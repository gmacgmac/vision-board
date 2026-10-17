# FE_02_page-wiring: Page wiring, gallery, end-to-end and safety page tests

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Put app cards on the real board: wire FE_01's frame to BE_02's routes through the page's I/O and
action layers, add the gallery samples, prove PLAN.md § Goal state lines 3, 4a, 4b, 4j and 6 by page
tests, and give this repo's board the calculator.

## Context

PLAN.md rulings 3-7, 10, 13-16 and § Goal state. Wave 2 has landed: read the notes of BE_01, BE_02,
FE_01 and T_01 first (the names they chose are in Shared Foundations).

## Inputs

- **Files to modify / create** (`apps/board/src/board/`; split along seams, about 300 lines a file):
  - a new `app-cards.ts`: creates and removes each app card's frame with `offscreen.ts` and `FAR_K`
    (ruling 14); builds the host context from the page's computed token values and theme; sends
    `host-context-changed` when the theme changes; routes `onEscape` to focus the card.
  - `io.ts` (the one I/O layer): `listApps()` and `callAppTool(app, tool, args)` through the generated
    operations; nothing else calls the server.
  - Allow / Stop app: through the action layer as the other card buttons do (`item-acts.ts` /
    the act path), never a direct fetch; after Allow, refresh the app's state.
  - App state: `list_apps` read on open, on `watch` lines that touch app cards, after Allow/Stop, and
    on a "Retry" in the invalid/broken states; one cache in one module (no second copy of state).
  - `cards.ts` / `draw.ts` / `size.ts`: app cards take their width from `app.w` (the size control is
    hidden; the person's size act ignored for them); measured height as for any card.
  - Past versions: app cards draw the placeholder, read-only (ruling 10).
  - Flag `appCards` off: plain card "App cards are off" (ruling 13).
  - Gallery: a new section `apps/board/src/gallery/app-section.ts` with every state of ruling 10 and a
    live calculator panel (the gallery's server project gets a copy of the example; reuse how the
    gallery fixture is set up); the `kinds` region's `app` node from BE_01 now draws properly.
  - Key help: if any new key exists (Esc out of the panel), list it from the command table.
- **Page tests** (`tests/pages/app-cards.spec.ts`, plus states in `tests/pages/gallery.spec.ts`):
  1. **End to end** (§ Goal state line 3) on a temp project with the example copied in: agent joins,
     draws an app card `calculator` `w 360 h 440` → panel at that size → "needs approval" → Allow →
     type `12*3=` with the keyboard inside the frame → `36` shown → the server call is asserted (count
     the `POST /api/apps/calculator/calls` requests) → History lists it. Light and dark, axe on the
     board, no console errors, no failed requests.
  2. **4a**: from inside the panel, `document.cookie` is empty, `parent.document` access throws,
     `fetch('/api/boards')` fails (assert from a test-only panel in a fixture app).
  3. **4b**: a panel `fetch` to an undeclared https domain is blocked by CSP (assert the CSP violation
     event; no network needed); a declared one is allowed by the header (header test is BE_02's).
  4. **4j**: a message posted to the board by another window (a second frame the test adds) is
     ignored.
  5. Every app card state (ruling 10) with axe light and dark; Tab into the panel and out; Esc from
     the panel returns focus to the card; the frame is not created off screen or below `FAR_K` and is
     created when scrolled into view; a code change (edit `tools.mjs` in the temp project) shows
     "code changed · Allow".
- **This repo's board**: copy the example into this repo's `.visionboard/apps/calculator/`
  (byte-for-byte; a test asserts the copy equals the source so they cannot drift). Then, only if
  `.visionboard/lock` is free or stale (`server/lock.ts` rules), start the board on a spare port with
  `VB_PROJECT` = this repo, join as an agent "app-cards build", draw one container "Apps" with one
  `app` card for `calculator` (360×440) and a short note card explaining it, stop the server; else
  write the one-line instruction in TASK-STATUS.md. Never use port 4466.
- **Patterns to follow**: `offscreen.ts`, `io.ts`, `item-acts.ts`, `cards.ts`, the gallery sections,
  page-test helpers in `tests/pages/helpers.ts`.
- **Skills**: `cortex-architecture` (one I/O layer, one action layer, one state source) ·
  `cortex-docs` (`components.md` § App card wiring, `apps/board/README.md`).

## Steps

1. [ ] Page tests first (they fail: no wiring yet).
2. [ ] Wiring, gallery, flag-off path, past-version placeholder.
3. [ ] This repo's calculator copy and card (as above).
4. [ ] Screenshots: view every diff light and dark before updating; say which changed and why.
5. [ ] Gates one after another: `npm run check`, `npm test`, `npm run verify`,
   `node scripts/gen-api.mjs --check`, `npm run build`, `npm run test:pages` — all exit 0.

## Validation

- [ ] All gates exit 0; the five page tests above exist by name and pass; the page-weight budget
  holds (`npm run verify`).

## Constraints

- No git commits. Deviation: TASK-STATUS.md instruction 5. Only the steps above touch this repo's
  `.visionboard/`.

## Implementation Notes

**Status**: Pending

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-app] FE_02: <what you did> → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/FE_02_page-wiring.md]]`
