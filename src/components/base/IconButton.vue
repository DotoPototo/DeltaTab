<template>
  <button
    v-tippy="tooltip ? { content: label, placement } : undefined"
    type="button"
    class="icon-btn"
    :class="[`icon-btn-${size}`, { 'icon-btn-glass': glass }]"
    :aria-label="label"
  >
    <Icon :icon="icon" :class="{ spin: spinning }" />
  </button>
</template>

<script setup lang="ts">
import Icon from '@/components/base/AppIcon.vue';
import type { IconName } from '@/libs/icons';

withDefaults(
  defineProps<{
    icon: IconName;
    label: string;
    size?: 'sm' | 'md';
    spinning?: boolean;
    glass?: boolean;
    tooltip?: boolean;
    placement?: 'top' | 'bottom' | 'left' | 'right';
  }>(),
  { size: 'md', tooltip: true, placement: 'top' }
);
</script>

<style scoped>
.icon-btn {
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  transition:
    background var(--duration-fast),
    color var(--duration-fast);
}

.icon-btn:hover {
  background: var(--surface-raised);
  color: var(--accent);
}

.icon-btn-sm {
  width: 1.6rem;
  height: 1.6rem;
  font-size: 0.8rem;
}

.icon-btn-md {
  width: 2rem;
  height: 2rem;
  font-size: 0.95rem;
}

.icon-btn-glass {
  color: rgb(255 255 255 / 0.85);
  background: rgb(0 0 0 / 0.22);
  backdrop-filter: blur(12px);
  border: 1px solid rgb(255 255 255 / 0.12);
}

.icon-btn-glass:hover {
  background: rgb(0 0 0 / 0.38);
  color: #fff;
}

.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
