<template>
  <TransitionGroup v-if="glances.length" tag="div" name="glance" class="glances" appear>
    <WidgetGlance v-for="instance in glances" :key="instance.id" :instance="instance" />
  </TransitionGroup>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import WidgetGlance from '@/components/start/WidgetGlance.vue';
import { useDashboardStore } from '@/stores/dashboard';
import { widgetDefinition } from '@/widgets';

const { placed } = storeToRefs(useDashboardStore());
const glances = computed(() => placed.value.filter((w) => w.glance && widgetDefinition(w.type)?.glance));
</script>

<style scoped>
.glances {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.6rem;
  max-width: min(90vw, 1000px);
}

.glance-enter-active {
  transition:
    opacity var(--duration-slow) var(--ease-out),
    transform var(--duration-slow) var(--ease-out);
}

.glance-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
</style>
