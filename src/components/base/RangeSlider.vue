<template>
  <label class="range">
    <input
      v-model.number="model"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :aria-label="ariaLabel"
      :aria-valuetext="format(model)"
      :style="{ '--fill': `${((model - min) / (max - min)) * 100}%` }"
    />
    <span class="range-value tabular">{{ format(model) }}</span>
  </label>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ ariaLabel?: string; min?: number; max?: number; step?: number; format?: (value: number) => string }>(), {
  ariaLabel: undefined,
  min: 0,
  max: 100,
  step: 1,
  format: (value: number) => String(value),
});
const model = defineModel<number>({ required: true });
</script>

<style scoped>
.range {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.range-value {
  min-width: 2.75rem;
  text-align: right;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

input[type='range'] {
  width: 11rem;
  appearance: none;
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--accent) var(--fill), var(--surface-hover) var(--fill));
  cursor: pointer;
}

input[type='range']::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgb(0 0 0 / 0.4);
}

input[type='range']::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border: none;
  border-radius: 50%;
  background: #fff;
}
</style>
