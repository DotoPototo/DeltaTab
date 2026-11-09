<template>
  <GlanceChip v-if="next" icon="material-symbols:timer-outline-rounded" :label="next.days === 0 ? 'Today' : `${next.days}d`" :detail="next.label" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import GlanceChip from '@/components/start/GlanceChip.vue';
import { useNow } from '@/composables/useNow';
import { useWidgetConfig } from '@/widgets/context';
import { GLANCE_DAYS, type CountdownConfig } from './index';
import { upcoming } from './progress';

const config = useWidgetConfig<CountdownConfig>();
const now = useNow();

const next = computed(() => upcoming(config.value.events, now.value).find((e) => e.days <= GLANCE_DAYS));
</script>
