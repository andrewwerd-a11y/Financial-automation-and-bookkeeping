import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = path.join(rootDir, 'e2e', '.tmp');
const dbFile = path.join(tempDir, 'playwright.db');
const port = process.env.PLAYWRIGHT_BACKEND_PORT ?? '4100';

fs.mkdirSync(tempDir, { recursive: true });
for (const suffix of ['', '-shm', '-wal']) {
  const candidate = `${dbFile}${suffix}`;
  if (fs.existsSync(candidate)) {
    fs.rmSync(candidate, { force: true });
  }
}

const child = spawn('npm run dev -w backend', {
  cwd: rootDir,
  shell: true,
  stdio: 'inherit',
  env: {
    ...process.env,
    FIN_DB_FILE: dbFile,
    FIN_DB_SEED: '1',
    PORT: port
  }
});

const shutdown = (signal) => {
  if (!child.killed) {
    child.kill(signal);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
