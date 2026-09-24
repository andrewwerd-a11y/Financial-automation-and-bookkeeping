/**
 * Core domain model. Every connector normalizes external data into these
 * shapes, so matching, comparison, and recordkeeping never need to know which
 * platform a job or payout came from.
 */

export type Currency = 'USD' | 'CAD' | 'EUR' | 'GBP' | 'AUD';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Place extends GeoPoint {
  /** Human-readable region label, e.g. "Austin, TX". */
  region: string;
}

/** 1 = learning, 2 = competent, 3 = proficient, 4 = expert, 5 = master. */
export type SkillLevel = 1 | 2 | 3 | 4 | 5;

export interface Skill {
  /** Normalized slug, e.g. "drywall", "react", "forklift-operation". */
  id: string;
  level: SkillLevel;
  /** How the level was established; verified skills weigh more in matching. */
  evidence: 'self_reported' | 'platform_history' | 'assessment' | 'certified';
}

export interface Certification {
  /** Normalized slug, e.g. "osha-10", "cdl-a", "epa-608". */
  id: string;
  issuer: string;
  expiresAt?: string;
  verified: boolean;
}

export interface Equipment {
  /** Normalized slug, e.g. "pickup-truck", "box-truck", "scissor-lift". */
  id: string;
  notes?: string;
}

export interface AvailabilityWindow {
  /** ISO timestamps. */
  start: string;
  end: string;
}

export interface Availability {
  /** Worker has toggled "ready for work right now". */
  availableNow: boolean;
  windows: AvailabilityWindow[];
  /** How far the worker is willing to travel, in km. */
  maxTravelKm: number;
  remoteOk: boolean;
}

export interface WorkHistory {
  completedJobs: number;
  /** Average rating on a 1–5 scale across all connected platforms. */
  averageRating: number | null;
  ratingCount: number;
  onTimeRate: number | null;
  cancellations: number;
  disputesLost: number;
  /** ISO date the worker's earliest verified job started. */
  firstJobAt?: string;
}

export interface Verification {
  identity: boolean;
  backgroundCheck: 'none' | 'pending' | 'clear' | 'consider';
  backgroundCheckAt?: string;
  insurance: boolean;
  businessLicense: boolean;
}

export interface WorkerProfile {
  id: string;
  displayName: string;
  home: Place;
  skills: Skill[];
  certifications: Certification[];
  equipment: Equipment[];
  availability: Availability;
  history: WorkHistory;
  verification: Verification;
  /** Minimum effective hourly rate the worker will consider. */
  minHourlyRate?: number;
  /** Cost per km of driving, used for effective-pay comparisons. */
  vehicleCostPerKm?: number;
  /** Trades or categories the worker wants to grow into. */
  growthInterests?: string[];
}

export type EngagementType = 'gig' | 'contract' | 'temp' | 'full_time';
export type Urgency = 'immediate' | 'scheduled' | 'long_term';

export interface Compensation {
  kind: 'hourly' | 'fixed' | 'salary_annual';
  /** For ranges, the low end. */
  amount: number;
  maxAmount?: number;
  currency: Currency;
  /** Percentage the source platform takes from the worker, 0–100. */
  platformFeePct?: number;
}

export interface SkillRequirement {
  id: string;
  minLevel: SkillLevel;
}

export interface OpportunitySource {
  /** Connector id, e.g. "polymathic", "upwork", "usajobs". */
  connectorId: string;
  externalId: string;
  url?: string;
  fetchedAt: string;
}

export interface Opportunity {
  id: string;
  source: OpportunitySource;
  title: string;
  description: string;
  /** Normalized trade/category slug, e.g. "construction", "software", "delivery". */
  category: string;
  engagement: EngagementType;
  urgency: Urgency;
  /** Omitted for fully remote work. */
  location?: Place;
  remote: boolean;
  startsAt?: string;
  estimatedHours?: number;
  compensation?: Compensation;
  requiredSkills: SkillRequirement[];
  requiredCertifications: string[];
  requiredEquipment: string[];
  minTrustTier: TrustTier;
  requiresBackgroundCheck: boolean;
  /** Number of workers needed; >1 means a crew job. */
  headcount: number;
  /** Organization that posted it, when posted on Polymathic by a business or crew. */
  postedBy?: string;
}

export type OrgRole = 'owner' | 'admin' | 'dispatcher' | 'lead' | 'member';

/** A business hiring through Polymathic, or a crew of workers taking jobs together. */
export interface Organization {
  id: string;
  name: string;
  kind: 'business' | 'crew';
  home: Place;
  members: { userId: string; role: OrgRole }[];
  verification: { businessLicense: boolean; insurance: boolean; taxIdVerified: boolean };
  /** Trades a crew offers, or a business commonly hires for. */
  trades?: string[];
}

export type TrustTier = 'new' | 'verified' | 'trusted' | 'pro' | 'elite';

export const TRUST_TIERS: readonly TrustTier[] = ['new', 'verified', 'trusted', 'pro', 'elite'];

export interface EarningsRecord {
  id: string;
  workerId: string;
  connectorId: string;
  externalId: string;
  occurredAt: string;
  gross: number;
  fees: number;
  tips: number;
  currency: Currency;
  hoursWorked?: number;
  distanceKm?: number;
  description?: string;
}
