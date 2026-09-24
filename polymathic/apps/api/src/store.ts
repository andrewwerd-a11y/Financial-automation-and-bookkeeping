import type Anthropic from '@anthropic-ai/sdk';
import type { CompletedJob, Engagement, Opportunity, Organization, Review, WorkerProfile } from '@polymathic/core';
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
  readonly organizations = new Map<string, Organization>();
  readonly engagements = new Map<string, Engagement>();
  readonly reviews: Review[] = [];
  readonly completedJobs = new Map<string, CompletedJob[]>();
  /** Assistant conversation per user. */
  readonly conversations = new Map<string, Anthropic.Beta.BetaMessageParam[]>();
  readonly pendingAuth = new Map<string, PendingAuth>();
  /** key: `${workerId}:${connectorId}` */
  readonly tokens = new Map<string, TokenSet>();

  constructor(seed?: { workers: WorkerProfile[]; opportunities: Opportunity[]; organizations?: Organization[] }) {
    seed?.workers.forEach((w) => this.workers.set(w.id, w));
    seed?.opportunities.forEach((o) => this.opportunities.set(o.id, o));
    seed?.organizations?.forEach((o) => this.organizations.set(o.id, o));
  }

  listOpportunities(): Opportunity[] {
    return [...this.opportunities.values()];
  }

  /** Is this user the client itself, or a member of the client organization? */
  actsFor(userId: string, clientId: string, roles?: string[]): boolean {
    if (userId === clientId) return true;
    const org = this.organizations.get(clientId);
    return !!org?.members.some((m) => m.userId === userId && (!roles || roles.includes(m.role)));
  }
}
