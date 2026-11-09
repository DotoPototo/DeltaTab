<template>
  <SettingsGroup title="Public holidays" description="Holidays are marked on the calendar; hover a date for its name.">
    <SettingsRow title="Country">
      <select v-model="config.country" class="input select" aria-label="Country">
        <option value="auto">Automatic{{ detected ? ` (${detected})` : '' }}</option>
        <option value="">None</option>
        <option v-for="country in countries" :key="country.code" :value="country.code">{{ country.name }}</option>
      </select>
    </SettingsRow>
    <SettingsRow v-if="countriesResource.error && !countries.length" title="Couldn’t load the list of countries" :description="countriesResource.error">
      <AppButton size="sm" label="Retry" @click="countriesResource.refresh()" />
    </SettingsRow>
  </SettingsGroup>

  <SettingsGroup title="Week">
    <SettingsRow title="Starts on">
      <SegmentedControl
        v-model="config.weekStart"
        size="sm"
        label="Week starts on"
        :options="[{ value: 'auto', label: 'Auto' }, ...[1, 0, 6].map((d) => ({ value: d, label: weekdayName(d) }))]"
      />
    </SettingsRow>
    <SettingsRow title="Weekend days" :description="config.weekend === 'auto' ? 'Following your region.' : undefined" stacked>
      <div class="days" role="group" aria-label="Weekend days">
        <button v-for="day in WEEK" :key="day" class="day" :class="{ active: weekend.has(day) }" :aria-pressed="weekend.has(day)" @click="toggleWeekend(day)">
          {{ weekdayName(day) }}
        </button>
        <AppButton v-if="config.weekend !== 'auto'" size="sm" variant="ghost" label="Reset" @click="config.weekend = 'auto'" />
      </div>
    </SettingsRow>
    <SettingsRow title="Week numbers" description="ISO 8601 numbering.">
      <ToggleSwitch v-model="config.weekNumbers" aria-label="Week numbers" />
    </SettingsRow>
  </SettingsGroup>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppButton from '@/components/base/AppButton.vue';
import SegmentedControl from '@/components/base/SegmentedControl.vue';
import ToggleSwitch from '@/components/base/ToggleSwitch.vue';
import SettingsGroup from '@/components/settings/SettingsGroup.vue';
import SettingsRow from '@/components/settings/SettingsRow.vue';
import { useResource } from '@/composables/useResource';
import { DAY } from '@/libs/time';
import { fetchCountries, localeCountry, localeWeekend, weekdayName } from './holidays';
import { useCalendar } from './useCalendar';

const WEEK = [1, 2, 3, 4, 5, 6, 0];

const { config, weekend } = useCalendar();
const countriesResource = useResource({ key: 'holiday-countries', fetcher: fetchCountries, ttl: 30 * DAY });
const countries = computed(() => countriesResource.data ?? []);
const detected = computed(() => countries.value.find((c) => c.code === localeCountry())?.name);

const toggleWeekend = (day: number) => {
  const days = new Set(config.value.weekend === 'auto' ? localeWeekend() : config.value.weekend);
  if (days.has(day)) days.delete(day);
  else days.add(day);
  config.value.weekend = [...days].sort();
};
</script>

<style scoped>
.select {
  width: auto;
  min-width: 12rem;
}

.days {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.day {
  min-width: 2.9rem;
  padding: 0.35rem 0.5rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  font-size: var(--text-xs);
  color: var(--text-muted);
  transition: all var(--duration-fast);
}

.day:hover {
  border-color: var(--accent);
}

.day.active {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-text);
  font-weight: 600;
}
</style>
