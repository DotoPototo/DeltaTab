import { describe, test, expect } from 'bun:test';
import { displayTag, fetchReleases, packageOf, parseRepo } from '@/widgets/releases/api';

describe('parseRepo', () => {
  test('accepts owner/repo, URLs and .git suffixes', () => {
    expect(parseRepo('vuejs/core')).toBe('vuejs/core');
    expect(parseRepo('https://github.com/oven-sh/bun')).toBe('oven-sh/bun');
    expect(parseRepo('github.com/vitejs/vite.git')).toBe('vitejs/vite');
    expect(parseRepo('https://github.com/microsoft/TypeScript/#readme')).toBe('microsoft/TypeScript');
  });

  test('rejects anything else', () => {
    expect(parseRepo('vue')).toBeUndefined();
    expect(parseRepo('https://gitlab.com/a/b/c')).toBeUndefined();
  });
});

describe('displayTag', () => {
  test('drops a redundant repo-name prefix', () => {
    expect(displayTag('oven-sh/bun', 'bun-v1.4.4')).toBe('v1.4.4');
    expect(displayTag('wxt-dev/wxt', 'wxt-v0.21.5')).toBe('v0.21.5');
    expect(displayTag('vitejs/vite', 'create-vite@9.3.3')).toBe('create-vite@9.3.3');
    expect(displayTag('vuejs/core', 'v3.5.44')).toBe('v3.5.44');
  });
});

describe('packageOf', () => {
  test('tells the main package from monorepo side packages', () => {
    expect(packageOf('vitejs/vite', 'v7.2.0')).toBe('');
    expect(packageOf('vitejs/vite', 'v7.3.0-beta.1')).toBe('');
    expect(packageOf('oven-sh/bun', 'bun-v1.4.4')).toBe('');
    expect(packageOf('vitejs/vite', 'create-vite@9.3.3')).toBe('create-vite');
    expect(packageOf('vitejs/vite', 'plugin-legacy@7.0.0-beta.2')).toBe('plugin-legacy');
  });
});

describe('fetchReleases', () => {
  const release = (tag: string, day: number, prerelease = false) => ({
    tag_name: tag,
    name: tag,
    html_url: `https://x/${tag}`,
    published_at: `2026-01-${day}T00:00:00Z`,
    prerelease,
    draft: false,
  });
  const withReleases = async (list: object[], run: () => Promise<void>) => {
    const real = globalThis.fetch;
    globalThis.fetch = (async () => Response.json(list)) as unknown as typeof fetch;
    try {
      await run();
    } finally {
      globalThis.fetch = real;
    }
  };

  test('a monorepo’s stable release is paired with its own beta, not a side package’s', async () => {
    await withReleases([release('create-vite@10.0.0-beta.1', 20, true), release('v7.3.0-beta.1', 15, true), release('v7.2.0', 10)], async () => {
      expect((await fetchReleases('vitejs/vite', '', true)).map((r) => r.tag)).toEqual(['v7.2.0', 'v7.3.0-beta.1']);
    });
  });

  test('a repo with only betas returns its newest beta', async () => {
    await withReleases([release('v2.0.0-beta.2', 20, true), release('v2.0.0-beta.1', 10, true)], async () => {
      expect((await fetchReleases('owner/new', '', true)).map((r) => r.tag)).toEqual(['v2.0.0-beta.2']);
    });
  });
});
