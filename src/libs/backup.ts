import { browser } from 'wxt/browser';
import { flushAll, liveValue, replaceStored, type Replacement } from '@/libs/persist';

// Each section is repaired by its store when loaded, so here a backup only needs the right overall shape.

const BACKUP_KEYS = ['settings', 'dashboard', 'scratchpad'] as const;
const SECTION_NAMES: Record<(typeof BACKUP_KEYS)[number], string> = { settings: 'settings', dashboard: 'layout', scratchpad: 'notes' };
const FORMAT = 'delta-tab-backup';
const VERSION = 1;

export interface Backup {
  format: typeof FORMAT;
  version: number;
  exportedAt: string;
  data: Partial<Record<(typeof BACKUP_KEYS)[number], unknown>>;
}

// Unsaved edits included: a failing save mustn't leave them out of a backup.
export const createBackup = async (): Promise<Backup> => {
  await flushAll().catch(() => undefined);
  const stored = await browser.storage.local.get([...BACKUP_KEYS]);
  const data = Object.fromEntries(BACKUP_KEYS.map((key) => [key, liveValue(key) ?? stored[key]]).filter(([, value]) => value !== undefined));
  return { format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), data };
};

export const downloadBackup = async () => {
  const backup = await createBackup();
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: `delta-tab-${backup.exportedAt.slice(0, 10)}.json` });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const parseBackup = (text: string): Backup => {
  const parsed = JSON.parse(text) as Partial<Backup>;
  if (parsed?.format !== FORMAT || typeof parsed.data !== 'object' || !parsed.data) throw new Error('This isn’t a Delta Tab backup file');
  if ((parsed.version ?? 0) > VERSION) throw new Error('This backup is from a newer version of Delta Tab');
  for (const key of BACKUP_KEYS) {
    const section = (parsed.data as Record<string, unknown>)[key];
    if (section !== undefined && (typeof section !== 'object' || section === null || Array.isArray(section)))
      throw new Error(`The ${SECTION_NAMES[key]} in this backup are damaged`);
  }
  return { ...parsed, exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : '' } as Backup;
};

export const backupSections = (backup: Backup) => BACKUP_KEYS.filter((key) => backup.data[key] !== undefined).map((key) => SECTION_NAMES[key]);

export const restoreBackup = (backup: Backup): Promise<Replacement> =>
  replaceStored(Object.fromEntries(BACKUP_KEYS.filter((key) => backup.data[key] !== undefined).map((key) => [key, backup.data[key]])));

export const resetPreferences = (): Promise<Replacement> => replaceStored({ settings: undefined, dashboard: undefined });
