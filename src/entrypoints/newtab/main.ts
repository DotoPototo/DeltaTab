import { createApp } from 'vue';
import { createPinia } from 'pinia';
import VueTippy from 'vue-tippy';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/animations/shift-away-subtle.css';
import '@/styles/theme.css';
import '@/styles/base.css';
import '@/styles/tippy.css';
import { applyBoot } from '@/libs/boot';
import { migrateLegacyState } from '@/libs/migrations/state';
import { allReady } from '@/libs/persist';
import { useDashboardStore } from '@/stores/dashboard';
import { useSettingsStore } from '@/stores/settings';
import { useWallpaperStore } from '@/stores/wallpaper';
import App from './App.vue';
import StorageError from './StorageError.vue';

// Synchronous, so theme, accent and wallpaper colours paint before anything async runs.
applyBoot();

const app = createApp(App);
app.use(createPinia());
app.use(VueTippy, {
  directive: 'tippy',
  defaultProps: { theme: 'deltatab', animation: 'shift-away-subtle', delay: [350, 0], duration: [180, 120] },
});

// Mounting after state is read (a few ms) avoids a re-layout flash.
await migrateLegacyState().catch((error) => console.error('[migrate] Legacy settings import failed:', error));
useSettingsStore();
useDashboardStore();
const readable = await allReady().then(
  () => true,
  (error) => {
    console.error('[boot] Stored state could not be read:', error);
    return false;
  }
);
if (readable) {
  app.mount('#app');
  useWallpaperStore().init();
} else createApp(StorageError).mount('#app');
