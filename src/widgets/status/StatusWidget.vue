<template>
  <WidgetCard :resource="resource">
    <template #actions>
      <span v-if="resource.data" class="summary" :class="{ bad: degraded.length, unknown: !degraded.length && unverified.length }">{{ summary }}</span>
    </template>

    <EmptyState
      v-if="!statuses.length && !resource.pending"
      compact
      icon="material-symbols:monitor-heart-outline-rounded"
      title="No services selected"
      text="Watch the status pages of the tools you rely on."
    >
      <AppButton size="sm" label="Choose services" @click="openSettings" />
    </EmptyState>
    <ul class="services">
      <li v-for="service in statuses" :key="service.id" class="service" :class="[service.indicator, { unchecked: service.error }]">
        <ExternalLink :href="service.url" class="service-row" :title="service.error ? `Couldn’t check: ${service.error}` : undefined">
          <span class="dot" :title="service.description" />
          <span class="service-name">{{ service.name }}</span>
          <span class="service-desc">{{ describe(service) }}</span>
        </ExternalLink>
        <ul v-if="service.incidents.length" class="incidents">
          <li v-for="incident in service.incidents" :key="incident.url + incident.name">
            <ExternalLink :href="incident.url" class="incident">{{ incident.name }}</ExternalLink>
          </li>
        </ul>
      </li>
    </ul>
  </WidgetCard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppButton from '@/components/base/AppButton.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import ExternalLink from '@/components/base/ExternalLink.vue';
import WidgetCard from '@/components/dashboard/WidgetCard.vue';
import { plural } from '@/libs/text';
import { useWidget } from '@/widgets/context';
import type { ServiceStatus } from './services';
import { useStatus } from './useStatus';

const { resource, statuses, degraded, unverified } = useStatus();
const { openSettings } = useWidget();

const summary = computed(() => {
  if (degraded.value.length) return plural(degraded.value.length, 'issue');
  if (unverified.value.length) return `${unverified.value.length} unchecked`;
  return 'No active incidents';
});

const describe = (service: ServiceStatus) => {
  const state = service.description;
  if (!service.error) return state;
  return service.checkedAt ? `${state} · couldn’t check` : 'Couldn’t check';
};
</script>

<style scoped>
.summary {
  font-size: var(--text-xs);
  color: var(--success);
  font-weight: 600;
}

.summary.bad {
  color: var(--warning);
}

.summary.unknown {
  color: var(--text-muted);
}

.services {
  list-style: none;
}

.service-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.38rem 0.9rem;
  transition: background var(--duration-fast);
}

.service-row:hover {
  background: var(--surface-raised);
}

.dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success);
}

.minor .dot {
  background: var(--warning);
}

.major .dot,
.critical .dot {
  background: var(--danger);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--danger) 25%, transparent);
}

.maintenance .dot {
  background: var(--info);
}

.unchecked .dot {
  background: transparent;
  box-shadow: inset 0 0 0 1.5px var(--text-faint);
}

.service-name {
  font-size: var(--text-sm);
  font-weight: 500;
}

.service-desc {
  margin-left: auto;
  font-size: var(--text-xs);
  color: var(--text-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.service:not(.none) .service-desc {
  color: var(--text-muted);
}

.incidents {
  list-style: none;
  padding: 0 0.9rem 0.4rem 2.25rem;
}

.incident {
  display: block;
  font-size: var(--text-xs);
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.incident:hover {
  color: var(--accent);
}
</style>
