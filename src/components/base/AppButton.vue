<template>
  <button class="btn" :class="[`btn-${variant}`, `btn-${size}`]" :type="type" :disabled="disabled || loading" :aria-busy="loading">
    <Icon v-if="loading" icon="line-md:loading-twotone-loop" class="btn-icon" />
    <Icon v-else-if="icon" :icon="icon" class="btn-icon" />
    <span v-if="label || $slots.default" class="btn-label"
      ><slot>{{ label }}</slot></span
    >
  </button>
</template>

<script setup lang="ts">
import Icon from '@/components/base/AppIcon.vue';
import type { IconName } from '@/libs/icons';

withDefaults(
  defineProps<{
    label?: string;
    icon?: IconName;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md';
    type?: 'button' | 'submit';
    disabled?: boolean;
    loading?: boolean;
  }>(),
  { label: undefined, icon: undefined, variant: 'secondary', size: 'md', type: 'button' }
);
</script>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45em;
  border-radius: var(--radius-sm);
  font-weight: 550;
  white-space: nowrap;
  border: 1px solid transparent;
  transition:
    background var(--duration-fast),
    border-color var(--duration-fast),
    color var(--duration-fast),
    transform var(--duration-fast);
}

.btn:active:not(:disabled) {
  transform: translateY(1px);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-md {
  height: 2.1rem;
  padding: 0 0.9rem;
  font-size: var(--text-sm);
}

.btn-sm {
  height: 1.7rem;
  padding: 0 0.6rem;
  font-size: var(--text-xs);
}

.btn-primary {
  background: var(--accent);
  color: var(--accent-text);
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-strong);
}

.btn-secondary {
  background: var(--surface-raised);
  border-color: var(--border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--surface-hover);
  border-color: var(--border-strong);
}

.btn-ghost {
  color: var(--text-muted);
}

.btn-ghost:hover:not(:disabled) {
  background: var(--surface-hover);
  color: var(--text);
}

.btn-danger {
  background: color-mix(in oklab, var(--danger) 16%, transparent);
  color: var(--danger);
  border-color: color-mix(in oklab, var(--danger) 30%, transparent);
}

.btn-danger:hover:not(:disabled) {
  background: color-mix(in oklab, var(--danger) 26%, transparent);
}

.btn-icon {
  font-size: 1.1em;
  flex-shrink: 0;
}
</style>
