<template>
  <WidgetCard :resource="resource">
    <template #actions>
      <SegmentedControl v-if="config.sources.length > 1" v-model="tab" size="sm" label="Feed source" :options="tabs" />
    </template>

    <p v-if="partialErrors" class="feed-warning">
      <Icon icon="material-symbols:warning-outline-rounded" />
      {{ partialErrors }}
    </p>

    <EmptyState
      v-if="!config.sources.length"
      icon="material-symbols:rss-feed-rounded"
      title="No sources yet"
      text="Add Hacker News, subreddits or any RSS feed."
    >
      <AppButton size="sm" label="Add sources" @click="openSettings" />
    </EmptyState>
    <EmptyState
      v-else-if="!items.length && resource.hydrated && !resource.loading"
      compact
      icon="material-symbols:inbox-outline-rounded"
      title="Nothing to show"
      :text="resource.error ? undefined : 'All caught up.'"
    />

    <ol v-else class="tiles" :class="{ compact: config.density === 'compact' }">
      <li v-for="item in items" :key="item.id" class="tile feed-item" :class="{ read: readIds.has(item.id) }">
        <ExternalLink :href="item.url" class="tile-title feed-title" @click="markRead(item.id)" @auxclick="markRead(item.id)">
          <span v-if="fresh.has(item.id)" class="feed-new" title="New since you last looked" />{{ item.title }}
        </ExternalLink>
        <div class="tile-meta">
          <span v-if="tab === ALL" class="feed-source" :style="{ '--source': sourceColour(item.source) }">{{ item.tag ?? sourceLabel(item.source) }}</span>
          <span v-else-if="item.tag" class="accent">{{ item.tag }}</span>
          <span class="feed-domain">{{ hostname(item.url) }}</span>
          <span v-if="item.score !== undefined" class="feed-stat feed-score tabular"><Icon icon="fa6-solid:arrow-up" />{{ formatCompact(item.score) }}</span>
          <ExternalLink
            v-if="item.discussionUrl && item.comments !== undefined"
            :href="item.discussionUrl"
            class="feed-stat feed-comments tabular"
            @click="markRead(item.id)"
          >
            <Icon icon="fa6-solid:comment" />{{ formatCompact(item.comments) }}
          </ExternalLink>
          <span v-if="item.time" class="feed-stat feed-time tabular"><Icon icon="fa6-solid:clock" />{{ formatAge(item.time, now) }}</span>
        </div>
      </li>
    </ol>
  </WidgetCard>
</template>

<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import AppButton from '@/components/base/AppButton.vue';
import Icon from '@/components/base/AppIcon.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import ExternalLink from '@/components/base/ExternalLink.vue';
import SegmentedControl from '@/components/base/SegmentedControl.vue';
import WidgetCard from '@/components/dashboard/WidgetCard.vue';
import { useNow } from '@/composables/useNow';
import { hashKey, useResource } from '@/composables/useResource';
import { errorMessage, settleAll } from '@/libs/http';
import { hostname } from '@/libs/text';
import { MINUTE, formatAge, formatCompact } from '@/libs/time';
import { useWidget, useWidgetConfig } from '@/widgets/context';
import { sourceKey, type FeedKind, type FeedsConfig } from './index';
import { mergeFeeds } from './merge';
import { markRead, markSeen, readIds, readStateReady, seenIds } from './readState';
import { fetchSource, type FeedItem } from './sources';

interface FeedData {
  lists: Record<string, FeedItem[]>;
  errors: Record<string, string>;
}

const ALL = '__all__';
const MARK_SEEN_DELAY = 3000;
const KIND_COLOURS: Record<FeedKind, string> = { hn: '#ff6600', reddit: 'var(--accent)', lobsters: '#c0392b', rss: 'var(--accent)' };

const config = useWidgetConfig<FeedsConfig>();
const { openSettings } = useWidget();
const now = useNow();
const tab = ref(ALL);

const fetchAll = async (previous: FeedData | undefined): Promise<FeedData> => {
  const { sources, limit } = config.value;
  const results = await settleAll(sources.map((source) => fetchSource(source, limit)));
  const data: FeedData = { lists: {}, errors: {} };
  results.forEach((result, i) => {
    const key = sourceKey(sources[i]!);
    if (result.status === 'fulfilled') data.lists[key] = result.value;
    else {
      data.lists[key] = previous?.lists[key] ?? [];
      data.errors[key] = errorMessage(result.reason);
    }
  });
  return data;
};

const resource = useResource<FeedData>({
  key: () => (config.value.sources.length ? `feeds:v2:${hashKey([config.value.sources.map(({ kind, value }) => [kind, value]), config.value.limit])}` : null),
  fetcher: fetchAll,
  ttl: 15 * MINUTE,
});

const sourceByKey = computed(() => new Map(config.value.sources.map((s) => [sourceKey(s), s])));
const sourceLabel = (id: string) => sourceByKey.value.get(id)?.label ?? '';
const sourceColour = (id: string) => KIND_COLOURS[sourceByKey.value.get(id)?.kind ?? 'rss'];

const tabs = computed(() => [{ value: ALL, label: 'All' }, ...config.value.sources.map((s) => ({ value: sourceKey(s), label: s.label }))]);
watch(tabs, (options) => {
  if (!options.some((o) => o.value === tab.value)) tab.value = ALL;
});

const items = computed(() => {
  const lists = resource.data?.lists ?? {};
  const selected = tab.value === ALL ? config.value.sources : config.value.sources.filter((s) => sourceKey(s) === tab.value);
  return mergeFeeds(
    selected.map((s) => lists[sourceKey(s)] ?? []),
    config.value.filters
  );
});

const partialErrors = computed(() =>
  Object.entries(resource.data?.errors ?? {})
    .filter(([id]) => sourceByKey.value.has(id))
    .map(([id, message]) => `${sourceLabel(id)}: ${message}`)
    .join(' · ')
);

const fresh = ref(new Set<string>());
let seenTimer: ReturnType<typeof setTimeout> | undefined;
watch(
  items,
  async (list) => {
    await readStateReady;
    const unseen = list.filter((item) => !seenIds.value.has(item.id)).map((item) => item.id);
    if (!unseen.length) return;
    // A first-ever load would mark everything new, which is noise rather than signal.
    if (seenIds.value.size) fresh.value = new Set([...fresh.value, ...unseen]);
    clearTimeout(seenTimer);
    seenTimer = setTimeout(() => markSeen(unseen), MARK_SEEN_DELAY);
  },
  { immediate: true }
);
onScopeDispose(() => clearTimeout(seenTimer));
</script>

<style scoped>
.compact {
  gap: 0;
}

.compact .feed-item {
  padding: 0.45rem 0.25rem;
  border: none;
  border-radius: 0;
  background: none;
}

.compact .feed-item + .feed-item {
  border-top: 1px solid var(--border);
}

.compact .feed-item:hover {
  background: var(--surface-raised);
}

.compact .feed-title {
  font-size: 0.82rem;
}

.compact :deep(.tile-meta) {
  margin-top: 0.2rem;
}

.feed-title {
  display: block;
}

.feed-title:hover {
  color: var(--accent-strong);
}

.read .feed-title {
  color: var(--text-faint);
}

.feed-new {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin: 0 0.45rem 0.12rem 0;
  border-radius: 50%;
  background: var(--accent);
  vertical-align: middle;
}

.feed-source {
  color: color-mix(in oklab, var(--source) 75%, var(--text));
  font-weight: 600;
}

.feed-domain {
  max-width: 14rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.feed-stat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.feed-score {
  color: #c25933;
}

.feed-comments:hover {
  color: var(--accent);
}

.feed-time {
  margin-left: auto;
}

.feed-warning {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.5rem;
  font-size: var(--text-xs);
  color: var(--warning);
}
</style>
