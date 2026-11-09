import { defineWidget, lazy } from '@/widgets/types';

export interface CalendarConfig {
  /** Country for public holidays: 'auto' follows the browser's region, '' turns them off. */
  country: string;
  /** First day of the week (0 = Sunday), or 'auto' for the locale's convention. */
  weekStart: 'auto' | number;
  weekend: 'auto' | number[];
  weekNumbers: boolean;
}

export default defineWidget<CalendarConfig>({
  type: 'calendar',
  name: 'Calendar',
  description: 'A month at a glance with public holidays, your weekend days and optional week numbers.',
  icon: 'material-symbols:calendar-month-outline-rounded',
  defaults: () => ({ country: 'auto', weekStart: 'auto', weekend: 'auto', weekNumbers: false }),
  // Holidays need the country sent to Nager.Date; with holidays off, nothing leaves the device.
  permissions: (config) => (config.country ? { consent: 'calendar' } : {}),
  permissionReason:
    'Calendar sends your country to Nager.Date, a free public-holiday service, to mark holidays. Nothing else. To skip this, turn holidays off in its settings.',
  view: lazy(() => import('./CalendarWidget.vue')),
  settings: lazy(() => import('./CalendarSettings.vue')),
});
