import type { Opportunity, Organization, Place, TrustTier, WorkerProfile } from '@polymathic/core';

const AUSTIN: Place = { lat: 30.2672, lng: -97.7431, region: 'Austin, TX' };
const DOWNTOWN: Place = { lat: 30.2669, lng: -97.7428, region: 'Downtown Austin, TX' };
const EAST_AUSTIN: Place = { lat: 30.2621, lng: -97.7152, region: 'East Austin, TX' };
const NORTH_LAMAR: Place = { lat: 30.3521, lng: -97.7110, region: 'North Austin, TX' };
const SOUTH_CONGRESS: Place = { lat: 30.2340, lng: -97.7560, region: 'South Austin, TX' };
const ROUND_ROCK: Place = { lat: 30.5083, lng: -97.6789, region: 'Round Rock, TX' };
const SAN_MARCOS: Place = { lat: 29.8833, lng: -97.9414, region: 'San Marcos, TX' };
const CEDAR_PARK: Place = { lat: 30.5052, lng: -97.8203, region: 'Cedar Park, TX' };
const PFLUGERVILLE: Place = { lat: 30.4394, lng: -97.62, region: 'Pflugerville, TX' };
const BUDA: Place = { lat: 30.0852, lng: -97.8403, region: 'Buda, TX' };
const WEST_LAKE: Place = { lat: 30.2966, lng: -97.8036, region: 'West Lake Hills, TX' };
const CONVENTION_CENTER: Place = { lat: 30.2638, lng: -97.7394, region: 'Austin Convention Center, TX' };
const SAN_ANTONIO: Place = { lat: 29.4241, lng: -98.4936, region: 'San Antonio, TX' };

/** Demo data so the API is useful before any real connector is authorized. */
export function seedData(now = new Date()) {
  const inHours = (h: number) => new Date(now.getTime() + h * 3_600_000).toISOString();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();

  const workers: WorkerProfile[] = [
    {
      id: 'w_alex',
      displayName: 'Alex R.',
      home: AUSTIN,
      skills: [
        { id: 'drywall', level: 4, evidence: 'platform_history' },
        { id: 'painting', level: 3, evidence: 'platform_history' },
        { id: 'furniture-assembly', level: 4, evidence: 'platform_history' },
        { id: 'moving', level: 3, evidence: 'self_reported' },
        { id: 'hvac', level: 1, evidence: 'self_reported' },
      ],
      certifications: [{ id: 'osha-10', issuer: 'OSHA', verified: true }],
      equipment: [{ id: 'pickup-truck' }, { id: 'power-tools' }],
      availability: {
        availableNow: true,
        windows: [{ start: now.toISOString(), end: inHours(24 * 14) }],
        maxTravelKm: 60,
        remoteOk: false,
      },
      history: {
        completedJobs: 140,
        averageRating: 4.85,
        ratingCount: 118,
        onTimeRate: 0.96,
        cancellations: 3,
        disputesLost: 0,
        firstJobAt: daysAgo(900),
      },
      verification: { identity: true, backgroundCheck: 'clear', insurance: false, businessLicense: false },
      minHourlyRate: 25,
      vehicleCostPerKm: 0.4,
      growthInterests: ['hvac'],
    },
    {
      id: 'w_sam',
      displayName: 'Sam K.',
      home: SAN_MARCOS,
      skills: [
        { id: 'bookkeeping', level: 3, evidence: 'certified' },
        { id: 'data-entry', level: 4, evidence: 'self_reported' },
      ],
      certifications: [],
      equipment: [],
      availability: { availableNow: false, windows: [], maxTravelKm: 20, remoteOk: true },
      history: { completedJobs: 2, averageRating: 5, ratingCount: 2, onTimeRate: 1, cancellations: 0, disputesLost: 0 },
      verification: { identity: true, backgroundCheck: 'none', insurance: false, businessLicense: false },
      growthInterests: ['bookkeeping'],
    },
    {
      id: 'w_maria',
      displayName: 'Maria L.',
      home: PFLUGERVILLE,
      skills: [
        { id: 'customer-service', level: 4, evidence: 'platform_history' },
        { id: 'patient-care', level: 2, evidence: 'self_reported' },
      ],
      certifications: [
        { id: 'food-handler', issuer: 'Texas DSHS-accredited provider', verified: true },
        { id: 'cpr-first-aid', issuer: 'American Red Cross', verified: true },
      ],
      equipment: [{ id: 'car' }],
      availability: {
        availableNow: false,
        windows: [{ start: now.toISOString(), end: inHours(24 * 7) }],
        maxTravelKm: 40,
        remoteOk: false,
      },
      history: { completedJobs: 35, averageRating: 4.9, ratingCount: 30, onTimeRate: 0.97, cancellations: 1, disputesLost: 0, firstJobAt: daysAgo(400) },
      verification: { identity: true, backgroundCheck: 'clear', insurance: false, businessLicense: false },
      growthInterests: ['cna'],
    },
  ];

  const organizations: Organization[] = [
    {
      id: 'org_greenleaf',
      name: 'Greenleaf Property Management',
      kind: 'business',
      home: AUSTIN,
      members: [{ userId: 'u_dana', role: 'owner' }],
      verification: { businessLicense: true, insurance: true, taxIdVerified: true },
    },
    {
      id: 'crew_alex',
      name: "Alex R.'s Crew",
      kind: 'crew',
      home: AUSTIN,
      members: [{ userId: 'w_alex', role: 'lead' }],
      verification: { businessLicense: false, insurance: false, taxIdVerified: false },
    },
  ];

  const base = {
    source: { connectorId: 'polymathic', fetchedAt: now.toISOString() },
    remote: false,
    requiredCertifications: [] as string[],
    requiredEquipment: [] as string[],
    minTrustTier: 'new' as TrustTier,
    requiresBackgroundCheck: false,
    headcount: 1,
  };

  const job = (id: string, fields: Omit<Opportunity, 'id' | 'source' | keyof typeof base> & Partial<typeof base>): Opportunity => ({
    ...base,
    ...fields,
    id,
    source: { ...base.source, externalId: id },
  });

  const opportunities: Opportunity[] = [
    job('pm_assembly_now', {
      title: 'Assemble office furniture — today',
      description: '6 desks and 6 chairs, tools helpful.',
      category: 'handyman',
      engagement: 'gig',
      urgency: 'immediate',
      location: DOWNTOWN,
      estimatedHours: 4,
      compensation: { kind: 'fixed', amount: 240, currency: 'USD' },
      requiredSkills: [{ id: 'furniture-assembly', minLevel: 2 }],
    }),
    job('pm_drywall', {
      title: 'Drywall patch and paint, 3 rooms',
      description: 'Water damage repair in a rental unit.',
      category: 'painting-drywall',
      engagement: 'contract',
      urgency: 'scheduled',
      location: ROUND_ROCK,
      startsAt: inHours(48),
      estimatedHours: 16,
      compensation: { kind: 'hourly', amount: 38, currency: 'USD' },
      requiredSkills: [
        { id: 'drywall', minLevel: 3 },
        { id: 'painting', minLevel: 2 },
      ],
    }),
    job('pm_move_crew', {
      title: 'Office move crew (3 people, box truck required)',
      description: 'Relocate a 12-person office across town.',
      category: 'moving',
      engagement: 'gig',
      urgency: 'scheduled',
      location: EAST_AUSTIN,
      startsAt: inHours(72),
      estimatedHours: 8,
      compensation: { kind: 'hourly', amount: 32, currency: 'USD' },
      requiredSkills: [{ id: 'moving', minLevel: 2 }],
      requiredEquipment: ['box-truck'],
      headcount: 3,
    }),
    job('pm_hvac_helper', {
      title: 'HVAC install helper',
      description: 'Assist a licensed tech with residential condenser swaps.',
      category: 'hvac',
      engagement: 'temp',
      urgency: 'scheduled',
      location: NORTH_LAMAR,
      startsAt: inHours(96),
      estimatedHours: 40,
      compensation: { kind: 'hourly', amount: 27, currency: 'USD' },
      requiredSkills: [{ id: 'hvac', minLevel: 1 }],
      requiredCertifications: ['epa-608'],
    }),
    job('pm_property_maint', {
      title: 'Ongoing property maintenance contract — 40 units',
      description: 'Make-ready turns and work orders for a small landlord.',
      category: 'handyman',
      engagement: 'contract',
      urgency: 'long_term',
      location: SOUTH_CONGRESS,
      estimatedHours: 20,
      compensation: { kind: 'hourly', amount: 35, currency: 'USD' },
      requiredSkills: [{ id: 'drywall', minLevel: 2 }],
      minTrustTier: 'pro',
      requiresBackgroundCheck: true,
      postedBy: 'org_greenleaf',
    }),
    job('pm_sa_tile', {
      title: 'Bathroom tile job',
      description: 'Too far for most Austin workers.',
      category: 'tile',
      engagement: 'gig',
      urgency: 'scheduled',
      location: SAN_ANTONIO,
      startsAt: inHours(30),
      estimatedHours: 10,
      compensation: { kind: 'fixed', amount: 600, currency: 'USD' },
      requiredSkills: [],
    }),
    job('pm_remote_books', {
      title: 'Monthly bookkeeping for a landscaping company',
      description: 'Reconcile 2 accounts, categorize, prep for CPA.',
      category: 'bookkeeping',
      engagement: 'contract',
      urgency: 'long_term',
      remote: true,
      estimatedHours: 10,
      compensation: { kind: 'hourly', amount: 30, currency: 'USD' },
      requiredSkills: [{ id: 'bookkeeping', minLevel: 3 }],
      minTrustTier: 'verified',
    }),
    job('pm_junk', {
      title: 'Garage cleanout & haul-away',
      description: 'One-car garage, mostly boxes and old furniture.',
      category: 'junk-removal',
      engagement: 'gig',
      urgency: 'scheduled',
      location: CEDAR_PARK,
      startsAt: inHours(26),
      estimatedHours: 4,
      compensation: { kind: 'fixed', amount: 280, currency: 'USD' },
      requiredSkills: [],
      requiredEquipment: ['pickup-truck'],
    }),
    job('pm_pressure', {
      title: 'Pressure wash house exterior & driveway',
      description: 'Two-story home, plus a 3-car driveway.',
      category: 'pressure-washing',
      engagement: 'gig',
      urgency: 'scheduled',
      location: PFLUGERVILLE,
      startsAt: inHours(50),
      estimatedHours: 5,
      compensation: { kind: 'fixed', amount: 350, currency: 'USD' },
      requiredSkills: [],
      requiredEquipment: ['pressure-washer'],
    }),
    job('pm_drone', {
      title: 'Drone roof inspection photos',
      description: 'Insurance claim documentation for hail damage.',
      category: 'drone-services',
      engagement: 'gig',
      urgency: 'scheduled',
      location: WEST_LAKE,
      startsAt: inHours(40),
      estimatedHours: 2,
      compensation: { kind: 'fixed', amount: 250, currency: 'USD' },
      requiredSkills: [],
      requiredCertifications: ['faa-part-107'],
      requiredEquipment: ['drone'],
    }),
    job('pm_event', {
      title: 'Conference event staff (6 people)',
      description: 'Registration desk and catering support.',
      category: 'event-staffing',
      engagement: 'gig',
      urgency: 'scheduled',
      location: CONVENTION_CENTER,
      startsAt: inHours(60),
      estimatedHours: 6,
      compensation: { kind: 'hourly', amount: 22, currency: 'USD' },
      requiredSkills: [],
      requiredCertifications: ['food-handler'],
      headcount: 6,
      postedBy: 'org_greenleaf',
    }),
    job('pm_cna', {
      title: 'Weekend CNA shifts at assisted living',
      description: 'Two 12-hour weekend shifts.',
      category: 'cna',
      engagement: 'temp',
      urgency: 'scheduled',
      location: BUDA,
      startsAt: inHours(100),
      estimatedHours: 12,
      compensation: { kind: 'hourly', amount: 24, currency: 'USD' },
      requiredSkills: [],
      requiredCertifications: ['cna-certification'],
      requiresBackgroundCheck: true,
      headcount: 2,
    }),
    job('pm_courier', {
      title: 'Same-day courier route',
      description: 'Pharmacy deliveries, 12–15 stops.',
      category: 'delivery',
      engagement: 'gig',
      urgency: 'immediate',
      location: WEST_LAKE,
      estimatedHours: 5,
      compensation: { kind: 'hourly', amount: 23, currency: 'USD' },
      requiredSkills: [],
    }),
  ];

  return { workers, opportunities, organizations };
}
