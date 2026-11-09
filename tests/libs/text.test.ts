import { describe, test, expect } from 'bun:test';
import { formatBytes, hostname, plural, siteName } from '@/libs/text';

describe('text helpers', () => {
  test('plural', () => {
    expect(plural(1, 'image')).toBe('1 image');
    expect(plural(3, 'image')).toBe('3 images');
    expect(plural(2, 'person', 'people')).toBe('2 people');
  });

  test('hostname strips www and tolerates garbage', () => {
    expect(hostname('https://www.bbc.co.uk/news')).toBe('bbc.co.uk');
    expect(hostname('nope')).toBe('');
  });

  test('siteName', () => {
    expect(siteName('https://www.github.com/x')).toBe('Github');
    expect(siteName('https://doto.gg')).toBe('Doto');
  });

  test('formatBytes', () => {
    expect(formatBytes(512 * 1024)).toBe('512 KB');
    expect(formatBytes(3.5 * 1024 ** 2)).toBe('3.5 MB');
  });
});
