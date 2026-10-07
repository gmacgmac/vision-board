// Where the performance fixture's server listens (playwright.config.ts starts it): one port above
// the main page-test server, so the two never share a ledger.
export const PERF_PORT = Number(process.env.VB_TEST_PORT ?? 4468) + 1;
export const PERF_BASE = `http://127.0.0.1:${PERF_PORT}`;

// The empty project's server (live-boards.spec.ts): two above, with no seed, so the page opens on a
// project with no boards and waits for the first one drawn.
export const EMPTY_PORT = PERF_PORT + 1;
export const EMPTY_BASE = `http://127.0.0.1:${EMPTY_PORT}`;
