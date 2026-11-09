import { describe, test, expect } from 'bun:test';
import { HttpError, INSECURE, errorMessage, fetchText } from '@/libs/http';

describe('errorMessage', () => {
  test('distinguishes rate limits from access denied', () => {
    expect(errorMessage(new HttpError(403, 'https://api.github.com/x', true))).toContain('Rate limited');
    expect(errorMessage(new HttpError(403, 'https://api.github.com/x'))).toBe('Access denied by api.github.com');
    expect(errorMessage(new HttpError(429, 'https://a.dev/'))).toContain('Rate limited');
    expect(errorMessage(new HttpError(404, 'https://a.dev/'))).toBe('Not found');
  });

  test('timeouts and network failures read naturally', () => {
    expect(errorMessage(new DOMException('x', 'TimeoutError'))).toBe('Request timed out');
    expect(errorMessage(new TypeError('Failed to fetch'))).toBe('Network error');
  });
});

describe('request', () => {
  test('refuses plain http before anything is sent', async () => {
    const original = globalThis.fetch;
    let sent = 0;
    globalThis.fetch = (async () => (sent++, new Response('x'))) as unknown as typeof fetch;
    try {
      await expect(fetchText('http://example.com/feed.rss?token=secret')).rejects.toThrow(INSECURE);
      expect(sent).toBe(0);
    } finally {
      globalThis.fetch = original;
    }
  });
});
