// Page tests (rule 13, D-025): open every page of the board and the gallery in a real browser and
// fail on console errors, failed requests, accessibility violations or unexpected visual change.
//
// Chromium only. The tokens use light-dark(), which has been checked in Chromium alone; other
// engines are not verified here.
//
// `webServer` builds the page, then serves it on its own port (4468, so a board you are running
// yourself on 4466 is never touched; VB_TEST_PORT picks another, so a second checkout can run its
// own copy) from a fresh copy of the roadmap fixture ledger in a temp folder. The server seeds the
// project from VB_SEED only when the folder has no ledger yet, so removing the folder first is what
// makes every run start from the same board. The folder is removed again when the server stops.
// A second server (PERF_PORT, one above) serves the performance fixture (perf-ledger.ts: a
// 1,000-card board and a mixed one) the same way, for perf.spec.ts, so the budgets never share a
// ledger with the other tests. It serves the page the first server built: Playwright starts the
// servers one after the other, in this order. A third (EMPTY_PORT, two above) serves an empty
// project, no seed, for live-boards.spec.ts: the page waits there for the first board drawn.
// Screenshots are kept in tests/pages/__screenshots__/; update them on purpose with:
// npm run test:pages -- --update-snapshots
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import { EMPTY_PORT, PERF_PORT } from './perf-server.ts';

const PORT = Number(process.env.VB_TEST_PORT ?? 4468);
const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const PROJECT = path.join(os.tmpdir(), `vision-board-page-tests-${PORT}`);
const PERF_PROJECT = path.join(os.tmpdir(), `vision-board-page-tests-${PERF_PORT}`);
const EMPTY_PROJECT = path.join(os.tmpdir(), `vision-board-page-tests-${EMPTY_PORT}`);
const serve = (start: string) => [
  'rm -rf "$VB_PROJECT"',
  'trap "rm -rf $VB_PROJECT; exit 0" TERM INT EXIT',
  start,
].join('; ');
const SERVE = serve('npm run build && node apps/board/server.ts');
const SERVE_PERF = serve('node tests/pages/perf-ledger.ts "$VB_SEED" && node apps/board/server.ts');
const SERVE_EMPTY = serve('node apps/board/server.ts');
const env = process.env as Record<string, string>;

export default defineConfig({
  testDir: '.',
  // One server, one ledger: the board tests change it, so the files run one after another.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  // Outside the repo (tracker N25): the repo sits in a synced folder, and Dropbox syncing the
  // traces of the 1,000-card board while the run goes on made context teardown time out.
  outputDir: path.join(os.tmpdir(), `vision-board-test-results-${PORT}`),
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFileName}/{arg}-{platform}{ext}',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    // Durations drop to 0ms under reduced motion (tokens.css), so neither axe nor a screenshot
    // ever catches a colour or a card halfway through a transition.
    reducedMotion: 'reduce',
    viewport: { width: 1600, height: 1000 },
    trace: 'retain-on-failure',
    // No network beyond the local servers (rule 18): every other host fails to resolve, so the
    // test browser can't reach Google's services or anything a page might call by mistake.
    launchOptions: { args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1600, height: 1000 } } }],
  webServer: [{
    command: `sh -c '${SERVE}'`,
    url: `http://127.0.0.1:${PORT}/api/boards`,
    reuseExistingServer: false,
    cwd: ROOT,
    env: {
      ...env,
      VB_PORT: String(PORT),
      VB_PROJECT: PROJECT,
      VB_SEED: path.join(ROOT, 'packages/format/fixtures/roadmap.ledger.jsonl'),
    },
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 },
    timeout: 120_000,
  }, {
    command: `sh -c '${SERVE_PERF}'`,
    url: `http://127.0.0.1:${PERF_PORT}/api/boards`,
    reuseExistingServer: false,
    cwd: ROOT,
    env: { ...env, VB_PORT: String(PERF_PORT), VB_PROJECT: PERF_PROJECT, VB_SEED: path.join(PERF_PROJECT, 'seed.ledger.jsonl') },
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 },
    timeout: 60_000,
  }, {
    command: `sh -c '${SERVE_EMPTY}'`,
    url: `http://127.0.0.1:${EMPTY_PORT}/api/boards`,
    reuseExistingServer: false,
    cwd: ROOT,
    env: { ...env, VB_PORT: String(EMPTY_PORT), VB_PROJECT: EMPTY_PROJECT },
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 },
    timeout: 60_000,
  }],
});
