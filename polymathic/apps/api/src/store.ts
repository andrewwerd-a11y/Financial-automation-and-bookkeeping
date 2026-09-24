import type Anthropic from '@anthropic-ai/sdk';
import { isVisible, type CompletedJob, type Engagement, type Opportunity, type Organization, type PriceObservation, type Quote, type Review, type ServiceRequest, type WorkerProfile } from '@polymathic/core';
import type { SiteSettings } from '@polymathic/sites';
import type { TokenSet } from '@polymathic/connectors';

/** Contact details from a guest (no account) request, e.g. a provider website form. */
export interface GuestContact {
  name: string;
  email?: string;
  phone?: string;
}

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
  readonly requests = new Map<string, ServiceRequest>();
  readonly quotes = new Map<string, Quote>();
  readonly guestContacts = new Map<string, GuestContact>();
  /** Provider websites, keyed by owner (worker or organization id). */
  readonly sites = new Map<string, SiteSettings>();
  /** Real prices paid on the platform; feeds the pricing database. */
  readonly priceObservations: PriceObservation[] = [];
  /** Assistant conversation per user. */
  readonly conversations = new Map<string, Anthropic.Beta.BetaMessageParam[]>();
  readonly pendingAuth = new Map<string, PendingAuth>();
  /** key: `${workerId}:${connectorId}` */
  readonly tokens = new Map<string, TokenSet>();

  constructor(seed?: {
    workers: WorkerProfile[];
    opportunities: Opportunity[];
    organizations?: Organization[];
    priceObservations?: PriceObservation[];
    sites?: SiteSettings[];
  }) {
    seed?.workers.forEach((w) => this.workers.set(w.id, w));
    seed?.opportunities.forEach((o) => this.opportunities.set(o.id, o));
    seed?.organizations?.forEach((o) => this.organizations.set(o.id, o));
    this.priceObservations.push(...(seed?.priceObservations ?? []));
    seed?.sites?.forEach((site) => this.sites.set(site.ownerId, site));
  }

  siteBySlug(slug: string): SiteSettings | undefined {
    return [...this.sites.values()].find((site) => site.slug === slug);
  }

  /** Reviews that have passed the blind period. */
  visibleReviews(now: Date): Review[] {
    return this.reviews.filter((r) => {
      const eng = this.engagements.get(r.engagementId);
      return eng ? isVisible(r, eng, this.reviews, now) : false;
    });
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
