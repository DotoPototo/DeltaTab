<template>
  <div class="row" :class="{ stacked }">
    <Icon v-if="icon" :icon="icon" class="row-icon" />
    <div class="row-text">
      <span class="row-title" :class="{ danger }">{{ title }}</span>
      <span v-if="description" class="row-description">{{ description }}</span>
    </div>
    <div class="row-control">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from '@/components/base/AppIcon.vue';
import type { IconName } from '@/libs/icons';

defineProps<{ title: string; description?: string; icon?: IconName; danger?: boolean; stacked?: boolean }>();
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem 0.9rem;
  min-height: 3.4rem;
  padding: 0.7rem 1rem;
}

.row + .row {
  border-top: 1px solid var(--border);
}

.row-icon {
  flex-shrink: 0;
  font-size: 1.05rem;
  color: var(--accent);
}

.row-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  flex: 1 1 14rem;
  min-width: 0;
}

.row-title {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text);
}

.row-title.danger {
  color: var(--danger);
}

.row-description {
  font-size: var(--text-xs);
  color: var(--text-muted);
  line-height: 1.45;
}

.row-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  max-width: 100%;
  margin-left: auto;
}

.stacked .row-control {
  flex-basis: 100%;
  flex-shrink: 1;
  margin-left: 0;
}

.stacked .row-icon + .row-text + .row-control {
  padding-left: calc(1.05rem + 0.9rem);
}
</style>
