import { defineWidget, lazy } from '@/widgets/types';

export interface ClockZone {
  tz: string;
  label: string;
}

export type ClockStyle = 'cards' | 'analog' | 'list';

export interface ClocksConfig {
  zones: ClockZone[];
  // Cards and analogue need room: in a short slot both fall back to the list.
  style: ClockStyle;
}

export const zoneCity = (tz: string) => tz.slice(tz.lastIndexOf('/') + 1).replaceAll('_', ' ');

export default defineWidget<ClocksConfig>({
  type: 'clocks',
  name: 'World Clocks',
  description: 'Time across your team’s time zones, with day/night at a glance.',
  icon: 'material-symbols:public',
  defaults: () => ({
    zones: ['America/Los_Angeles', 'America/New_York', 'Europe/London', 'Asia/Tokyo'].map((tz) => ({ tz, label: zoneCity(tz) })),
    style: 'cards',
  }),
  view: lazy(() => import('./ClocksWidget.vue')),
  settings: lazy(() => import('./ClocksSettings.vue')),
});
