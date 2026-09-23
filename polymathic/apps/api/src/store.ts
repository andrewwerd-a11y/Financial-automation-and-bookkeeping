import type { Opportunity, WorkerProfile } from '@polymathic/core';
import type { TokenSet } from '@polymathic/connectors';

export interface PendingAuth {
  workerId: string;
  connectorId: string;
  codeVerifier?: string;
  createdAt: number;
}

/**
 * In-memory store for the prototype. Swap for Postgres (+ PostGIS for geo
 * queries) before anything real; tokens must be encrypted at rest there.
 */
export class MemoryStore {
  readonly workers = new Map<string, WorkerProfile>();
  readonly opportunities = new Map<string, Opportunity>();
  readonly pendingAuth = new Map<string, PendingAuth>();
  /** key: `${workerId}:${connectorId}` */
  readonly tokens = new Map<string, TokenSet>();

  constructor(seed?: { workers: WorkerProfile[]; opportunities: Opportunity[] }) {
    seed?.workers.forEach((w) => this.workers.set(w.id, w));
    seed?.opportunities.forEach((o) => this.opportunities.set(o.id, o));
  }

  listOpportunities(): Opportunity[] {
    return [...this.opportunities.values()];
  }
}
