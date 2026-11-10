<template>
  <SettingsGroup title="New tabs">
    <SettingsRow title="Open the dashboard straight away" description="Skip the home screen and land on your widgets.">
      <ToggleSwitch v-model="settings.openDashboard" aria-label="Open the dashboard straight away" />
    </SettingsRow>
    <SettingsRow title="Open links in a new tab" description="When off, links replace this page, the same as Chrome’s own new tab.">
      <ToggleSwitch v-model="settings.openLinksInNewTab" aria-label="Open links in a new tab" />
    </SettingsRow>
  </SettingsGroup>

  <SettingsGroup title="Keyboard shortcuts">
    <SettingsRow title="Open or close the dashboard"> <kbd>Ctrl</kbd><kbd>Space</kbd> </SettingsRow>
    <SettingsRow title="Close the dashboard or a window">
      <kbd>Esc</kbd>
    </SettingsRow>
  </SettingsGroup>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import ToggleSwitch from '@/components/base/ToggleSwitch.vue';
import SettingsGroup from '@/components/settings/SettingsGroup.vue';
import SettingsRow from '@/components/settings/SettingsRow.vue';
import { useSettingsStore } from '@/stores/settings';

const { settings } = storeToRefs(useSettingsStore());
</script>

<style scoped>
kbd {
  min-width: 1.6rem;
  padding: 0.15rem 0.45rem;
  border-radius: var(--radius-xs);
  border: 1px solid var(--border-strong);
  border-bottom-width: 2px;
  background: var(--surface-solid);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-align: center;
}
</style>
