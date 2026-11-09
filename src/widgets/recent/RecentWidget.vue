<template>
  <WidgetCard>
    <template #actions>
      <SegmentedControl
        v-model="config.sort"
        size="sm"
        label="Sort"
        :options="[
          { value: 'recent', label: 'Recent' },
          { value: 'frequent', label: 'Frequent' },
        ]"
      />
    </template>

    <EmptyState
      v-if="loaded && !items.length"
      icon="material-symbols:history-rounded"
      title="Nothing yet"
      text="Visit a GitHub PR, Jira ticket, Google Doc or Figma file and it’ll show up here. Add your own sites in settings."
    />

    <template v-else>
      <ul class="tiles">
        <li v-for="item in items.slice(0, MAX_ITEMS)" :key="item.key">
          <ExternalLink :href="item.url" class="tile">
            <span class="tile-title item-title">
              <Icon :icon="iconFor(item.recipeId)" class="item-icon" />
              <span class="item-text">{{ item.title }}</span>
            </span>
            <span class="tile-meta">
              <span class="accent">{{ item.kind }}</span>
              <span v-if="item.project">{{ item.project }}</span>
              <span class="item-age tabular"><Icon icon="fa6-solid:clock" />{{ formatAge(item.lastVisit, now) }}</span>
            </span>
          </ExternalLink>
        </li>
      </ul>
    </template>
  </WidgetCard>
</template>

<script setup lang="ts">
import Icon from '@/components/base/AppIcon.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import ExternalLink from '@/components/base/ExternalLink.vue';
import SegmentedControl from '@/components/base/SegmentedControl.vue';
import WidgetCard from '@/components/dashboard/WidgetCard.vue';
import { useNow } from '@/composables/useNow';
import type { IconName } from '@/libs/icons';
import { formatAge } from '@/libs/time';
import { useWidgetConfig } from '@/widgets/context';
import type { RecentConfig } from './index';
import { RECIPES } from './recipes';
import { useWorkItems } from './useWorkItems';

const MAX_ITEMS = 60;
const ICONS = new Map(RECIPES.map((r) => [r.id, r.icon]));

const config = useWidgetConfig<RecentConfig>();
const { items, loaded } = useWorkItems(config);
const now = useNow();

const iconFor = (recipeId: string): IconName => ICONS.get(recipeId) ?? 'material-symbols:link-rounded';
</script>

<style scoped>
.item-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.item-icon {
  flex-shrink: 0;
  font-size: 1.1rem;
  color: var(--accent);
}

.item-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-age {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}
</style>
