<template>
  <SettingsGroup title="Time">
    <SettingsRow title="Time format" :description="`Now showing ${example}`">
      <SegmentedControl
        v-model="settings.clock.format"
        size="sm"
        label="Time format"
        :options="[
          { value: 'auto', label: 'Auto' },
          { value: '12', label: '12h' },
          { value: '24', label: '24h' },
        ]"
      />
    </SettingsRow>
  </SettingsGroup>

  <SettingsGroup title="Units">
    <SettingsRow title="Temperature" :description="settings.units === 'auto' ? `Following your region: ${imperial ? 'Fahrenheit' : 'Celsius'}` : undefined">
      <SegmentedControl
        v-model="settings.units"
        size="sm"
        label="Temperature units"
        :options="[
          { value: 'auto', label: 'Auto' },
          { value: 'metric', label: '°C' },
          { value: 'imperial', label: '°F' },
        ]"
      />
    </SettingsRow>
  </SettingsGroup>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import SegmentedControl from '@/components/base/SegmentedControl.vue';
import SettingsGroup from '@/components/settings/SettingsGroup.vue';
import SettingsRow from '@/components/settings/SettingsRow.vue';
import { useNow } from '@/composables/useNow';
import { formatTime } from '@/libs/time';
import { useSettingsStore } from '@/stores/settings';

const { settings, hour12, imperial } = storeToRefs(useSettingsStore());
const now = useNow();
const example = computed(() => formatTime(now.value, hour12.value));
</script>
