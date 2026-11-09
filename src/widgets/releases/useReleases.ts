import { computed } from 'vue';
import { hashKey, useResource } from '@/composables/useResource';
import { hasConsent } from '@/libs/dataConsent';
import { errorMessage, settleAll } from '@/libs/http';
import { secrets } from '@/libs/secrets';
import { HOUR } from '@/libs/time';
import { useWidgetConfig } from '@/widgets/context';
import { fetchReleases, type Release } from './api';
import type { ReleasesConfig } from './index';

interface RepoReleases {
  repo: string;
  releases: Release[];
  error?: string;
}

export const FRESH = 3 * 24 * HOUR;

export const useReleases = () => {
  const config = useWidgetConfig<ReleasesConfig>();
  // The token is sent only once agreed to (via the GitHub widget); public repos work without it.
  const token = computed(() => (hasConsent('github') ? secrets.state.value.github.trim() : ''));

  const resource = useResource({
    // A different token can see different (private) repos, so it gets its own, hashed, cache key.
    key: () =>
      config.value.repos.length ? `releases:${hashKey([config.value.repos, config.value.showPrereleases, token.value && hashKey(token.value)])}` : null,
    fetcher: async (previous): Promise<RepoReleases[]> => {
      const results = await settleAll(config.value.repos.map((repo) => fetchReleases(repo, token.value, config.value.showPrereleases)));
      return results.map((result, i) => {
        const repo = config.value.repos[i]!;
        if (result.status === 'fulfilled') return { repo, releases: result.value };
        const last = previous?.find((p) => p.repo === repo);
        return { repo, releases: last?.releases ?? [], error: errorMessage(result.reason) };
      });
    },
    // One request per repo an hour: unauthenticated GitHub allows 60 an hour.
    ttl: HOUR,
  });

  // `shown` is the stable release, or the prerelease for a repo that has only those.
  const rows = computed(() =>
    (resource.data ?? [])
      .map(({ repo, releases, error }) => {
        const latest = releases.find((r) => !r.prerelease);
        const pre = releases.find((r) => r.prerelease);
        return { repo, error, latest, pre, shown: latest ?? pre };
      })
      .sort((a, b) => (b.shown?.publishedAt ?? 0) - (a.shown?.publishedAt ?? 0))
  );

  return { config, resource, rows };
};
