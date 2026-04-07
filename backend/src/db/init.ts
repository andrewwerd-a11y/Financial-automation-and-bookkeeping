import { bootstrapDb, getDbFilePath } from './client.js';

bootstrapDb();
console.log(`DB initialized at ${getDbFilePath()}`);
