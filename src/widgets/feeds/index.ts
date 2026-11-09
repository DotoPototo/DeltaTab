import { originsFor } from '@/composables/usePermissions';
import { defineWidget, lazy } from '@/widgets/types';

export const LOBSTERS_ORIGIN = 'https://lobste.rs/*';

export type FeedKind = 'hn' | 'reddit' | 'lobsters' | 'rss';

export interface FeedSource {
  id: string;
  kind: FeedKind;
  /** HN list tag, "sub1+sub2", Lobsters list, or a feed URL. */
  value: string;
  label: string;
}

export interface FeedsConfig {
  sources: FeedSource[];
  filters: string[];
  limit: number;
  density: 'comfortable' | 'compact';
}

export const HN_LISTS = [
  { value: 'front_page', label: 'Front page' },
  { value: 'show_hn', label: 'Show HN' },
  { value: 'ask_hn', label: 'Ask HN' },
];

export const LOBSTERS_LISTS = [
  { value: 'hottest', label: 'Hottest' },
  { value: 'newest', label: 'Newest' },
];

// Keyed by content, not instance id, so a re-created identical source reuses its cached results.
export const sourceKey = ({ kind, value }: Pick<FeedSource, 'kind' | 'value'>) => `${kind}:${value}`;

export const source = (kind: FeedKind, value: string, label: string): FeedSource => ({ id: crypto.randomUUID(), kind, value, label });

export default defineWidget<FeedsConfig>({
  type: 'feeds',
  name: 'Feeds',
  description: 'Hacker News, Reddit and any RSS or Atom feed, merged into one list.',
  icon: 'material-symbols:rss-feed-rounded',
  defaults: () => ({
    sources: [source('hn', 'front_page', 'Hacker News'), source('reddit', 'programming+technology', 'Reddit')],
    filters: [],
    limit: 30,
    density: 'comfortable',
  }),
  view: lazy(() => import('./FeedsWidget.vue')),
  settings: lazy(() => import('./FeedsSettings.vue')),
  // HN allows cross-origin reads and Reddit is an install-time permission; other sites are asked for when added.
  permissions: (config) => ({
    origins: [
      ...originsFor(config.sources.filter((s) => s.kind === 'rss').map((s) => s.value)),
      ...(config.sources.some((s) => s.kind === 'lobsters') ? [LOBSTERS_ORIGIN] : []),
    ],
  }),
  permissionReason: 'Feeds reads your custom feeds (and Lobsters, if added) straight from their sites. Nothing is sent to them but the request.',
});
