import { describe, test, expect } from 'bun:test';
import { parseFeed } from '@/libs/feedParser';

const RSS = `<?xml version="1.0"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Example &amp; Co</title>
    <link>https://example.com/</link>
    <item>
      <title>First &lt;b&gt;post&lt;/b&gt;</title>
      <link>/posts/1</link>
      <guid>post-1</guid>
      <pubDate>Wed, 28 Oct 2026 10:00:00 GMT</pubDate>
      <comments>https://example.com/posts/1#comments</comments>
    </item>
    <item>
      <title>Second</title>
      <link>https://example.com/posts/2</link>
      <dc:date>2026-10-27T08:00:00Z</dc:date>
    </item>
    <item><description>No title or link</description></item>
  </channel>
</rss>`;

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title type="text">Release notes from core</title>
  <link rel="alternate" type="text/html" href="https://github.com/vuejs/core/releases"/>
  <entry>
    <id>tag:github.com,2008:Repository/1/v3.6.0</id>
    <updated>2026-10-20T12:00:00Z</updated>
    <link rel="alternate" type="text/html" href="https://github.com/vuejs/core/releases/tag/v3.6.0"/>
    <title>v3.6.0</title>
  </entry>
</feed>`;

const RDF = `<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/">
  <channel rdf:about="https://rdf.example/"><title>RDF feed</title><link>https://rdf.example/</link></channel>
  <item rdf:about="https://rdf.example/a"><title>A</title><link>https://rdf.example/a</link></item>
</rdf:RDF>`;

describe('parseFeed', () => {
  test('drops items whose link is not http(s)', () => {
    const xml = `<rss><channel><title>x</title><item><title>Bad</title><link>javascript:alert(1)</link></item><item><title>Data</title><link>data:text/html,hi</link></item><item><title>Good</title><link>https://ok.dev/</link></item></channel></rss>`;
    expect(parseFeed(xml).items.map((i) => i.title)).toEqual(['Good']);
  });

  test('RSS 2.0: decodes entities, resolves relative links, reads guid/comments/dates', () => {
    const feed = parseFeed(RSS);
    expect(feed.title).toBe('Example & Co');
    expect(feed.items).toHaveLength(2);
    expect(feed.items[0]).toMatchObject({
      id: 'post-1',
      title: 'First post',
      url: 'https://example.com/posts/1',
      commentsUrl: 'https://example.com/posts/1#comments',
      time: Date.UTC(2026, 9, 28, 10),
    });
    expect(feed.items[1]!.time).toBe(Date.UTC(2026, 9, 27, 8));
  });

  test('Atom: picks the alternate link and updated time', () => {
    const feed = parseFeed(ATOM);
    expect(feed.title).toBe('Release notes from core');
    expect(feed.items[0]).toMatchObject({ title: 'v3.6.0', url: 'https://github.com/vuejs/core/releases/tag/v3.6.0', time: Date.UTC(2026, 9, 20, 12) });
  });

  test('RSS 1.0 / RDF items outside the channel', () => {
    const feed = parseFeed(RDF);
    expect(feed.title).toBe('RDF feed');
    expect(feed.items.map((i) => i.url)).toEqual(['https://rdf.example/a']);
  });

  test('rejects non-feeds', () => {
    expect(() => parseFeed('<html><body>nope</body></html>')).toThrow();
    expect(() => parseFeed('not xml at all <')).toThrow();
  });
});
