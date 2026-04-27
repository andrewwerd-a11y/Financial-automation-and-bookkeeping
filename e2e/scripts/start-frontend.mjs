import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const port = process.env.PLAYWRIGHT_FRONTEND_PORT ?? '4173';
const child = spawn(`npm run dev -w frontend -- --host 127.0.0.1 --port ${port}`, {
  cwd: rootDir,
  shell: true,
  stdio: 'inherit',
  env: process.env
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
