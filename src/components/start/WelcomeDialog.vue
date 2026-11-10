<template>
  <AppDialog v-model:open="open" title="Welcome to Delta Tab" icon="material-symbols:waving-hand-outline-rounded" :dismissible="false">
    <SettingsGroup title="Dashboard">
      <SettingsRow title="Open and close" description="Or pull down the bar at the top.">
        <kbd>Ctrl</kbd>
        <kbd>Space</kbd>
      </SettingsRow>
      <SettingsRow title="New tabs open with">
        <SegmentedControl
          v-model="settings.openDashboard"
          size="sm"
          label="New tabs open with"
          :options="[
            { value: false, label: 'Home Screen' },
            { value: true, label: 'Dashboard' },
          ]"
        />
      </SettingsRow>
    </SettingsGroup>

    <SettingsGroup title="Background">
      <WallpaperSources v-model="settings.wallpaper.source" />
      <WallpaperDropzone v-if="settings.wallpaper.source === 'library'" class="welcome-dropzone" />
    </SettingsGroup>

    <SettingsGroup v-if="asking.length" title="Permissions">
      <template v-for="{ instance, definition } in asking" :key="instance.id">
        <WelcomePermission :instance="instance" :definition="definition" :allowed-label="instance.type === 'weather' ? place?.name : undefined" />
        <div v-if="instance.type === 'weather' && !place && hasConsent('weather')" class="place">
          <LocationSearch @select="setPlace" />
        </div>
      </template>
    </SettingsGroup>

    <template #footer>
      <span class="later">All optional. Change any of it later in Settings.</span>
      <AppButton variant="primary" label="Get started" autofocus @click="open = false" />
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import AppButton from '@/components/base/AppButton.vue';
import AppDialog from '@/components/base/AppDialog.vue';
import SegmentedControl from '@/components/base/SegmentedControl.vue';
import SettingsGroup from '@/components/settings/SettingsGroup.vue';
import SettingsRow from '@/components/settings/SettingsRow.vue';
import WallpaperDropzone from '@/components/settings/WallpaperDropzone.vue';
import WallpaperSources from '@/components/settings/WallpaperSources.vue';
import WelcomePermission from '@/components/start/WelcomePermission.vue';
import { asksAnything } from '@/composables/usePermissions';
import { hasConsent } from '@/libs/dataConsent';
import { welcomePending } from '@/libs/welcome';
import { useDashboardStore } from '@/stores/dashboard';
import { useSettingsStore } from '@/stores/settings';
import { widgetDefinition } from '@/widgets';
import type { WidgetInstance } from '@/widgets/types';
import type { WeatherConfig } from '@/widgets/weather';
import type { WeatherLocation } from '@/widgets/weather/api';
import LocationSearch from '@/widgets/weather/LocationSearch.vue';

const { settings } = storeToRefs(useSettingsStore());
const dashboard = useDashboardStore();
const asking = computed(() =>
  dashboard.placed.flatMap((instance) => {
    const definition = widgetDefinition(instance.type);
    return definition?.permissions && asksAnything(definition.permissions(instance.config)) ? [{ instance, definition }] : [];
  })
);
const weather = computed(() => dashboard.state.instances.find((i) => i.type === 'weather') as WidgetInstance<WeatherConfig> | undefined);
const place = computed(() => weather.value?.config.location);
const setPlace = (location: WeatherLocation) => {
  if (weather.value) weather.value.config.location = location;
};

const open = ref(true);
watch(open, (value) => value || welcomePending.removeValue());
</script>

<style scoped>
.later {
  margin-right: auto;
  align-self: center;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.place {
  padding: 0 1rem 0.8rem;
}

.place + :deep(.row) {
  border-top: 1px solid var(--border);
}

.welcome-dropzone {
  margin: 0 1rem 1rem;
}

kbd {
  padding: 0.05rem 0.4rem;
  border-radius: 4px;
  border: 1px solid var(--border-strong);
  border-bottom-width: 2px;
  font: inherit;
  font-size: var(--text-xs);
  color: var(--text);
}
</style>
