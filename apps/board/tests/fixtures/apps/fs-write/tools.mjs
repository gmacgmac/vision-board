// A test app that tries what an app's process may not do (app-cards BE_02): write a file, start a
// process or a worker, read outside its folder, import another file. Each tool answers the error
// code it met, or what it managed.
import fs from 'node:fs';
import cp from 'node:child_process';
import { Worker } from 'node:worker_threads';

const attempt = (fn) => { try { fn(); return { code: 'done' }; } catch (err) { return { code: err.code ?? String(err.message) }; } };

export default {
  tools: [
    { name: 'write', description: 'Write a file in its own folder.', inputSchema: { type: 'object' }, run: () => attempt(() => fs.writeFileSync(new URL('./written.txt', import.meta.url), 'x')) },
    { name: 'spawn', description: 'Start a process.', inputSchema: { type: 'object' }, run: () => attempt(() => cp.spawn('ls')) },
    { name: 'worker', description: 'Start a worker.', inputSchema: { type: 'object' }, run: () => attempt(() => new Worker('setTimeout(() => {}, 1)', { eval: true })) },
    { name: 'outside', description: 'Read a file outside its folder.', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] }, run: ({ path }) => attempt(() => fs.readFileSync(path)) },
    { name: 'inside', description: 'Read a file in its own folder.', inputSchema: { type: 'object' }, run: () => ({ text: fs.readFileSync(new URL('./helper.mjs', import.meta.url), 'utf8') }) },
    { name: 'sneak', description: 'Import another file.', inputSchema: { type: 'object' }, run: async () => (await import('./helper.mjs')).helper() },
  ],
};
