import { upworkConnector, usaJobsConnector, type Connector } from '@polymathic/connectors';
import { buildApp } from './app.js';
import { seedData } from './seed.js';
import { MemoryStore } from './store.js';

const connectors: Connector[] = [upworkConnector];
if (process.env.USAJOBS_API_KEY) connectors.push(usaJobsConnector);

const app = buildApp({ store: new MemoryStore(seedData()), connectors });
const port = Number(process.env.PORT ?? 4100);

app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
