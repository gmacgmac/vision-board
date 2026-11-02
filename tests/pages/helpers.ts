// Shared page-test helpers (rule 13): one `test` whose page fails the test on any console
// error or warning, page error or failed request, and an `axe` check that fails on any
// accessibility violation. Specs import `test` and `expect` from here, never from Playwright.
// The same `test` gives each worker its own servers (servers.ts, on its ports, ports.ts), fresh for
// every spec file, and points `baseURL` at the worker's main board.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test as base } from '@playwright/test';
import type { Frame, Page } from '@playwright/test';
import { MAIN_BASE } from './ports.ts';
import type { WorkerBoards } from './servers.ts';
import { workerBoards } from './servers.ts';
import { prefixOf } from '../../apps/board/src/board/mount-ids.ts';

export { expect };

/** The selector of an id the board owns. Every one starts with its mount's prefix (`mount-ids.ts`), the page's one board being the first mount; the shell's own ids (`#chat-toggle`, `#toast`) have none. */
export const bid = (id: string): string => `#${prefixOf(1)}${id}`;

/**
 * axe-core is injected straight from node_modules; no Playwright wrapper package is installed.
 * It goes in through `page.evaluate`, not `addScriptTag`: the page's CSP (rule 18) refuses an
 * inline <script>, and the tests must not weaken it.
 */
const AXE_SOURCE = readFileSync(
  fileURLToPath(new URL('../../node_modules/axe-core/axe.min.js', import.meta.url)), 'utf8',
);

/** WCAG 2 A and AA (2.0, 2.1 and 2.2). Rule 5. */
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * Contrast is APCA here (rule 3, tracker N1), which axe cannot measure; its WCAG 2 ratio check
 * would judge the same colours by a different rule and disagree. Everything else stays on.
 */
const SKIPPED_RULES = ['color-contrast'];

/**
 * The page under test fails its test on: a console error or warning, an uncaught page error, a
 * request that failed, or a response of 400 or above. One case is not a failure: the browser
 * aborts the board's server-sent-events stream when the page reloads or closes, which is how
 * that stream ends. A test that causes a refusal on purpose (an app's panel blocked by its CSP, a
 * tool call before Allow) names each problem it expects with `test.use({ expected: { problems: [...] } })`
 * (an object: Playwright reads an array there as a fixture's value and options); every other
 * problem still fails it.
 */
export const test = base.extend<{ expected: { problems: RegExp[] }; fresh: void }, { boards: WorkerBoards }>({
  expected: [{ problems: [] }, { option: true }],
  boards: [async ({}, use) => {
    const boards = workerBoards();
    await use(boards);
    await boards.close();
  }, { scope: 'worker' }],
  /** Fresh boards for each spec file, before anything in the file's first test runs. */
  fresh: [async ({ boards }, use, info) => {
    await boards.forFile(info.file);
    await use();
  }, { auto: true }],
  baseURL: MAIN_BASE,
  page: async ({ page, expected, fresh: _ }, use) => {
    const problems: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') problems.push(`console ${msg.type()}: ${msg.text()}`);
    });
    page.on('pageerror', (err) => problems.push(`page error: ${err.message}`));
    page.on('requestfailed', (req) => {
      const text = req.failure()?.errorText ?? 'failed';
      if (req.resourceType() === 'eventsource' && text === 'net::ERR_ABORTED') return;
      problems.push(`request failed: ${req.method()} ${req.url()} (${text})`);
    });
    page.on('response', (res) => {
      if (res.status() >= 400) problems.push(`response ${res.status()}: ${res.request().method()} ${res.url()}`);
    });
    await use(page);
    const unexpected = problems.filter((p) => !expected.problems.some((e) => e.test(p)));
    expect(unexpected, unexpected.join('\n')).toEqual([]);
  },
});

export type Theme = 'light' | 'dark';

/** Picks the theme the way a visitor's system does (prefers-color-scheme), not by forcing an attribute. */
export const setTheme = (page: Page, theme: Theme) => page.emulateMedia({ colorScheme: theme });

export interface AxeFinding {
  id: string;
  help: string;
  targets: string[];
}

/** axe on a page, or on one frame of it. Frames are left to their own run (`iframes: false`): an app's
 * panel has an opaque origin, which axe's messages to frames can't name (a console warning each),
 * so a test checks the panel by passing its Frame here. */
export async function axeFindings(page: Page | Frame): Promise<AxeFinding[]> {
  if (!(await page.evaluate(() => 'axe' in window))) await page.evaluate(AXE_SOURCE);
  return page.evaluate(async ({ tags, skipped }) => {
    const axe = (window as unknown as { axe: { run(ctx: Document, o: object): Promise<{ violations: {
      id: string; help: string; nodes: { target: unknown[] }[] }[] }> } }).axe;
    const rules = Object.fromEntries(skipped.map((id) => [id, { enabled: false }]));
    const results = await axe.run(document, { runOnly: { type: 'tag', values: tags }, rules, iframes: false });
    return results.violations
      .filter((v) => !skipped.includes(v.id))
      .map((v) => ({ id: v.id, help: v.help, targets: v.nodes.map((n) => n.target.join(' ')) }));
  }, { tags: WCAG, skipped: SKIPPED_RULES });
}

const describe = (found: AxeFinding[]) =>
  found.map((v) => `${v.id}: ${v.help}\n  ${v.targets.slice(0, 5).join('\n  ')}${v.targets.length > 5 ? `\n  (+${v.targets.length - 5} more)` : ''}`).join('\n');

/**
 * Fails on any axe violation, naming the rule and the elements. `known` lists rule ids already
 * recorded as a failing test elsewhere (test.fail), so the suite stays green while a new rule
 * still fails it.
 */
export async function expectNoAxeViolations(page: Page | Frame, known: string[] = []): Promise<void> {
  const found = (await axeFindings(page)).filter((v) => !known.includes(v.id));
  expect(found, describe(found)).toEqual([]);
}

/** Open the selection bar from its pill (selectionPill flag, stage5-follow-ups FE_02), so its
 *  buttons show; with the flag off, or the bar already open, it does nothing. */
export async function openSelectionBar(page: Page): Promise<void> {
  const pill = page.locator('vb-selection-bar .vb-sb-pill');
  if (await pill.count() && (await pill.getAttribute('aria-expanded')) === 'false') await pill.click();
}

/** Zoom in with the + key until the board is no longer zoomed out, so the cards' buttons, the size control
 *  and the containers' icon rows are drawn (hideControlsZoomedOut flag, on by default, tracker N13). */
export async function zoomToControls(page: Page): Promise<void> {
  const stage = page.locator(bid('stage'));
  for (let i = 0; i < 12 && (await stage.getAttribute('data-zoom')) === 'far'; i += 1) await page.keyboard.press('+');
  await expect(stage).not.toHaveAttribute('data-zoom', 'far');
}
