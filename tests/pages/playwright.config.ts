// Page tests (rule 13, D-025): open every page of the board and the gallery in a real browser and
// fail on console errors, failed requests, accessibility violations or unexpected visual change.
//
// Chromium only. The tokens use light-dark(), which has been checked in Chromium alone; other
// engines are not verified here. Everything runs on the headless shell; what a full build behaves
// differently in (a sandboxed frame's own process) carries the tag @full-build and runs on each full
// build found too (full-builds.ts), and each run says which it found.
//
// The page is built once (global-setup.ts); then each worker starts its own servers in a child
// process of its own (helpers.ts `test`, servers.ts, serve-boards.ts) on its own block of ports (ports.ts: VB_TEST_PORT, 4468 by
// default, plus ten per worker, so a board you are running yourself on 4466 is never touched and a
// second checkout can run its own copy): the roadmap fixture's board, the performance fixture's and
// an empty project's, fresh for every spec file. No spec sees another's writes, so files run in any
// order, on any number of workers. Specs start their own servers on the same block (chat-server.ts,
// folder-server.ts, app-server.ts, roadmap-server.ts).
// Screenshots are kept in tests/pages/__screenshots__/; update them on purpose with:
// npm run test:pages -- --update-snapshots
import os from 'node:os';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { fullBuilds, fullBuildsSaid } from './full-builds.ts';

const PORT = Number(process.env.VB_TEST_PORT ?? 4468);
/** Workers: VB_TEST_WORKERS, else 5 (each runs a browser and three boards; 5 measured 4.9 min, 3 took 6.4). */
const WORKERS = Number(process.env.VB_TEST_WORKERS ?? 5);
const CHROME = { ...devices['Desktop Chrome'], viewport: { width: 1600, height: 1000 } };
const BUDGETS = 'perf.spec.ts';

const LOCAL_ONLY = ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'];
const FULL = fullBuilds();
if (process.env.TEST_WORKER_INDEX === undefined) console.log(fullBuildsSaid(FULL)); // once, not in each worker

export default defineConfig({
  testDir: '.',
  globalSetup: './global-setup.ts',
  // A file's tests run in order on one worker (they build on each other's writes); files spread.
  workers: WORKERS,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  // Outside the repo (tracker N25): the repo sits in a synced folder, and Dropbox syncing the
  // traces of the 1,000-card board while the run goes on made context teardown time out.
  outputDir: path.join(os.tmpdir(), `vision-board-test-results-${PORT}`),
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFileName}/{arg}-{platform}{ext}',
  use: {
    // baseURL: the worker's main board (helpers.ts `test`).
    // Durations drop to 0ms under reduced motion (tokens.css), so neither axe nor a screenshot
    // ever catches a colour or a card halfway through a transition.
    reducedMotion: 'reduce',
    viewport: { width: 1600, height: 1000 },
    trace: 'retain-on-failure',
    // No network beyond the local servers (rule 18): every other host fails to resolve, so the
    // test browser can't reach Google's services or anything a page might call by mistake.
    launchOptions: { args: LOCAL_ONLY },
  },
  // The performance budgets (perf.spec.ts) run last and alone, on a quiet machine, as they were
  // measured: `budgets` waits for `chromium`, one worker. Both projects are the same browser. A
  // dependency always runs whole, so to run the budgets by themselves: `-- --no-deps perf.spec.ts`;
  // and `--shard` splits only one project at a time: `-- --project=chromium --shard=1/2`.
  projects: [
    { name: 'chromium', use: CHROME, testIgnore: BUDGETS },
    { name: 'budgets', use: CHROME, testMatch: BUDGETS, dependencies: ['chromium'], workers: 1 },
    ...FULL.map(({ name, executable }) => ({
      name, grep: /@full-build/, testIgnore: BUDGETS, workers: 1,
      use: { ...CHROME, launchOptions: { executablePath: executable, args: LOCAL_ONLY } },
    })),
  ],
});
