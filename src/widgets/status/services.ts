import { fetchJson } from '@/libs/http';

// Statuspage's summary API (incident.io pages copy it) sends CORS headers: no host permissions needed.

export interface StatusService {
  id: string;
  name: string;
  url: string;
}

export const PRESETS: StatusService[] = [
  { id: 'github', name: 'GitHub', url: 'https://www.githubstatus.com' },
  { id: 'cloudflare', name: 'Cloudflare', url: 'https://www.cloudflarestatus.com' },
  { id: 'vercel', name: 'Vercel', url: 'https://www.vercel-status.com' },
  { id: 'netlify', name: 'Netlify', url: 'https://www.netlifystatus.com' },
  { id: 'npm', name: 'npm', url: 'https://status.npmjs.org' },
  { id: 'anthropic', name: 'Claude', url: 'https://status.claude.com' },
  { id: 'openai', name: 'OpenAI', url: 'https://status.openai.com' },
  { id: 'digitalocean', name: 'DigitalOcean', url: 'https://status.digitalocean.com' },
  { id: 'supabase', name: 'Supabase', url: 'https://status.supabase.com' },
  { id: 'linear', name: 'Linear', url: 'https://linearstatus.com' },
  { id: 'atlassian', name: 'Atlassian', url: 'https://status.atlassian.com' },
  { id: 'discord', name: 'Discord', url: 'https://discordstatus.com' },
  { id: 'reddit', name: 'Reddit', url: 'https://www.redditstatus.com' },
];

export type Indicator = 'none' | 'minor' | 'major' | 'critical' | 'maintenance';

export interface ServiceStatus {
  id: string;
  name: string;
  url: string;
  indicator: Indicator;
  description: string;
  incidents: { name: string; url: string; impact: string }[];
  /** Set when the last check of this page failed; the rest is then the last known state, if any. */
  error?: string;
  checkedAt?: number;
}

export interface SummaryResponse {
  status: { indicator: Indicator; description: string };
  incidents?: { name: string; shortlink?: string; impact: string; status: string }[];
  scheduled_maintenances?: { name: string; shortlink?: string; status: string }[];
}

export const pageKey = (url: string) => url.trim().replace(/\/+$/, '').toLowerCase();

/** Statuspage's own words for each state, for when the page's headline describes a different one. */
const LABELS: Record<Indicator, string> = {
  none: 'No active incidents',
  maintenance: 'Under maintenance',
  minor: 'Minor service outage',
  major: 'Partial system outage',
  critical: 'Major service outage',
};

const INCIDENT_INDICATORS: Record<string, Indicator> = { minor: 'minor', major: 'major', critical: 'critical' };

const SEVERITY: Record<Indicator, number> = { none: 0, maintenance: 1, minor: 2, major: 3, critical: 4 };
export const severity = (indicator: Indicator) => SEVERITY[indicator] ?? 0;

// From open incidents, not the component rollup (Cloudflare's shows outages it doesn't call issues);
// with none open it claims only "No active incidents", as components can go down before an incident.
export const summarise = (summary: SummaryResponse, base: string): Pick<ServiceStatus, 'indicator' | 'description' | 'incidents'> => {
  const active = (summary.incidents ?? []).filter((i) => i.status !== 'resolved' && i.status !== 'postmortem');
  const maintenance = (summary.scheduled_maintenances ?? []).filter((m) => m.status === 'in_progress');
  // An open incident with no stated impact is still something going on.
  const indicator = active.reduce<Indicator>((worst, i) => {
    const level = INCIDENT_INDICATORS[i.impact] ?? 'minor';
    return severity(level) > severity(worst) ? level : worst;
  }, 'none');
  return {
    indicator,
    description: indicator !== 'none' && indicator === summary.status.indicator ? summary.status.description : LABELS[indicator],
    incidents: [
      ...active.map((i) => ({ name: i.name, url: i.shortlink ?? base, impact: i.impact })),
      ...maintenance.map((m) => ({ name: m.name, url: m.shortlink ?? base, impact: 'maintenance' })),
    ],
  };
};

export const fetchStatus = async (service: StatusService): Promise<ServiceStatus> => {
  const base = service.url.replace(/\/+$/, '');
  const summary = await fetchJson<SummaryResponse>(`${base}/api/v2/summary.json`);
  return { ...service, checkedAt: Date.now(), ...summarise(summary, base) };
};
