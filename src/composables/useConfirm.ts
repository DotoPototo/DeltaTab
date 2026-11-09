import { shallowRef } from 'vue';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

const pending = shallowRef<PendingConfirm>();

export const useConfirm = () => ({
  pending,
  confirm: (options: ConfirmOptions) =>
    new Promise<boolean>((resolve) => {
      pending.value?.resolve(false);
      pending.value = { ...options, resolve };
    }),
  settle: (confirmed: boolean) => {
    pending.value?.resolve(confirmed);
    pending.value = undefined;
  },
});
