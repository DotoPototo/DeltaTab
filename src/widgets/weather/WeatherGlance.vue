<template>
  <GlanceChip
    v-if="forecast"
    :icon="weatherIcon(forecast.current.code, forecast.current.isDay)"
    :label="`${Math.round(forecast.current.temp)}°`"
    :detail="detail"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import GlanceChip from '@/components/start/GlanceChip.vue';
import { useNow } from '@/composables/useNow';
import { formatTime } from '@/libs/time';
import { useSettingsStore } from '@/stores/settings';
import { nextRain } from './api';
import { isPrecipitating, weatherIcon, weatherLabel } from './codes';
import { useForecast } from './useForecast';

const { resource, location } = useForecast();
const { hour12 } = storeToRefs(useSettingsStore());
const now = useNow();

const forecast = computed(() => resource.data);

const detail = computed(() => {
  const data = forecast.value;
  if (!data) return '';
  if (isPrecipitating(data.current.code)) return weatherLabel(data.current.code);
  const rain = nextRain(data.hourly, now.value, 6);
  if (rain) return rain.time <= now.value ? 'Rain likely soon' : `Rain likely ~${formatTime(rain.time, hour12.value, { timeZone: data.timezone })}`;
  const [today] = data.daily;
  return today ? `${weatherLabel(data.current.code)} · H ${Math.round(today.max)}°` : (location.value?.name ?? '');
});
</script>
