<template>
  <GlanceChip
    v-if="newest"
    icon="material-symbols:rocket-launch-outline-rounded"
    :label="`${repoName(newest.repo)} ${displayTag(newest.repo, newest.tag)}`"
    :detail="`released ${formatRelative(newest.publishedAt, now)}`"
    :href="newest.url"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import GlanceChip from '@/components/start/GlanceChip.vue';
import { useNow } from '@/composables/useNow';
import { DAY, formatRelative } from '@/libs/time';
import { displayTag, repoName } from './api';
import { useReleases } from './useReleases';

const { rows } = useReleases();
const now = useNow();

const newest = computed(() => {
  const latest = rows.value[0]?.latest;
  return latest && now.value - latest.publishedAt < 2 * DAY ? latest : undefined;
});
</script>
