import { describe, test, expect } from 'bun:test';
import { DAY } from '@/libs/time';
import { frecency, matchHistory } from '@/widgets/recent/match';
import { RECIPES, customRecipe } from '@/widgets/recent/recipes';

const NOW = Date.UTC(2026, 9, 29);

describe('matchHistory', () => {
  test('collapses sub-pages into one item with the canonical title', () => {
    const items = matchHistory(
      [
        { url: 'https://github.com/vuejs/core/pull/123/files', title: 'Files changed · Pull Request #123', lastVisitTime: NOW - 1000, visitCount: 2 },
        {
          url: 'https://github.com/vuejs/core/pull/123',
          title: 'Fix reactivity bug by octocat · Pull Request #123 · vuejs/core',
          lastVisitTime: NOW - 5000,
          visitCount: 3,
        },
      ],
      RECIPES,
      NOW
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: 'Fix reactivity bug',
      url: 'https://github.com/vuejs/core/pull/123',
      kind: 'Pull request',
      project: 'vuejs/core',
      visits: 5,
      lastVisit: NOW - 1000,
    });
  });

  test('ignores GitHub reserved routes and non-matching pages', () => {
    const items = matchHistory(
      [
        { url: 'https://github.com/settings/profile', title: 'Settings' },
        { url: 'https://github.com/notifications', title: 'Notifications' },
        { url: 'https://example.com/whatever', title: 'Nope' },
        { url: 'https://github.com/oven-sh/bun', title: 'oven-sh/bun: Incredibly fast JavaScript runtime' },
      ],
      RECIPES,
      NOW
    );
    expect(items.map((i) => i.title)).toEqual(['oven-sh/bun']);
  });

  test('cleans Stack Overflow and Jira titles', () => {
    const items = matchHistory(
      [
        { url: 'https://stackoverflow.com/questions/111/how-to-x', title: 'javascript, typescript - How do I do X? - Stack Overflow' },
        { url: 'https://acme.atlassian.net/browse/PLAT-42', title: '[PLAT-42] Migrate auth - Jira' },
      ],
      RECIPES,
      NOW
    );
    expect(items.map((i) => i.title)).toEqual(['How do I do X?', '[PLAT-42] Migrate auth']);
    expect(items[1]!.project).toBe('PLAT');
  });

  test('supports custom patterns', () => {
    const recipe = customRecipe({ id: 'c1', label: 'Wiki', pattern: 'wiki.acme.dev/pages/:slug' });
    const items = matchHistory([{ url: 'https://wiki.acme.dev/pages/onboarding', title: 'Onboarding' }], [recipe], NOW);
    expect(items[0]).toMatchObject({ kind: 'Wiki', title: 'Onboarding', project: 'wiki.acme.dev' });
  });

  test('different Notion pages stay apart, and a renamed page stays one item', () => {
    const items = matchHistory(
      [
        { url: 'https://www.notion.so/acme/Roadmap-0123456789abcdef0123456789abcdef', title: 'Roadmap' },
        { url: 'https://www.notion.so/acme/Q4-Roadmap-0123456789abcdef0123456789abcdef', title: 'Q4 Roadmap' },
        { url: 'https://www.notion.so/acme/Hiring-fedcba9876543210fedcba9876543210', title: 'Hiring' },
      ],
      RECIPES,
      NOW
    );
    expect(items).toHaveLength(2);
    expect(items[0]!.visits).toBe(2);
  });

  test('wildcard custom patterns keep each page separate', () => {
    const recipe = customRecipe({ id: 'c2', label: 'Wiki', pattern: 'wiki.acme.dev/*' });
    const items = matchHistory(
      [
        { url: 'https://wiki.acme.dev/Onboarding', title: 'Onboarding' },
        { url: 'https://wiki.acme.dev/onboarding', title: 'Different page' },
        { url: 'https://wiki.acme.dev/Onboarding/', title: 'Onboarding' },
      ],
      [recipe],
      NOW
    );
    expect(items.map((i) => i.title).sort()).toEqual(['Different page', 'Onboarding']);
  });

  test('custom pattern syntax errors throw', () => {
    expect(() => customRecipe({ id: 'x', label: '', pattern: 'acme.dev/(' })).toThrow();
  });
});

describe('ranking', () => {
  test('frecency decays with age', () => {
    expect(frecency(4, NOW, NOW)).toBe(2);
    expect(frecency(4, NOW - 7 * DAY, NOW)).toBeCloseTo(1);
  });
});
