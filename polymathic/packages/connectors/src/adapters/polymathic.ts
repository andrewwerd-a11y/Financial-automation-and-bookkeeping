import { distanceKm, type Opportunity } from '@polymathic/core';
import type { Connector, OpportunityQuery } from '../types.js';

export interface OpportunitySource {
  list(): Opportunity[];
}

/**
 * Polymathic's own jobs: work it contracts directly (as general contractor)
 * or that businesses and crews post on the platform.
 */
export function createPolymathicConnector(source: OpportunitySource): Connector {
  return {
    id: 'polymathic',
    name: 'Polymathic',
    category: 'native',
    auth: { kind: 'none' },
    capabilities: ['opportunities', 'apply', 'messaging', 'payments'],
    async fetchOpportunities(_ctx, query) {
      return source.list().filter((o) => matchesQuery(o, query));
    },
  };
}

export function matchesQuery(o: Opportunity, q: OpportunityQuery): boolean {
  if (q.categories?.length && !q.categories.includes(o.category)) return false;
  if (q.keywords?.length) {
    const text = `${o.title} ${o.description}`.toLowerCase();
    if (!q.keywords.some((k) => text.includes(k.toLowerCase()))) return false;
  }
  if (o.remote) return q.includeRemote !== false;
  if (q.near && q.radiusKm !== undefined && o.location) {
    return distanceKm(q.near, o.location) <= q.radiusKm;
  }
  return true;
}
