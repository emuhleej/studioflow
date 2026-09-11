import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createServer } from 'vite';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const playwrightCli = path.join(projectRoot, 'node_modules', '@playwright', 'test', 'cli.js');

process.env.VITE_DEMO_MODE = 'true';

const server = await createServer({
  root: projectRoot,
  logLevel: 'error',
  server: {
    host: '127.0.0.1',
    port: 4174,
    strictPort: true,
  },
});

let child;
let closePromise;
const closeServer = () => {
  closePromise ??= server.close();
  return closePromise;
};

const stopAfterSignal = async () => {
  child?.kill();
  await closeServer();
  process.exitCode = 130;
};

process.once('SIGINT', stopAfterSignal);
process.once('SIGTERM', stopAfterSignal);

try {
  await server.listen();
  child = spawn(process.execPath, [playwrightCli, 'test', ...process.argv.slice(2)], {
    cwd: projectRoot,
    env: { ...process.env, VITE_DEMO_MODE: 'true' },
    stdio: 'inherit',
  });

  const exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => resolve(code));
  });
  process.exitCode = exitCode ?? 1;
} finally {
  await closeServer();
}
