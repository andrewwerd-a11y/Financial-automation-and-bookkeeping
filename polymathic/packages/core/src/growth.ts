import { rankOpportunities, type BlockerKind } from './matching.js';
import type { Opportunity, WorkerProfile } from './types.js';

export interface GrowthStep {
  kind: BlockerKind;
  ref?: string;
  label: string;
  /** Jobs where this is the *only* thing standing in the way. */
  unlocksNow: number;
  /** Jobs where this is one of several missing requirements. */
  contributesTo: number;
  /** Sum of net pay across jobs this alone would unlock (where pay is known). */
  unlockedValue: number;
}

/**
 * "What should I learn, buy, or verify next?" — ranks every fixable gap by how
 * much real work it would open up in the worker's current market.
 */
export function growthPlan(worker: WorkerProfile, opps: Opportunity[]): GrowthStep[] {
  const steps = new Map<string, GrowthStep>();

  for (const match of rankOpportunities(worker, opps, { includeIneligible: true })) {
    if (match.eligible) continue;
    // A job blocked by distance or schedule won't be unlocked by a new cert.
    if (match.blockers.some((b) => !b.unlockable)) continue;

    const sole = match.blockers.length === 1;
    for (const b of match.blockers) {
      const key = `${b.kind}:${b.ref ?? ''}`;
      const step = steps.get(key) ?? {
        kind: b.kind,
        ref: b.ref,
        label: labelFor(b.kind, b.ref),
        unlocksNow: 0,
        contributesTo: 0,
        unlockedValue: 0,
      };
      if (sole) {
        step.unlocksNow += 1;
        step.unlockedValue += match.pay.netTotal ?? 0;
      } else {
        step.contributesTo += 1;
      }
      steps.set(key, step);
    }
  }

  return [...steps.values()].sort(
    (a, b) => b.unlocksNow - a.unlocksNow || b.unlockedValue - a.unlockedValue || b.contributesTo - a.contributesTo,
  );
}

function labelFor(kind: BlockerKind, ref: string | undefined): string {
  switch (kind) {
    case 'certification':
      return `Earn certification: ${ref}`;
    case 'equipment':
      return `Acquire equipment: ${ref}`;
    case 'skill':
      return `Level up skill: ${ref}`;
    case 'trust_tier':
      return `Reach ${ref} trust tier`;
    case 'background_check':
      return 'Complete a background check';
    default:
      return kind;
  }
}
