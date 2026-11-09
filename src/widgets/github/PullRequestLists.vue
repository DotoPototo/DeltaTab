<template>
  <section v-if="showReviews">
    <h4 class="section-title">
      <ExternalLink href="https://github.com/pulls/review-requested">Needs your review</ExternalLink>
      <span class="count tabular">{{ summary.reviewCount }}</span>
    </h4>
    <p v-if="!summary.reviewRequests.length" class="none">Inbox zero. Nice.</p>
    <ul class="prs">
      <PullRequestRow v-for="pr in summary.reviewRequests" :key="pr.url" :pr="pr" show-author />
    </ul>
  </section>
  <section v-if="showMine">
    <h4 class="section-title">
      <ExternalLink href="https://github.com/pulls">Your pull requests</ExternalLink>
      <span class="count tabular" :title="summary.mineMore ? `Your ${PR_PAGE} most recently updated are shown` : undefined"
        >{{ summary.mine.length }}{{ summary.mineMore ? '+' : '' }}</span
      >
    </h4>
    <p v-if="!summary.mine.length" class="none">No open pull requests.</p>
    <ul class="prs">
      <PullRequestRow v-for="pr in summary.mine" :key="pr.url" :pr="pr" />
    </ul>
  </section>
</template>

<script setup lang="ts">
import ExternalLink from '@/components/base/ExternalLink.vue';
import { PR_PAGE, type GitHubSummary } from './api';
import PullRequestRow from './PullRequestRow.vue';

defineProps<{ summary: GitHubSummary; showReviews: boolean; showMine: boolean }>();
</script>

<style scoped>
.section-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.9rem 0.25rem;
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.section-title a:hover {
  color: var(--accent);
}

.count {
  padding: 0 0.4rem;
  border-radius: 999px;
  background: var(--surface-hover);
  font-size: 0.95em;
}

.none {
  padding: 0.2rem 0.9rem 0.4rem;
  font-size: var(--text-xs);
  color: var(--text-faint);
}

.prs {
  list-style: none;
}
</style>
