// The contract test (docs/specification/plugin.md): a fake host, written from that spec alone, mounts the built
// folder `dist/plugin/vision-board/` and uses every hook and every tool. `npm run test:plugin`. The folder is built
// first (global-setup.ts). Chromium, as the page tests (tests/pages/playwright.config.ts); `npm run test:plugin:webkit`
// runs the same specs in WebKit, the engine of a host's webview on macOS (a desktop host such as nclite).
import os from 'node:os';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.VB_TEST_PORT ?? 4468);
const WEBKIT = process.env.VB_TEST_BROWSER === 'webkit';

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  globalSetup: './global-setup.ts',
  workers: Number(process.env.VB_TEST_WORKERS ?? 5),
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 45_000,
  reporter: [['list']],
  outputDir: path.join(os.tmpdir(), `vision-board-plugin-results-${PORT}${WEBKIT ? '-webkit' : ''}`),
  use: {
    ...devices[WEBKIT ? 'Desktop Safari' : 'Desktop Chrome'],
    viewport: { width: 1600, height: 1000 },
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    // Chromium's switch that keeps every name but the test host's off the network; WebKit has none.
    ...(!WEBKIT && { launchOptions: { args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] } }),
  },
});
