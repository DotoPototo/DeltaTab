<template>
  <label class="toggle">
    <input v-model="model" type="checkbox" role="switch" class="toggle-input" :aria-label="ariaLabel" />
    <span class="toggle-track" aria-hidden="true"><span class="toggle-thumb" /></span>
  </label>
</template>

<script setup lang="ts">
defineProps<{ ariaLabel?: string }>();
const model = defineModel<boolean>({ required: true });
</script>

<style scoped>
.toggle {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.toggle-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.toggle-track {
  position: relative;
  flex-shrink: 0;
  width: 2.3rem;
  height: 1.3rem;
  border-radius: 999px;
  background: var(--surface-hover);
  border: 1px solid var(--border-strong);
  transition: background var(--duration-fast);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: calc(1.3rem - 6px);
  height: calc(1.3rem - 6px);
  border-radius: 50%;
  background: var(--text-muted);
  transition:
    transform var(--duration) var(--ease-out),
    background var(--duration-fast);
}

.toggle-input:checked + .toggle-track {
  background: var(--accent);
  border-color: transparent;
}

.toggle-input:checked + .toggle-track .toggle-thumb {
  transform: translateX(1rem);
  background: var(--accent-text);
}

.toggle-input:focus-visible + .toggle-track {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>
