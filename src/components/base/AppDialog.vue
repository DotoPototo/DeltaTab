<template>
  <dialog
    ref="dialog"
    class="dialog"
    :class="[`dialog-${size}`, { 'dialog-bare': bare, 'dialog-animated': animated }]"
    :style="fitsContent && height ? { height: `${height}px` } : undefined"
    :aria-labelledby="bare ? undefined : titleId"
    :aria-label="bare ? title : undefined"
    tabindex="-1"
    @close="onClose"
    @click="onBackdropClick"
  >
    <slot v-if="open && bare" />
    <template v-else-if="open">
      <header ref="header" class="dialog-header">
        <h2 :id="titleId" class="dialog-title">
          <Icon v-if="icon" :icon="icon" />
          {{ title }}
        </h2>
        <slot name="header" />
        <IconButton icon="material-symbols:close-rounded" label="Close" :tooltip="false" @click="open = false" />
      </header>
      <div ref="body" class="dialog-body">
        <div ref="inner">
          <slot />
        </div>
      </div>
      <footer v-if="$slots.footer" ref="footer" class="dialog-footer">
        <slot name="footer" />
      </footer>
    </template>
  </dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, useTemplateRef, watch } from 'vue';
import Icon from '@/components/base/AppIcon.vue';
import IconButton from '@/components/base/IconButton.vue';
import { pushModal, removeModal } from '@/composables/useModals';
import type { IconName } from '@/libs/icons';

const props = withDefaults(defineProps<{ title: string; icon?: IconName; size?: 'sm' | 'md' | 'xl'; bare?: boolean }>(), {
  icon: undefined,
  size: 'md',
});

const open = defineModel<boolean>('open', { required: true });
const dialog = useTemplateRef('dialog');
const titleId = useId();

watch(
  open,
  async (value) => {
    await nextTick();
    if (!dialog.value) return;
    if (value && !dialog.value.open) {
      dialog.value.showModal();
      pushModal(dialog.value);
      // The platform focuses the first control (usually Close); prefer an [autofocus] in the content.
      (dialog.value.querySelector<HTMLElement>('[autofocus]') ?? dialog.value).focus();
    } else if (!value && dialog.value.open) dialog.value.close();
  },
  { immediate: true }
);

// Animates to the content's height, measured from the unconstrained inner wrapper.
const fitsContent = computed(() => !props.bare && (props.size === 'sm' || props.size === 'md'));
const header = useTemplateRef('header');
const body = useTemplateRef('body');
const inner = useTemplateRef('inner');
const footer = useTemplateRef('footer');
const height = ref<number>();
const animated = ref(false);

const DIALOG_BORDERS = 2;

const measure = () => {
  if (!animated.value || !body.value || !inner.value) return;
  const { paddingTop, paddingBottom } = getComputedStyle(body.value);
  const chrome = (header.value?.offsetHeight ?? 0) + (footer.value?.offsetHeight ?? 0) + parseFloat(paddingTop) + parseFloat(paddingBottom);
  height.value = Math.ceil(chrome + inner.value.offsetHeight + DIALOG_BORDERS);
};

const observer = new ResizeObserver(measure);
watch(inner, (element, previous) => {
  if (previous) observer.unobserve(previous);
  animated.value = false;
  height.value = undefined;
  if (!element || !fitsContent.value) return;
  observer.observe(element);
  // Open at the natural size; take over (and animate) from the first change after paint.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      animated.value = true;
      measure();
    })
  );
});
onBeforeUnmount(() => {
  observer.disconnect();
  if (dialog.value) removeModal(dialog.value);
});

const onClose = () => {
  if (dialog.value) removeModal(dialog.value);
  open.value = false;
};

const onBackdropClick = (event: MouseEvent) => {
  // Clicks on the ::backdrop target the dialog element itself.
  if (event.target === dialog.value) open.value = false;
};
</script>

<style scoped>
.dialog {
  margin: auto;
  max-height: min(86vh, 900px);
  padding: 0;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  background: var(--surface-solid);
  color: var(--text);
  box-shadow: 0 30px 80px rgb(0 0 0 / 0.45);
  backdrop-filter: blur(var(--blur));
  /* clip, not hidden: focus can still scroll a hidden box, sliding content up and leaving a gap. */
  overflow: clip;
}

.dialog:focus-visible {
  outline: none;
}

.dialog-animated {
  transition: height 260ms var(--ease-out);
}

.dialog[open] {
  display: flex;
  flex-direction: column;
  animation: dialog-in var(--duration) var(--ease-out);
}

.dialog::backdrop {
  background: rgb(0 0 0 / 0.45);
  backdrop-filter: blur(4px);
  animation: fade-in var(--duration) var(--ease-out);
}

.dialog-sm {
  width: min(420px, 92vw);
}

.dialog-md {
  width: min(620px, 92vw);
}

.dialog-xl {
  width: min(980px, 94vw);
  height: min(86vh, 720px);
}

.dialog-bare[open] {
  flex-direction: row;
}

.dialog-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-4) var(--space-3) var(--space-5);
  border-bottom: 1px solid var(--border);
}

.dialog-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-right: auto;
  font-size: var(--text-lg);
  font-weight: 600;
}

.dialog-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: var(--space-5);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  border-top: 1px solid var(--border);
}

@keyframes dialog-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}
</style>
