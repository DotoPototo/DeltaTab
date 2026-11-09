import { DAY } from '@/libs/time';
import type { Recipe } from './recipes';

export interface HistoryEntry {
  url: string;
  title?: string;
  lastVisitTime?: number;
  visitCount?: number;
}

export interface WorkItem {
  key: string;
  recipeId: string;
  url: string;
  title: string;
  kind: string;
  project?: string;
  lastVisit: number;
  visits: number;
  score: number;
}

interface CompiledRecipe {
  recipe: Recipe;
  pattern: URLPattern;
}

const compile = (recipes: Recipe[]): CompiledRecipe[] =>
  recipes.flatMap((recipe) => {
    try {
      return [{ recipe, pattern: new URLPattern({ protocol: 'http{s}?', hostname: recipe.hostname, pathname: recipe.pathname }) }];
    } catch {
      return [];
    }
  });

const FRECENCY_HALF_LIFE = 7 * DAY;

// Wildcards capture under numeric keys ("0", "1"); they mark sub-pages, not the item's identity.
const isWildcard = (key: string) => /^\d+$/.test(key);

const namedGroups = (groups: Record<string, string | undefined>) => {
  const named: Record<string, string> = {};
  for (const [key, value] of Object.entries(groups)) if (value !== undefined && !isWildcard(key)) named[key] = value;
  return named;
};

const identityOf = (recipe: Recipe, groups: Record<string, string>, pathname: string) => {
  if (recipe.identity) return recipe.identity(pathname);
  if (Object.keys(groups).length) return Object.values(groups).join('/');
  return pathname.replace(/\/+$/, '') || '/';
};

// Visits matter, but recency matters more.
export const frecency = (visits: number, lastVisit: number, now: number) => Math.sqrt(visits) * 0.5 ** ((now - lastVisit) / FRECENCY_HALF_LIFE);

export const matchHistory = (entries: HistoryEntry[], recipes: Recipe[], now = Date.now()): WorkItem[] => {
  const compiled = compile(recipes);
  const items = new Map<string, WorkItem>();

  for (const entry of entries) {
    for (const { recipe, pattern } of compiled) {
      const result = pattern.exec(entry.url);
      if (!result) continue;
      const groups = namedGroups(result.pathname.groups);
      if (recipe.exclude?.(groups)) continue;

      const identity = identityOf(recipe, groups, result.pathname.input);
      if (!identity) continue;
      // Only the hostname is case-insensitive; ids in paths (Google Docs, Notion) are not.
      const key = `${recipe.id}:${result.hostname.input.toLowerCase()}/${identity}`;
      const rawTitle = entry.title?.trim() || identity;
      const title = (recipe.title?.(rawTitle, groups) || rawTitle).trim();
      const visit = entry.lastVisitTime ?? 0;
      const existing = items.get(key);
      // The wildcard-free visit (the item's own page) gives the best title and URL.
      const isCanonical = !Object.keys(result.pathname.groups).some((k) => isWildcard(k) && result.pathname.groups[k]);

      if (existing) {
        existing.visits += entry.visitCount ?? 1;
        existing.lastVisit = Math.max(existing.lastVisit, visit);
        if (isCanonical) {
          existing.url = entry.url;
          existing.title = title;
        }
      } else {
        items.set(key, {
          key,
          recipeId: recipe.id,
          url: entry.url,
          title,
          kind: recipe.label,
          project: recipe.project?.(groups),
          lastVisit: visit,
          visits: entry.visitCount ?? 1,
          score: 0,
        });
      }
      // The first matching recipe wins, so recipes are ordered from most to least specific.
      break;
    }
  }

  return [...items.values()].map((item) => ({ ...item, score: frecency(item.visits, item.lastVisit, now) }));
};
