import { distanceKm } from './geo.js';
import type { GeoPoint } from './types.js';

/**
 * Pricing database: what common services cost, per unit, adjusted for region,
 * and continuously corrected by real prices paid on the platform.
 *
 * The seed ranges are rough US planning figures so estimates work on day one.
 * As quotes are accepted and jobs are paid in an area, observed prices
 * outweigh the seed (see `estimatePrice`), so the database converges on what
 * work actually costs locally.
 */

export type PriceUnit =
  | 'job'
  | 'hour'
  | 'visit'
  | 'day'
  | 'month'
  | 'room'
  | 'item'
  | 'sqft'
  | 'linear_ft'
  | 'guest';

export interface ServiceDefinition {
  id: string;
  tradeId: string;
  name: string;
  unit: PriceUnit;
  /** Seed per-unit USD range at a regional index of 1.0. */
  seed: { low: number; typical: number; high: number };
  /** Words and phrases customers use when asking for this. */
  keywords: string[];
}

const s = (
  id: string,
  tradeId: string,
  name: string,
  unit: PriceUnit,
  low: number,
  typical: number,
  high: number,
  keywords: string[],
): ServiceDefinition => ({ id, tradeId, name, unit, seed: { low, typical, high }, keywords });

export const SERVICES: ServiceDefinition[] = [
  // Home services & repair
  s('handyman-hourly', 'handyman', 'Handyman (hourly)', 'hour', 55, 75, 110, ['handyman', 'odd jobs', 'fix', 'repair', 'small repairs', 'honey do']),
  s('furniture-assembly', 'furniture-assembly', 'Furniture assembly', 'item', 50, 90, 150, ['assemble', 'assembly', 'ikea', 'furniture', 'bed frame', 'desk']),
  s('tv-mounting', 'tv-mounting', 'TV mounting', 'job', 100, 150, 250, ['tv', 'mount', 'television', 'wall mount', 'soundbar']),
  s('appliance-repair', 'appliance-repair', 'Appliance repair', 'job', 100, 200, 400, ['appliance', 'washer', 'dryer', 'fridge', 'refrigerator', 'dishwasher', 'oven']),
  s('lockout-rekey', 'locksmith', 'Lockout or rekey', 'job', 75, 150, 300, ['locksmith', 'locked out', 'rekey', 'lock', 'deadbolt']),
  s('pest-treatment', 'pest-control', 'Pest treatment', 'visit', 100, 175, 350, ['pest', 'bugs', 'ants', 'roaches', 'termite', 'exterminator', 'rodent', 'mice']),
  s('pool-weekly', 'pool-service', 'Weekly pool service', 'visit', 30, 45, 75, ['pool', 'pool cleaning', 'pool service']),
  s('water-damage', 'restoration', 'Water damage dry-out', 'job', 1000, 2500, 6000, ['water damage', 'flood', 'mold', 'restoration']),

  // Construction trades
  s('interior-painting-room', 'painting-drywall', 'Interior painting', 'room', 300, 500, 900, ['paint', 'painting', 'painter', 'walls', 'repaint']),
  s('drywall-patch', 'painting-drywall', 'Drywall patch & repair', 'job', 120, 250, 500, ['drywall', 'hole in wall', 'patch', 'sheetrock', 'ceiling crack']),
  s('lvp-install', 'flooring', 'Vinyl plank / laminate install', 'sqft', 2, 3.5, 6, ['floor', 'flooring', 'lvp', 'laminate', 'vinyl plank', 'hardwood']),
  s('tile-backsplash', 'tile', 'Tile backsplash', 'sqft', 15, 25, 45, ['backsplash', 'kitchen tile']),
  s('bathroom-tile', 'tile', 'Shower / bathroom tile', 'sqft', 12, 22, 40, ['shower tile', 'bathroom tile', 'tile', 'regrout', 'grout']),
  s('roof-repair', 'roofing', 'Roof repair', 'job', 350, 800, 1800, ['roof', 'roof leak', 'shingle', 'shingles', 'roofer']),
  s('concrete-slab', 'concrete-masonry', 'Concrete slab / patio', 'sqft', 6, 9, 14, ['concrete', 'slab', 'patio', 'pour', 'sidewalk']),
  s('fence-install', 'fencing-decks', 'Fence install', 'linear_ft', 20, 35, 60, ['fence', 'fencing', 'gate']),
  s('deck-build', 'fencing-decks', 'Deck build', 'sqft', 25, 45, 80, ['deck', 'decking', 'pergola']),
  s('electrician-hourly', 'electrical', 'Electrician (hourly)', 'hour', 70, 100, 150, ['electrician', 'outlet', 'wiring', 'breaker', 'light fixture', 'ceiling fan', 'panel']),
  s('plumber-hourly', 'plumbing', 'Plumber (hourly)', 'hour', 70, 110, 160, ['plumber', 'leak', 'clog', 'drain', 'toilet', 'faucet', 'water heater', 'pipe']),
  s('ac-tuneup', 'hvac', 'AC / furnace tune-up', 'visit', 80, 130, 200, ['tune-up', 'hvac maintenance', 'furnace', 'ac service']),
  s('ac-repair', 'hvac', 'AC repair', 'job', 150, 400, 1200, ['ac', 'air conditioner', 'not cooling', 'ac repair', 'hvac', 'heat pump']),
  s('mobile-welding', 'welding', 'Mobile welding', 'hour', 75, 110, 160, ['weld', 'welding', 'welder', 'fabrication', 'railing', 'trailer repair']),
  s('solar-panel-cleaning', 'solar', 'Solar panel cleaning', 'job', 100, 175, 300, ['solar', 'solar panel']),

  // Outdoor
  s('lawn-mowing', 'landscaping', 'Lawn mowing', 'visit', 35, 55, 90, ['mow', 'mowing', 'lawn', 'grass', 'yard work', 'edging']),
  s('yard-cleanup', 'landscaping', 'Yard cleanup', 'job', 150, 350, 700, ['yard cleanup', 'leaves', 'brush', 'weeding', 'mulch']),
  s('tree-trimming', 'tree-care', 'Tree trimming / removal', 'job', 250, 500, 1200, ['tree', 'trim', 'stump', 'branch', 'arborist']),
  s('pressure-wash-house', 'pressure-washing', 'Pressure washing', 'job', 250, 400, 700, ['pressure wash', 'power wash', 'siding', 'driveway cleaning']),
  s('gutter-cleaning', 'gutter-cleaning', 'Gutter cleaning', 'job', 100, 175, 300, ['gutter', 'gutters', 'downspout']),
  s('window-cleaning', 'gutter-cleaning', 'Window cleaning', 'job', 150, 250, 450, ['window cleaning', 'windows']),
  s('snow-plow-driveway', 'snow-removal', 'Driveway snow plowing', 'visit', 40, 65, 120, ['snow', 'plow', 'shovel', 'ice']),
  s('irrigation-repair', 'irrigation', 'Sprinkler repair', 'job', 100, 225, 500, ['sprinkler', 'irrigation', 'drip line']),

  // Moving, hauling, delivery
  s('local-move-2-movers', 'moving', 'Local move (2 movers + truck)', 'hour', 90, 130, 200, ['move', 'moving', 'movers', 'relocate', 'apartment move']),
  s('junk-haul-load', 'junk-removal', 'Junk removal', 'job', 150, 300, 600, ['junk', 'haul', 'haul away', 'cleanout', 'trash', 'dump run']),
  s('courier-delivery', 'delivery', 'Local delivery / courier', 'job', 25, 45, 90, ['deliver', 'delivery', 'courier', 'pick up and drop off']),
  s('hotshot-load', 'hotshot', 'Hotshot load', 'job', 300, 700, 1500, ['hotshot', 'freight', 'haul equipment', 'load']),

  // Cleaning
  s('standard-clean', 'house-cleaning', 'House cleaning', 'visit', 100, 160, 260, ['clean', 'cleaning', 'maid', 'house cleaning', 'housekeeper']),
  s('deep-clean', 'house-cleaning', 'Deep / move-out clean', 'visit', 200, 320, 500, ['deep clean', 'move-out clean', 'move out cleaning']),
  s('office-cleaning', 'commercial-cleaning', 'Office cleaning', 'visit', 120, 200, 400, ['office cleaning', 'janitorial', 'commercial cleaning']),
  s('carpet-clean-room', 'carpet-cleaning', 'Carpet cleaning', 'room', 35, 55, 90, ['carpet', 'upholstery', 'rug', 'stain']),

  // Care
  s('babysitting-hourly', 'childcare', 'Babysitting', 'hour', 16, 22, 30, ['babysit', 'babysitter', 'nanny', 'childcare', 'sitter']),
  s('senior-companion-hourly', 'senior-care', 'Senior companion care', 'hour', 20, 28, 38, ['senior', 'elderly', 'companion', 'caregiver']),
  s('dog-walk', 'pet-care', 'Dog walking', 'visit', 18, 25, 40, ['dog walk', 'dog walker', 'walk my dog']),
  s('pet-sitting-day', 'pet-care', 'Pet sitting', 'day', 30, 50, 80, ['pet sit', 'pet sitting', 'cat sitter', 'house sit']),
  s('mobile-grooming', 'dog-grooming', 'Mobile dog grooming', 'visit', 65, 95, 150, ['grooming', 'groomer', 'dog bath']),
  s('in-home-cna-hourly', 'cna', 'In-home CNA care', 'hour', 25, 32, 45, ['cna', 'nursing assistant', 'home health']),

  // Automotive
  s('car-detail', 'auto-detailing', 'Car detailing', 'job', 100, 175, 300, ['detail', 'detailing', 'car wash', 'interior clean']),
  s('mobile-mechanic-hourly', 'auto-mechanic', 'Mobile mechanic', 'hour', 75, 110, 150, ['mechanic', 'brakes', 'oil change', 'car repair', 'battery', 'check engine']),

  // Events & hospitality
  s('event-staff-hourly', 'event-staffing', 'Event staff', 'hour', 20, 28, 40, ['event staff', 'servers', 'catering staff', 'party help']),
  s('bartender-hourly', 'bartending', 'Bartender', 'hour', 30, 45, 70, ['bartender', 'bartending', 'mixologist']),
  s('catering-per-guest', 'catering', 'Catering', 'guest', 20, 40, 80, ['catering', 'caterer', 'private chef', 'meal prep']),
  s('dj-event', 'av-tech', 'DJ / event sound', 'job', 300, 700, 1500, ['dj', 'sound system', 'speakers', 'pa system']),

  // Creative & tech
  s('photo-session', 'photography', 'Photo session', 'job', 150, 350, 800, ['photographer', 'photos', 'photoshoot', 'headshots', 'portraits']),
  s('real-estate-photos', 'photography', 'Real estate photos', 'job', 125, 225, 400, ['real estate photos', 'listing photos']),
  s('drone-inspection', 'drone-services', 'Drone photo / inspection', 'job', 150, 275, 500, ['drone', 'aerial', 'roof inspection', 'aerial photos']),
  s('event-video', 'videography', 'Event videography', 'job', 500, 1200, 3000, ['videographer', 'video', 'wedding video']),
  s('logo-design', 'graphic-design', 'Logo & brand design', 'job', 150, 500, 1500, ['logo', 'branding', 'graphic design', 'flyer']),
  s('small-business-website', 'web-development', 'Small business website', 'job', 800, 2500, 7000, ['website', 'web site', 'web design', 'landing page']),
  s('it-support-hourly', 'it-support', 'Computer / IT help', 'hour', 60, 90, 140, ['computer', 'it support', 'wifi', 'network', 'printer', 'laptop']),
  s('social-media-monthly', 'marketing', 'Social media management', 'month', 300, 800, 2000, ['social media', 'marketing', 'instagram', 'ads']),

  // Business & professional
  s('monthly-bookkeeping', 'bookkeeping', 'Monthly bookkeeping', 'month', 200, 450, 1000, ['bookkeeping', 'bookkeeper', 'quickbooks', 'reconcile']),
  s('tax-return-schedule-c', 'tax-preparation', 'Self-employed tax return', 'job', 200, 400, 800, ['taxes', 'tax return', 'schedule c', 'tax prep']),
  s('mobile-notary', 'notary', 'Mobile notary', 'job', 50, 125, 200, ['notary', 'notarize', 'loan signing']),
  s('virtual-assistant-hourly', 'data-entry', 'Virtual assistant', 'hour', 18, 28, 45, ['virtual assistant', 'data entry', 'admin help', 'scheduling']),
  s('translation-page', 'translation', 'Document translation', 'item', 25, 40, 70, ['translate', 'translation', 'interpreter']),

  // Education & fitness
  s('tutoring-hourly', 'tutoring', 'Tutoring', 'hour', 30, 50, 90, ['tutor', 'tutoring', 'homework help', 'sat prep', 'math help']),
  s('personal-training-session', 'personal-training', 'Personal training', 'hour', 50, 75, 120, ['personal trainer', 'training session', 'fitness coach']),

  // Security
  s('security-guard-hourly', 'security-guard', 'Security guard', 'hour', 25, 35, 50, ['security guard', 'event security', 'bouncer']),

  // Resale & sourcing
  s('resale-listing', 'resale-sourcing', 'List & sell items for you', 'item', 5, 10, 20, ['sell my stuff', 'list items', 'ebay', 'consign', 'resale']),
  s('estate-sale-setup', 'estate-sales', 'Garage / estate sale setup', 'day', 150, 300, 600, ['estate sale', 'garage sale', 'yard sale', 'downsizing']),
];

const SERVICE_BY_ID = new Map(SERVICES.map((x) => [x.id, x]));

export function getService(id: string): ServiceDefinition | undefined {
  return SERVICE_BY_ID.get(id);
}

export interface RegionIndex {
  id: string;
  name: string;
  center: GeoPoint;
  radiusKm: number;
  /** Cost-of-service multiplier vs. the national seed. Rough seed values. */
  multiplier: number;
}

export const REGIONS: RegionIndex[] = [
  { id: 'austin', name: 'Austin, TX', center: { lat: 30.27, lng: -97.74 }, radiusKm: 70, multiplier: 1.0 },
  { id: 'san-antonio', name: 'San Antonio, TX', center: { lat: 29.42, lng: -98.49 }, radiusKm: 60, multiplier: 0.92 },
  { id: 'dallas', name: 'Dallas–Fort Worth, TX', center: { lat: 32.78, lng: -96.9 }, radiusKm: 80, multiplier: 0.98 },
  { id: 'houston', name: 'Houston, TX', center: { lat: 29.76, lng: -95.37 }, radiusKm: 80, multiplier: 0.97 },
  { id: 'phoenix', name: 'Phoenix, AZ', center: { lat: 33.45, lng: -112.07 }, radiusKm: 80, multiplier: 0.97 },
  { id: 'denver', name: 'Denver, CO', center: { lat: 39.74, lng: -104.99 }, radiusKm: 70, multiplier: 1.08 },
  { id: 'chicago', name: 'Chicago, IL', center: { lat: 41.88, lng: -87.63 }, radiusKm: 80, multiplier: 1.1 },
  { id: 'atlanta', name: 'Atlanta, GA', center: { lat: 33.75, lng: -84.39 }, radiusKm: 80, multiplier: 0.98 },
  { id: 'miami', name: 'Miami, FL', center: { lat: 25.76, lng: -80.19 }, radiusKm: 70, multiplier: 1.05 },
  { id: 'nyc', name: 'New York City, NY', center: { lat: 40.71, lng: -74.01 }, radiusKm: 60, multiplier: 1.35 },
  { id: 'boston', name: 'Boston, MA', center: { lat: 42.36, lng: -71.06 }, radiusKm: 60, multiplier: 1.28 },
  { id: 'la', name: 'Los Angeles, CA', center: { lat: 34.05, lng: -118.24 }, radiusKm: 90, multiplier: 1.25 },
  { id: 'sf-bay', name: 'San Francisco Bay Area, CA', center: { lat: 37.77, lng: -122.42 }, radiusKm: 80, multiplier: 1.4 },
  { id: 'seattle', name: 'Seattle, WA', center: { lat: 47.61, lng: -122.33 }, radiusKm: 70, multiplier: 1.2 },
];

export function regionFor(point: GeoPoint): RegionIndex | undefined {
  return REGIONS.filter((r) => distanceKm(point, r.center) <= r.radiusKm).sort(
    (a, b) => distanceKm(point, a.center) - distanceKm(point, b.center),
  )[0];
}

/** A real price paid or agreed on the platform (per unit, USD). */
export interface PriceObservation {
  serviceId: string;
  unitPrice: number;
  location: GeoPoint;
  at: string;
  source: 'paid_job' | 'accepted_quote' | 'import';
}

export interface PriceEstimate {
  serviceId: string;
  serviceName: string;
  unit: PriceUnit;
  quantity: number;
  perUnit: { low: number; typical: number; high: number };
  total: { low: number; typical: number; high: number };
  basis: {
    region: string | null;
    regionMultiplier: number;
    localObservations: number;
    /** Share of the estimate coming from real local prices rather than the seed. */
    observedWeight: number;
    confidence: 'low' | 'medium' | 'high';
  };
}

/** Observations within this distance count as "local". */
const LOCAL_KM = 80;
const OBSERVATION_MAX_AGE_DAYS = 365;
/** How many local observations it takes for real data to count as much as the seed. */
const PRIOR_STRENGTH = 5;

export function estimatePrice(
  serviceId: string,
  opts: { location?: GeoPoint; quantity?: number; observations?: PriceObservation[]; now?: Date } = {},
): PriceEstimate {
  const service = getService(serviceId);
  if (!service) throw new Error(`Unknown service ${serviceId}`);
  const now = opts.now ?? new Date();
  const quantity = opts.quantity && opts.quantity > 0 ? opts.quantity : 1;
  const region = opts.location ? regionFor(opts.location) : undefined;
  const multiplier = region?.multiplier ?? 1;

  const local = (opts.observations ?? [])
    .filter(
      (o) =>
        o.serviceId === serviceId &&
        (!opts.location || distanceKm(o.location, opts.location) <= LOCAL_KM) &&
        now.getTime() - Date.parse(o.at) <= OBSERVATION_MAX_AGE_DAYS * 86_400_000,
    )
    .map((o) => o.unitPrice)
    .sort((a, b) => a - b);

  const seed = {
    low: service.seed.low * multiplier,
    typical: service.seed.typical * multiplier,
    high: service.seed.high * multiplier,
  };
  const w = local.length / (local.length + PRIOR_STRENGTH);
  const blend = (seedValue: number, observed: number) => (local.length ? w * observed + (1 - w) * seedValue : seedValue);
  const perUnit = {
    low: round2(blend(seed.low, quantile(local, 0.25))),
    typical: round2(blend(seed.typical, quantile(local, 0.5))),
    high: round2(blend(seed.high, quantile(local, 0.75))),
  };

  return {
    serviceId,
    serviceName: service.name,
    unit: service.unit,
    quantity,
    perUnit,
    total: { low: round2(perUnit.low * quantity), typical: round2(perUnit.typical * quantity), high: round2(perUnit.high * quantity) },
    basis: {
      region: region?.name ?? null,
      regionMultiplier: multiplier,
      localObservations: local.length,
      observedWeight: round2(w),
      confidence: local.length >= 15 ? 'high' : local.length >= 5 ? 'medium' : 'low',
    },
  };
}

export type MarketPosition = 'well_below' | 'below' | 'typical' | 'above' | 'well_above';

/** Where a quote sits against the estimate; shown to both customer and provider. */
export function marketPosition(amount: number, estimate: PriceEstimate): { position: MarketPosition; vsTypicalPct: number } {
  const { low, typical, high } = estimate.total;
  const vsTypicalPct = Math.round(((amount - typical) / typical) * 100);
  const position: MarketPosition =
    amount < low * 0.8 ? 'well_below' : amount < low ? 'below' : amount <= high ? 'typical' : amount <= high * 1.25 ? 'above' : 'well_above';
  return { position, vsTypicalPct };
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}

const round2 = (n: number) => Math.round(n * 100) / 100;
