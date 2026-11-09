import { browser } from 'wxt/browser';
import { storage } from 'wxt/utils/storage';
import { pruneCache } from '@/composables/useResource';
import { refreshStaleAccentsOnce } from '@/libs/accent/refresh';
import { refreshDaily } from '@/libs/wallpaper/daily';
import { migrateLegacyWallpapers } from '@/libs/migrations/wallpapers';
import { SETTINGS_KEY, readSettings, settingsFrom } from '@/libs/settings';
import { DAY } from '@/libs/time';
import { welcomePending } from '@/libs/welcome';
import { REFRESH_ACCENTS_MESSAGE, stripPlaceholders, sweepOrphans } from '@/libs/wallpaper/library';

const REFRESH_ALARM = 'daily-wallpaper';
const REFRESH_PERIOD_MINUTES = 3 * 60;

const refreshActive = async () => {
  const { source } = (await readSettings()).wallpaper;
  if (source === 'library') return;
  try {
    await refreshDaily(source);
  } catch (error) {
    console.warn(`[wallpaper] ${source} refresh failed:`, error);
  }
};

const refreshAccents = (first?: string) => refreshStaleAccentsOnce(first).catch((error) => console.warn('[accent] Refresh failed:', error));

const maintenance = async () => {
  await migrateLegacyWallpapers().catch((error) => console.error('[migrate] Wallpaper migration failed:', error));
  await Promise.allSettled([sweepOrphans(), pruneCache(7 * DAY), stripPlaceholders(), refreshStaleAccentsOnce()]);
  await refreshActive();
};

// Listeners register synchronously so a woken service worker sees the event that woke it.
export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') welcomePending.setValue(true);
    maintenance();
  });
  browser.runtime.onStartup.addListener(maintenance);

  // An extension update can stale accents while the browser stays open; cheap when nothing is stale.
  refreshAccents();
  browser.runtime.onMessage.addListener((message: { type?: string; first?: string }) => {
    if (message?.type === REFRESH_ACCENTS_MESSAGE) refreshAccents(message.first);
  });

  // The worker wakes on every storage write; re-creating the alarm would keep pushing it back.
  browser.alarms.get(REFRESH_ALARM).then((alarm) => {
    if (!alarm) browser.alarms.create(REFRESH_ALARM, { periodInMinutes: REFRESH_PERIOD_MINUTES, delayInMinutes: 1 });
  });
  browser.alarms.onAlarm.addListener(({ name }) => {
    if (name !== REFRESH_ALARM) return;
    refreshActive();
    refreshAccents();
  });

  storage.watch(SETTINGS_KEY, (next, previous) => {
    if (settingsFrom(next).wallpaper.source !== settingsFrom(previous).wallpaper.source) refreshActive();
  });

  (browser.action ?? browser.browserAction).onClicked.addListener(() => browser.tabs.create({}));
});
