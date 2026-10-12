// Shared page-test helpers (rule 13): one `test` whose page fails the test on any console
// error or warning, page error or failed request, and an `axe` check that fails on any
// accessibility violation. Specs import `test` and `expect` from here, never from Playwright.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test as base } from '@playwright/test';
import type { Page } from '@playwright/test';

export { expect };

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
 * that stream ends.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
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
    expect(problems, problems.join('\n')).toEqual([]);
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

export async function axeFindings(page: Page): Promise<AxeFinding[]> {
  if (!(await page.evaluate(() => 'axe' in window))) await page.evaluate(AXE_SOURCE);
  return page.evaluate(async ({ tags, skipped }) => {
    const axe = (window as unknown as { axe: { run(ctx: Document, o: object): Promise<{ violations: {
      id: string; help: string; nodes: { target: unknown[] }[] }[] }> } }).axe;
    const rules = Object.fromEntries(skipped.map((id) => [id, { enabled: false }]));
    const results = await axe.run(document, { runOnly: { type: 'tag', values: tags }, rules });
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
export async function expectNoAxeViolations(page: Page, known: string[] = []): Promise<void> {
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
  const stage = page.locator('#stage');
  for (let i = 0; i < 12 && (await stage.getAttribute('data-zoom')) === 'far'; i += 1) await page.keyboard.press('+');
  await expect(stage).not.toHaveAttribute('data-zoom', 'far');
}
