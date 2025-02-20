#!/bin/bash

# TODO(johnrwatson): In theory we should be able to run this task for any of the
# components we need rootfs' for but there are some cyclone-specifics bits that
# will cause us problems

set -euxo pipefail

# TODO(johnrwatson): We need to port this to python or similar, and check for
# OS-dependencies that are required. i.e. docker and basic priviledged
# escalation for the mounts

# i.e. ./${git_metadata} | jq -r '.abbreviated_commit_hash' (it returns a json
# blob output via python)
git_metadata=$1
# i.e. ./metadata-out.json (a build metadata file containing contents of type
# etc)
build_metadata_out=$2
# i.e. output the file ./johns_rootfs.tar
tar_file_out=$3

# Shift the parsed arguments off after assignment
shift 3

# The rest of the inputs are a list of input files or directories, to also
# include in the build i.e. consume a binary ./johns_binary.bin for use within
# this script
binary_inputs=("$@")

echo "-------------------------------------"
echo "Info: Initiating rootfs build"
echo "Artifact Version: $(jq -r '.canonical_version' <"$git_metadata")"
echo "Output File: $tar_file_out"
echo "Input Binaries (list):"
for binary_input in "${binary_inputs[@]}"; do
  echo "$(
    echo "$binary_input" \
      | awk -F "/" '{print $NF}'
  ) Full Path: $binary_input"
done
echo "-------------------------------------"

GITROOT="$(pwd)"
BUCKROOT="$BUCK_SCRATCH_PATH" # This is provided by buck2

BIN=cyclone
PACKAGEDIR=$(realpath "$BUCKROOT/cyclone-pkg")
ROOTFS="$PACKAGEDIR/cyclone-rootfs.ext4"
ROOTFSMOUNT="$PACKAGEDIR/rootfs"
ROOTFS_TAR="rootfs.tar.gz"
INITSCRIPT="$PACKAGEDIR/init.sh"
ALPINE_VERSION=3.18

# Vendored from https://github.com/fnichol/libsh/blob/main/lib/setup_traps.sh
setup_traps() {
  local _sig
  for _sig in HUP INT QUIT ALRM TERM; do
    trap "
      $1
      trap - $_sig EXIT
      kill -s $_sig "'"$$"' "$_sig"
  done
  # shellcheck disable=SC2064
  trap "$1" EXIT

  unset _sig
}

cleanup() {
  set +e

  # cleanup the PACKAGEDIR
  sudo umount -fv "$ROOTFSMOUNT"

  rm -rfv "$ROOTFSMOUNT" "$INITSCRIPT" "$ROOTFS_TAR"
}

setup_traps cleanup

# create disk and mount to a known location
mkdir -pv "$ROOTFSMOUNT"
dd if=/dev/zero of="$ROOTFS" bs=1M count=2048
mkfs.ext4 -v "$ROOTFS"
sudo mount -v "$ROOTFS" "$ROOTFSMOUNT"

cyclone_args=(
  --bind-vsock 3:52
  --decryption-key /cyclone/decryption.key
  --lang-server /usr/local/bin/lang-js
  --enable-watch
  --limit-requests 1
  --watch-timeout 30
  --enable-ping
  --enable-resolver
  --enable-action-run
  -vvvv
)

# got get the rootfs tar and unpack it
curl "https://dl-cdn.alpinelinux.org/alpine/v$ALPINE_VERSION/releases/$(arch)/alpine-minirootfs-$ALPINE_VERSION.0-$(arch).tar.gz" -o $ROOTFS_TAR
sudo tar xf rootfs.tar.gz -C "$ROOTFSMOUNT"

#ENTER CHROOT
sudo chroot "$ROOTFSMOUNT" sh <<EOL

# Set up DNS resolution
echo "nameserver 8.8.8.8" >"/etc/resolv.conf"

apk update
apk add openrc openssh mingetty runuser

adduser -D app
for dir in / run etc usr/local/etc home/app/.config; do
    mkdir -pv "/\$dir/$BIN"
done

# create /dev/null
mknod /dev/null c 1 3
chmod 666 /dev/null

ssh-keygen -A

# Make sure special file systems are mounted on boot:
rc-update add devfs boot
rc-update add procfs boot
rc-update add sysfs boot
rc-update add networking boot
rc-update add local default
rc-update add sshd

# autologin
echo "ttyS0::respawn:/sbin/mingetty --autologin root --noclear ttyS0" >> /etc/inittab
sed -i 's/root:*::0:::::/root:::0:::::/g' /etc/shadow

# autostart cyclone
cat <<EOF >"/etc/init.d/cyclone"
#!/sbin/openrc-run

name="cyclone"
description="Cyclone"
supervisor="supervise-daemon"
pidfile="/cyclone/agent.pid"

start(){
  export OTEL_EXPORTER_OTLP_ENDPOINT=http://1.0.0.1:4316
  cyclone ${cyclone_args[*]} >> /var/log/cyclone.log 2>&1 && reboot &
}
EOF

chmod +x "/etc/init.d/cyclone"

rc-update add cyclone boot

# Set up TAP device route/escape
cat <<EOZ >"/etc/network/interfaces"
auto lo
iface lo inet loopback

auto eth0
iface eth0 inet static
        address 10.0.0.1/30
        gateway 10.0.0.2
EOZ

EOL
# LEAVE CHROOT

# For each tar.gz, copy the contents into the rootfs into the rootfs partition
# we created above. This will cumulatively stack the content of each.
for binary_input in "${binary_inputs[@]}"; do
  sudo tar -xpf "$binary_input" -C "$ROOTFSMOUNT"

  # TODO(johnrwatson): This can never make it into Production We need to figure
  # out how to pass these decryption keys at all for the services That need
  # them, maybe we need another sub-service specifically for fetching these from
  # a secret provider or similar. Only for cyclone pull the dev decryption key
  if echo "$binary_input" | grep -q "cyclone"; then
    sudo mkdir -pv "$ROOTFSMOUNT/cyclone"
    sudo cp -v \
      "$GITROOT/lib/cyclone-server/src/dev.decryption.key" \
      "$ROOTFSMOUNT/cyclone/decryption.key"
  fi
done
# Must be unmounted then moved with sudo or permission issues will prevent all directories
# from copying over for some mysterious reason.
sudo umount -fv "$ROOTFSMOUNT"
sudo mv -v "$ROOTFS" "$tar_file_out"

# Then generate the build metadata
#
# TODO(johnrwatson): family here needs adjusted to the service/component name as
# this doesn't currently support services outside of cyclone.
cat <<EOF >"$build_metadata_out"
{
  "family":"cyclone",
  "variant":"rootfs",
  "version":"$(jq -r '.canonical_version' <"$git_metadata")",
  "arch":"$(uname -m | tr '[:upper:]' '[:lower:]')",
  "os":"$(uname -s | tr '[:upper:]' '[:lower:]')",
  "commit": "$(jq -r '.commit_hash' <"$git_metadata")",
  "b3sum": "$(b3sum --no-names "$tar_file_out")"
}
EOF

echo "--- rootfs build complete."
