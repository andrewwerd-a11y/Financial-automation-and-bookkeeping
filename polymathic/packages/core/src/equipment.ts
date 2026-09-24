import { rankOpportunities } from './matching.js';
import { TRADES, type Trade } from './trades.js';
import type { Opportunity, WorkerProfile } from './types.js';

export interface EquipmentItem {
  id: string;
  name: string;
  /** Typical new/used purchase range in USD, for investment planning. */
  costUsd: [number, number];
  /** Commonly available to rent by the day, so a worker can try before buying. */
  rentable: boolean;
  /** Service lines a worker can start or advertise once they own this. */
  serviceIdeas: string[];
}

const e = (id: string, name: string, costUsd: [number, number], rentable: boolean, serviceIdeas: string[] = []): EquipmentItem => ({
  id,
  name,
  costUsd,
  rentable,
  serviceIdeas,
});

/** Cost ranges are rough planning figures, not quotes. */
export const EQUIPMENT: EquipmentItem[] = [
  e('pickup-truck', 'Pickup truck', [8000, 45000], true, ['Junk removal', 'Small moves & deliveries', 'Materials pickup for contractors', 'Marketplace furniture delivery']),
  e('box-truck', 'Box truck', [15000, 60000], true, ['Local moving company', 'Freight/last-mile contracts', 'Estate cleanouts']),
  e('van', 'Cargo van', [10000, 50000], true, ['Mobile trade service', 'Courier routes', 'Mobile detailing/grooming base']),
  e('car', 'Reliable car', [5000, 30000], false, ['Delivery & courier', 'Rideshare', 'Mobile notary', 'Resale sourcing runs']),
  e('trailer', 'Utility trailer', [1000, 6000], true, ['Landscaping route', 'Junk hauling', 'Equipment transport']),
  e('gooseneck-trailer', 'Gooseneck trailer', [8000, 25000], false, ['Hotshot hauling', 'Equipment transport']),
  e('semi-truck', 'Semi truck', [40000, 180000], false, ['Owner-operator freight']),
  e('power-tools', 'Power tool kit', [300, 2500], true, ['Handyman services', 'Assembly & mounting', 'Small repairs']),
  e('miter-saw', 'Miter saw', [150, 900], true, ['Trim & molding install']),
  e('tile-saw', 'Wet tile saw', [200, 1500], true, ['Backsplash & bathroom tile']),
  e('drywall-tools', 'Drywall tool set', [100, 800], false, ['Patch & repair specialist']),
  e('flooring-tools', 'Flooring tools', [200, 1200], true, ['LVP/laminate installs']),
  e('ladders', 'Extension & step ladders', [150, 900], true, ['Gutter cleaning', 'Holiday light install', 'Exterior painting']),
  e('fall-protection-kit', 'Fall protection kit', [150, 600], false),
  e('mixer', 'Concrete mixer', [300, 2500], true, ['Small concrete pads & repairs']),
  e('electrical-tools', 'Electrical tool kit', [300, 2000], false),
  e('plumbing-tools', 'Plumbing tool kit', [300, 2500], false),
  e('hvac-gauges', 'HVAC gauges & recovery', [300, 3000], false, ['Seasonal AC tune-ups']),
  e('welder', 'Welder', [400, 6000], true, ['Mobile welding repairs', 'Custom gates & railings', 'Trailer repair']),
  e('insulation-blower', 'Insulation blower', [1500, 6000], true, ['Attic insulation top-ups']),
  e('stud-finder', 'Stud finder', [20, 100], false),
  e('appliance-tools', 'Appliance repair tools', [200, 1500], false),
  e('lock-tools', 'Locksmith tools', [200, 2000], false, ['Rekeying service']),
  e('sprayer', 'Pesticide sprayer', [100, 1500], false),
  e('pool-kit', 'Pool service kit', [300, 1500], false, ['Weekly pool route']),
  e('inspection-kit', 'Inspection kit (moisture, IR)', [500, 5000], false),
  e('drone', 'Camera drone', [500, 5000], false, ['Real estate aerials', 'Roof inspections', 'Construction progress photos']),
  e('dehumidifier', 'Commercial dehumidifier', [1000, 4000], true),
  e('air-movers', 'Air movers', [150, 400], true),
  e('mower', 'Commercial mower', [1500, 12000], true, ['Lawn care route']),
  e('trimmer', 'String trimmer & blower', [200, 900], true),
  e('trencher', 'Trencher', [2000, 15000], true),
  e('chainsaw', 'Chainsaw', [200, 1200], true, ['Storm cleanup', 'Firewood']),
  e('chipper', 'Wood chipper', [2000, 30000], true),
  e('snow-plow', 'Snow plow', [3000, 8000], false, ['Winter plowing contracts']),
  e('pressure-washer', 'Pressure washer', [300, 4000], true, ['House & driveway washing', 'Fleet washing', 'Deck restoration']),
  e('post-hole-digger', 'Post hole digger', [200, 1500], true, ['Fence repair', 'Mailbox install']),
  e('mechanic-tools', 'Mechanic tool set', [500, 8000], false, ['Mobile oil changes', 'Brake jobs']),
  e('detailing-kit', 'Detailing kit', [300, 2000], false, ['Mobile detailing']),
  e('dolly', 'Appliance dolly', [100, 400], true, ['Appliance delivery']),
  e('moving-blankets', 'Moving blankets & straps', [50, 300], true),
  e('cleaning-kit', 'Cleaning kit', [100, 600], false, ['Move-out cleans', 'Airbnb turnovers']),
  e('floor-machine', 'Floor scrubber/buffer', [500, 5000], true, ['Commercial floor care']),
  e('carpet-extractor', 'Carpet extractor', [800, 6000], true, ['Carpet & upholstery cleaning']),
  e('grooming-kit', 'Grooming kit', [300, 2000], false),
  e('catering-kit', 'Catering kit', [500, 5000], false, ['Private dinners', 'Event catering']),
  e('av-kit', 'AV kit (speakers, mics)', [800, 8000], true, ['DJ / small event sound']),
  e('salon-kit', 'Salon kit', [300, 3000], false, ['Mobile haircuts']),
  e('massage-table', 'Massage table', [150, 800], false, ['Mobile massage']),
  e('camera', 'Camera & lenses', [700, 6000], true, ['Real estate photos', 'Product photos for resellers', 'Event photography']),
  e('lighting-kit', 'Lighting kit', [200, 2000], true),
  e('audio-kit', 'Audio recording kit', [200, 2000], true, ['Podcast production']),
  e('computer', 'Computer', [500, 3000], false, ['Remote bookkeeping', 'Virtual assistance', 'Design & web work']),
  e('vinyl-cutter', 'Vinyl cutter', [300, 3000], false, ['Decals & vehicle lettering']),
  e('phlebotomy-kit', 'Phlebotomy kit', [100, 500], false),
  e('pricing-kit', 'Tagging & pricing kit', [50, 300], false, ['Garage & estate sale setup']),
  e('skid-steer', 'Skid steer', [20000, 70000], true, ['Grading & land clearing', 'Material moving']),
];

const BY_ID = new Map(EQUIPMENT.map((item) => [item.id, item]));

export function getEquipment(id: string): EquipmentItem | undefined {
  return BY_ID.get(id);
}

/** Trades that list this equipment as needed to work independently. */
export function tradesUsing(equipmentId: string): Trade[] {
  return TRADES.filter((tr) => tr.equipment.includes(equipmentId));
}

export interface EquipmentInvestment {
  equipment: EquipmentItem;
  /** Trades where this is the last piece of gear the worker is missing. */
  completesTrades: string[];
  /** Jobs in the current market where this item is the only blocker. */
  unlocksJobs: number;
  unlockedValue: number;
  /** Jobs needed to pay back the midpoint cost, if we can estimate it. */
  paybackJobs: number | null;
}

export interface EquipmentReport {
  /** Trades where the worker already has all the typical gear. */
  equippedFor: { trade: Trade; missingCertifications: string[] }[];
  /** Business ideas unlocked by gear the worker already owns. */
  serviceIdeas: { equipmentId: string; ideas: string[] }[];
  /** Gear worth buying (or renting first), ranked by work it opens up. */
  investments: EquipmentInvestment[];
}

/**
 * Turns "what's in your garage" into work: what you can already sell, and
 * which purchase would open the most paid jobs relative to its cost.
 */
export function equipmentReport(worker: WorkerProfile, market: Opportunity[] = []): EquipmentReport {
  const owned = new Set(worker.equipment.map((x) => x.id));
  const certs = new Set(worker.certifications.map((c) => c.id));

  const equippedFor = TRADES.filter((tr) => tr.equipment.length > 0 && tr.equipment.every((id) => owned.has(id))).map((trade) => ({
    trade,
    missingCertifications: trade.licensing === 'usually' ? trade.certifications.filter((c) => !certs.has(c)) : [],
  }));

  const serviceIdeas = [...owned]
    .map((id) => ({ equipmentId: id, ideas: getEquipment(id)?.serviceIdeas ?? [] }))
    .filter((x) => x.ideas.length > 0);

  // Market evidence: jobs blocked only by one missing piece of equipment.
  const soleEquipmentBlocks = new Map<string, { jobs: number; value: number }>();
  for (const m of rankOpportunities(worker, market, { includeIneligible: true })) {
    if (m.blockers.length !== 1 || m.blockers[0]!.kind !== 'equipment') continue;
    const ref = m.blockers[0]!.ref!;
    const agg = soleEquipmentBlocks.get(ref) ?? { jobs: 0, value: 0 };
    agg.jobs += 1;
    agg.value += m.pay.netTotal ?? 0;
    soleEquipmentBlocks.set(ref, agg);
  }

  const investments: EquipmentInvestment[] = [];
  for (const item of EQUIPMENT) {
    if (owned.has(item.id)) continue;
    const completesTrades = TRADES.filter((tr) => {
      const missing = tr.equipment.filter((id) => !owned.has(id));
      return missing.length === 1 && missing[0] === item.id;
    }).map((tr) => tr.id);
    const evidence = soleEquipmentBlocks.get(item.id) ?? { jobs: 0, value: 0 };
    if (completesTrades.length === 0 && evidence.jobs === 0) continue;

    const avgJobValue = evidence.jobs ? evidence.value / evidence.jobs : 0;
    const midpoint = (item.costUsd[0] + item.costUsd[1]) / 2;
    investments.push({
      equipment: item,
      completesTrades,
      unlocksJobs: evidence.jobs,
      unlockedValue: Math.round(evidence.value),
      paybackJobs: avgJobValue > 0 ? Math.ceil(midpoint / avgJobValue) : null,
    });
  }
  investments.sort(
    (a, b) => b.unlockedValue - a.unlockedValue || b.completesTrades.length - a.completesTrades.length || a.equipment.costUsd[0] - b.equipment.costUsd[0],
  );

  return { equippedFor, serviceIdeas, investments };
}
