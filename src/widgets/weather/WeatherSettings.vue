<template>
  <SettingsGroup title="Location" description="Units follow Settings → Time & Units.">
    <SettingsRow v-if="config.location" icon="material-symbols:location-on-outline-rounded" :title="config.location.name" :description="coordinates" />
    <div class="settings-pad">
      <LocationSearch @select="config.location = $event" />
    </div>
  </SettingsGroup>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import SettingsGroup from '@/components/settings/SettingsGroup.vue';
import SettingsRow from '@/components/settings/SettingsRow.vue';
import { useWidgetConfig } from '@/widgets/context';
import type { WeatherConfig } from './index';
import LocationSearch from './LocationSearch.vue';

const config = useWidgetConfig<WeatherConfig>();
const coordinates = computed(() =>
  config.value.location ? `${config.value.location.latitude.toFixed(2)}, ${config.value.location.longitude.toFixed(2)}` : undefined
);
</script>
