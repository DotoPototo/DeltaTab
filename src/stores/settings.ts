import { computed } from 'vue';
import { defineStore } from 'pinia';
import { persistent } from '@/libs/persist';
import { SETTINGS_KEY, defaultSettings, sanitiseSettings, type Settings } from '@/libs/settings';
import { uses12Hour } from '@/libs/time';

const IMPERIAL_REGIONS = new Set(['US', 'LR', 'MM', 'BS', 'BZ', 'KY', 'PW']);

export const useSettingsStore = defineStore('settings', () => {
  const { state: settings, ready } = persistent<Settings>(SETTINGS_KEY, defaultSettings, { sanitise: sanitiseSettings });

  const hour12 = computed(() => uses12Hour(settings.value.clock.format));
  const imperial = computed(() => {
    if (settings.value.units !== 'auto') return settings.value.units === 'imperial';
    const { region } = new Intl.Locale(navigator.language).maximize();
    return !!region && IMPERIAL_REGIONS.has(region);
  });

  return { settings, ready, hour12, imperial };
});
