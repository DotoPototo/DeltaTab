import { defineWidget, lazy } from '@/widgets/types';

export interface GitHubConfig {
  showReviews: boolean;
  showMine: boolean;
}

export default defineWidget<GitHubConfig>({
  type: 'github',
  name: 'GitHub',
  description: 'Pull requests waiting on your review, your open PRs with CI status, and unread notifications.',
  icon: 'fa6-brands:github',
  defaults: () => ({ showReviews: true, showMine: true }),
  permissions: () => ({ consent: 'github' }),
  permissionReason:
    'GitHub sends your access token to GitHub, and only GitHub, to read your pull requests and notifications. Release Radar uses it too, for private repos.',
  view: lazy(() => import('./GitHubWidget.vue')),
  settings: lazy(() => import('./GitHubSettings.vue')),
  glance: lazy(() => import('./GitHubGlance.vue')),
});
