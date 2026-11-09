<template>
  <WallpaperLayer />
  <StartScreen v-show="!previewingLook" />
  <DashboardView v-show="!previewingLook" />
  <WallpaperLookPanel v-if="previewingLook" />
  <SettingsDialog v-if="settingsLoaded" />
  <ConfirmDialog />
  <AppToast />
  <WelcomeDialog v-if="welcome" />
</template>

<script setup lang="ts">
import { defineAsyncComponent, ref, watch } from 'vue';
import { useEventListener } from '@/composables/useEventListener';
import { openModals } from '@/composables/useModals';
import AppToast from '@/components/base/AppToast.vue';
import ConfirmDialog from '@/components/base/ConfirmDialog.vue';
import DashboardView from '@/components/dashboard/DashboardView.vue';
import StartScreen from '@/components/start/StartScreen.vue';
import WallpaperLayer from '@/components/wallpaper/WallpaperLayer.vue';
import { useAppearance } from '@/composables/useAppearance';
import { useShell } from '@/composables/useShell';
import { welcomePending } from '@/libs/welcome';
import { useDashboardStore } from '@/stores/dashboard';
import { useSettingsStore } from '@/stores/settings';

useAppearance();
const dashboard = useDashboardStore();
const { open, toggle, settingsOpen, previewingLook } = useShell();

// Lazy routes keep Settings, the look panel and Welcome out of the bundle each new tab parses.
const SettingsDialog = defineAsyncComponent(() => import('@/components/settings/SettingsDialog.vue'));
const settingsLoaded = ref(false);
watch(settingsOpen, (value) => value && (settingsLoaded.value = true), { immediate: true });

const WallpaperLookPanel = defineAsyncComponent(() => import('@/components/wallpaper/WallpaperLookPanel.vue'));

const WelcomeDialog = defineAsyncComponent(() => import('@/components/start/WelcomeDialog.vue'));
const welcome = ref(false);
welcomePending.getValue().then((pending) => (welcome.value = pending));

if (useSettingsStore().settings.openDashboard) open.value = true;

useEventListener(document, 'keydown', (event: KeyboardEvent) => {
  if (previewingLook.value) return;
  if (event.ctrlKey && event.code === 'Space') {
    event.preventDefault();
    toggle();
  } else if (event.key === 'Escape' && open.value && !openModals.value.length) {
    if (dashboard.editing) dashboard.cancelEdit();
    else toggle();
  }
});
</script>
