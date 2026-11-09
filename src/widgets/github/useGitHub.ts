import { computed } from 'vue';
import { hashKey, useResource } from '@/composables/useResource';
import { hasConsent } from '@/libs/dataConsent';
import { secrets } from '@/libs/secrets';
import { MINUTE } from '@/libs/time';
import { fetchSummary } from './api';

// The cache key is a hash, so the token itself is never stored twice.
export const useGitHub = () => {
  const token = computed(() => secrets.state.value.github.trim());
  const resource = useResource({
    key: () => (token.value && hasConsent('github') ? `github:${hashKey(token.value)}` : null),
    fetcher: () => fetchSummary(token.value, () => hasConsent('github')),
    ttl: 5 * MINUTE,
  });
  return { token, resource };
};
