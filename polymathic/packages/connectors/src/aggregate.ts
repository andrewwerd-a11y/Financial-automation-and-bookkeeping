import type { Opportunity } from '@polymathic/core';
import type { Connector, ConnectorContext, OpportunityQuery } from './types.js';

export interface AggregatedOpportunity extends Opportunity {
  /** Other sources carrying what looks like the same job (cross-posted listings). */
  alsoListedOn: { connectorId: string; url?: string }[];
}

export interface AggregateResult {
  opportunities: AggregatedOpportunity[];
  /** Per-connector failures. One broken integration never blanks the whole feed. */
  errors: { connectorId: string; message: string }[];
}

/**
 * Fans a query out to every connector that can supply opportunities, then
 * collapses cross-posted duplicates so the worker sees each real job once.
 */
export async function aggregateOpportunities(
  connectors: Connector[],
  contextFor: (connector: Connector) => ConnectorContext,
  query: OpportunityQuery,
): Promise<AggregateResult> {
  const sources = connectors.filter((c) => c.fetchOpportunities);
  const settled = await Promise.allSettled(sources.map((c) => c.fetchOpportunities!(contextFor(c), query)));

  const errors: AggregateResult['errors'] = [];
  const all: Opportunity[] = [];
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') all.push(...r.value);
    else errors.push({ connectorId: sources[i]!.id, message: String((r.reason as Error)?.message ?? r.reason) });
  });

  return { opportunities: dedupe(all), errors };
}

export function dedupe(opps: Opportunity[]): AggregatedOpportunity[] {
  const byKey = new Map<string, AggregatedOpportunity>();
  for (const o of opps) {
    const key = fingerprint(o);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...o, alsoListedOn: [] });
      continue;
    }
    // Keep whichever listing pays the worker more; remember the other.
    const keepNew = netRate(o) > netRate(existing);
    const [winner, loser] = keepNew ? [o, existing] : [existing, o];
    byKey.set(key, {
      ...winner,
      alsoListedOn: [
        ...existing.alsoListedOn,
        { connectorId: loser.source.connectorId, url: loser.source.url },
      ],
    });
  }
  return [...byKey.values()];
}

function fingerprint(o: Opportunity): string {
  const title = o.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const where = o.remote || !o.location ? 'remote' : `${o.location.lat.toFixed(2)},${o.location.lng.toFixed(2)}`;
  const day = o.startsAt?.slice(0, 10) ?? '';
  return `${title}|${where}|${day}`;
}

function netRate(o: Opportunity): number {
  const c = o.compensation;
  return c ? c.amount * (1 - (c.platformFeePct ?? 0) / 100) : 0;
}
