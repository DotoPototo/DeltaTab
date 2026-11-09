import { defineConfig } from 'wxt';
import Icons from 'unplugin-icons/vite';

// Feeds are added by the user, so site access is asked for one site at a time.
const OPTIONAL_ORIGINS = ['https://*/*'];

// Production keeps warnings and errors: they're the only trail when a wallpaper or feed fails for a user.
const DROP_ORDINARY_LOGS = { treeshake: { manualPureFunctions: ['console.log', 'console.info', 'console.debug'] } };

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  srcDir: 'src',
  // WXT resolves publicDir from the project root, not srcDir.
  publicDir: 'src/public',
  outDir: 'dist',
  webExt: {
    disabled: true,
  },
  vite: () => ({
    plugins: [Icons({ compiler: 'vue3', scale: 1 })],
    build: { rolldownOptions: DROP_ORDINARY_LOGS },
    worker: { rolldownOptions: DROP_ORDINARY_LOGS },
  }),
  manifest: ({ browser, manifestVersion }) => ({
    name: 'Delta Tab',
    description: 'A beautiful new tab: daily wallpapers, the time, and a dashboard of the widgets you choose.',
    action: { default_title: 'Open Delta Tab' },
    // AbortSignal.any needs Chrome 116.
    ...(browser === 'chrome' && { minimum_chrome_version: '116' }),
    permissions: ['storage', 'unlimitedStorage', 'alarms', ...(browser === 'chrome' ? ['favicon'] : [])],
    // MV2 (Firefox) has no optional_host_permissions.
    optional_permissions: ['history', 'topSites', ...(manifestVersion === 2 ? OPTIONAL_ORIGINS : [])],
    // Bing and Reddit block cross-origin reads; every other built-in source allows them.
    host_permissions: ['https://www.bing.com/', 'https://www.reddit.com/'],
    optional_host_permissions: OPTIONAL_ORIGINS,
    ...(browser === 'firefox' && {
      browser_specific_settings: {
        gecko: { data_collection_permissions: { required: ['none'], optional: ['locationInfo', 'searchTerms', 'authenticationInfo'] } },
      },
    }),
  }),
});
