<template>
  <AppDialog :open="!!pending" :title="pending?.title ?? ''" size="sm" @update:open="(value) => !value && settle(false)">
    <p class="message">{{ pending?.message }}</p>
    <template #footer>
      <AppButton label="Cancel" @click="settle(false)" />
      <AppButton :variant="pending?.danger ? 'danger' : 'primary'" :label="pending?.confirmLabel ?? 'Confirm'" @click="settle(true)" />
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import AppButton from '@/components/base/AppButton.vue';
import AppDialog from '@/components/base/AppDialog.vue';
import { useConfirm } from '@/composables/useConfirm';

const { pending, settle } = useConfirm();
</script>

<style scoped>
.message {
  font-size: var(--text-sm);
  color: var(--text-muted);
  line-height: 1.55;
}
</style>
