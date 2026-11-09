import { computed } from 'vue';
import { hashKey, useResource } from '@/composables/useResource';
import { errorMessage, settleAll } from '@/libs/http';
import { MINUTE } from '@/libs/time';
import { useWidgetConfig } from '@/widgets/context';
import type { StatusConfig } from './index';
import { PRESETS, fetchStatus, pageKey, severity, type ServiceStatus } from './services';

export const useStatus = () => {
  const config = useWidgetConfig<StatusConfig>();
  const services = computed(() => [...PRESETS.filter((p) => config.value.services.includes(p.id)), ...config.value.custom]);

  const resource = useResource({
    key: () => (services.value.length ? `status:${hashKey(services.value.map((s) => s.url))}` : null),
    fetcher: async (previous): Promise<ServiceStatus[]> => {
      const results = await settleAll(services.value.map(fetchStatus));
      return results.map((r, i) => {
        if (r.status === 'fulfilled') return r.value;
        const service = services.value[i]!;
        const last = previous?.find((p) => pageKey(p.url) === pageKey(service.url));
        return { ...service, indicator: 'none', description: '', incidents: [], ...last, error: errorMessage(r.reason) };
      });
    },
    ttl: 3 * MINUTE,
  });

  // Joined onto today's config, as names and ids may have changed since caching.
  const statuses = computed(() => {
    const results = new Map((resource.data ?? []).map((s) => [pageKey(s.url), s]));
    return services.value
      .flatMap((service): ServiceStatus[] => {
        const result = results.get(pageKey(service.url));
        return result ? [{ ...result, ...service }] : [];
      })
      .sort((a, b) => severity(b.indicator) - severity(a.indicator) || a.name.localeCompare(b.name));
  });
  const degraded = computed(() => statuses.value.filter((s) => s.indicator !== 'none'));
  const unverified = computed(() => (resource.error ? statuses.value : statuses.value.filter((s) => s.error)));

  return { config, resource, statuses, degraded, unverified };
};
