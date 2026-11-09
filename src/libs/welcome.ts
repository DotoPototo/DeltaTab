import { storage } from 'wxt/utils/storage';

// Set on a fresh install, never on update.
export const welcomePending = storage.defineItem<boolean>('local:welcome', { fallback: false });
