import { describe, test, expect } from 'bun:test';
import { filterMatcher, mergeFeeds, normaliseUrl } from '@/widgets/feeds/merge';
import type { FeedItem } from '@/widgets/feeds/sources';

const item = (id: string, url: string, title = id): FeedItem => ({ id, source: id[0]!, title, url });

describe('normaliseUrl', () => {
  test('keeps case-sensitive paths and queries, and ports, apart', () => {
    expect(normaliseUrl('https://ex.com/items/A')).not.toBe(normaliseUrl('https://ex.com/items/a'));
    expect(normaliseUrl('https://ex.com/?id=Xy')).not.toBe(normaliseUrl('https://ex.com/?id=xy'));
    expect(normaliseUrl('https://ex.com:8443/a')).not.toBe(normaliseUrl('https://ex.com/a'));
    expect(normaliseUrl('https://WWW.EX.com/a')).toBe(normaliseUrl('https://ex.com/a'));
  });

  test('ignores scheme, www, trailing slash, hash and tracking params', () => {
    expect(normaliseUrl('https://www.Example.com/a/?utm_source=x&id=2#top')).toBe(normaliseUrl('http://example.com/a?id=2'));
  });

  test('keeps meaningful query params', () => {
    expect(normaliseUrl('https://example.com/?id=1')).not.toBe(normaliseUrl('https://example.com/?id=2'));
  });
});

describe('filterMatcher', () => {
  test('matches whole words case-insensitively', () => {
    const m = filterMatcher(['crypto', 'Go'])!;
    expect(m.test('New Crypto exchange')).toBe(true);
    expect(m.test('go is everywhere')).toBe(true);
    expect(m.test('Good tips')).toBe(false);
  });

  test('escapes regex characters and ignores blanks', () => {
    expect(filterMatcher(['c++', ' '])!.test('Learning C++ today')).toBe(true);
    expect(filterMatcher(['go'])!.test('Google')).toBe(false);
    expect(filterMatcher(['', '  '])).toBeNull();
  });
});

describe('mergeFeeds', () => {
  test('interleaves sources by rank', () => {
    const merged = mergeFeeds([[item('a1', 'https://a/1'), item('a2', 'https://a/2'), item('a3', 'https://a/3')], [item('b1', 'https://b/1')]]);
    expect(merged.map((i) => i.id)).toEqual(['a1', 'b1', 'a2', 'a3']);
  });

  test('drops cross-source duplicates and filtered titles', () => {
    const merged = mergeFeeds(
      [[item('a1', 'https://example.com/story'), item('a2', 'https://a/2', 'Election news')], [item('b1', 'https://www.example.com/story/')]],
      ['election']
    );
    expect(merged.map((i) => i.id)).toEqual(['a1']);
  });
});
