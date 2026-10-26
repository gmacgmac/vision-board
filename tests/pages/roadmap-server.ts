// A board server of its own on a fresh copy of the roadmap fixture ledger (the one the main test
// server starts from), for a test whose picture must not depend on what earlier specs wrote to the
// shared board: its version, its card marks and the "N boards updated" chip the other specs' boards
// raise. Started in the test process on a free port (listen(0)), so it never meets another port; it
// serves the page the main test server built. Its folder is named like the main server's, so the
// folder chip draws alike. Everything is removed on close.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { createBoardServer } from '../../apps/board/server/app.ts';
import { ledgerPath, openLedger } from '../../apps/board/server/ledger.ts';

const DIST = fileURLToPath(new URL('../../apps/board/dist', import.meta.url));
const ROADMAP = fileURLToPath(new URL('../../packages/format/fixtures/roadmap.ledger.jsonl', import.meta.url));

export interface RoadmapServer { base: string; close(): Promise<void> }

export async function startRoadmapServer(): Promise<RoadmapServer> {
  const project = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vision-board-page-tests-roadmap-')));
  const file = ledgerPath(project);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.copyFileSync(ROADMAP, file);
  const server = createBoardServer({ ledger: openLedger(file, () => {}), dist: DIST });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    base: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    async close() {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      fs.rmSync(project, { recursive: true, force: true });
    },
  };
}
