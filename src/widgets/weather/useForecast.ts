import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { hashKey, useResource } from '@/composables/useResource';
import { hasConsent } from '@/libs/dataConsent';
import { MINUTE } from '@/libs/time';
import { useSettingsStore } from '@/stores/settings';
import { useWidgetConfig } from '@/widgets/context';
import { fetchForecast } from './api';
import type { WeatherConfig } from './index';

export const useForecast = () => {
  const config = useWidgetConfig<WeatherConfig>();
  const { imperial } = storeToRefs(useSettingsStore());
  const resource = useResource({
    // No location leaves the device without consent (the start-screen glance included).
    key: () =>
      config.value.location && hasConsent('weather')
        ? `weather:${hashKey([config.value.location.latitude, config.value.location.longitude, imperial.value])}`
        : null,
    fetcher: () => fetchForecast(config.value.location!, imperial.value),
    ttl: 20 * MINUTE,
  });
  return { config, resource, location: computed(() => config.value.location) };
};
