import type { Capability, ConnectorCategory } from './types.js';

export type AccessPath =
  /** Open API, self-serve key. */
  | 'public_api'
  /** OAuth2 app any developer can register. */
  | 'oauth2'
  /** API exists but requires a partnership / approval. */
  | 'partner_api'
  /** No worker-facing API; reach via a consented earnings/employment aggregator. */
  | 'aggregator'
  /** Nothing programmatic; CSV/email import or manual entry. */
  | 'import_only';

export type IntegrationStatus = 'implemented' | 'scaffolded' | 'planned';

export interface CatalogEntry {
  id: string;
  name: string;
  category: ConnectorCategory;
  access: AccessPath;
  status: IntegrationStatus;
  capabilities: Capability[];
  notes: string;
}

/**
 * The integration map: every system Polymathic intends to broker between,
 * how we can realistically reach it, and where the code stands.
 *
 * Access paths reflect public information at time of writing and must be
 * re-verified before building each adapter — platforms change terms often.
 */
export const INTEGRATION_CATALOG: CatalogEntry[] = [
  // Work sources
  { id: 'polymathic', name: 'Polymathic jobs', category: 'native', access: 'public_api', status: 'implemented', capabilities: ['opportunities', 'apply', 'messaging', 'payments'], notes: 'Our own GC jobs and jobs posted by businesses/crews.' },
  { id: 'usajobs', name: 'USAJOBS', category: 'job_board', access: 'public_api', status: 'implemented', capabilities: ['opportunities'], notes: 'Free key; federal jobs.' },
  { id: 'upwork', name: 'Upwork', category: 'freelance_marketplace', access: 'oauth2', status: 'scaffolded', capabilities: ['opportunities', 'earnings', 'profile', 'reputation'], notes: 'GraphQL API; developer app requires approval.' },
  { id: 'freelancer', name: 'Freelancer.com', category: 'freelance_marketplace', access: 'oauth2', status: 'planned', capabilities: ['opportunities', 'profile'], notes: 'Developer API with OAuth2.' },
  { id: 'thumbtack', name: 'Thumbtack', category: 'local_services', access: 'partner_api', status: 'planned', capabilities: ['opportunities', 'messaging'], notes: 'Partner API for pros\' leads and messages.' },
  { id: 'fiverr', name: 'Fiverr', category: 'freelance_marketplace', access: 'import_only', status: 'planned', capabilities: ['earnings'], notes: 'No public seller API; import earnings statements.' },
  { id: 'taskrabbit', name: 'TaskRabbit', category: 'local_services', access: 'import_only', status: 'planned', capabilities: ['earnings'], notes: 'No public tasker API.' },
  { id: 'adzuna', name: 'Adzuna', category: 'job_board', access: 'public_api', status: 'planned', capabilities: ['opportunities'], notes: 'Job-search API with free tier; broad trades coverage.' },
  { id: 'indeed', name: 'Indeed', category: 'job_board', access: 'partner_api', status: 'planned', capabilities: ['opportunities'], notes: 'Search access restricted to partners.' },
  { id: 'staffing-agencies', name: 'Staffing agencies (Bullhorn-based)', category: 'staffing', access: 'partner_api', status: 'planned', capabilities: ['opportunities'], notes: 'Many agencies run Bullhorn; integrate per-agency.' },

  // Rideshare & delivery: no worker APIs, reach earnings/reputation via aggregators
  { id: 'uber', name: 'Uber (driver/courier)', category: 'rideshare_delivery', access: 'aggregator', status: 'planned', capabilities: ['earnings', 'reputation'], notes: 'Via Argyle/Pinwheel/Truv-style consented connection.' },
  { id: 'lyft', name: 'Lyft', category: 'rideshare_delivery', access: 'aggregator', status: 'planned', capabilities: ['earnings', 'reputation'], notes: 'Via aggregator.' },
  { id: 'doordash', name: 'DoorDash', category: 'rideshare_delivery', access: 'aggregator', status: 'planned', capabilities: ['earnings', 'reputation'], notes: 'Via aggregator.' },
  { id: 'instacart', name: 'Instacart', category: 'rideshare_delivery', access: 'aggregator', status: 'planned', capabilities: ['earnings', 'reputation'], notes: 'Via aggregator.' },
  { id: 'amazon-flex', name: 'Amazon Flex', category: 'rideshare_delivery', access: 'aggregator', status: 'planned', capabilities: ['earnings'], notes: 'Via aggregator.' },
  { id: 'argyle', name: 'Argyle', category: 'earnings_aggregator', access: 'partner_api', status: 'planned', capabilities: ['earnings', 'profile', 'reputation'], notes: 'One integration unlocks hundreds of gig/payroll accounts with user consent.' },

  // Trust & safety
  { id: 'checkr', name: 'Checkr', category: 'verification', access: 'partner_api', status: 'planned', capabilities: ['background_check'], notes: 'FCRA-compliant checks; requires adverse-action workflow.' },
  { id: 'persona', name: 'Persona', category: 'verification', access: 'partner_api', status: 'planned', capabilities: ['identity'], notes: 'ID + selfie verification.' },
  { id: 'credly', name: 'Credly', category: 'credentials', access: 'partner_api', status: 'planned', capabilities: ['profile'], notes: 'Verify digital badges/certifications.' },

  // Money & records
  { id: 'stripe-connect', name: 'Stripe Connect', category: 'payments', access: 'public_api', status: 'planned', capabilities: ['payments'], notes: 'Pay subcontractors, escrow milestones, 1099 reporting.' },
  { id: 'plaid', name: 'Plaid', category: 'accounting', access: 'public_api', status: 'planned', capabilities: ['bookkeeping'], notes: 'Bank feeds for expense/income records.' },
  { id: 'quickbooks', name: 'QuickBooks Online', category: 'accounting', access: 'oauth2', status: 'planned', capabilities: ['bookkeeping'], notes: 'Sync invoices and expenses.' },
  { id: 'google-calendar', name: 'Google Calendar', category: 'calendar', access: 'oauth2', status: 'planned', capabilities: ['availability'], notes: 'Derive availability windows automatically.' },
  { id: 'twilio', name: 'Twilio', category: 'communications', access: 'public_api', status: 'planned', capabilities: ['messaging'], notes: 'Masked calls/SMS, safety check-ins, SOS.' },
  { id: 'xero', name: 'Xero', category: 'accounting', access: 'oauth2', status: 'planned', capabilities: ['bookkeeping'], notes: 'Alternative to QuickBooks for invoices and expenses.' },
  { id: 'google-drive', name: 'Google Drive / Dropbox', category: 'accounting', access: 'oauth2', status: 'planned', capabilities: ['bookkeeping'], notes: 'Import existing documents into the vault.' },

  // Growth, advertising & AI
  { id: 'anthropic', name: 'Claude (Anthropic API)', category: 'communications', access: 'public_api', status: 'implemented', capabilities: ['profile'], notes: 'Assistant: planning, paperwork, research with web search.' },
  { id: 'google-business-profile', name: 'Google Business Profile', category: 'communications', access: 'oauth2', status: 'planned', capabilities: ['profile', 'reputation'], notes: 'Publish verified profiles, posts, and reviews for local search.' },
  { id: 'meta-ads', name: 'Meta (Facebook/Instagram) ads', category: 'communications', access: 'oauth2', status: 'planned', capabilities: ['profile'], notes: 'Generated local ad campaigns; user approves creative.' },
  { id: 'careeronestop', name: 'CareerOneStop (US DOL)', category: 'credentials', access: 'public_api', status: 'planned', capabilities: ['profile'], notes: 'Training programs, licenses, and certifications by state for growth research.' },
];
