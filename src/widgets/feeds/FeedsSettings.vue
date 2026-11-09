<template>
  <SettingsGroup title="Sources" description="Names are editable.">
    <EditableList :items="config.sources" :item-key="(s) => s.id" empty="No sources yet." @remove="config.sources.splice($event, 1)">
      <template #item="{ item }">
        <Icon :icon="KIND_ICONS[item.kind]" class="kind-icon" />
        <input v-model="item.label" class="input inline-input" aria-label="Source name" />
        <span class="faint source-value">{{ describe(item) }}</span>
      </template>
    </EditableList>
  </SettingsGroup>

  <SettingsGroup title="Add a source" :description="hint">
    <div class="settings-pad">
      <SegmentedControl v-model="kind" size="sm" :options="KIND_OPTIONS" label="Source type" />
      <form class="add-row" @submit.prevent="add">
        <select v-if="kind === 'hn'" v-model="value" class="input" aria-label="Hacker News list">
          <option v-for="list in HN_LISTS" :key="list.value" :value="list.value">{{ list.label }}</option>
        </select>
        <select v-else-if="kind === 'lobsters'" v-model="value" class="input" aria-label="Lobsters list">
          <option v-for="list in LOBSTERS_LISTS" :key="list.value" :value="list.value">{{ list.label }}</option>
        </select>
        <input
          v-else
          v-model="value"
          class="input"
          :placeholder="kind === 'reddit' ? 'rust+golang+webdev' : 'https://example.com/feed.xml'"
          :aria-label="kind === 'reddit' ? 'Subreddits' : 'Feed address'"
        />
        <AppButton type="submit" icon="material-symbols:add-rounded" label="Add" :loading="adding" :disabled="!value.trim()" />
      </form>
      <p v-if="addError" class="form-error">{{ addError }}</p>
    </div>
  </SettingsGroup>

  <SettingsGroup title="Hide stories mentioning" description="Whole words, case-insensitive.">
    <EditableList :items="config.filters" empty="No filters." @remove="config.filters.splice($event, 1)" @submit="addFilter">
      <template #item="{ item }">{{ item }}</template>
      <template #add>
        <input v-model="filter" class="input" placeholder="Add a word…" aria-label="Word to hide" />
        <AppButton type="submit" label="Add" :disabled="!filter.trim()" />
      </template>
    </EditableList>
  </SettingsGroup>

  <SettingsGroup title="Display">
    <SettingsRow title="Density">
      <SegmentedControl
        v-model="config.density"
        size="sm"
        label="Density"
        :options="[
          { value: 'comfortable', label: 'Comfortable' },
          { value: 'compact', label: 'Compact' },
        ]"
      />
    </SettingsRow>
    <SettingsRow title="Stories per source">
      <SegmentedControl v-model="config.limit" size="sm" label="Stories per source" :options="[20, 30, 50].map((n) => ({ value: n, label: String(n) }))" />
    </SettingsRow>
  </SettingsGroup>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import AppButton from '@/components/base/AppButton.vue';
import Icon from '@/components/base/AppIcon.vue';
import EditableList from '@/components/base/EditableList.vue';
import SegmentedControl from '@/components/base/SegmentedControl.vue';
import SettingsGroup from '@/components/settings/SettingsGroup.vue';
import SettingsRow from '@/components/settings/SettingsRow.vue';
import { originsFor, requestPermissions } from '@/composables/usePermissions';
import { errorMessage } from '@/libs/http';
import type { IconName } from '@/libs/icons';
import { useWidgetConfig } from '@/widgets/context';
import { HN_LISTS, LOBSTERS_LISTS, LOBSTERS_ORIGIN, source, sourceKey, type FeedKind, type FeedSource, type FeedsConfig } from './index';
import { feedTitle } from './sources';

const config = useWidgetConfig<FeedsConfig>();

const KIND_ICONS: Record<FeedKind, IconName> = {
  hn: 'fa6-brands:hacker-news',
  reddit: 'fa6-brands:reddit',
  lobsters: 'material-symbols:rss-feed-rounded',
  rss: 'material-symbols:rss-feed-rounded',
};

const KIND_OPTIONS: { value: FeedKind; label: string; icon: IconName }[] = [
  { value: 'hn', label: 'Hacker News', icon: KIND_ICONS.hn },
  { value: 'reddit', label: 'Reddit', icon: KIND_ICONS.reddit },
  { value: 'lobsters', label: 'Lobsters', icon: KIND_ICONS.lobsters },
  { value: 'rss', label: 'RSS / Atom', icon: KIND_ICONS.rss },
];

const DEFAULT_VALUE: Record<FeedKind, string> = { hn: 'front_page', reddit: '', lobsters: 'hottest', rss: '' };

const kind = ref<FeedKind>('reddit');
const value = ref('');
const adding = ref(false);
const addError = ref<string>();
const filter = ref('');

watch(kind, (k) => {
  value.value = DEFAULT_VALUE[k];
  addError.value = undefined;
});

const hint = computed(
  () =>
    ({
      hn: 'Stories via the Algolia HN API.',
      reddit: 'One or more subreddits joined with “+”.',
      lobsters: 'lobste.rs: a programming link community, like a smaller, invite-only Hacker News.',
      rss: 'Blogs, YouTube channels, GitHub releases (…/releases.atom), Mastodon (…/@user.rss) and more.',
    })[kind.value]
);

const describe = (s: FeedSource) => {
  if (s.kind === 'reddit') return `r/${s.value}`;
  if (s.kind === 'hn') return HN_LISTS.find((l) => l.value === s.value)?.label;
  if (s.kind === 'lobsters') return LOBSTERS_LISTS.find((l) => l.value === s.value)?.label;
  return s.value.replace(/^https?:\/\//, '');
};

const normaliseFeedUrl = (input: string) => {
  // feed:// and feed:https:// are rewritten as text: URL won't switch a non-special scheme to https.
  // A typed http:// address is tried over https (feeds are only read securely).
  const text = input.replace(/^feed:(\/\/)?/i, (_, slashes) => (slashes ? 'https://' : '')).replace(/^http:\/\//i, 'https://');
  return new URL(/^[a-z]+:\/\//i.test(text) ? text : `https://${text}`).toString();
};

const ALREADY_ADDED = 'That source is already in this widget';
const isAdded = (next: Pick<FeedSource, 'kind' | 'value'>) => config.value.sources.some((s) => sourceKey(s) === sourceKey(next));

const addSource = (next: FeedSource) => {
  if (isAdded(next)) throw new Error(ALREADY_ADDED);
  config.value.sources.push(next);
};

const add = async () => {
  addError.value = undefined;
  const raw = value.value.trim();
  try {
    adding.value = true;
    if (kind.value === 'rss') {
      const url = normaliseFeedUrl(raw);
      if (isAdded({ kind: 'rss', value: url })) throw new Error(ALREADY_ADDED);
      // Must be requested synchronously within the submit gesture, before any other await.
      if (!(await requestPermissions({ origins: originsFor([url]) }))) throw new Error('Access to that site was not granted');
      addSource(source('rss', url, await feedTitle(url)));
    } else if (kind.value === 'reddit') {
      const subs = raw
        .replace(/^\/?r\//i, '')
        .split(/[\s+,]+/)
        .filter(Boolean);
      addSource(source('reddit', subs.join('+'), subs.length === 1 ? `r/${subs[0]}` : 'Reddit'));
    } else {
      // Lobsters blocks cross-origin reads: ask for the site now, inside the submit gesture.
      if (kind.value === 'lobsters' && !(await requestPermissions({ origins: [LOBSTERS_ORIGIN] }))) throw new Error('Access to lobste.rs was not granted');
      const label = kind.value === 'hn' ? 'Hacker News' : 'Lobsters';
      const list = [...HN_LISTS, ...LOBSTERS_LISTS].find((l) => l.value === raw)?.label;
      addSource(source(kind.value, raw, list && list !== 'Front page' && list !== 'Hottest' ? `${label} · ${list}` : label));
    }
    value.value = DEFAULT_VALUE[kind.value];
  } catch (error) {
    addError.value = errorMessage(error);
  } finally {
    adding.value = false;
  }
};

const addFilter = () => {
  const word = filter.value.trim();
  if (word && !config.value.filters.includes(word)) config.value.filters.push(word);
  filter.value = '';
};
</script>

<style scoped>
.kind-icon {
  flex-shrink: 0;
  color: var(--text-muted);
}

.inline-input {
  max-width: 11rem;
  padding: 0.25rem 0.5rem;
}

.source-value {
  font-size: var(--text-xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.add-row {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.4rem;
}
</style>
