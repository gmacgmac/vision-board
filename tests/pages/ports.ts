// The page suite's port allocator: every server a page test talks to listens on a port of its
// worker's own block, so workers never meet. Worker `slot` (Playwright's TEST_PARALLEL_INDEX, 0 to
// workers - 1, kept by a worker that restarts) gets the ten ports from VB_TEST_PORT + 10 × (slot + 1);
// VB_TEST_PORT (4468 by default) itself is left free, and 4466, the maintainer's board, is never one.
// Each port is fixed for its worker, so a failing test names the board it ran on.
import { DEFAULT_PORT } from '#format';

const BASE = Number(process.env.VB_TEST_PORT ?? 4468);
const BLOCK = 10;
/** Each server's place in the block. */
const OFFSET = { main: 0, perf: 1, empty: 2, chat: 3, folder: 4, app: 5, appsOff: 6, roadmap: 7, chatAgain: 8 } as const;
export type Server = keyof typeof OFFSET;
/** The worker's own boards (servers.ts), fresh for every spec file. */
export const BOARDS = ['main', 'perf', 'empty'] as const;
export type Board = (typeof BOARDS)[number];

/** The ports of worker `slot`'s block. */
export function portsOf(slot: number): Record<Server, number> {
  const first = BASE + BLOCK * (slot + 1);
  if (first <= DEFAULT_PORT && DEFAULT_PORT < first + BLOCK) throw new Error(`VB_TEST_PORT ${BASE} puts worker ${slot} on port ${DEFAULT_PORT}, the maintainer's board`);
  return Object.fromEntries(Object.entries(OFFSET).map(([k, o]) => [k, first + o])) as Record<Server, number>;
}

/** This worker's slot; 0 outside a worker. */
export const SLOT = Number(process.env.TEST_PARALLEL_INDEX ?? 0);
export const PORTS = portsOf(SLOT);
export const baseOf = (port: number): string => `http://127.0.0.1:${port}`;

/** The worker's board on the roadmap fixture: every page test's `baseURL`. */
export const MAIN_BASE = baseOf(PORTS.main);
/** The performance fixture's board (`#format/testing` perfLedger: `big`, 1,000 cards, and `mixed`). */
export const PERF_BASE = baseOf(PORTS.perf);
/** An empty project, no seed: the page waits there for the first board drawn. */
export const EMPTY_BASE = baseOf(PORTS.empty);
