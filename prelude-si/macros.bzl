load(
    "@prelude-si//macros:native.bzl",
    _alias = "alias",
    _export_file = "export_file",
    _filegroup = "filegroup",
)
alias = _alias
export_file = _export_file
filegroup = _filegroup

load(
    "@prelude-si//macros:pnpm.bzl",
    _node_pkg_bin = "node_pkg_bin",
    _npm_bin = "npm_bin",
    _package_node_modules = "package_node_modules",
    _pnpm_lock = "pnpm_lock",
    _typescript_dist = "typescript_dist",
    _vite_app = "vite_app",
    _workspace_node_modules = "workspace_node_modules",
)
node_pkg_bin = _node_pkg_bin
npm_bin = _npm_bin
package_node_modules = _package_node_modules
pnpm_lock = _pnpm_lock
typescript_dist = _typescript_dist
vite_app = _vite_app
workspace_node_modules = _workspace_node_modules

load(
    "@prelude-si//macros:rust.bzl",
    _rust_binary = "rust_binary",
    _rust_library = "rust_library",
)
rust_binary = _rust_binary
rust_library = _rust_library
