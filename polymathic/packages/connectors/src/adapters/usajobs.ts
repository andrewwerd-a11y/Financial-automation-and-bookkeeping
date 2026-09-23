import type { EngagementType, Opportunity } from '@polymathic/core';
import type { Connector } from '../types.js';

const SEARCH_URL = 'https://data.usajobs.gov/api/search';
const KM_PER_MILE = 1.609344;

/** Subset of the USAJOBS search response we rely on. */
export interface UsaJobsItem {
  MatchedObjectId: string;
  MatchedObjectDescriptor: {
    PositionTitle: string;
    PositionURI: string;
    OrganizationName?: string;
    QualificationSummary?: string;
    PositionStartDate?: string;
    PositionLocation?: { LocationName: string; Latitude?: number; Longitude?: number }[];
    PositionRemuneration?: { MinimumRange: string; MaximumRange: string; RateIntervalCode: string }[];
    PositionSchedule?: { Name: string }[];
    JobCategory?: { Name: string; Code: string }[];
  };
}

/**
 * USAJOBS: free public API for US federal jobs. Needs an API key and the
 * email it was registered with (sent as User-Agent).
 */
export const usaJobsConnector: Connector = {
  id: 'usajobs',
  name: 'USAJOBS',
  category: 'job_board',
  auth: { kind: 'api_key', envVars: ['USAJOBS_API_KEY', 'USAJOBS_USER_AGENT'] },
  capabilities: ['opportunities'],
  async fetchOpportunities(ctx, query) {
    const apiKey = ctx.apiKey ?? ctx.env.USAJOBS_API_KEY;
    const userAgent = ctx.env.USAJOBS_USER_AGENT;
    if (!apiKey || !userAgent) throw new Error('USAJOBS_API_KEY and USAJOBS_USER_AGENT are required');

    const url = new URL(SEARCH_URL);
    if (query.keywords?.length) url.searchParams.set('Keyword', query.keywords.join(' '));
    if (query.near) url.searchParams.set('LocationName', query.near.region);
    if (query.radiusKm) url.searchParams.set('Radius', String(Math.round(query.radiusKm / KM_PER_MILE)));
    url.searchParams.set('ResultsPerPage', String(query.limit ?? 50));

    const res = await ctx.fetch(url, {
      headers: { Host: 'data.usajobs.gov', 'User-Agent': userAgent, 'Authorization-Key': apiKey },
    });
    if (!res.ok) throw new Error(`USAJOBS returned ${res.status}`);
    const json = (await res.json()) as { SearchResult?: { SearchResultItems?: UsaJobsItem[] } };
    const fetchedAt = ctx.now().toISOString();
    return (json.SearchResult?.SearchResultItems ?? []).map((item) => mapUsaJobsItem(item, fetchedAt));
  },
};

export function mapUsaJobsItem(item: UsaJobsItem, fetchedAt: string): Opportunity {
  const d = item.MatchedObjectDescriptor;
  const loc = d.PositionLocation?.[0];
  const pay = d.PositionRemuneration?.[0];
  const schedule = d.PositionSchedule?.[0]?.Name ?? '';
  const hourly = pay && ['PH', 'Per Hour'].includes(pay.RateIntervalCode);
  const remote = !loc || /anywhere|remote|telework/i.test(loc.LocationName);

  return {
    id: `usajobs:${item.MatchedObjectId}`,
    source: { connectorId: 'usajobs', externalId: item.MatchedObjectId, url: d.PositionURI, fetchedAt },
    title: d.PositionTitle,
    description: d.QualificationSummary ?? '',
    category: 'government',
    engagement: engagementFromSchedule(schedule),
    urgency: 'long_term',
    remote,
    location:
      !remote && loc?.Latitude !== undefined && loc.Longitude !== undefined
        ? { lat: loc.Latitude, lng: loc.Longitude, region: loc.LocationName }
        : undefined,
    startsAt: d.PositionStartDate,
    compensation: pay
      ? {
          kind: hourly ? 'hourly' : 'salary_annual',
          amount: Number(pay.MinimumRange),
          maxAmount: Number(pay.MaximumRange),
          currency: 'USD',
        }
      : undefined,
    requiredSkills: [],
    requiredCertifications: [],
    requiredEquipment: [],
    minTrustTier: 'new',
    requiresBackgroundCheck: true,
    headcount: 1,
  };
}

function engagementFromSchedule(schedule: string): EngagementType {
  if (/full/i.test(schedule)) return 'full_time';
  if (/temp|intermittent|seasonal/i.test(schedule)) return 'temp';
  return 'contract';
}
