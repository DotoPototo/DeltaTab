import type { IconName } from '@/libs/icons';

export interface Recipe {
  id: string;
  label: string;
  icon: IconName;
  hostname: string;
  pathname: string;
  project?: (groups: Record<string, string>) => string;
  title?: (title: string, groups: Record<string, string>) => string;
  exclude?: (groups: Record<string, string>) => boolean;
  identity?: (pathname: string) => string | undefined;
}

export interface CustomRecipe {
  id: string;
  label: string;
  // "host/path" in URLPattern syntax, such as "jira.acme.com/browse/:key".
  pattern: string;
}

const firstSegment = (separator: string) => (title: string) => title.split(separator)[0]!.trim();
const stripSuffix = (pattern: RegExp) => (title: string) => title.replace(pattern, '').trim();

const GITHUB_RESERVED = new Set([
  'settings',
  'notifications',
  'orgs',
  'organizations',
  'marketplace',
  'explore',
  'topics',
  'login',
  'logout',
  'sponsors',
  'features',
  'pulls',
  'issues',
  'search',
  'new',
  'codespaces',
  'collections',
  'trending',
  'apps',
  'enterprise',
  'pricing',
  'about',
  'security',
  'site',
  'users',
]);

const githubProject = ({ owner, repo }: Record<string, string>) => `${owner}/${repo}`;
const githubExclude = ({ owner }: Record<string, string>) => GITHUB_RESERVED.has(owner!.toLowerCase());
// "Fix the thing by octocat · Pull Request #12 · owner/repo" becomes "Fix the thing"
const githubTitle = (title: string) => firstSegment(' · ')(title).replace(/ by [\w-]+$/, '');

export const RECIPES: Recipe[] = [
  {
    id: 'github-pr',
    label: 'Pull request',
    icon: 'material-symbols:merge-type-rounded',
    hostname: 'github.com',
    pathname: '/:owner/:repo/pull/:number(\\d+){/*}?',
    project: githubProject,
    title: githubTitle,
    exclude: githubExclude,
  },
  {
    id: 'github-issue',
    label: 'Issue',
    icon: 'material-symbols:bug-report-outline-rounded',
    hostname: 'github.com',
    pathname: '/:owner/:repo/issues/:number(\\d+)',
    project: githubProject,
    title: githubTitle,
    exclude: githubExclude,
  },
  {
    id: 'github-repo',
    label: 'Repository',
    icon: 'fa6-brands:github',
    hostname: 'github.com',
    pathname: '/:owner/:repo',
    project: githubProject,
    title: (_, g) => githubProject(g),
    exclude: githubExclude,
  },
  {
    id: 'gitlab-mr',
    label: 'Merge request',
    icon: 'fa6-brands:gitlab',
    hostname: 'gitlab.com',
    pathname: '/:project+/-/merge_requests/:number(\\d+){/*}?',
    project: ({ project }) => project!,
    title: firstSegment(' · '),
  },
  {
    id: 'gitlab-issue',
    label: 'Issue',
    icon: 'fa6-brands:gitlab',
    hostname: 'gitlab.com',
    pathname: '/:project+/-/issues/:number(\\d+)',
    project: ({ project }) => project!,
    title: firstSegment(' · '),
  },
  {
    id: 'jira',
    label: 'Jira',
    icon: 'fa6-brands:jira',
    hostname: '*.atlassian.net',
    pathname: '/browse/:key',
    project: ({ key }) => key!.split('-')[0]!,
    title: stripSuffix(/\s+-\s+Jira$/),
  },
  {
    id: 'linear',
    label: 'Linear',
    icon: 'material-symbols:checklist-rounded',
    hostname: 'linear.app',
    pathname: '/:team/issue/:key{/:slug}?',
    project: ({ key }) => key!.split('-')[0]!,
    title: stripSuffix(/\s+[-\u2013|]\s+Linear$/),
  },
  {
    id: 'figma',
    label: 'Figma',
    icon: 'fa6-brands:figma',
    hostname: '{www.}?figma.com',
    pathname: '/:type(file|design|board|proto)/:id{/*}?',
    title: stripSuffix(/\s+[-\u2013]\s+Figma$/),
  },
  {
    id: 'google-docs',
    label: 'Google Docs',
    icon: 'fa6-brands:google-drive',
    hostname: 'docs.google.com',
    pathname: '/:type(document|spreadsheets|presentation)/d/:id{/*}?',
    title: stripSuffix(/\s+-\s+Google (Docs|Sheets|Slides)$/),
  },
  {
    id: 'notion',
    label: 'Notion',
    icon: 'material-symbols:description-outline-rounded',
    hostname: '{www.}?notion.so',
    pathname: '/*',
    // "/team/Roadmap-1a2b…" and "/1a2b…" are the same page: the 32-hex id survives renames.
    identity: (pathname) => pathname.match(/[0-9a-f]{32}/i)?.[0].toLowerCase(),
  },
  {
    id: 'stackoverflow',
    label: 'Stack Overflow',
    icon: 'fa6-brands:stack-overflow',
    hostname: 'stackoverflow.com',
    pathname: '/questions/:id(\\d+){/:slug}?',
    // "javascript - How do I …? - Stack Overflow" becomes "How do I …?"
    title: (title) => title.replace(/\s+-\s+Stack Overflow$/, '').replace(/^[\w.#+-]+(?:, [\w.#+-]+)* - /, ''),
  },
  {
    id: 'npm',
    label: 'npm',
    icon: 'fa6-brands:npm',
    hostname: 'www.npmjs.com',
    pathname: '/package/:name+',
    title: (_, { name }) => name!,
  },
  {
    id: 'mdn',
    label: 'MDN',
    icon: 'material-symbols:code-rounded',
    hostname: 'developer.mozilla.org',
    pathname: '/:locale/docs/:path+',
    title: stripSuffix(/\s+[-|]\s+MDN( Web Docs)?$/),
  },
];

export const customRecipe = ({ id, label, pattern }: CustomRecipe): Recipe => {
  const cleaned = pattern.trim().replace(/^https?:\/\//, '');
  const slash = cleaned.indexOf('/');
  const hostname = slash < 0 ? cleaned : cleaned.slice(0, slash);
  const pathname = slash < 0 ? '/*' : cleaned.slice(slash);
  new URLPattern({ hostname, pathname }); // validate eagerly so settings can show the error
  return { id, label: label || hostname, icon: 'material-symbols:link-rounded', hostname, pathname, project: () => hostname };
};
