<template>
  <component :is="definition.glance" v-if="definition?.glance && !failed" />
</template>

<script setup lang="ts">
import { computed, onErrorCaptured, provide, ref } from 'vue';
import { widgetDefinition } from '@/widgets';
import { WIDGET_CONTEXT } from '@/widgets/context';
import type { WidgetInstance } from '@/widgets/types';
import { useShell } from '@/composables/useShell';

const props = defineProps<{ instance: WidgetInstance }>();
const definition = computed(() => widgetDefinition(props.instance.type));
const { open } = useShell();

provide(WIDGET_CONTEXT, {
  get instance() {
    return props.instance;
  },
  get definition() {
    return definition.value!;
  },
  openSettings: () => (open.value = true),
});

const failed = ref(false);
onErrorCaptured((error) => {
  console.error(`[glance:${props.instance.type}]`, error);
  failed.value = true;
  return false;
});
</script>
