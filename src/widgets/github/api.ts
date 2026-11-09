import { HttpError, fetchJson } from '@/libs/http';

export type CheckState = 'SUCCESS' | 'FAILURE' | 'ERROR' | 'PENDING' | 'EXPECTED' | null;

export interface PullRequest {
  title: string;
  url: string;
  number: number;
  repo: string;
  author?: string;
  draft: boolean;
  updatedAt: number;
  review: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null;
  checks: CheckState;
}

export interface GitHubSummary {
  login: string;
  reviewRequests: PullRequest[];
  reviewCount: number;
  mine: PullRequest[];
  mineMore: boolean;
  /** Undefined when the token can't read notifications (fine-grained tokens). */
  notifications?: number;
}

const PR_FIELDS = `
  title url number isDraft updatedAt reviewDecision
  repository { nameWithOwner }
  author { login }
  commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
`;

export const PR_PAGE = 15;

export const NOTIFICATION_PAGE = 50;

const SHARING_OFF = 'GitHub sharing is off';

const QUERY = `query {
  viewer {
    login
    pullRequests(first: ${PR_PAGE}, states: OPEN, orderBy: { field: UPDATED_AT, direction: DESC }) { nodes { ${PR_FIELDS} } }
  }
  reviews: search(query: "is:open is:pr review-requested:@me archived:false", type: ISSUE, first: 15) {
    issueCount
    nodes { ... on PullRequest { ${PR_FIELDS} } }
  }
}`;

interface RawPr {
  title: string;
  url: string;
  number: number;
  isDraft: boolean;
  updatedAt: string;
  reviewDecision: PullRequest['review'];
  repository: { nameWithOwner: string };
  author: { login: string } | null;
  commits: { nodes: { commit: { statusCheckRollup: { state: CheckState } | null } }[] };
}

interface QueryResponse {
  data?: { viewer: { login: string; pullRequests: { nodes: RawPr[] } }; reviews: { issueCount: number; nodes: RawPr[] } };
  errors?: { message: string }[];
}

const toPr = (raw: RawPr): PullRequest => ({
  title: raw.title,
  url: raw.url,
  number: raw.number,
  repo: raw.repository.nameWithOwner,
  author: raw.author?.login,
  draft: raw.isDraft,
  updatedAt: Date.parse(raw.updatedAt),
  review: raw.reviewDecision,
  checks: raw.commits.nodes[0]?.commit.statusCheckRollup?.state ?? null,
});

export const githubHeaders = (token: string): HeadersInit => ({
  Accept: 'application/vnd.github+json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

// `allowed` is rechecked before each request, so consent withdrawn mid-fetch stops the token being resent.
export const fetchSummary = async (token: string, allowed: () => boolean): Promise<GitHubSummary> => {
  if (!allowed()) throw new Error(SHARING_OFF);
  const response = await fetchJson<QueryResponse>('https://api.github.com/graphql', {
    method: 'POST',
    headers: { ...githubHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: QUERY }),
  });
  if (!response.data) throw new Error(response.errors?.[0]?.message ?? 'GitHub returned no data');
  if (!allowed()) throw new Error(SHARING_OFF);

  const notifications = await fetchJson<unknown[]>(`https://api.github.com/notifications?per_page=${NOTIFICATION_PAGE}`, { headers: githubHeaders(token) })
    .then((list) => list.length)
    .catch((error: unknown) => {
      if (error instanceof HttpError && (error.status === 403 || error.status === 404)) return undefined;
      throw error;
    });

  const { viewer, reviews } = response.data;
  return {
    login: viewer.login,
    reviewRequests: reviews.nodes.filter((n) => n.url).map(toPr),
    reviewCount: reviews.issueCount,
    mine: viewer.pullRequests.nodes.map(toPr),
    mineMore: viewer.pullRequests.nodes.length >= PR_PAGE,
    notifications,
  };
};

export const NEW_TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=repo,notifications&description=Delta%20Tab';
