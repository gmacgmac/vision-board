# 2a_FE_03_page-tests: Page tests and the pattern gallery

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Decision**: D-025 · **Rules**: 11, 13 ·
> **Pattern**: `docs/specification/components.md` § Tests · **Model**: Sonnet 5.5

## Objective

`npm run test:pages` opens every page of the board and the gallery in a real browser and fails
on console errors, failed requests, accessibility violations or unexpected visual change. The
gallery shows every pattern in every state, built from fixture data (rule 11), so 2b's new look
is checked across all states at once.

## Inputs

- **Install** (exact, `--ignore-scripts`, dev): `@playwright/test@1.63.0`, `axe-core@4.13.0`.
  Record both in `docs/specification/dependencies.md` in the same change; remove the "wait for
  their decision (N3)" line. Browsers are already cached on this machine; don't download any.
- **Create**: `apps/board/gallery.html`, `apps/board/src/gallery/` (entry and fixture),
  `tests/pages/playwright.config.ts`, `tests/pages/board.spec.ts`,
  `tests/pages/gallery.spec.ts`, `tests/pages/helpers.ts`
- **Modify**: root `package.json` (`test:pages`), the Vite config (second input), `.gitignore`
  (Playwright output), `tsconfig.json` include, `apps/board/README.md`, `cortex-tasks/tracker.md`
  (delete N3)
- **Reuse**: Uplynk Studio's `tests/playwright.config.ts` and its page specs
  (`~/WORK/uplynk-studio/tests/`) for structure only

## Steps

1. [x] Gallery page: one section per pattern, listed from the patterns' `pattern.json` files.
   `<vb-node>`: every kind × every status, plus pinned, a non-item topic and note, emphasis,
   tags, and one, two and three notes. `<vb-region>`: each mode, with a count, Reset places
   showing and the empty message. Elements come from `defineBoardElements()` and data from a
   fixture ledger through `boardView` and `nodeState`/`regionState`, never hand-written markup.
   Dark and light toggle. No inline styles (CSP).
2. [x] Config: start the board on its own port from a fresh copy of the roadmap fixture ledger
   in a temp folder; Chromium only; screenshots stored under `tests/pages/__screenshots__/`.
3. [x] `helpers.ts`: one fixture that fails the test on any console error, page error or failed
   request, and an `axe` check (inject `axe-core`, run WCAG 2 A and AA rules, fail on any
   violation, except `color-contrast`, which rule 3 replaces with APCA, tracker N1).
4. [x] `board.spec.ts`: the board loads with all cards; ok, drop and comment work and survive a
   reload; each layout mode draws; Tab moves card to card; axe passes; screenshots in dark and
   light. `gallery.spec.ts`: every section renders, axe passes, screenshots in dark and light.
5. [x] Any axe violation in today's UI: don't change UI code. List each one in the notes and mark
   it `test.fail` with a comment naming it, so the suite is green and the gap is visible.

## Validation

- [x] `npm run test:pages` exits 0 twice in a row (the second run compares against the stored
  screenshots); `npm test`, `npm run check`, `npm run verify` exit 0
- [x] Gallery opened by eye (screenshots read, dark and light): every state visible in dark and light

## Constraints

No UI or pattern code changes. No protected files. No commits. Deviation: stop and report.

## Implementation Notes

**Status**: Completed 2026-10-04

**Files**
- Installed (exact, `--ignore-scripts`): `@playwright/test` 1.63.0, `axe-core` 4.13.0; no `^` or `~` in `package.json`. Chromium build 1243 was already cached; no browser downloaded.
- Created: `apps/board/gallery.html`; `apps/board/src/gallery/` (`main.ts`, `fixture.ts`, `dom.ts`, `node-section.ts`, `region-section.ts`, `gallery.css`, `gallery.ledger.jsonl`); `apps/board/tests/gallery-fixture.test.ts` (schema test for the fixture: ledger checks, every act allowed by its node type, every kind/status cell present, a frame per mode); `tests/pages/playwright.config.ts`, `helpers.ts`, `board.spec.ts`, `gallery.spec.ts`; `tests/pages/__screenshots__/` (4 baselines, darwin).
- Modified: `package.json` (`test:pages`, two devDependencies), `package-lock.json`, `apps/board/vite.config.ts` (second input), `tsconfig.json` (include `tests/pages`), `apps/board/README.md`, `docs/specification/dependencies.md` (two rows, summary, N3 line removed), `docs/specification/components.md` (Tests bullet), `cortex-tasks/tracker.md` (N3 deleted). `.gitignore` needed no change: `test-results/` and `playwright-report/` were already ignored.

**Design notes**
- The server runs from `sh -c` in the config: it removes the temp project folder, builds, starts `apps/board/server.ts` on port 4468 with `VB_SEED` set to the roadmap fixture (the server seeds only when the folder has no ledger), and removes the folder when stopped (checked: gone after a run).
- axe is injected with `page.evaluate`, not `addScriptTag`, because the page CSP refuses inline scripts and the tests must not weaken it.
- Rules: WCAG 2 A and AA (tags wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa); `color-contrast` is skipped (rule 3, APCA, tracker N1).
- The page fixture also fails on any response status 400 or above. The only ignored failure is the browser aborting the board's server-sent-events stream on reload or close.
- The gallery passes axe in dark and light with nothing excused.
- Harness drill: a `console.error` planted in the gallery entry failed both gallery axe tests; removed again.

**Axe findings (known failures, marked `test.fail`)**
1. `target-size` (WCAG 2.2 AA 2.5.8), board page, dark and light: 99 elements, the 20 `.vb-mode` layout buttons and the 79 `.vb-act` item buttons. They are drawn under 24 CSS pixels because the opening view is zoomed out to fit; the same buttons pass on the gallery at full size. Two tests, `axe passes with nothing excused (dark|light)`, carry `test.fail`; `axe passes apart from the known failure (dark|light)` excuses only `target-size`, so any other rule still fails the suite.

**Screenshots**: `tests/pages/__screenshots__/gallery.spec.ts/gallery-dark-darwin.png`, `gallery-light-darwin.png`; `tests/pages/__screenshots__/board.spec.ts/board-dark-darwin.png`, `board-light-darwin.png` (all under the repo root).

**Checks**: `npm test` 108 to 112 tests (4 added); `test:pages` 0 to 19 (17 passing, 2 expected failures); `npm run check`, `npm run verify` exit 0; `npm run test:pages` exit 0 on two consecutive runs. No existing test modified.
