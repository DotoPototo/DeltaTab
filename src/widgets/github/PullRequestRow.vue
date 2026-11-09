<template>
  <li class="pr" :class="{ draft: pr.draft }">
    <span class="pr-checks" :class="checkClass" :title="checkLabel" role="img" :aria-label="checkLabel" />
    <ExternalLink :href="pr.url" class="pr-body">
      <span class="pr-title">{{ pr.title }}</span>
      <span class="pr-meta">
        {{ pr.repo }}#{{ pr.number }}<template v-if="showAuthor && pr.author"> · {{ pr.author }}</template> · {{ formatAge(pr.updatedAt, now) }}
      </span>
    </ExternalLink>
    <span v-if="badge" class="pr-badge" :class="badge.tone">{{ badge.label }}</span>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ExternalLink from '@/components/base/ExternalLink.vue';
import { useNow } from '@/composables/useNow';
import { formatAge } from '@/libs/time';
import type { PullRequest } from './api';

const props = defineProps<{ pr: PullRequest; showAuthor?: boolean }>();
const now = useNow();

const checkClass = computed(() => {
  switch (props.pr.checks) {
    case 'SUCCESS':
      return 'ok';
    case 'FAILURE':
    case 'ERROR':
      return 'fail';
    case 'PENDING':
    case 'EXPECTED':
      return 'pending';
    default:
      return 'none';
  }
});

const checkLabel = computed(() => ({ ok: 'Checks passing', fail: 'Checks failing', pending: 'Checks running', none: 'No checks' })[checkClass.value]);

const badge = computed(() => {
  if (props.pr.draft) return { label: 'Draft', tone: 'muted' };
  if (props.pr.review === 'APPROVED') return { label: 'Approved', tone: 'good' };
  if (props.pr.review === 'CHANGES_REQUESTED') return { label: 'Changes', tone: 'bad' };
  return undefined;
});
</script>

<style scoped>
.pr {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0.9rem;
  transition: background var(--duration-fast);
}

.pr:hover {
  background: var(--surface-raised);
}

.pr.draft .pr-title {
  color: var(--text-muted);
}

.pr-checks {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--border-strong);
}

.pr-checks.ok {
  background: var(--success);
}

.pr-checks.fail {
  background: var(--danger);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--danger) 25%, transparent);
}

.pr-checks.pending {
  background: var(--warning);
  animation: pulse 1.6s ease-in-out infinite;
}

.pr-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.pr-title {
  font-size: var(--text-sm);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pr-body:hover .pr-title {
  color: var(--accent-strong);
}

.pr-meta {
  font-size: var(--text-xs);
  color: var(--text-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pr-badge {
  flex-shrink: 0;
  padding: 0.05rem 0.45rem;
  border-radius: 999px;
  font-size: var(--text-xs);
  font-weight: 600;
}

.pr-badge.good {
  background: color-mix(in oklab, var(--success) 18%, transparent);
  color: var(--success);
}

.pr-badge.bad {
  background: color-mix(in oklab, var(--danger) 18%, transparent);
  color: var(--danger);
}

.pr-badge.muted {
  background: var(--surface-hover);
  color: var(--text-muted);
}

@keyframes pulse {
  50% {
    opacity: 0.35;
  }
}
</style>
