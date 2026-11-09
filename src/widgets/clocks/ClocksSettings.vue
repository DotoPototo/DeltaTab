<template>
  <SettingsGroup title="Look" description="Cards and analogue need room: in a short slot they show as a list.">
    <SettingsRow title="Style">
      <SegmentedControl
        v-model="config.style"
        size="sm"
        label="Clock style"
        :options="[
          { value: 'cards', label: 'Cards' },
          { value: 'analog', label: 'Analogue' },
          { value: 'list', label: 'List' },
        ]"
      />
    </SettingsRow>
  </SettingsGroup>

  <SettingsGroup title="Time zones" description="Search by city or region, e.g. “Berlin” or “Asia/Kolkata”. Labels are editable.">
    <EditableList :items="config.zones" :item-key="(z) => z.tz" empty="No time zones yet." @remove="config.zones.splice($event, 1)" @submit="add">
      <template #item="{ item }">
        <input v-model="item.label" class="input inline-input" aria-label="Label" />
        <span class="faint tz">{{ item.tz }}</span>
      </template>
      <template #add>
        <input v-model="query" class="input" list="tz-options" placeholder="Add a time zone…" aria-label="Time zone" />
        <datalist id="tz-options">
          <option v-for="tz in TIME_ZONES" :key="tz" :value="tz" />
        </datalist>
        <AppButton type="submit" icon="material-symbols:add-rounded" label="Add" :disabled="!match" />
      </template>
    </EditableList>
  </SettingsGroup>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import AppButton from '@/components/base/AppButton.vue';
import EditableList from '@/components/base/EditableList.vue';
import SegmentedControl from '@/components/base/SegmentedControl.vue';
import SettingsGroup from '@/components/settings/SettingsGroup.vue';
import SettingsRow from '@/components/settings/SettingsRow.vue';
import { useWidgetConfig } from '@/widgets/context';
import { zoneCity, type ClocksConfig } from './index';

const config = useWidgetConfig<ClocksConfig>();

const TIME_ZONES = Intl.supportedValuesOf('timeZone');
const query = ref('');

const match = computed(() => {
  const q = query.value.trim().toLowerCase().replaceAll(' ', '_');
  if (!q) return undefined;
  return TIME_ZONES.find((tz) => tz.toLowerCase() === q) ?? TIME_ZONES.find((tz) => tz.toLowerCase().endsWith(`/${q}`));
});

const add = () => {
  const tz = match.value;
  if (!tz || config.value.zones.some((z) => z.tz === tz)) return;
  config.value.zones.push({ tz, label: zoneCity(tz) });
  query.value = '';
};
</script>

<style scoped>
.inline-input {
  max-width: 12rem;
  padding: 0.25rem 0.5rem;
}

.tz {
  font-size: var(--text-xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
