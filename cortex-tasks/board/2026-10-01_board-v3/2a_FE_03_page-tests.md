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

1. [ ] Gallery page: one section per pattern, listed from the patterns' `pattern.json` files.
   `<vb-node>`: every kind × every status, plus pinned, a non-item topic and note, emphasis,
   tags, and one, two and three notes. `<vb-region>`: each mode, with a count, Reset places
   showing and the empty message. Elements come from `defineBoardElements()` and data from a
   fixture ledger through `boardView` and `nodeState`/`regionState`, never hand-written markup.
   Dark and light toggle. No inline styles (CSP).
2. [ ] Config: start the board on its own port from a fresh copy of the roadmap fixture ledger
   in a temp folder; Chromium only; screenshots stored under `tests/pages/__screenshots__/`.
3. [ ] `helpers.ts`: one fixture that fails the test on any console error, page error or failed
   request, and an `axe` check (inject `axe-core`, run WCAG 2 A and AA rules, fail on any
   violation, except `color-contrast`, which rule 3 replaces with APCA, tracker N1).
4. [ ] `board.spec.ts`: the board loads with all cards; ok, drop and comment work and survive a
   reload; each layout mode draws; Tab moves card to card; axe passes; screenshots in dark and
   light. `gallery.spec.ts`: every section renders, axe passes, screenshots in dark and light.
5. [ ] Any axe violation in today's UI: don't change UI code. List each one in the notes and mark
   it `test.fail` with a comment naming it, so the suite is green and the gap is visible.

## Validation

- [ ] `npm run test:pages` exits 0 twice in a row (the second run compares against the stored
  screenshots); `npm test`, `npm run check`, `npm run verify` exit 0
- [ ] Gallery opened by eye: every state visible in dark and light

## Constraints

No UI or pattern code changes. No protected files. No commits. Deviation: stop and report.

## Implementation Notes

**Status**: Not started (runs after 2a_FE_02)
