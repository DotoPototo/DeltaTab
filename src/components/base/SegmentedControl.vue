<template>
  <div class="segmented" :class="`segmented-${size}`" role="radiogroup" :aria-label="label" @keydown="onRadioKeydown">
    <button
      v-for="option in options"
      :key="String(option.value)"
      type="button"
      role="radio"
      class="segment"
      :aria-checked="model === option.value"
      :tabindex="model === option.value ? 0 : -1"
      :class="{ active: model === option.value }"
      @click="model = option.value"
    >
      <Icon v-if="option.icon" :icon="option.icon" />
      <span v-if="option.label">{{ option.label }}</span>
      <span v-if="option.badge" class="segment-badge tabular">{{ option.badge }}</span>
    </button>
  </div>
</template>

<script setup lang="ts" generic="T extends string | number | boolean">
import { onRadioKeydown } from '@/libs/radioGroup';
import Icon from '@/components/base/AppIcon.vue';
import type { IconName } from '@/libs/icons';

export interface SegmentOption<V> {
  value: V;
  label?: string;
  icon?: IconName;
  badge?: string | number;
}

withDefaults(defineProps<{ options: SegmentOption<T>[]; label?: string; size?: 'sm' | 'md' }>(), { label: undefined, size: 'md' });
const model = defineModel<T>({ required: true });
</script>

<style scoped>
.segmented {
  display: inline-flex;
  max-width: 100%;
  padding: 2px;
  gap: 2px;
  border-radius: var(--radius-sm);
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  overflow-x: auto;
  scrollbar-width: none;
}

.segment {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
  border-radius: calc(var(--radius-sm) - 2px);
  color: var(--text-muted);
  font-weight: 500;
  white-space: nowrap;
  transition:
    background var(--duration-fast),
    color var(--duration-fast);
}

.segmented-md .segment {
  padding: 0.35rem 0.75rem;
  font-size: var(--text-sm);
}

.segmented-sm .segment {
  padding: 0.2rem 0.55rem;
  font-size: var(--text-xs);
}

.segment:hover {
  color: var(--text);
}

.segment.active {
  background: var(--accent);
  color: var(--accent-text);
  font-weight: 600;
}

.segment-badge {
  padding: 0 0.35em;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 0.85em;
}
</style>
