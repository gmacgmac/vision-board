// A board server of its own on a fresh copy of the roadmap fixture ledger (the one the worker's main
// board starts from), for a test whose picture must not depend on what the file's earlier tests wrote
// to the main board: its version, its card marks and the "N boards updated" chip the other boards
// raise. Started in the test process on the worker's roadmap port (ports.ts); it serves the page the
// global setup built. Its folder is named like the main board's, so the folder chip draws alike.
// Everything is removed on close.
import { FIXTURE_LEDGERS } from '#format/testing';
import { startTestBoard } from '#board/testing';
import { PORTS } from './ports.ts';

export interface RoadmapServer { base: string; close(): Promise<void> }

export async function startRoadmapServer(): Promise<RoadmapServer> {
  const board = await startTestBoard({ prefix: 'vision-board-page-tests-roadmap-', seed: FIXTURE_LEDGERS.roadmap, port: PORTS.roadmap });
  return { base: board.base, close: board.close };
}
