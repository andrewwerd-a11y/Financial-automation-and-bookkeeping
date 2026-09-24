import { bayesianRating } from './trust.js';
import type { Engagement } from './engagement.js';

/**
 * Two-way, verified reviews: workers rate the businesses they work for, and
 * clients rate workers. Only parties to a paid or resolved engagement can
 * review, and reviews stay hidden until both sides submit (or the window
 * closes) so nobody writes a retaliatory review after seeing the other's.
 */
export type ReviewDirection = 'client_to_worker' | 'worker_to_client';

export const CRITERIA: Record<ReviewDirection, readonly string[]> = {
  client_to_worker: ['quality', 'timeliness', 'communication', 'professionalism'],
  worker_to_client: ['paid_on_time', 'scope_accuracy', 'communication', 'site_safety'],
};

export const REVIEW_WINDOW_DAYS = 14;

export interface Review {
  id: string;
  engagementId: string;
  direction: ReviewDirection;
  authorId: string;
  subjectId: string;
  ratings: Record<string, number>;
  comment?: string;
  submittedAt: string;
}

export class ReviewError extends Error {}

export function validateReview(review: Review, eng: Engagement, existing: Review[]): void {
  if (eng.status !== 'paid' && eng.status !== 'refunded') {
    throw new ReviewError('Reviews open once the engagement is paid or resolved');
  }
  const isWorker = eng.workerIds.includes(review.authorId);
  const isClient = eng.clientId === review.authorId;
  if (review.direction === 'client_to_worker' && !(isClient && eng.workerIds.includes(review.subjectId))) {
    throw new ReviewError('Only the client can review a worker on this engagement');
  }
  if (review.direction === 'worker_to_client' && !(isWorker && review.subjectId === eng.clientId)) {
    throw new ReviewError('Only a worker on this engagement can review its client');
  }
  if (existing.some((r) => r.engagementId === eng.id && r.authorId === review.authorId && r.subjectId === review.subjectId)) {
    throw new ReviewError('Already reviewed');
  }
  const unknown = Object.keys(review.ratings).filter((k) => !CRITERIA[review.direction].includes(k));
  if (unknown.length) throw new ReviewError(`Unknown rating criteria: ${unknown.join(', ')}`);
  for (const c of CRITERIA[review.direction]) {
    const v = review.ratings[c];
    if (v === undefined || !Number.isInteger(v) || v < 1 || v > 5) throw new ReviewError(`Rating "${c}" must be 1–5`);
  }
}

/** Blind until both directions are in, or the window since closing has passed. */
export function isVisible(review: Review, eng: Engagement, all: Review[], now = new Date()): boolean {
  if (review.engagementId !== eng.id) return false;
  const onEngagement = all.filter((r) => r.engagementId === eng.id);
  const bothSides =
    onEngagement.some((r) => r.direction === 'client_to_worker') && onEngagement.some((r) => r.direction === 'worker_to_client');
  if (bothSides) return true;
  const closedAt = eng.history.at(-1)?.at ?? eng.createdAt;
  return now.getTime() - Date.parse(closedAt) >= REVIEW_WINDOW_DAYS * 86_400_000;
}

export interface Reputation {
  subjectId: string;
  reviewCount: number;
  /** Confidence-weighted average per criterion. */
  criteria: Record<string, number>;
  overall: number | null;
}

export function reputation(subjectId: string, reviews: Review[]): Reputation {
  const mine = reviews.filter((r) => r.subjectId === subjectId);
  const sums = new Map<string, { total: number; n: number }>();
  for (const r of mine) {
    for (const [k, v] of Object.entries(r.ratings)) {
      const s = sums.get(k) ?? { total: 0, n: 0 };
      s.total += v;
      s.n += 1;
      sums.set(k, s);
    }
  }
  const criteria: Record<string, number> = {};
  for (const [k, s] of sums) criteria[k] = round2(bayesianRating(s.total / s.n, s.n));
  const vals = Object.values(criteria);
  return {
    subjectId,
    reviewCount: mine.length,
    criteria,
    overall: vals.length ? round2(vals.reduce((a, b) => a + b, 0) / vals.length) : null,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
