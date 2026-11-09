export const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const describeError = (error: unknown) => (error instanceof Error ? error.message : String(error));

export const joinList = (items: string[]) => new Intl.ListFormat('en', { type: 'conjunction' }).format(items);

export const plural = (count: number, word: string, pluralWord = `${word}s`) => `${count} ${count === 1 ? word : pluralWord}`;

export const hostname = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

export const siteName = (url: string) => {
  const [name = url] = hostname(url).split('.');
  return name.charAt(0).toUpperCase() + name.slice(1);
};

export const formatBytes = (bytes: number) => (bytes < 1024 ** 2 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`);
