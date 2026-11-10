<template>
  <AppDialog v-model:open="open" :title="definition ? `${definition.name} settings` : 'Settings'" :icon="definition?.icon">
    <template v-if="instance && definition">
      <SettingsGroup title="Card">
        <SettingsRow title="Title" description="Leave empty to use the default.">
          <input v-model="instance.title" class="input title-input" :placeholder="definition.name" :maxlength="MAX_TITLE" aria-label="Title" />
        </SettingsRow>
        <SettingsRow
          v-if="definition.glance"
          title="Show on the home screen"
          description="A compact summary under the clock, only when there’s something worth knowing."
        >
          <ToggleSwitch v-model="instance.glance" aria-label="Show on the home screen" />
        </SettingsRow>
      </SettingsGroup>
      <component :is="definition.settings.resolved ?? definition.settings" v-if="definition.settings" />
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, provide } from 'vue';
import AppDialog from '@/components/base/AppDialog.vue';
import ToggleSwitch from '@/components/base/ToggleSwitch.vue';
import SettingsGroup from '@/components/settings/SettingsGroup.vue';
import SettingsRow from '@/components/settings/SettingsRow.vue';
import { MAX_TITLE, useDashboardStore } from '@/stores/dashboard';
import { widgetDefinition } from '@/widgets';
import { WIDGET_CONTEXT } from '@/widgets/context';

const props = defineProps<{ instanceId?: string }>();
const open = defineModel<boolean>('open', { required: true });
const dashboard = useDashboardStore();

const instance = computed(() => (props.instanceId ? dashboard.find(props.instanceId) : undefined));
const definition = computed(() => (instance.value ? widgetDefinition(instance.value.type) : undefined));

provide(WIDGET_CONTEXT, {
  get instance() {
    return instance.value!;
  },
  get definition() {
    return definition.value!;
  },
  openSettings: () => {},
});
</script>

<style scoped>
.title-input {
  width: 14rem;
}
</style>
