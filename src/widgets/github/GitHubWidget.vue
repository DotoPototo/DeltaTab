<template>
  <WidgetCard :title="login ? `@${login}` : 'GitHub'" :resource="token ? resource : undefined">
    <template #actions>
      <ExternalLink
        v-if="unread !== undefined"
        href="https://github.com/notifications"
        class="bell"
        :class="{ unread }"
        :aria-label="`GitHub notifications, ${unread ? `${unreadCount} unread` : 'none unread'}`"
      >
        <Icon icon="material-symbols:notifications-outline-rounded" />
        <span v-if="unread" class="tabular" aria-hidden="true">{{ unreadCount }}</span>
      </ExternalLink>
    </template>

    <div v-if="!token" class="setup">
      <EmptyState compact icon="fa6-brands:github" title="Connect GitHub" text="See PRs waiting on your review and the CI status of your own." />
      <TokenField />
    </div>

    <PullRequestLists v-else-if="summary" :summary="summary" :show-reviews="config.showReviews" :show-mine="config.showMine" />
  </WidgetCard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Icon from '@/components/base/AppIcon.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import ExternalLink from '@/components/base/ExternalLink.vue';
import WidgetCard from '@/components/dashboard/WidgetCard.vue';
import { useWidgetConfig } from '@/widgets/context';
import { NOTIFICATION_PAGE } from './api';
import type { GitHubConfig } from './index';
import PullRequestLists from './PullRequestLists.vue';
import TokenField from './TokenField.vue';
import { useGitHub } from './useGitHub';

const config = useWidgetConfig<GitHubConfig>();
const { token, resource } = useGitHub();
const summary = computed(() => resource.data);
const login = computed(() => summary.value?.login);
const unread = computed(() => summary.value?.notifications);
const unreadCount = computed(() => (unread.value !== undefined && unread.value >= NOTIFICATION_PAGE ? `${NOTIFICATION_PAGE}+` : unread.value));
</script>

<style scoped>
.setup {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0 0.9rem;
}

.bell {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.15rem 0.4rem;
  border-radius: 999px;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.bell.unread {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 700;
}
</style>
