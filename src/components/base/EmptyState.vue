<template>
  <div class="empty" :class="{ compact }">
    <Icon v-if="icon" :icon="icon" class="empty-icon" />
    <p class="empty-title">{{ title }}</p>
    <p v-if="text" class="empty-text">{{ text }}</p>
    <div v-if="$slots.default" class="empty-actions"><slot /></div>
  </div>
</template>

<script setup lang="ts">
import Icon from '@/components/base/AppIcon.vue';
import type { IconName } from '@/libs/icons';

defineProps<{ title: string; text?: string; icon?: IconName; compact?: boolean }>();
</script>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  height: 100%;
  min-height: 7rem;
  padding: 1rem;
  text-align: center;
}

.empty-icon {
  font-size: 1.8rem;
  color: var(--text-faint);
  margin-bottom: 0.2rem;
}

.empty-title {
  font-size: var(--text-sm);
  font-weight: 600;
}

.empty-text {
  max-width: 34ch;
  font-size: var(--text-xs);
  color: var(--text-muted);
  line-height: 1.5;
}

.empty-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.compact {
  min-height: 0;
  padding: 0.5rem;
}
</style>
