import { escapeRegExp } from '@/libs/text';
import type { FeedItem } from './sources';

const TRACKING_PARAMS = /^(utm_|ref$|ref_src$|fbclid$|gclid$)/;

export const normaliseUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    // Snapshot the keys: deleting while iterating the live iterator skips entries.
    for (const key of Array.from(parsed.searchParams.keys())) if (TRACKING_PARAMS.test(key)) parsed.searchParams.delete(key);
    parsed.hash = '';
    // Only the host is case-insensitive: paths and queries ("/items/A", "?id=Xy") are not. The port
    // stays (parsed.host keeps a non-default one); the scheme goes, as http/https are the same story.
    const host = parsed.host.replace(/^(www|m|old)\./, '');
    return `${host}${parsed.pathname.replace(/\/+$/, '')}${parsed.search}`;
  } catch {
    return url;
  }
};

// Lookarounds rather than \b, so terms like "c++" and ".net" still match as words.
export const filterMatcher = (words: string[]): RegExp | null => {
  const terms = words.map((w) => w.trim()).filter(Boolean);
  return terms.length ? new RegExp(`(?<![\\p{L}\\p{N}])(${terms.map(escapeRegExp).join('|')})(?![\\p{L}\\p{N}])`, 'iu') : null;
};

// Round-robin by rank, so each source's top stories surface first however it scores them.
export const mergeFeeds = (lists: FeedItem[][], filters: string[] = []): FeedItem[] => {
  const matcher = filterMatcher(filters);
  const seen = new Set<string>();
  const merged: FeedItem[] = [];
  const longest = Math.max(0, ...lists.map((l) => l.length));
  for (let rank = 0; rank < longest; rank++) {
    for (const list of lists) {
      const item = list[rank];
      if (!item || matcher?.test(item.title)) continue;
      const key = normaliseUrl(item.url);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }
  return merged;
};
