<template>
  <WidgetCard :title="location?.name ?? 'Weather'" :resource="location ? resource : undefined">
    <div v-if="!location" class="setup">
      <EmptyState compact icon="material-symbols:partly-cloudy-day-outline-rounded" title="Where are you?" text="Pick a city. No location permission needed." />
      <LocationSearch @select="config.location = $event" />
    </div>

    <div v-else-if="forecast" class="weather">
      <section class="now">
        <Icon :icon="weatherIcon(forecast.current.code, forecast.current.isDay)" class="now-icon" />
        <div class="now-temp tabular">{{ round(forecast.current.temp) }}°</div>
        <div class="now-info">
          <span class="now-label">{{ weatherLabel(forecast.current.code) }}</span>
          <span v-if="today" class="now-range tabular">H {{ round(today.max) }}° · L {{ round(today.min) }}°</span>
        </div>
      </section>

      <ul class="details">
        <li>
          <Icon icon="fa6-solid:temperature-half" /><span>Feels like</span><strong class="tabular">{{ round(forecast.current.feels) }}°</strong>
        </li>
        <li>
          <Icon icon="fa6-solid:wind" /><span>Wind</span><strong class="tabular">{{ round(forecast.current.wind) }} {{ forecast.units.wind }}</strong>
        </li>
        <li>
          <Icon icon="fa6-solid:droplet" /><span>Humidity</span><strong class="tabular">{{ forecast.current.humidity }}%</strong>
        </li>
        <li v-if="sunEvent">
          <Icon :icon="sunEvent.icon" /><span>{{ sunEvent.label }}</span
          ><strong class="tabular">{{ sunEvent.time }}</strong>
        </li>
      </ul>

      <section class="chart">
        <p v-if="rain" class="rain-alert"><Icon icon="fa6-solid:umbrella" />{{ rain }}</p>
        <HourlyChart :hours="forecast.hourly" :hour12="hour12" :time-zone="forecast.timezone" class="chart-body" />
      </section>

      <ol class="hours">
        <li v-for="hour in upcomingHours" :key="hour.time" class="hour">
          <span class="hour-time">{{ hourLabel(hour.time) }}</span>
          <Icon :icon="weatherIcon(hour.code, hour.isDay)" class="hour-icon" />
          <span class="tabular">{{ round(hour.temp) }}°</span>
          <span class="hour-rain tabular" :class="{ none: hour.precip < 20 }">{{ hour.precip }}%</span>
        </li>
      </ol>

      <ol class="daily">
        <li v-for="day in forecast.daily.slice(1, 6)" :key="day.time" class="day">
          <span class="day-name">{{ weekday(day.time) }}</span>
          <Icon :icon="weatherIcon(day.code)" class="day-icon" />
          <span class="day-temps tabular">
            <span>{{ round(day.max) }}°</span>
            <span class="day-min">{{ round(day.min) }}°</span>
          </span>
          <span v-if="day.precip >= 30" class="day-rain tabular"><Icon icon="fa6-solid:droplet" />{{ day.precip }}%</span>
        </li>
      </ol>
    </div>

    <EmptyState
      v-else-if="resource.hydrated && !resource.loading"
      compact
      icon="material-symbols:cloud-off-outline-rounded"
      title="No forecast yet"
      :text="resource.error"
    />
  </WidgetCard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import Icon from '@/components/base/AppIcon.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import WidgetCard from '@/components/dashboard/WidgetCard.vue';
import { useNow } from '@/composables/useNow';
import { dateFormat, formatTime } from '@/libs/time';
import { useSettingsStore } from '@/stores/settings';
import { nextRain, nextSunEvent } from './api';
import { weatherIcon, weatherLabel } from './codes';
import HourlyChart from './HourlyChart.vue';
import LocationSearch from './LocationSearch.vue';
import { useForecast } from './useForecast';

const { config, resource, location } = useForecast();
const { hour12 } = storeToRefs(useSettingsStore());
const now = useNow();

const forecast = computed(() => resource.data);
const today = computed(() => forecast.value?.daily[0]);
const round = (value: number) => Math.round(value);
// Everything is shown in the forecast city's time, which needn't be the browser's.
const timeZone = computed(() => forecast.value?.timezone);
const weekday = (time: number) => dateFormat({ weekday: 'short', timeZone: timeZone.value }).format(time);
const timeOf = (time: number) => formatTime(time, hour12.value, { timeZone: timeZone.value });

const sunEvent = computed(() => {
  const event = forecast.value && nextSunEvent(forecast.value.daily, now.value);
  if (!event) return undefined;
  const sunset = event.kind === 'sunset';
  return { icon: sunset ? ('fa6-solid:moon' as const) : ('fa6-solid:sun' as const), label: sunset ? 'Sunset' : 'Sunrise', time: timeOf(event.time) };
});

const upcomingHours = computed(() => (forecast.value?.hourly ?? []).filter((_, i) => i > 0 && i % 3 === 0).slice(0, 8));
const hourLabel = (time: number) => dateFormat({ hour: 'numeric', hour12: hour12.value, timeZone: timeZone.value }).format(time);

const rain = computed(() => {
  const hour = forecast.value && nextRain(forecast.value.hourly, now.value);
  if (!hour) return undefined;
  return hour.time <= now.value ? 'Rain likely now' : `Rain likely from ${timeOf(hour.time)}`;
});
</script>

<style scoped>
.setup {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.weather {
  container-type: size;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.85rem;
  height: 100%;
}

/* Only the chart gives way when the card is short. */
.weather > :not(.chart) {
  flex-shrink: 0;
}

.now {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.now-icon {
  flex-shrink: 0;
  font-size: 2.6rem;
  color: var(--accent);
}

.now-temp {
  font-size: 3rem;
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.02em;
}

.now-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.now-label {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
}

.details {
  display: grid;
  /* 4 in a row when they fit, else 2 × 2, else one per row: never an orphan (3 + 1). */
  grid-template-columns: minmax(0, 1fr);
  gap: 0.4rem;
  list-style: none;
}

@container (min-width: 250px) {
  .details {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@container (min-width: 400px) {
  .details {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.details li {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  column-gap: 0.5rem;
  align-items: center;
  padding: 0.45rem 0.6rem;
  border-radius: var(--radius);
  background: var(--surface-raised);
  border: 1px solid var(--border);
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.details :deep(svg) {
  grid-row: span 2;
  font-size: 0.95rem;
  color: var(--accent);
}

.details strong {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text);
}

.chart {
  display: none;
  flex: 0 1 240px;
  flex-direction: column;
  gap: 0.4rem;
  min-height: 0;
}

.hours {
  display: none;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 0.25rem;
  list-style: none;
}

.hour {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  padding: 0.5rem 0;
  font-size: var(--text-sm);
}

.hour-time {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.hour-icon {
  font-size: 1.1rem;
  color: var(--accent);
}

.hour-rain {
  font-size: var(--text-xs);
  color: var(--info);
}

.hour-rain.none {
  visibility: hidden;
}

.chart-body {
  flex: 1;
  min-height: 0;
}

.rain-alert {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: var(--text-xs);
  color: var(--info);
}

.daily {
  display: none;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.4rem;
  list-style: none;
}

.day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  padding: 0.55rem 0.25rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--surface-raised);
  font-size: var(--text-xs);
}

.day-name {
  font-weight: 600;
  color: var(--text-muted);
}

.day-icon {
  font-size: 1.15rem;
  color: var(--accent);
}

.day-temps {
  display: flex;
  gap: 0.35rem;
  font-size: var(--text-sm);
}

.day-min {
  color: var(--text-faint);
}

.day-rain {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  color: var(--info);
}

@container (max-height: 107px) or ((max-height: 159px) and (max-width: 399px)) {
  .details {
    display: none;
  }
}

/* Four details in one row leave the chart room in a shorter card than two rows do. */
@container (min-height: 250px) or ((min-height: 210px) and (min-width: 400px)) {
  .chart {
    display: flex;
  }
}

@container (min-height: 400px) {
  .daily {
    display: grid;
  }
}

@container (min-height: 560px) {
  .hours {
    display: grid;
  }
}
</style>
