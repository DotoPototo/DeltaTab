import { describe, test, expect } from 'bun:test';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { refreshDaily, wikimediaImageUrl } from '@/libs/wallpaper/daily';
import { dailyItem, type Wallpaper } from '@/libs/wallpaper/library';

describe('wikimediaImageUrl', () => {
  const image = (source: string, width: number) => ({
    title: 'File:X.jpg',
    file_page: '',
    image: { source, width },
    thumbnail: { source: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0d/X.jpg/960px-X.jpg?utm_source=x' },
  });

  test('requests the smallest standard thumbnail covering the display', () => {
    expect(wikimediaImageUrl(image('https://upload.wikimedia.org/a/X.jpg', 6000), 2560)).toBe(
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0d/X.jpg/3840px-X.jpg'
    );
    expect(wikimediaImageUrl(image('https://upload.wikimedia.org/a/X.jpg', 6000), 1600)).toContain('/1920px-X.jpg');
  });

  test('uses the original when it is no larger than the thumbnail', () => {
    expect(wikimediaImageUrl(image('https://upload.wikimedia.org/a/X.jpg', 1800), 1600)).toBe('https://upload.wikimedia.org/a/X.jpg');
  });

  test('always rasterises vectors', () => {
    expect(wikimediaImageUrl(image('https://upload.wikimedia.org/a/X.svg', 500), 1600)).toContain('/1920px-');
  });
});

describe('refreshDaily', () => {
  test('asks the provider at most once per interval while it has an image', async () => {
    fakeBrowser.reset();
    // Bing still on yesterday: the image is outdated by the local calendar but not by Bing's.
    const yesterday = { id: 'daily-bing-x', origin: 'bing', day: '20000101' } as Wallpaper;
    await dailyItem.setValue({ bing: yesterday });
    const realFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return Response.json({ images: [{ startdate: '20000101', urlbase: '/x', title: '', copyright: '', copyrightlink: '' }] });
    }) as unknown as typeof fetch;
    try {
      expect(await refreshDaily('bing')).toEqual(yesterday);
      expect(await refreshDaily('bing')).toEqual(yesterday);
      expect(calls).toBe(1);
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
