<template>
  <AppDialog v-model:open="open" title="Welcome to Delta Tab" icon="material-symbols:waving-hand-outline-rounded">
    <p class="intro">
      A calm start screen, with your dashboard one keystroke away. Press <kbd>Ctrl</kbd> <kbd>Space</kbd> or pull down the bar at the top. A few choices to get
      going; everything here can be changed later in Settings.
    </p>

    <SettingsGroup title="Background">
      <WallpaperSources v-model="settings.wallpaper.source" />
      <WallpaperDropzone v-if="settings.wallpaper.source === 'library'" class="welcome-dropzone" />
    </SettingsGroup>

    <SettingsGroup v-if="weather" title="Weather" description="Pick your city for the forecast. No location permission needed.">
      <SettingsRow v-if="weather.config.location" icon="material-symbols:location-on-outline-rounded" :title="weather.config.location.name" />
      <div class="settings-pad">
        <LocationSearch @select="weather.config.location = $event" />
      </div>
    </SettingsGroup>

    <SettingsGroup title="New tabs">
      <SettingsRow title="Open with">
        <SegmentedControl
          v-model="settings.openDashboard"
          size="sm"
          label="Open new tabs with"
          :options="[
            { value: false, label: 'Start Screen' },
            { value: true, label: 'Dashboard' },
          ]"
        />
      </SettingsRow>
    </SettingsGroup>

    <template #footer>
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
import { welcomePending } from '@/libs/welcome';
import { useDashboardStore } from '@/stores/dashboard';
import { useSettingsStore } from '@/stores/settings';
import type { WidgetInstance } from '@/widgets/types';
import type { WeatherConfig } from '@/widgets/weather';
import LocationSearch from '@/widgets/weather/LocationSearch.vue';

const { settings } = storeToRefs(useSettingsStore());
const dashboard = useDashboardStore();
const weather = computed(() => dashboard.state.instances.find((i) => i.type === 'weather') as WidgetInstance<WeatherConfig> | undefined);

const open = ref(true);
watch(open, (value) => value || welcomePending.removeValue());
</script>

<style scoped>
.intro {
  margin-bottom: 1.5rem;
  font-size: var(--text-sm);
  color: var(--text-muted);
  line-height: 1.6;
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
