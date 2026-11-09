import { persistent } from '@/libs/persist';

// Kept apart from settings and widget config so credentials are never exported.
export interface Secrets {
  github: string;
}

export const secrets = persistent<Secrets>('local:secrets', () => ({ github: '' }));
