import { hashKey } from '@/composables/useResource';
import { parseFeed } from '@/libs/feedParser';
import { HttpError, fetchJson, fetchText } from '@/libs/http';
import { sourceKey, type FeedKind, type FeedSource } from './index';

export interface FeedItem {
  id: string;
  source: string;
  title: string;
  url: string;
  discussionUrl?: string;
  score?: number;
  comments?: number;
  time?: number;
  tag?: string;
}

interface HnResponse {
  hits: { objectID: string; title: string; url: string | null; points: number; num_comments: number; created_at_i: number }[];
}

interface RedditResponse {
  data: {
    children: {
      data: {
        id: string;
        title: string;
        permalink: string;
        url: string;
        is_self: boolean;
        stickied: boolean;
        score: number;
        num_comments: number;
        created_utc: number;
        subreddit_name_prefixed: string;
      };
    }[];
  };
}

type LobstersResponse = {
  short_id: string;
  title: string;
  url: string;
  comments_url: string;
  score: number;
  comment_count: number;
  created_at: string;
  tags: string[];
}[];

const hnItem = (id: string) => `https://news.ycombinator.com/item?id=${id}`;

const FETCHERS: Record<FeedKind, (source: FeedSource, limit: number) => Promise<Omit<FeedItem, 'source'>[]>> = {
  async hn({ value }, limit) {
    const { hits } = await fetchJson<HnResponse>(`https://hn.algolia.com/api/v1/search?tags=${encodeURIComponent(value)}&hitsPerPage=${limit}`);
    return hits.map((hit) => ({
      id: `hn:${hit.objectID}`,
      title: hit.title,
      url: hit.url || hnItem(hit.objectID),
      discussionUrl: hnItem(hit.objectID),
      score: hit.points,
      comments: hit.num_comments,
      time: hit.created_at_i * 1000,
    }));
  },

  async reddit({ value }, limit) {
    const subs = value
      .split(/[\s+,]+/)
      .filter(Boolean)
      .join('+');
    try {
      // A few extra make up for the stickied posts that are dropped.
      const { data } = await fetchJson<RedditResponse>(`https://www.reddit.com/r/${subs}/hot.json?limit=${limit + 5}&raw_json=1`);
      return data.children
        .map((c) => c.data)
        .filter((post) => !post.stickied)
        .map((post) => ({
          id: `reddit:${post.id}`,
          title: post.title,
          url: post.is_self ? `https://www.reddit.com${post.permalink}` : post.url,
          discussionUrl: `https://www.reddit.com${post.permalink}`,
          score: post.score,
          comments: post.num_comments,
          time: post.created_utc * 1000,
          tag: post.subreddit_name_prefixed,
        }));
    } catch (error) {
      // Reddit throttles the JSON API aggressively; the Atom feed is a scoreless but reliable fallback.
      if (!(error instanceof HttpError) || ![403, 429].includes(error.status)) throw error;
      const feed = parseFeed(await fetchText(`https://www.reddit.com/r/${subs}/.rss`));
      return feed.items.map((item) => ({ id: `reddit:${item.id}`, title: item.title, url: item.url, discussionUrl: item.url, time: item.time }));
    }
  },

  async lobsters({ value }) {
    const stories = await fetchJson<LobstersResponse>(`https://lobste.rs/${value === 'newest' ? 'newest' : 'hottest'}.json`);
    return stories.map((story) => ({
      id: `lobsters:${story.short_id}`,
      title: story.title,
      url: story.url || story.comments_url,
      discussionUrl: story.comments_url,
      score: story.score,
      comments: story.comment_count,
      time: Date.parse(story.created_at),
      tag: story.tags.slice(0, 2).join(' · '),
    }));
  },

  async rss({ value }) {
    const feed = parseFeed(await fetchText(value), value);
    // GUIDs are only unique within a feed ("1", "2"…), so they're namespaced by it.
    const feedId = hashKey(value);
    return feed.items.map((item) => ({ id: `rss:${feedId}:${item.id}`, title: item.title, url: item.url, discussionUrl: item.commentsUrl, time: item.time }));
  },
};

export const fetchSource = async (source: FeedSource, limit: number): Promise<FeedItem[]> =>
  (await FETCHERS[source.kind](source, limit)).slice(0, limit).map((item) => ({ ...item, source: sourceKey(source) }));

export const feedTitle = async (url: string) => parseFeed(await fetchText(url), url).title;
