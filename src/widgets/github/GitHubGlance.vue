<template>
  <GlanceChip v-if="chip" icon="fa6-brands:github" :label="chip.label" :detail="chip.detail" :href="chip.href" :alert="chip.alert" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import GlanceChip from '@/components/start/GlanceChip.vue';
import { plural } from '@/libs/text';
import { useGitHub } from './useGitHub';

const { resource } = useGitHub();

const chip = computed(() => {
  const { data } = resource;
  if (!data) return undefined;
  const failing = data.mine.filter((pr) => pr.checks === 'FAILURE' || pr.checks === 'ERROR');
  if (failing.length) {
    return { label: 'CI failing', detail: failing.length === 1 ? failing[0]!.title : `${failing.length} of your PRs`, href: failing[0]!.url, alert: true };
  }
  if (data.reviewCount) {
    return {
      label: plural(data.reviewCount, 'review'),
      detail: 'waiting on you',
      href: 'https://github.com/pulls/review-requested',
      alert: false,
    };
  }
  return undefined;
});
</script>
