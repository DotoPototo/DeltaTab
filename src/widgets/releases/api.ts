import { fetchJson } from '@/libs/http';
import { escapeRegExp } from '@/libs/text';
import { githubHeaders } from '@/widgets/github/api';

export interface Release {
  repo: string;
  tag: string;
  name: string;
  url: string;
  publishedAt: number;
  prerelease: boolean;
}

interface RawRelease {
  tag_name: string;
  name: string | null;
  html_url: string;
  published_at: string | null;
  prerelease: boolean;
  draft: boolean;
}

type PublishedRelease = RawRelease & { published_at: string };

/** "owner/repo", "github.com/owner/repo" or a full URL to "owner/repo". */
export const parseRepo = (input: string): string | undefined => {
  const match = input.trim().match(/^(?:https?:\/\/)?(?:www\.)?(?:github\.com\/)?([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?(?:[#?].*)?$/i);
  return match ? `${match[1]}/${match[2]}` : undefined;
};

export const ownerUrl = (repo: string) => `https://github.com/${repo.split('/')[0]}`;
export const repoName = (repo: string) => repo.split('/')[1] ?? repo;

const toRelease = (repo: string, r: PublishedRelease): Release => ({
  repo,
  tag: r.tag_name,
  name: r.name || r.tag_name,
  url: r.html_url,
  publishedAt: Date.parse(r.published_at),
  prerelease: r.prerelease,
});

/** Monorepos tag sub-packages ("create-vite@9.3.3"); a bare version ("v7.2.0") is the main package. */
const isMainTag = (tag: string) => /^v?\d+\.\d+/.test(tag);

/** Drops a repo-name prefix, which adds nothing: "bun-v1.4.4" becomes "v1.4.4". */
export const displayTag = (repo: string, tag: string) => tag.replace(new RegExp(`^${escapeRegExp(repoName(repo))}[-@/]`, 'i'), '');

export const packageOf = (repo: string, tag: string) => {
  const shown = displayTag(repo, tag);
  return isMainTag(shown) ? '' : shown.replace(/[-@/]?v?\d+(\.\d+)*\S*$/, '');
};

// Covers the last 100 releases, so prereleases and sub-packages can't hide the stable line;
// `/releases/latest` often points at a monorepo sub-package.
export const fetchReleases = async (repo: string, token: string, includePrerelease: boolean): Promise<Release[]> => {
  const recent = (await fetchJson<RawRelease[]>(`https://api.github.com/repos/${repo}/releases?per_page=100`, { headers: githubHeaders(token) })).filter(
    (r): r is PublishedRelease => !r.draft && Boolean(r.published_at)
  );
  const stable = recent.filter((r) => !r.prerelease);
  const latest = stable.find((r) => isMainTag(displayTag(repo, r.tag_name))) ?? stable[0];
  const releases = latest ? [toRelease(repo, latest)] : [];
  if (includePrerelease) {
    const line = latest ? packageOf(repo, latest.tag_name) : '';
    const newer = recent.filter((r) => r.prerelease && (!latest || Date.parse(r.published_at) > Date.parse(latest.published_at)));
    const pre = newer.find((r) => packageOf(repo, r.tag_name) === line) ?? (latest ? undefined : newer[0]);
    if (pre) releases.push(toRelease(repo, pre));
  }
  return releases;
};
