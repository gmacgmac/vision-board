// Where the performance fixture's server listens (playwright.config.ts starts it): one port above
// the main page-test server, so the two never share a ledger.
export const PERF_PORT = Number(process.env.VB_TEST_PORT ?? 4468) + 1;
export const PERF_BASE = `http://127.0.0.1:${PERF_PORT}`;
