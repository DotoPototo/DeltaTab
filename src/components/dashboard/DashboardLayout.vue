<template>
  <div ref="root" class="layout" :class="{ editing }">
    <template v-for="(column, c) in columns" :key="`c${c}`">
      <div :ref="(el) => (columnEls[c] = el as HTMLElement)" class="column" :style="{ flex: `${column.size} 1 0` }">
        <template v-for="(cell, r) in column.cells" :key="`s${c}-${r}`">
          <div
            class="slot"
            :class="{ 'drop-target': dropTarget?.column === c && dropTarget.row === r }"
            :style="{ flex: `${cell.size} 1 0` }"
            @dragover="onDragOver($event, cell.slot)"
            @dragleave="dropTarget = undefined"
            @drop="drop($event, cell.slot)"
          >
            <WidgetFrame
              v-if="cell.widget"
              :instance="cell.widget.instance"
              :definition="cell.widget.definition"
              :editing="editing"
              :dragging="dragging?.column === c && dragging.row === r"
              @drag-start="dragging = cell.slot"
              @drag-end="dragging = dropTarget = undefined"
              @settings="emit('settings', cell.widget.instance.id)"
              @change="emit('pick', cell.slot)"
              @remove="remove(cell.slot, cell.widget.definition.name)"
            />
            <button v-else class="empty-slot" :class="{ visible: editing }" @click="emit('pick', cell.slot)">
              <Icon icon="fa6-solid:plus" />
              <span>Add widget</span>
            </button>
          </div>
          <template v-if="cell.max !== undefined">
            <LayoutGutter
              v-if="editing && !stacked"
              direction="row"
              label="Resize widgets"
              :value="cell.size"
              :min="MIN_FRACTION"
              :max="cell.max"
              @drag-start="startResize(cell.size)"
              @drag="(d) => dragRow(c, r, d)"
              @step="(s) => dashboard.resizeRows(c, r, s * KEY_STEP)"
            />
            <div v-else class="gap-row" />
          </template>
        </template>
      </div>
      <template v-if="column.max !== undefined">
        <LayoutGutter
          v-if="editing && !stacked"
          direction="column"
          label="Resize columns"
          :value="column.size"
          :min="MIN_FRACTION"
          :max="column.max"
          @drag-start="startResize(column.size)"
          @drag="(d) => dragColumn(c, d)"
          @step="(s) => dashboard.resizeColumns(c, s * KEY_STEP)"
        />
        <div v-else class="gap-column" />
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { storeToRefs } from 'pinia';
import { useMediaQuery } from '@/composables/useMediaQuery';
import Icon from '@/components/base/AppIcon.vue';
import LayoutGutter from '@/components/dashboard/LayoutGutter.vue';
import WidgetFrame from '@/components/dashboard/WidgetFrame.vue';
import { useToast } from '@/composables/useToast';
import { MIN_FRACTION, useDashboardStore, type SlotRef } from '@/stores/dashboard';
import { widgetDefinition } from '@/widgets';
import type { AnyWidgetDefinition, WidgetInstance } from '@/widgets/types';

const props = defineProps<{ editing: boolean }>();
// Stacked panes have a fixed height, so resizing would change proportions that can't be seen.
const stacked = useMediaQuery('(max-width: 900px)');
const emit = defineEmits<{ settings: [id: string]; pick: [slot: SlotRef] }>();

const dashboard = useDashboardStore();
const { layout } = storeToRefs(dashboard);
const toast = useToast();
const root = useTemplateRef('root');
const columnEls: HTMLElement[] = [];
const dragging = ref<SlotRef>();
const dropTarget = ref<SlotRef>();

interface Pane {
  size: number;
  max?: number;
}

interface Cell extends Pane {
  slot: SlotRef;
  widget?: { instance: WidgetInstance; definition: AnyWidgetDefinition };
}

const maxShare = (sizes: number[], index: number) => {
  const [size, next] = [sizes[index], sizes[index + 1]];
  return size === undefined || next === undefined ? undefined : size + next - MIN_FRACTION;
};

const widgetIn = (id: string | null): Cell['widget'] => {
  const instance = dashboard.find(id);
  const definition = instance && widgetDefinition(instance.type);
  return instance && definition ? { instance, definition } : undefined;
};

const columns = computed(() =>
  layout.value.slots.map((ids, column): Pane & { cells: Cell[] } => {
    const rows = layout.value.rows[column] ?? [];
    return {
      size: layout.value.columns[column] ?? 0,
      max: maxShare(layout.value.columns, column),
      cells: ids.map((id, row) => ({ slot: { column, row }, widget: widgetIn(id), size: rows[row] ?? 0, max: maxShare(rows, row) })),
    };
  })
);

const KEY_STEP = 0.02;

// Shares rather than pixels, so proportions survive window resizes; the store clamps what it applies.
let startShare = 0;
const startResize = (share: number) => (startShare = share);
const dragColumn = (index: number, offset: number) => {
  if (root.value) dashboard.resizeColumns(index, startShare + offset / root.value.clientWidth - layout.value.columns[index]!);
};
const dragRow = (column: number, index: number, offset: number) => {
  const el = columnEls[column];
  if (el) dashboard.resizeRows(column, index, startShare + offset / el.clientHeight - layout.value.rows[column]![index]!);
};

// Only a layout drag in edit mode is ours: links and files dragged over keep the browser's behaviour.
const onDragOver = (event: DragEvent, slot: SlotRef) => {
  if (!props.editing || !dragging.value) return;
  event.preventDefault();
  dropTarget.value = slot;
};

const drop = (event: DragEvent, target: SlotRef) => {
  if (!props.editing || !dragging.value) return;
  event.preventDefault();
  dashboard.swap(dragging.value, target);
  dragging.value = dropTarget.value = undefined;
};

const remove = (slot: SlotRef, name: string) => {
  toast.add({ summary: `${name} removed`, action: { label: 'Undo', run: dashboard.clear(slot) } });
};
</script>

<style scoped>
.layout {
  display: flex;
  height: 100%;
  min-height: 0;
}

.column {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.slot {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-radius: var(--radius);
  transition: box-shadow var(--duration-fast);
}

.slot > * {
  flex: 1;
  min-height: 0;
}

.slot.drop-target {
  box-shadow: 0 0 0 2px var(--accent);
}

.gap-column {
  width: 14px;
  flex-shrink: 0;
}

.gap-row {
  height: 14px;
  flex-shrink: 0;
}

.empty-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: var(--radius);
  border: 1px dashed var(--border);
  background: color-mix(in oklab, var(--surface) 50%, transparent);
  color: var(--text-faint);
  font-size: var(--text-sm);
  opacity: 0.5;
  transition:
    opacity var(--duration),
    border-color var(--duration),
    color var(--duration);
}

.empty-slot.visible,
.empty-slot:hover,
.empty-slot:focus-visible {
  opacity: 1;
  border-color: var(--border);
}

.empty-slot:hover {
  border-color: var(--accent);
  color: var(--accent);
}

@media (max-width: 900px) {
  .layout {
    flex-direction: column;
    height: auto;
  }

  .column {
    flex: none !important;
  }

  .slot {
    flex: none !important;
    height: 420px;
  }
}
</style>
