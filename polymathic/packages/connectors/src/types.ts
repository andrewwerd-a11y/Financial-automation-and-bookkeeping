import type { EarningsRecord, Opportunity, Place } from '@polymathic/core';

export type ConnectorCategory =
  | 'native'
  | 'freelance_marketplace'
  | 'local_services'
  | 'rideshare_delivery'
  | 'job_board'
  | 'staffing'
  | 'earnings_aggregator'
  | 'verification'
  | 'payments'
  | 'accounting'
  | 'calendar'
  | 'communications'
  | 'credentials';

export type Capability =
  | 'opportunities'
  | 'apply'
  | 'earnings'
  | 'profile'
  | 'reputation'
  | 'messaging'
  | 'availability'
  | 'payments'
  | 'identity'
  | 'background_check'
  | 'bookkeeping';

export type AuthSpec =
  | { kind: 'none' }
  | { kind: 'api_key'; envVars: string[] }
  | {
      kind: 'oauth2';
      authorizeUrl: string;
      tokenUrl: string;
      scopes: string[];
      pkce: boolean;
      clientIdEnv: string;
      clientSecretEnv?: string;
    }
  /** The platform has no worker-facing API; data arrives through a consented aggregator. */
  | { kind: 'aggregator'; via: string };

/** Per-call context. Credentials are resolved by the caller, never stored on the connector. */
export interface ConnectorContext {
  accessToken?: string;
  apiKey?: string;
  env: Record<string, string | undefined>;
  fetch: typeof fetch;
  now: () => Date;
}

export interface OpportunityQuery {
  near?: Place;
  radiusKm?: number;
  keywords?: string[];
  categories?: string[];
  includeRemote?: boolean;
  limit?: number;
}

export interface DateRange {
  from: string;
  to: string;
}

export interface Connector {
  id: string;
  name: string;
  category: ConnectorCategory;
  auth: AuthSpec;
  capabilities: Capability[];
  fetchOpportunities?(ctx: ConnectorContext, query: OpportunityQuery): Promise<Opportunity[]>;
  fetchEarnings?(ctx: ConnectorContext, workerId: string, range: DateRange): Promise<EarningsRecord[]>;
}
