import { defineWidget, lazy } from '@/widgets/types';
import type { StatusService } from './services';

export interface StatusConfig {
  services: string[];
  custom: StatusService[];
}

export default defineWidget<StatusConfig>({
  type: 'status',
  name: 'Service Status',
  description: 'Live health of the services you depend on. Stays quiet until something breaks.',
  icon: 'material-symbols:monitor-heart-outline-rounded',
  defaults: () => ({ services: ['github', 'cloudflare', 'npm', 'vercel', 'anthropic', 'openai'], custom: [] }),
  view: lazy(() => import('./StatusWidget.vue')),
  settings: lazy(() => import('./StatusSettings.vue')),
  glance: lazy(() => import('./StatusGlance.vue')),
});
