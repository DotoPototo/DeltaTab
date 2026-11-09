import { defineWidget, lazy } from '@/widgets/types';
import type { CustomRecipe } from './recipes';

export interface RecentConfig {
  disabled: string[];
  custom: CustomRecipe[];
  days: number;
  sort: 'recent' | 'frequent';
}

export default defineWidget<RecentConfig>({
  type: 'recent',
  name: 'Recent Work',
  description: 'PRs, issues, tickets, docs and designs from your history, grouped by project. Runs entirely on-device.',
  icon: 'material-symbols:history-rounded',
  defaults: () => ({ disabled: [], custom: [], days: 14, sort: 'recent' }),
  view: lazy(() => import('./RecentWidget.vue')),
  settings: lazy(() => import('./RecentSettings.vue')),
  permissions: () => ({ permissions: ['history'] }),
  permissionReason: 'Reads your recent history on this device to find what you were working on. Nothing is sent anywhere.',
});
