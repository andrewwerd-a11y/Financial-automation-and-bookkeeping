import Anthropic from '@anthropic-ai/sdk';
import { upworkConnector, usaJobsConnector, type Connector } from '@polymathic/connectors';
import { buildApp } from './app.js';
import { seedData } from './seed.js';
import { MemoryStore } from './store.js';

const connectors: Connector[] = [upworkConnector];
if (process.env.USAJOBS_API_KEY) connectors.push(usaJobsConnector);

// Credentials resolve from ANTHROPIC_API_KEY (or an `ant auth login` profile).
const aiClient = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN ? new Anthropic() : undefined;

const app = buildApp({ store: new MemoryStore(seedData()), connectors, aiClient });
if (!process.env.VAULT_MASTER_KEYS) app.log.warn('VAULT_MASTER_KEYS not set: using a throwaway dev key; vault data will not survive a restart');
const port = Number(process.env.PORT ?? 4100);

app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
