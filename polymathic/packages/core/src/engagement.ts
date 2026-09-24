import type { Currency } from './types.js';

/**
 * The lifecycle of one piece of work, built around one rule: nobody starts
 * work until the client's money is held in escrow. Workers never chase
 * payment; clients never pay for work that wasn't delivered.
 *
 * Money movement itself is delegated to a payment processor (Stripe Connect
 * planned); this module decides *when* money may move.
 */
export type EngagementStatus =
  | 'offered'
  | 'accepted'
  | 'funded'
  | 'in_progress'
  | 'submitted'
  | 'approved'
  | 'paid'
  | 'disputed'
  | 'refunded'
  | 'cancelled';

export type Actor = 'client' | 'worker' | 'platform';

export interface EngagementEvent {
  at: string;
  from: EngagementStatus;
  to: EngagementStatus;
  by: Actor;
  note?: string;
}

export interface Engagement {
  id: string;
  opportunityId: string;
  /** Business, crew, or individual paying for the work. */
  clientId: string;
  workerIds: string[];
  status: EngagementStatus;
  /** Total agreed price for the job. */
  amount: number;
  currency: Currency;
  platformFeePct: number;
  createdAt: string;
  /** When the worker submitted; starts the auto-approval clock. */
  submittedAt?: string;
  history: EngagementEvent[];
}

const TRANSITIONS: { from: EngagementStatus; to: EngagementStatus; by: Actor[] }[] = [
  { from: 'offered', to: 'accepted', by: ['worker'] },
  { from: 'offered', to: 'cancelled', by: ['client', 'worker'] },
  { from: 'accepted', to: 'funded', by: ['client'] },
  { from: 'accepted', to: 'cancelled', by: ['client', 'worker'] },
  // Client backs out after funding but before work starts: full refund.
  { from: 'funded', to: 'refunded', by: ['client', 'worker'] },
  { from: 'funded', to: 'in_progress', by: ['worker'] },
  { from: 'in_progress', to: 'submitted', by: ['worker'] },
  { from: 'in_progress', to: 'disputed', by: ['client', 'worker'] },
  { from: 'submitted', to: 'approved', by: ['client', 'platform'] },
  { from: 'submitted', to: 'disputed', by: ['client'] },
  { from: 'approved', to: 'paid', by: ['platform'] },
  // Disputes are resolved by the platform, in either direction.
  { from: 'disputed', to: 'paid', by: ['platform'] },
  { from: 'disputed', to: 'refunded', by: ['platform'] },
];

export class TransitionError extends Error {}

export function allowedTransitions(status: EngagementStatus, actor: Actor): EngagementStatus[] {
  return TRANSITIONS.filter((t) => t.from === status && t.by.includes(actor)).map((t) => t.to);
}

export function transition(eng: Engagement, to: EngagementStatus, by: Actor, now = new Date(), note?: string): Engagement {
  const rule = TRANSITIONS.find((t) => t.from === eng.status && t.to === to);
  if (!rule) throw new TransitionError(`Cannot move from ${eng.status} to ${to}`);
  if (!rule.by.includes(by)) throw new TransitionError(`${by} cannot move from ${eng.status} to ${to}`);
  const at = now.toISOString();
  return {
    ...eng,
    status: to,
    submittedAt: to === 'submitted' ? at : eng.submittedAt,
    history: [...eng.history, { at, from: eng.status, to, by, note }],
  };
}

/** Days a client has to approve or dispute before the platform approves for them. */
export const AUTO_APPROVE_DAYS = 3;

/** Protects workers from clients who go silent after work is delivered. */
export function autoApproveIfDue(eng: Engagement, now = new Date(), days = AUTO_APPROVE_DAYS): Engagement {
  if (eng.status !== 'submitted' || !eng.submittedAt) return eng;
  const due = Date.parse(eng.submittedAt) + days * 86_400_000;
  return now.getTime() >= due ? transition(eng, 'approved', 'platform', now, `Auto-approved after ${days} days`) : eng;
}

export type EscrowState = 'none' | 'held' | 'released' | 'returned';

/** Where the client's money is right now. */
export function escrowState(status: EngagementStatus): EscrowState {
  switch (status) {
    case 'offered':
    case 'accepted':
    case 'cancelled':
      return 'none';
    case 'funded':
    case 'in_progress':
    case 'submitted':
    case 'approved':
    case 'disputed':
      return 'held';
    case 'paid':
      return 'released';
    case 'refunded':
      return 'returned';
  }
}

export interface Payout {
  gross: number;
  platformFee: number;
  /** Net per worker; crew jobs split evenly unless a split is agreed. */
  perWorker: { workerId: string; net: number }[];
}

export function payoutBreakdown(eng: Engagement): Payout {
  const cents = Math.round(eng.amount * 100);
  const feeCents = Math.round((cents * eng.platformFeePct) / 100);
  const netCents = cents - feeCents;
  const n = eng.workerIds.length;
  const base = Math.floor(netCents / n);
  // Remainder cents go to the first workers so the split always sums exactly.
  const perWorker = eng.workerIds.map((workerId, i) => ({ workerId, net: (base + (i < netCents % n ? 1 : 0)) / 100 }));
  return { gross: cents / 100, platformFee: feeCents / 100, perWorker };
}
