import { describe, test, expect } from 'bun:test';
import { fetchSummary } from '@/widgets/github/api';

describe('fetchSummary', () => {
  test('stops before the next request once consent is withdrawn mid-fetch', async () => {
    const original = globalThis.fetch;
    const sent: string[] = [];
    let allowed = true;
    globalThis.fetch = (async (url: string) => {
      sent.push(url);
      allowed = false; // the user withdraws GitHub sharing while this request is in flight
      return Response.json({
        data: { viewer: { login: 'me', pullRequests: { nodes: [] } }, reviews: { issueCount: 0, nodes: [] } },
      });
    }) as unknown as typeof fetch;
    try {
      await expect(fetchSummary('token', () => allowed)).rejects.toThrow('GitHub sharing is off');
      expect(sent).toEqual(['https://api.github.com/graphql']);
    } finally {
      globalThis.fetch = original;
    }
  });
});
