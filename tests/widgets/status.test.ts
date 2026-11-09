import { describe, test, expect } from 'bun:test';
import { summarise, type SummaryResponse } from '@/widgets/status/services';

const BASE = 'https://status.example.com';
const incident = (impact: string, status = 'investigating') => ({ name: `${impact} incident`, impact, status, shortlink: 'https://stspg.io/x' });

describe('summarise', () => {
  // Cloudflare marks rerouted data centres as outages.
  test('a page-wide rollup with no incidents is operational', () => {
    const summary: SummaryResponse = { status: { indicator: 'major', description: 'Partial System Outage' }, incidents: [] };
    expect(summarise(summary, BASE)).toMatchObject({ indicator: 'none', description: 'No active incidents', incidents: [] });
  });

  test('the worst active incident sets the state', () => {
    const summary: SummaryResponse = {
      status: { indicator: 'major', description: 'Partial System Outage' },
      incidents: [incident('minor'), incident('critical', 'resolved'), incident('major', 'identified')],
    };
    const result = summarise(summary, BASE);
    expect(result.indicator).toBe('major');
    expect(result.description).toBe('Partial System Outage');
    expect(result.incidents.map((i) => i.impact)).toEqual(['minor', 'major']);
  });

  test("the provider's wording is kept only when it describes the same state", () => {
    const summary: SummaryResponse = { status: { indicator: 'major', description: 'Partial System Outage' }, incidents: [incident('minor')] };
    expect(summarise(summary, BASE)).toMatchObject({ indicator: 'minor', description: 'Minor service outage' });
  });

  test('an open incident of no stated impact still counts', () => {
    const summary: SummaryResponse = { status: { indicator: 'none', description: 'All Systems Operational' }, incidents: [incident('none')] };
    expect(summarise(summary, BASE).indicator).toBe('minor');
  });

  test('maintenance in progress is listed but is not an issue', () => {
    const summary: SummaryResponse = {
      status: { indicator: 'maintenance', description: 'Service Under Maintenance' },
      incidents: [],
      scheduled_maintenances: [
        { name: 'DFW (Dallas)', status: 'in_progress' },
        { name: 'DUR (Durban)', status: 'scheduled' },
      ],
    };
    const result = summarise(summary, BASE);
    expect(result.indicator).toBe('none');
    expect(result.incidents).toEqual([{ name: 'DFW (Dallas)', url: BASE, impact: 'maintenance' }]);
  });
});
