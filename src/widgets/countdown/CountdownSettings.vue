<template>
  <SettingsGroup title="Progress bars">
    <SettingsRow v-for="span in SPANS" :key="span.value" :title="span.label">
      <ToggleSwitch :model-value="config.progress.includes(span.value)" :aria-label="span.label" @update:model-value="toggle(span.value)" />
    </SettingsRow>
  </SettingsGroup>

  <SettingsGroup title="Countdowns" description="Shown on the home screen in the final week.">
    <EditableList :items="config.events" :item-key="(e) => e.id" empty="No countdowns yet." @remove="config.events.splice($event, 1)" @submit="add">
      <template #item="{ item }">
        <input v-model="item.label" class="input inline-input" aria-label="Label" />
        <input v-model="item.date" type="date" class="input date-input" aria-label="Date" />
      </template>
      <template #add>
        <input v-model="label" class="input" placeholder="Launch day" aria-label="Countdown name" />
        <input v-model="date" type="date" class="input date-input" :min="today" aria-label="Countdown date" />
        <AppButton type="submit" icon="material-symbols:add-rounded" label="Add" :disabled="!label.trim() || !date" />
      </template>
    </EditableList>
  </SettingsGroup>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AppButton from '@/components/base/AppButton.vue';
import EditableList from '@/components/base/EditableList.vue';
import ToggleSwitch from '@/components/base/ToggleSwitch.vue';
import SettingsGroup from '@/components/settings/SettingsGroup.vue';
import SettingsRow from '@/components/settings/SettingsRow.vue';
import { useWidgetConfig } from '@/widgets/context';
import type { CountdownConfig, ProgressSpan } from './index';

const SPANS: { value: ProgressSpan; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

const config = useWidgetConfig<CountdownConfig>();
const label = ref('');
const date = ref('');
const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

const toggle = (span: ProgressSpan) => {
  const index = config.value.progress.indexOf(span);
  if (index >= 0) config.value.progress.splice(index, 1);
  else config.value.progress.push(span);
};

const add = () => {
  config.value.events.push({ id: crypto.randomUUID(), label: label.value.trim(), date: date.value });
  label.value = '';
  date.value = '';
};
</script>

<style scoped>
.inline-input {
  max-width: 12rem;
  padding: 0.3rem 0.5rem;
}

.date-input {
  max-width: 10rem;
  color-scheme: dark;
}
</style>
