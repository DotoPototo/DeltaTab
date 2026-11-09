import { reactive, readonly } from 'vue';
import { useToast } from '@/composables/useToast';
import { storageOptions } from '@/libs/wallpaper/image';
import { POOL_SIZE, displayTarget, processInWorker } from '@/libs/wallpaper/imageWorker';
import { describeError, plural } from '@/libs/text';
import { addManyToLibrary, libraryItem, type NewWallpaper } from '@/libs/wallpaper/library';
import { useSettingsStore } from '@/stores/settings';

// Module-level state: closing Settings mid-import doesn't stop it, and reopening shows progress.

const MAX_MB = 60;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const BATCH_SIZE = 8;

const fileFingerprint = (file: File) => `${file.name}:${file.size}:${file.lastModified}`;

const state = reactive({ busy: false, total: 0, done: 0, cancelled: false });

const confirmLeave = (event: BeforeUnloadEvent) => event.preventDefault();

const importFiles = async (files: File[]) => {
  const toast = useToast();
  const settingsStore = useSettingsStore();

  const images = files.filter((f) => f.type.startsWith('image/'));
  const known = new Set((await libraryItem.getValue()).map((w) => w.fingerprint));
  const queue = images.filter((file) => {
    const fingerprint = fileFingerprint(file);
    if (known.has(fingerprint)) return false;
    known.add(fingerprint); // also dedupes within the selection
    return true;
  });
  const duplicates = images.length - queue.length;
  const notImages = files.length - images.length;

  if (!queue.length) {
    if (duplicates) toast.info('Already added', `${plural(duplicates, 'image')} ${duplicates === 1 ? 'is' : 'are'} already in your wallpapers.`);
    else if (notImages) toast.warn('No images found', 'Only image files can be used as wallpapers.');
    return;
  }

  Object.assign(state, { total: queue.length, done: 0, cancelled: false });
  window.addEventListener('beforeunload', confirmLeave);
  const { resolution, quality } = settingsStore.settings.wallpaper;
  const target = storageOptions(resolution, quality, displayTarget());
  const failures: string[] = [];
  const batch: (NewWallpaper & { name: string })[] = [];
  let added = 0;
  const fail = (name: string, error: unknown) => failures.push(`${name}: ${describeError(error)}`);

  // A failed write loses the whole batch, so every file in it is reported.
  const flush = async () => {
    const entries = batch.splice(0);
    try {
      added += (await addManyToLibrary(entries)).length;
    } catch (error) {
      for (const { name } of entries) fail(name, error);
    }
  };

  const lane = async () => {
    for (let file = queue.shift(); file && !state.cancelled; file = queue.shift()) {
      try {
        if (file.size > MAX_BYTES) throw new Error(`larger than ${MAX_MB} MB`);
        batch.push({ name: file.name, processed: await processInWorker(file, target), extra: { fingerprint: fileFingerprint(file) } });
        if (batch.length >= BATCH_SIZE) await flush();
      } catch (error) {
        fail(file.name, error);
      }
      state.done++;
    }
  };

  try {
    await Promise.all(Array.from({ length: POOL_SIZE }, lane));
    await flush();
  } finally {
    window.removeEventListener('beforeunload', confirmLeave);
  }

  if (added) {
    settingsStore.settings.wallpaper.source = 'library';
    toast.success(`Added ${plural(added, 'wallpaper')}`, state.cancelled ? 'Import stopped early.' : undefined);
  }
  const skipped = [duplicates && plural(duplicates, 'duplicate'), notImages && plural(notImages, 'non-image file')].filter(Boolean).join(' and ');
  if (skipped) toast.info(`Skipped ${skipped}`);
  if (failures.length) toast.error(`${plural(failures.length, 'image')} couldn’t be added`, failures.slice(0, 4).join('\n'));
};

export const useWallpaperUpload = () => ({
  state: readonly(state),
  upload: async (files: Iterable<File>) => {
    if (state.busy) return useToast().info('Still importing', 'Wait for the current import to finish, or cancel it.');
    // Claimed before any await, so a second drop can't start a parallel import.
    state.busy = true;
    try {
      await importFiles([...files]);
    } finally {
      state.busy = false;
    }
  },
  cancel: () => (state.cancelled = true),
});
