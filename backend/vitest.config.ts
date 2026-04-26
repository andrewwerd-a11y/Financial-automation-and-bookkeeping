import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    pool: 'forks',
    // DECISION: keep backend tests serial because modules share a process-global DB handle, while each file supplies its own isolated FIN_DB_FILE temp database.
    sequence: { concurrent: false }
  }
});
