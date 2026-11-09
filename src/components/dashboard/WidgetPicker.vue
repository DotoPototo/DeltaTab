<template>
  <AppDialog v-model:open="open" :title="current ? 'Change widget' : 'Add a widget'" icon="material-symbols:space-dashboard-outline-rounded" size="md">
    <SettingsGroup v-if="current" title="In this slot">
      <div class="option current">
        <span class="option-icon"><Icon :icon="current.definition.icon" /></span>
        <span class="option-text">
          <span class="option-name">{{ current.definition.name }}</span>
          <span class="option-desc">{{ current.definition.description }}</span>
        </span>
        <AppButton size="sm" variant="ghost" icon="material-symbols:delete-outline-rounded" label="Remove" @click="removeCurrent" />
      </div>
    </SettingsGroup>

    <SettingsGroup v-if="available.length" title="Add" description="Widgets that aren’t on your dashboard yet.">
      <button v-for="widget in available" :key="widget.type" class="option" @click="add(widget.type)">
        <span class="option-icon"><Icon :icon="widget.icon" /></span>
        <span class="option-text">
          <span class="option-name">{{ widget.name }}</span>
          <span class="option-desc">{{ widget.description }}</span>
        </span>
        <span class="option-action"><Icon icon="material-symbols:add-rounded" />Add</span>
      </button>
    </SettingsGroup>

    <SettingsGroup v-if="elsewhere.length" title="On your dashboard" description="Moving one here swaps it with this slot.">
      <button v-for="item in elsewhere" :key="item.instance.id" class="option" @click="move(item.instance.id)">
        <span class="option-icon"><Icon :icon="item.definition.icon" /></span>
        <span class="option-text">
          <span class="option-name">{{ item.title }}</span>
          <span class="option-desc">{{ item.definition.description }}</span>
        </span>
        <span class="option-action"><Icon icon="material-symbols:swap-horiz-rounded" />Move here</span>
      </button>
    </SettingsGroup>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import AppButton from '@/components/base/AppButton.vue';
import Icon from '@/components/base/AppIcon.vue';
import AppDialog from '@/components/base/AppDialog.vue';
import SettingsGroup from '@/components/settings/SettingsGroup.vue';
import { requestPermissions } from '@/composables/usePermissions';
import { useToast } from '@/composables/useToast';
import { useDashboardStore, type SlotRef } from '@/stores/dashboard';
import { WIDGETS, widgetDefinition } from '@/widgets';

const props = defineProps<{ target?: SlotRef }>();
const open = defineModel<boolean>('open', { required: true });
const dashboard = useDashboardStore();
const toast = useToast();

const withDefinition = <T extends { type: string }>(instance: T) => ({ instance, definition: widgetDefinition(instance.type)! });

// The layout can change under a mounted picker (a preset switch, an edit in another tab).
const target = computed(() => {
  const slot = props.target;
  return slot && dashboard.isSlot(slot) ? slot : undefined;
});

watch(target, (slot) => {
  if (open.value && props.target && !slot) open.value = false;
});

const current = computed(() => {
  const id = target.value && dashboard.layout.slots[target.value.column]![target.value.row];
  const instance = dashboard.find(id);
  return instance && widgetDefinition(instance.type) ? withDefinition(instance) : undefined;
});

const elsewhere = computed(() =>
  dashboard.placed.filter((i) => i.id !== current.value?.instance.id).map((i) => ({ ...withDefinition(i), title: i.title || widgetDefinition(i.type)!.name }))
);

const available = computed(() => {
  const placedTypes = new Set(dashboard.placed.map((i) => i.type));
  return WIDGETS.filter((w) => !placedTypes.has(w.type));
});

const add = async (type: string) => {
  if (!target.value) return;
  const instance = dashboard.assign(target.value, type);
  open.value = false;
  // The click is the user gesture permission prompts need; data consent is asked on the widget's card.
  const spec = widgetDefinition(type)?.permissions?.(instance.config);
  if (spec) await requestPermissions({ ...spec, consent: undefined }).catch(() => false);
};

const move = (id: string) => {
  const from = dashboard.locate(id);
  if (from && target.value) dashboard.swap(from, target.value);
  open.value = false;
};

const removeCurrent = () => {
  if (!target.value || !current.value) return;
  const { name } = current.value.definition;
  toast.add({ summary: `${name} removed`, action: { label: 'Undo', run: dashboard.clear(target.value) } });
  open.value = false;
};
</script>

<style scoped>
.option {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  width: 100%;
  padding: 0.75rem 1rem;
  text-align: left;
  transition: background var(--duration-fast);
}

.option + .option {
  border-top: 1px solid var(--border);
}

button.option:hover {
  background: var(--surface-hover);
}

.option-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--radius-lg);
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 1.15rem;
}

.current .option-icon {
  background: var(--accent);
  color: var(--accent-text);
}

.option-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  flex: 1;
  min-width: 0;
}

.option-name {
  font-size: var(--text-sm);
  font-weight: 600;
}

.option-desc {
  font-size: var(--text-xs);
  color: var(--text-muted);
  line-height: 1.45;
}

.option-action {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  flex-shrink: 0;
  padding: 0.3rem 0.6rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-muted);
  transition: all var(--duration-fast);
}

button.option:hover .option-action {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-text);
}
</style>
