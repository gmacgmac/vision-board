// A worker's main, perf and empty boards (servers.ts), served from a child process of their own, as
// the suite's servers always were: the test process also runs Playwright's driver (tracing, page
// snapshots), and a board server sharing its one thread answers slower, which the performance
// budgets measure. Run by servers.ts with IPC: `reset` starts every board again on fresh copies of
// its template and answers `ready`; `close` stops them, removes the projects and exits.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIXTURE_LEDGERS, makeTempDir, perfLedger } from '#format/testing';
import type { TestBoard } from '#board/testing';
import { startTestBoard } from '#board/testing';
import { writeGalleryImages } from './gallery-images.ts';
import { BOARDS, PORTS } from './ports.ts';
import type { Board } from './ports.ts';

const CALCULATOR = fileURLToPath(new URL('../../skills/vision-board/examples/apps/calculator', import.meta.url));
const projectOf = (name: Board) => path.join(os.tmpdir(), `vision-board-page-tests-${PORTS[name]}`);

/** Each project as its board starts: the roadmap with the calculator app and the gallery's
 *  pictures; the performance fixture; nothing. Made once. */
function templates(): Record<Board, string> {
  const root = makeTempDir('vb-page-templates-');
  const out = Object.fromEntries(BOARDS.map((n) => [n, path.join(root, n)])) as Record<Board, string>;
  const ledger = (name: Board) => path.join(out[name], '.visionboard', 'ledger.jsonl');
  for (const n of BOARDS) fs.mkdirSync(path.join(out[n], '.visionboard'), { recursive: true });
  fs.copyFileSync(FIXTURE_LEDGERS.roadmap, ledger('main'));
  fs.cpSync(CALCULATOR, path.join(out.main, '.visionboard', 'apps', 'calculator'), { recursive: true });
  writeGalleryImages(out.main);
  fs.writeFileSync(ledger('perf'), `${perfLedger().join('\n')}\n`);
  return out;
}

const from = templates();
const running: TestBoard[] = [];

async function stop(): Promise<void> {
  await Promise.all(running.splice(0).map((b) => b.close()));
}

async function reset(): Promise<void> {
  await stop();
  for (const name of BOARDS) {
    const project = projectOf(name);
    fs.rmSync(project, { recursive: true, force: true });
    fs.cpSync(from[name], project, { recursive: true });
    // Never the real home's Kiro agent file (server.ts VB_KIRO_AGENT=0).
    running.push(await startTestBoard({ project, port: PORTS[name], chat: { kiroAgent: false } }));
  }
}

process.on('message', (msg: { type: 'reset' | 'close' }) => {
  if (msg.type === 'reset') void reset().then(() => process.send!({ type: 'ready' }), (err: Error) => process.send!({ type: 'error', message: err.stack ?? err.message }));
  else void stop().then(() => {
    for (const name of BOARDS) fs.rmSync(projectOf(name), { recursive: true, force: true });
    fs.rmSync(path.dirname(from.main), { recursive: true, force: true });
    process.exit(0);
  });
});
process.on('disconnect', () => process.exit(0));
