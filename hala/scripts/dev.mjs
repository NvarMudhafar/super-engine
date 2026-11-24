/**
 * hala — runs the chat server (restarting on change) and the Vite dev server together.
 * Open http://localhost:5173 — Vite proxies /ws through to the chat server.
 */
import { spawn } from 'node:child_process';

const serverPort = process.env.HULLO_SERVER_PORT ?? '3001';
const env = { ...process.env, PORT: serverPort, HULLO_SERVER_PORT: serverPort, NODE_ENV: 'development' };

const children = [
  spawn(process.execPath, ['--watch', 'server/index.ts'], { stdio: 'inherit', env }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js'], { stdio: 'inherit', env }),
];

const stop = () => {
  for (const child of children) child.kill('SIGTERM');
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
for (const child of children) child.on('exit', (code) => code && stop());
