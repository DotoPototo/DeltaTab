<template>
  <GlanceChip
    v-if="worst"
    icon="material-symbols:monitor-heart-outline-rounded"
    :label="degraded.length > 1 ? `${worst.name} +${degraded.length - 1}` : worst.name"
    :detail="worst.incidents[0]?.name ?? worst.description"
    :href="worst.incidents[0]?.url ?? worst.url"
    :alert="severity(worst.indicator) >= severity('major')"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import GlanceChip from '@/components/start/GlanceChip.vue';
import { severity } from './services';
import { useStatus } from './useStatus';

const { degraded } = useStatus();
const worst = computed(() => degraded.value[0]);
</script>
