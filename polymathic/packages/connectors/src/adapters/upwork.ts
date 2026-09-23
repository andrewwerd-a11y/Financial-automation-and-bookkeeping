import type { Connector } from '../types.js';

/**
 * Upwork: OAuth2 + GraphQL API. The auth flow is wired end to end; job search
 * and earnings mapping land once an Upwork developer app is approved and we
 * can test against the live schema.
 *
 * Endpoints per Upwork's developer docs — re-verify when the app key is issued.
 */
export const upworkConnector: Connector = {
  id: 'upwork',
  name: 'Upwork',
  category: 'freelance_marketplace',
  auth: {
    kind: 'oauth2',
    authorizeUrl: 'https://www.upwork.com/ab/account-security/oauth2/authorize',
    tokenUrl: 'https://www.upwork.com/api/v3/oauth2/token',
    scopes: [],
    pkce: false,
    clientIdEnv: 'UPWORK_CLIENT_ID',
    clientSecretEnv: 'UPWORK_CLIENT_SECRET',
  },
  capabilities: ['opportunities', 'earnings', 'profile', 'reputation'],
};
