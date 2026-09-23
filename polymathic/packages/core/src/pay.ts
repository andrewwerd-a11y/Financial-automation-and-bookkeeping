import { distanceKm } from './geo.js';
import type { Opportunity, WorkerProfile } from './types.js';

/** Default IRS-style vehicle cost when the worker hasn't set their own (USD/km). */
export const DEFAULT_VEHICLE_COST_PER_KM = 0.43;
const AVERAGE_DRIVING_SPEED_KMH = 50;
const FULL_TIME_HOURS_PER_YEAR = 2080;

export interface PayEstimate {
  /** Advertised pay per hour before fees or travel. */
  grossHourly: number | null;
  /** After the source platform's cut. */
  netHourly: number | null;
  /** After fees, round-trip driving cost, and counting drive time as work time. */
  effectiveHourly: number | null;
  /** Total the worker would take home for the whole job, if knowable. */
  netTotal: number | null;
  roundTripKm: number;
  travelCost: number;
  notes: string[];
}

/**
 * Normalizes any compensation shape into comparable hourly numbers so a $120
 * fixed-price job 40 km away can be ranked honestly against a $28/hr job next door.
 */
export function estimatePay(opp: Opportunity, worker: WorkerProfile): PayEstimate {
  const notes: string[] = [];
  const comp = opp.compensation;
  const roundTripKm = opp.remote || !opp.location ? 0 : 2 * distanceKm(worker.home, opp.location);
  const travelCost = roundTripKm * (worker.vehicleCostPerKm ?? DEFAULT_VEHICLE_COST_PER_KM);
  const travelHours = roundTripKm / AVERAGE_DRIVING_SPEED_KMH;

  if (!comp) {
    notes.push('Pay not listed');
    return { grossHourly: null, netHourly: null, effectiveHourly: null, netTotal: null, roundTripKm, travelCost, notes };
  }

  const hours = opp.estimatedHours;
  let grossHourly: number | null;
  switch (comp.kind) {
    case 'hourly':
      grossHourly = comp.amount;
      break;
    case 'fixed':
      grossHourly = hours ? comp.amount / hours : null;
      if (!hours) notes.push('Fixed price with no time estimate');
      break;
    case 'salary_annual':
      grossHourly = comp.amount / FULL_TIME_HOURS_PER_YEAR;
      break;
  }

  const keep = 1 - (comp.platformFeePct ?? 0) / 100;
  if (comp.platformFeePct) notes.push(`Platform keeps ${comp.platformFeePct}%`);
  const netHourly = grossHourly === null ? null : grossHourly * keep;

  // Salaried roles: commute cost is real but per-day, so only fee-adjust.
  if (comp.kind === 'salary_annual' || !hours || netHourly === null) {
    return {
      grossHourly: round2(grossHourly),
      netHourly: round2(netHourly),
      effectiveHourly: round2(netHourly),
      netTotal: comp.kind === 'fixed' ? round2(comp.amount * keep) : null,
      roundTripKm: round2(roundTripKm) ?? 0,
      travelCost: round2(travelCost) ?? 0,
      notes,
    };
  }

  const netTotal = netHourly * hours - travelCost;
  if (roundTripKm > 0) notes.push(`${Math.round(roundTripKm)} km round trip`);
  return {
    grossHourly: round2(grossHourly),
    netHourly: round2(netHourly),
    effectiveHourly: round2(netTotal / (hours + travelHours)),
    netTotal: round2(netTotal),
    roundTripKm: round2(roundTripKm) ?? 0,
    travelCost: round2(travelCost) ?? 0,
    notes,
  };
}

function round2(n: number | null): number | null {
  return n === null ? null : Math.round(n * 100) / 100;
}
