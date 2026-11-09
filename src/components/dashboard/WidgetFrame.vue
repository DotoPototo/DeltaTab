<template>
  <div class="frame" :class="{ editing, dragging }" :draggable="editing" @dragstart="onDragStart" @dragend="emit('dragEnd')">
    <div class="frame-content" :inert="editing">
      <WidgetCard v-if="crashed">
        <EmptyState icon="material-symbols:bug-report-outline-rounded" title="This widget hit an error" :text="crashed">
          <AppButton size="sm" label="Reload widget" @click="crashed = undefined" />
        </EmptyState>
      </WidgetCard>
      <WidgetCard v-else-if="granted === false">
        <EmptyState icon="material-symbols:lock-open-outline-rounded" title="Permission needed" :text="definition.permissionReason">
          <AppButton size="sm" variant="primary" label="Allow access" @click="request" />
        </EmptyState>
      </WidgetCard>
      <component :is="definition.view" v-else-if="granted" />
    </div>

    <div v-if="editing" class="frame-edit">
      <Icon icon="material-symbols:drag-indicator" class="frame-grip" />
      <span class="frame-name" :title="instance.title?.trim() || definition.name">{{ instance.title?.trim() || definition.name }}</span>
      <div class="frame-actions">
        <IconButton icon="material-symbols:swap-horiz-rounded" label="Change widget" @click="emit('change')" />
        <IconButton icon="material-symbols:tune-rounded" label="Widget settings" @pointerenter="definition.settings?.prefetch()" @click="emit('settings')" />
        <IconButton icon="material-symbols:delete-outline-rounded" label="Remove" @click="emit('remove')" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onErrorCaptured, provide, ref, watch } from 'vue';
import AppButton from '@/components/base/AppButton.vue';
import Icon from '@/components/base/AppIcon.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import IconButton from '@/components/base/IconButton.vue';
import WidgetCard from '@/components/dashboard/WidgetCard.vue';
import { usePermissions } from '@/composables/usePermissions';
import { describeError } from '@/libs/text';
import { WIDGET_CONTEXT } from '@/widgets/context';
import type { AnyWidgetDefinition, WidgetInstance } from '@/widgets/types';

const props = defineProps<{ instance: WidgetInstance; definition: AnyWidgetDefinition; editing: boolean; dragging: boolean }>();
const emit = defineEmits<{ settings: []; change: []; remove: []; dragStart: []; dragEnd: [] }>();

provide(WIDGET_CONTEXT, {
  get instance() {
    return props.instance;
  },
  get definition() {
    return props.definition;
  },
  openSettings: () => emit('settings'),
});

const spec = computed(() => props.definition.permissions?.(props.instance.config) ?? {});
const { granted, request } = usePermissions(spec);

const crashed = ref<string>();
onErrorCaptured((error) => {
  console.error(`[widget:${props.definition.type}]`, error);
  crashed.value = describeError(error);
  return false;
});
// Slots reuse their frame, so a widget swapped in must not inherit the previous one's crash.
watch(
  () => props.instance.id,
  () => (crashed.value = undefined)
);

const onDragStart = (event: DragEvent) => {
  // Only the frame itself is a layout drag: a link dragged out of a widget must keep its own drag data.
  if (!props.editing || event.target !== event.currentTarget) return;
  event.dataTransfer?.setData('text/plain', props.instance.id);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  emit('dragStart');
};
</script>

<style scoped>
.frame {
  position: relative;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.frame-content {
  height: 100%;
}

.editing {
  cursor: grab;
}

.editing .frame-content {
  opacity: 0.25;
  filter: blur(2px);
  transition:
    opacity var(--duration),
    filter var(--duration);
}

.dragging {
  opacity: 0.4;
}

.frame-edit {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: 1px dashed var(--accent);
  border-radius: var(--radius);
  background: rgb(0 0 0 / 0.25);
}

.frame-grip {
  font-size: 1.4rem;
  color: var(--accent);
}

.frame-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-muted);
}

.frame-actions {
  display: flex;
  gap: 0.25rem;
  padding: 0.2rem;
  border-radius: var(--radius);
  background: var(--surface-solid);
  border: 1px solid var(--border);
}
</style>
