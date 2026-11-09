<template>
  <SettingsGroup title="Clock">
    <SettingsRow title="Show the clock">
      <ToggleSwitch v-model="settings.start.clock" aria-label="Show the clock" />
    </SettingsRow>
    <template v-if="settings.start.clock">
      <SettingsRow title="Size">
        <SegmentedControl
          v-model="settings.start.clockSize"
          size="sm"
          label="Clock size"
          :options="[
            { value: 'sm', label: 'Small' },
            { value: 'md', label: 'Medium' },
            { value: 'lg', label: 'Large' },
          ]"
        />
      </SettingsRow>
      <SettingsRow title="Show seconds">
        <ToggleSwitch v-model="settings.clock.seconds" aria-label="Show seconds" />
      </SettingsRow>
      <SettingsRow title="Show the date">
        <ToggleSwitch v-model="settings.start.date" aria-label="Show the date" />
      </SettingsRow>
    </template>
  </SettingsGroup>

  <SettingsGroup title="Extras">
    <SettingsRow title="Widget summaries" description="Weather, status incidents and fresh releases under the clock. Choose which in each widget’s settings.">
      <ToggleSwitch v-model="settings.start.glances" aria-label="Widget summaries" />
    </SettingsRow>
    <SettingsRow title="Image credit" description="Title and photographer of daily images, bottom-left.">
      <ToggleSwitch v-model="settings.start.credit" aria-label="Image credit" />
    </SettingsRow>
  </SettingsGroup>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import SegmentedControl from '@/components/base/SegmentedControl.vue';
import ToggleSwitch from '@/components/base/ToggleSwitch.vue';
import SettingsGroup from '@/components/settings/SettingsGroup.vue';
import SettingsRow from '@/components/settings/SettingsRow.vue';
import { useSettingsStore } from '@/stores/settings';

const { settings } = storeToRefs(useSettingsStore());
</script>
