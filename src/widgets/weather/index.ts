import { defineWidget, lazy } from '@/widgets/types';
import type { WeatherLocation } from './api';

export interface WeatherConfig {
  location: WeatherLocation | null;
}

export default defineWidget<WeatherConfig>({
  type: 'weather',
  name: 'Weather',
  description: 'Current conditions, the next 24 hours of temperature and rain, and the week ahead.',
  icon: 'material-symbols:partly-cloudy-day-outline-rounded',
  defaults: () => ({ location: null }),
  permissions: () => ({ consent: 'weather' }),
  permissionReason:
    'Weather sends the place you choose (and what you type when searching for it) to Open-Meteo, a free weather service, to get its forecast. Nothing else.',
  view: lazy(() => import('./WeatherWidget.vue')),
  settings: lazy(() => import('./WeatherSettings.vue')),
  glance: lazy(() => import('./WeatherGlance.vue')),
});
