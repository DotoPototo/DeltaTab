<template>
  <div
    class="gutter"
    :class="[direction, { active: dragging }]"
    role="separator"
    tabindex="0"
    :aria-label="label"
    :aria-orientation="direction === 'column' ? 'vertical' : 'horizontal'"
    :aria-valuenow="Math.round(value * 100)"
    :aria-valuemin="Math.round(min * 100)"
    :aria-valuemax="Math.round(max * 100)"
    :aria-valuetext="`${Math.round(value * 100)}%`"
    @pointerdown="start"
    @keydown="onKeydown"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';

// Emits the offset from drag start, not a delta, so a clamped pane waits for the pointer to come back.
const props = defineProps<{
  direction: 'column' | 'row';
  label: string;
  /** Leading pane's share, 0 to 1. */
  value: number;
  min: number;
  max: number;
}>();
const emit = defineEmits<{ dragStart: []; drag: [offset: number]; step: [steps: number] }>();
const dragging = ref(false);

const start = (event: PointerEvent) => {
  const el = event.currentTarget as HTMLElement;
  el.setPointerCapture(event.pointerId);
  dragging.value = true;
  const position = (e: PointerEvent) => (props.direction === 'column' ? e.clientX : e.clientY);
  const origin = position(event);
  emit('dragStart');

  const move = (e: PointerEvent) => emit('drag', position(e) - origin);
  const end = () => {
    dragging.value = false;
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', end);
    el.removeEventListener('pointercancel', end);
  };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
};

const onKeydown = (event: KeyboardEvent) => {
  const keys = props.direction === 'column' ? { ArrowLeft: -1, ArrowRight: 1 } : { ArrowUp: -1, ArrowDown: 1 };
  const step = keys[event.key as keyof typeof keys];
  if (!step) return;
  event.preventDefault();
  emit('step', event.shiftKey ? step * 5 : step);
};
</script>

<style scoped>
.gutter {
  position: relative;
  outline: none;
  flex-shrink: 0;
  touch-action: none;
}

.gutter::after {
  content: '';
  position: absolute;
  border-radius: 2px;
  background: var(--accent);
  opacity: 0.35;
  transition: opacity var(--duration-fast);
}

.gutter:hover::after,
.gutter:focus-visible::after,
.gutter.active::after {
  opacity: 1;
}

.column {
  width: 14px;
  cursor: col-resize;
}

.column::after {
  top: 30%;
  bottom: 30%;
  left: 5px;
  width: 4px;
}

.row {
  height: 14px;
  cursor: row-resize;
}

.row::after {
  left: 30%;
  right: 30%;
  top: 5px;
  height: 4px;
}
</style>
