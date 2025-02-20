<template>
  <Modal
    ref="modalRef"
    class="bg-neutral-100 dark:bg-neutral-700 text-shade-100 dark:text-shade-0"
    titleClasses="bg-shade-0 dark:bg-shade-100 text-shade-100 dark:text-shade-0"
    noInnerPadding
    :noExit="addingSecret"
  >
    <template #title>
      <div class="flex flex-col overflow-hidden">
        <div class="uppercase font-bold text-md line-clamp-3 break-words">
          Secret: {{ definitionId }}
        </div>
        <div
          :class="
            clsx(
              'text-xs italic pt-xs',
              // 'text-neutral-600 dark:text-neutral-500', // dark/light mode classes
              'text-neutral-500', // force dark mode class
            )
          "
        >
          <template v-if="addingSecret">
            Fill out the form below to add the secret.
          </template>
          <template v-else>
            Select a secret from the list or add a new one.
          </template>
        </div>
      </div>
    </template>
    <div
      :class="
        clsx(
          themeContainerClasses,
          'min-h-[24rem] max-h-[80vh] flex flex-col overflow-hidden relative',
        )
      "
    >
      <AddSecretForm
        v-if="addingSecret"
        :definitionId="definitionId"
        forceDark
        @save="selectSecret"
        @cancel="cancelAddSecretForm"
      />
      <ScrollArea v-else class="m-sm">
        <RequestStatusMessage
          v-if="loadSecretsReq.isPending"
          :requestStatus="loadSecretsReq"
          loadingMessage="Loading Secrets"
        />
        <div v-else-if="secrets.length > 0" class="flex flex-col gap-xs">
          <SecretCard
            v-for="secret in secrets"
            :key="secret.id"
            :secret="secret"
            @click="emit('select', secret)"
          />
        </div>
        <div v-else class="flex flex-row items-center h-full">
          <div
            :class="
              clsx(
                'text-center w-full',
                // 'text-shade-100 dark:text-shade-0', // dark/light mode classes
                'text-shade-0', // force dark mode class
              )
            "
          >
            No secrets of this definition found.
          </div>
        </div>
        <template #bottom>
          <div class="flex flex-row gap-sm pt-sm">
            <VButton
              icon="x"
              tone="shade"
              variant="ghost"
              label="Close"
              @click="close"
            />
            <VButton
              v-if="!addingSecret"
              label="Add Secret"
              icon="plus"
              tone="action"
              class="flex-grow"
              @click="showAddSecretForm"
            />
          </div>
        </template>
      </ScrollArea>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import {
  VButton,
  RequestStatusMessage,
  useThemeContainer,
  Modal,
  ScrollArea,
} from "@si/vue-lib/design-system";

import { ref, computed } from "vue";
import clsx from "clsx";
import {
  useSecretsStore,
  SecretDefinitionId,
  Secret,
} from "@/store/secrets.store";
import SecretCard from "./SecretCard.vue";
import AddSecretForm from "./AddSecretForm.vue";

const modalRef = ref();

const { themeContainerClasses } = useThemeContainer("dark");

const props = defineProps<{ definitionId: SecretDefinitionId }>();

const secretsStore = useSecretsStore();

const loadSecretsReq = secretsStore.getRequestStatus("LOAD_SECRETS");

const secrets = computed(
  () => secretsStore.secretsByDefinitionId[props.definitionId] ?? [],
);

const addingSecret = ref(false);

const showAddSecretForm = () => {
  addingSecret.value = true;
};

const cancelAddSecretForm = () => {
  addingSecret.value = false;
};

const selectSecret = (secret: Secret) => {
  emit("select", secret);
};

const emit = defineEmits<{
  (e: "select", v: Secret): void;
}>();

const open = () => {
  cancelAddSecretForm();
  modalRef.value.open();
};
const close = () => {
  cancelAddSecretForm();
  modalRef.value.close();
};
const isOpen = computed(() => modalRef.value.isOpen);
defineExpose({ open, close, isOpen });
</script>
