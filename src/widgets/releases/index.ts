import { defineWidget, lazy } from '@/widgets/types';

export interface ReleasesConfig {
  repos: string[];
  showPrereleases: boolean;
}

export default defineWidget<ReleasesConfig>({
  type: 'releases',
  name: 'Release Radar',
  description: 'Latest versions of the GitHub projects you depend on, with fresh releases highlighted.',
  icon: 'material-symbols:rocket-launch-outline-rounded',
  defaults: () => ({ repos: ['vuejs/core', 'vitejs/vite', 'microsoft/TypeScript', 'oven-sh/bun', 'wxt-dev/wxt'], showPrereleases: false }),
  view: lazy(() => import('./ReleasesWidget.vue')),
  settings: lazy(() => import('./ReleasesSettings.vue')),
  glance: lazy(() => import('./ReleasesGlance.vue')),
});
