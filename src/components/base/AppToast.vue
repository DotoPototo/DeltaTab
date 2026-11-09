<template>
  <!-- Moved inside the open modal: the top layer alone doesn't exempt it from the modal's inertness. -->
  <Teleport :to="openModals.at(-1) ?? 'body'">
    <div ref="stack" popover="manual" class="toast-stack">
      <TransitionGroup name="toast">
        <div
          v-for="message in messages"
          :key="message.id"
          class="toast"
          :class="`toast-${message.severity}`"
          role="status"
          aria-live="polite"
          @pointerenter="pause(message.id)"
          @pointerleave="resume(message.id)"
          @focusin="pause(message.id)"
          @focusout="resume(message.id)"
        >
          <Icon :icon="SEVERITY_ICON[message.severity]" class="toast-icon" aria-hidden="true" />
          <div class="toast-text">
            <p class="toast-summary">{{ message.summary }}</p>
            <p v-if="message.detail" class="toast-detail">{{ message.detail }}</p>
          </div>
          <AppButton v-if="message.action" size="sm" variant="ghost" class="toast-action" :label="message.action.label" @click="runAction(message)" />
          <IconButton size="sm" icon="material-symbols:close-rounded" label="Dismiss" :tooltip="false" @click="dismiss(message.id)" />
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useTemplateRef, watch } from 'vue';
import AppButton from '@/components/base/AppButton.vue';
import Icon from '@/components/base/AppIcon.vue';
import IconButton from '@/components/base/IconButton.vue';
import { openModals } from '@/composables/useModals';
import { useToast, type ToastMessage, type ToastSeverity } from '@/composables/useToast';
import type { IconName } from '@/libs/icons';
import { describeError } from '@/libs/text';

const SEVERITY_ICON: Record<ToastSeverity, IconName> = {
  info: 'material-symbols:info-outline-rounded',
  success: 'material-symbols:check-circle-outline-rounded',
  warn: 'material-symbols:warning-outline-rounded',
  error: 'material-symbols:error-outline-rounded',
};

const toast = useToast();
const { messages, dismiss, pause, resume } = toast;
const stack = useTemplateRef('stack');

watch(
  [() => messages.value.length > 0, () => openModals.value.at(-1)],
  ([visible]) => {
    if (!stack.value) return;
    // Re-showing puts the popover back on top: after a move into or out of a dialog, or above one opened since.
    if (stack.value.matches(':popover-open')) stack.value.hidePopover();
    if (visible) stack.value.showPopover();
  },
  { flush: 'post' }
);

const runAction = async (message: ToastMessage) => {
  dismiss(message.id);
  try {
    await message.action?.run();
  } catch (error) {
    toast.error(`${message.action?.label} didn’t work`, describeError(error));
  }
};
</script>

<style scoped>
.toast-stack {
  inset: auto 1.25rem 1.25rem auto;
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  overflow: visible;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.toast-stack:not(:popover-open) {
  display: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: min(400px, calc(100vw - 2.5rem));
  padding: 0.6rem 0.5rem 0.6rem 0.8rem;
  border-radius: var(--radius);
  border: 1px solid var(--border-strong);
  background: color-mix(in oklab, var(--surface) 80%, black);
  backdrop-filter: blur(16px);
  box-shadow: 0 16px 40px rgb(0 0 0 / 0.35);
  color: var(--text);
}

.toast-icon {
  flex-shrink: 0;
  font-size: 1.2rem;
}

.toast-info .toast-icon {
  color: var(--info);
}

.toast-success .toast-icon {
  color: var(--success);
}

.toast-warn .toast-icon {
  color: var(--warning);
}

.toast-error .toast-icon {
  color: var(--danger);
}

.toast-text {
  flex: 1;
  min-width: 0;
}

.toast-summary {
  font-size: var(--text-sm);
  font-weight: 600;
}

.toast-detail {
  margin-top: 2px;
  font-size: var(--text-xs);
  color: var(--text-muted);
  line-height: 1.4;
  white-space: pre-line;
}

.toast-action {
  color: var(--accent);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity var(--duration),
    transform var(--duration) var(--ease-out);
}

.toast-move {
  transition: transform var(--duration) var(--ease-out);
}
</style>
