import { defineWidget, lazy } from '@/widgets/types';

export const PROGRESS_SPANS = ['day', 'week', 'month', 'year'] as const;
export type ProgressSpan = (typeof PROGRESS_SPANS)[number];

export const GLANCE_DAYS = 7;

export interface Countdown {
  id: string;
  label: string;
  // YYYY-MM-DD in local time.
  date: string;
}

export interface CountdownConfig {
  progress: ProgressSpan[];
  events: Countdown[];
}

export default defineWidget<CountdownConfig>({
  type: 'countdown',
  name: 'Countdowns',
  description: 'Day, week and year progress bars plus countdowns to launches, holidays and deadlines.',
  icon: 'material-symbols:timer-outline-rounded',
  defaults: () => ({ progress: ['day', 'week', 'year'], events: [] }),
  view: lazy(() => import('./CountdownWidget.vue')),
  settings: lazy(() => import('./CountdownSettings.vue')),
  glance: lazy(() => import('./CountdownGlance.vue')),
});
