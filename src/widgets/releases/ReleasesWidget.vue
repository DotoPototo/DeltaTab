<template>
  <WidgetCard :resource="resource">
    <EmptyState
      v-if="!config.repos.length"
      compact
      icon="material-symbols:rocket-launch-outline-rounded"
      title="No repositories"
      text="Add the projects you depend on."
    >
      <AppButton size="sm" label="Add repositories" @click="openSettings" />
    </EmptyState>
    <ul class="releases">
      <li v-for="row in rows" :key="row.repo">
        <component
          :is="row.shown ? ExternalLink : 'div'"
          :href="row.shown?.url"
          class="release"
          :class="{ fresh: row.shown && now - row.shown.publishedAt < FRESH, unchecked: row.shown && row.error }"
          :title="row.shown && row.error ? `Couldn’t check for newer releases: ${row.error}` : undefined"
        >
          <SiteIcon :url="ownerUrl(row.repo)" :size="18" />
          <span class="release-repo">{{ repoName(row.repo) }}</span>
          <span v-if="row.latest" class="release-tag tabular">{{ displayTag(row.repo, row.latest.tag) }}</span>
          <span v-if="row.pre" class="release-pre tabular" :title="`Prerelease ${row.pre.tag}`">{{ displayTag(row.repo, row.pre.tag) }}</span>
          <span v-if="row.shown" class="release-age tabular">{{ formatAge(row.shown.publishedAt, now) }}</span>
          <span v-else class="release-age">{{ row.error ?? 'No releases' }}</span>
        </component>
      </li>
    </ul>
  </WidgetCard>
</template>

<script setup lang="ts">
import AppButton from '@/components/base/AppButton.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import ExternalLink from '@/components/base/ExternalLink.vue';
import SiteIcon from '@/components/base/SiteIcon.vue';
import WidgetCard from '@/components/dashboard/WidgetCard.vue';
import { useNow } from '@/composables/useNow';
import { formatAge } from '@/libs/time';
import { useWidget } from '@/widgets/context';
import { displayTag, ownerUrl, repoName } from './api';
import { FRESH, useReleases } from './useReleases';

const { config, resource, rows } = useReleases();
const { openSettings } = useWidget();
const now = useNow();
</script>

<style scoped>
.releases {
  list-style: none;
}

.release {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.4rem 0.9rem;
  transition: background var(--duration-fast);
}

a.release:hover {
  background: var(--surface-raised);
}

.release-repo {
  flex: 1;
  min-width: 0;
  font-size: var(--text-sm);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.release-tag,
.release-pre {
  flex-shrink: 0;
  padding: 0.05rem 0.45rem;
  border-radius: 999px;
  background: var(--surface-hover);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.release-pre {
  background: transparent;
  border: 1px dashed var(--border-strong);
  color: var(--text-muted);
}

.fresh .release-tag {
  background: var(--accent);
  color: var(--accent-text);
  font-weight: 700;
}

.release-age {
  flex-shrink: 0;
  min-width: 2rem;
  text-align: right;
  font-size: var(--text-xs);
  color: var(--text-faint);
}

.unchecked .release-age {
  text-decoration: underline dotted;
}
</style>
