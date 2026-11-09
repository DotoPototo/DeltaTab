// Matches elements by local name so prefixed ones (dc:date, atom:link) work.

export interface ParsedFeedItem {
  id: string;
  title: string;
  url: string;
  time?: number;
  commentsUrl?: string;
  summary?: string;
}

export interface ParsedFeed {
  title: string;
  link?: string;
  items: ParsedFeedItem[];
}

const children = (parent: Element, name: string) => [...parent.children].filter((el) => el.localName === name);
const child = (parent: Element, name: string) => children(parent, name)[0];
const text = (parent: Element, ...names: string[]) => {
  for (const name of names) {
    const value = child(parent, name)?.textContent?.trim();
    if (value) return value;
  }
  return undefined;
};

const parseTime = (value?: string) => {
  if (!value) return undefined;
  const time = Date.parse(value);
  return Number.isNaN(time) ? undefined : time;
};

const decodeEntities = (value: string) => new DOMParser().parseFromString(`<!doctype html><body>${value}`, 'text/html').body.textContent ?? value;

const plain = (value?: string) =>
  value
    ? decodeEntities(value.replace(/<[^>]*>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim()
    : undefined;

const atomLink = (entry: Element) => {
  const links = children(entry, 'link');
  const alternate = links.find((l) => !l.getAttribute('rel') || l.getAttribute('rel') === 'alternate') ?? links[0];
  return alternate?.getAttribute('href') ?? undefined;
};

// A feed mustn't hand us javascript:, data: or other schemes to link to.
const resolve = (url: string | undefined, base?: string) => {
  if (!url) return undefined;
  try {
    const resolved = new URL(url, base);
    return resolved.protocol === 'https:' || resolved.protocol === 'http:' ? resolved.toString() : undefined;
  } catch {
    return undefined;
  }
};

export const parseFeed = (xml: string, baseUrl?: string): ParsedFeed => {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const root = doc.documentElement;
  if (!root || root.localName === 'parsererror' || doc.getElementsByTagName('parsererror').length) {
    throw new Error('Not a valid RSS or Atom feed');
  }

  if (root.localName === 'feed') {
    const link = resolve(atomLink(root), baseUrl);
    return {
      title: plain(text(root, 'title')) ?? 'Untitled feed',
      link,
      items: children(root, 'entry').flatMap((entry) => {
        const url = resolve(atomLink(entry), link ?? baseUrl);
        const title = plain(text(entry, 'title'));
        if (!url || !title) return [];
        return [
          { id: text(entry, 'id') ?? url, title, url, time: parseTime(text(entry, 'published', 'updated')), summary: plain(text(entry, 'summary', 'content')) },
        ];
      }),
    };
  }

  // RSS 2.0 nests items in <channel>; RSS 1.0 (RDF) has them as siblings of <channel>.
  const channel = child(root, 'channel');
  if (!channel) throw new Error('Not a valid RSS or Atom feed');
  const items = [...children(channel, 'item'), ...children(root, 'item')];
  const link = resolve(text(channel, 'link'), baseUrl);
  return {
    title: plain(text(channel, 'title')) ?? 'Untitled feed',
    link,
    items: items.flatMap((item) => {
      const url = resolve(text(item, 'link') ?? item.getAttribute('rdf:about') ?? undefined, link ?? baseUrl);
      const title = plain(text(item, 'title')) ?? plain(text(item, 'description'))?.slice(0, 140);
      if (!url || !title) return [];
      return [
        {
          id: text(item, 'guid') ?? url,
          title,
          url,
          time: parseTime(text(item, 'pubDate', 'date', 'published', 'updated')),
          commentsUrl: resolve(text(item, 'comments'), url),
          summary: plain(text(item, 'description')),
        },
      ];
    }),
  };
};
