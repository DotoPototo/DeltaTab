<template>
  <div class="editable">
    <TransitionGroup tag="ul" name="list" class="editable-items">
      <li v-for="(item, index) in items" :key="keyOf(item, index)" class="editable-item">
        <div class="editable-content"><slot name="item" :item="item" :index="index" /></div>
        <IconButton size="sm" icon="material-symbols:close-rounded" label="Remove" :tooltip="false" @click="emit('remove', index)" />
      </li>
    </TransitionGroup>
    <p v-if="!items.length && empty" class="editable-empty">{{ empty }}</p>
    <form v-if="$slots.add" class="editable-add" @submit.prevent="emit('submit')">
      <slot name="add" />
    </form>
  </div>
</template>

<script setup lang="ts" generic="T">
import IconButton from '@/components/base/IconButton.vue';

const props = defineProps<{ items: T[]; itemKey?: (item: T) => string; empty?: string }>();
const emit = defineEmits<{ remove: [index: number]; submit: [] }>();

const keyOf = (item: T, index: number) => props.itemKey?.(item) ?? (typeof item === 'string' ? item : String(index));
</script>

<style scoped>
.editable-items {
  list-style: none;
}

.editable-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-height: 3rem;
  padding: 0.45rem 0.6rem 0.45rem 1rem;
  font-size: var(--text-sm);
}

.editable-item + .editable-item {
  border-top: 1px solid var(--border);
}

.editable-content {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex: 1;
  min-width: 0;
}

.editable-empty {
  padding: 0.9rem 1rem;
  font-size: var(--text-sm);
  color: var(--text-faint);
}

.editable-add {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--border);
  background: color-mix(in oklab, var(--surface-sunken) 50%, transparent);
}

.list-enter-active,
.list-leave-active {
  transition:
    opacity var(--duration-fast),
    transform var(--duration-fast);
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-6px);
}
</style>
