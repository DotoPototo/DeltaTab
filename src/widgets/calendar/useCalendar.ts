import { computed, ref } from 'vue';
import { useNow } from '@/composables/useNow';
import { useResource } from '@/composables/useResource';
import { hasConsent } from '@/libs/dataConsent';
import { DAY } from '@/libs/time';
import { useWidgetConfig } from '@/widgets/context';
import { fetchHolidays, holidayYears, localeCountry, localeFirstDay, localeWeekend, type Holiday } from './holidays';
import type { CalendarConfig } from './index';

export const useCalendar = () => {
  const config = useWidgetConfig<CalendarConfig>();
  const now = useNow();

  const country = computed(() => (config.value.country === 'auto' ? localeCountry() : config.value.country));
  const firstDay = computed(() => (config.value.weekStart === 'auto' ? localeFirstDay() : config.value.weekStart));
  const weekend = computed(() => new Set(config.value.weekend === 'auto' ? localeWeekend() : config.value.weekend));
  const offset = ref(0);
  const viewed = computed(() => {
    const d = new Date(now.value);
    return new Date(d.getFullYear(), d.getMonth() + offset.value, 1);
  });
  const years = computed(() => holidayYears(new Date(now.value), viewed.value));

  const resource = useResource({
    key: () => (country.value && hasConsent('calendar') ? `holidays:${country.value}:${years.value.join(',')}` : null),
    fetcher: () => fetchHolidays(country.value, years.value),
    ttl: 7 * DAY,
  });

  const holidays = computed(() => {
    const byDate = new Map<string, Holiday[]>();
    for (const holiday of resource.data ?? []) byDate.set(holiday.date, [...(byDate.get(holiday.date) ?? []), holiday]);
    return byDate;
  });

  return { config, country, firstDay, weekend, holidays, resource, now, offset };
};
