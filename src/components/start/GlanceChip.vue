<template>
  <component :is="href ? ExternalLink : 'div'" :href="href" class="glance" :class="{ alert }">
    <Icon :icon="icon" class="glance-icon" />
    <span class="glance-label tabular">{{ label }}</span>
    <span v-if="detail" class="glance-detail">{{ detail }}</span>
  </component>
</template>

<script setup lang="ts">
import Icon from '@/components/base/AppIcon.vue';
import ExternalLink from '@/components/base/ExternalLink.vue';
import type { IconName } from '@/libs/icons';

defineProps<{ icon: IconName; label: string; detail?: string; href?: string; alert?: boolean }>();
</script>

<style scoped>
.glance {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  max-width: 22rem;
  padding: 0.45rem 0.9rem 0.45rem 0.75rem;
  border-radius: 999px;
  background: rgb(0 0 0 / 0.22);
  border: 1px solid rgb(255 255 255 / 0.12);
  backdrop-filter: blur(14px) saturate(1.3);
  color: #fff;
  font-size: var(--text-sm);
  text-shadow: 0 1px 4px rgb(0 0 0 / 0.3);
  transition: background var(--duration-fast);
}

a.glance:hover {
  background: rgb(0 0 0 / 0.36);
}

.glance-icon {
  flex-shrink: 0;
  font-size: 1rem;
  opacity: 0.9;
}

.glance-label {
  font-weight: 600;
  white-space: nowrap;
}

.glance-detail {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.8;
}

.alert {
  background: color-mix(in oklab, var(--danger) 35%, rgb(0 0 0 / 0.3));
  border-color: color-mix(in oklab, var(--danger) 60%, transparent);
}
</style>
