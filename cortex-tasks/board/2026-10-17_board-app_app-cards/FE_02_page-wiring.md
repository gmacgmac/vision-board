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

1. [x] Page tests first (they fail: no wiring yet). Done in the other order: the wiring's first draft came first; the page tests then failed on their own set-up and on the frame's focus ring (deviation 4).
2. [x] Wiring, gallery, flag-off path, past-version placeholder.
3. [x] This repo's calculator copy and card (as above).
4. [x] Screenshots: view every diff light and dark before updating; say which changed and why.
5. [x] Gates one after another: `npm run check`, `npm test`, `npm run verify`,
   `node scripts/gen-api.mjs --check`, `npm run build`, `npm run test:pages` — all exit 0.

## Validation

- [x] All gates exit 0; the five page tests above exist by name and pass; the page-weight budget
  holds (`npm run verify`).

## Constraints

- No git commits. Deviation: TASK-STATUS.md instruction 5. Only the steps above touch this repo's
  `.visionboard/`.

## Implementation Notes

**Status**: Completed (2026-10-18)

**What landed.** Page (`apps/board/src/board/`): `app-state.ts` `createAppStates` (the one copy of
list_apps' answer: read on loading a ledger that names an app, on lines that draw an app card or
allow/stop an app, after Allow/Stop app, on Check again/Restart, and when a tool call is refused
with a problem that says the state moved, so an edited `tools.mjs` shows "Code changed" at the
panel's next call; reads in flight share one more); `app-cards.ts` `createAppCards` (conditions
`{}` → `{ info }` → `{ past: true }`; each frame wired once to `io.ts` `callAppTool` and to Esc →
card; `load()` only while its state shows a panel, the card is on the visible stage and the zoom is
not `isFar`, `unload()` once more than a screen away, hidden, far or panel-less; `watchTheme` →
`lookChanged()`; `[data-app-act]`: Allow/Stop app confirmed per `ACTIONS[...].needsConfirmation`,
sent through the one sender, list_apps re-read, focus to the card, toast; Check again/Restart
re-read and say what they found, focus to the card when the button went); `app-words.ts` (the
words); `io.ts` `listApps`, `callAppTool` (rejects `{ problem, detail }`), `ActFields.app/hash`;
`controller.ts` (still 300 lines), `draw.ts` (`appCards`, `placed` hook), `offscreen.ts`
(`viewBounds`, `outside`, shared), `viewport.ts` (`isFar`, shared), `key-help.ts` + `KeyHelp.svelte`
("Leave an app · Esc", appCards flag), `main.ts` (the two pattern CSS files). Shared constant:
`packages/format/src/apps.ts` `APP_PANEL_PATH`, read by `apps/board/server/apps/panel.ts`
`PANEL_PATH` and `vb-app-frame.ts` (its local constant gone). Gallery: `app-section.ts` (appCards
flag: the example's panel live in a card from the served project, list_apps and call_app_tool
through io.ts, the theme followed); `node-section.ts` gives the matrices' app cards a ready app
(they said "Loading…" forever). Docs: components.md § App card 8-9, apps.md (frame rule, § Kept
true by + `calculator.test.mjs` and the page tests), `apps/board/README.md`.

**Page tests that prove the Goal state** (all pass; servers in `tests/pages/app-server.ts`, ports
4473 and 4474, a temp project with the example copied from the skill folder):
- **Line 3**: `app-cards.spec.ts` › "end to end (light) › end to end: an agent draws the calculator,
  the person allows it, 12*3 comes back as 36 from its tool (light)" and the same "(dark)": panel
  360×440 in `sandbox="allow-scripts"`, needs approval (card ask; `12*3=` typed by keyboard in the
  frame → "Press Allow on the card to calculate"), Allow + confirm, `c12*3=` → "Answer: 36", the
  `POST /api/apps/calculator/calls` bodies counted and read (`evaluate` `12×3`, then `history`),
  History lists "Use 36 from 12×3"; axe on the board and inside the panel; the one 403 before Allow
  is named (`expected`), any other console error or failed request fails it.
- **4a**: `app-safety.spec.ts` › "the panel is isolated › 4a: the panel cannot read the board's
  cookie, storage or page, nor call /api" (from inside the probe panel: origin `null`, cookie and
  localStorage SecurityError, `parent.document` SecurityError, `fetch('/api/boards')` and by full
  URL TypeError).
- **4b**: `app-safety.spec.ts` › "the panel is isolated › 4b: a fetch to a domain the manifest did
  not declare is blocked by the panel's CSP; a declared one is not" (the `securitypolicyviolation`
  event `connect-src https://undeclared.example.com/x`; none for the declared host).
- **4j**: `app-safety.spec.ts` › "4j: a message to the board from any window but the card's own
  frame is ignored" (the card's frame is heard: one POST and an answer; a second frame on the same
  panel route, its Esc, and the board's own window: no POST, no answer, focus unmoved).
- **Line 6** (light and dark, axe each): `app-states.spec.ts` › "every state the app host gives,
  each drawn in its card", "loading: until list_apps answers, each app card says so", "zoomed out
  past FAR_K, no panel runs: …", "off screen, no panel runs: none is made for a card well off
  screen, and one is made once it comes into view", "a past version: app cards are placeholders,
  read-only, with no panel", "Restart, once the agent fixed the code: …"; `app-cards.spec.ts` › "a
  change to the app's code › editing tools.mjs asks again: "Code changed", Allow again, and the
  tool runs", "Stop app asks first, …", "with app cards off, an app card is a plain card that says
  so, and nothing loads" (VB_FLAGS=-appCards on the server, ?flags=-appCards on the page; panel
  route 404, call_app_tool 404); keyboard: "the keyboard: Tab goes from the card into the panel and
  on out of it; Esc in the panel puts focus back on the card"; gallery: `app-gallery.spec.ts` › "app
  frame: the frame before it loads, an app card in every state of ruling 10, and the flag off", "app
  cards: the example calculator runs live in its card, and matches its screenshot (light|dark)",
  "app cards: the gallery's theme button reaches the live panel".

**This repo's board (drawn).** `.visionboard/lock` was free. `.visionboard/apps/calculator/` is a
byte-for-byte copy of the example (`apps/board/tests/repo-example-app.test.ts` keeps them equal).
The board ran on port 4491 with `VB_PROJECT` = this repo (`VB_KIRO_AGENT=0`), agent "app-cards
build" joined and drew a board of its own, **"App cards"** (`app-cards`), container "Apps": card 1
the `calculator` app (360×440) and card 2 a note, "Try the calculator" ("An app the agent built,
running in its card. Press **Allow**, then type a sum and press **=**. **Stop app** turns it off.
Its code: `.visionboard/apps/calculator/`"); ledger seq 192-196, plus seq 197 (the person's board
seen, from my look at it light and dark). Then the server was stopped (lock released).

**Deviations, all inside the rulings:**
1. Page tests in four files (300-line rule): `app-cards.spec.ts`, `app-states.spec.ts`,
   `app-safety.spec.ts`, `app-gallery.spec.ts` (the task's "states in gallery.spec.ts": that file
   is at 300 lines). Their own server, `tests/pages/app-server.ts` (as `chat-server.ts`).
2. A test-only fixture app, `apps/board/tests/fixtures/apps/probe/` (handshake only; an `echo`
   tool; one declared connect domain), as the task asks for 4a.
3. `tests/pages/helpers.ts`: a `test.use({ expected: { problems: [...] } })` option naming the
   refusals a test causes on purpose (CSP blocks, the 403 before Allow; an object, since Playwright
   reads an array there as a fixture tuple); axe runs with `iframes: false` (axe's messages to an
   opaque-origin frame each log a console warning) and a panel is checked by passing its Frame.
4. FE_01's element, fixed: Chromium never matches `:focus-within` on a frame of another origin, so
   the "keys go to the app" ring never showed. `vb-app-frame` now sets `data-focus-in` from the
   window's blur and focus (`app-frame.css`, `pattern.json`, components.md). Found by the
   accessibility review; page-tested.
5. The key list's Esc row is in key-help.ts `OTHER` (Esc in a panel is neither a command nor an
   action; the file's own rule), behind the appCards flag.
6. This repo's card is on a new board of the agent's own: the repo's three boards were drawn by
   other agents, so drawing on them needs the person's grant.
7. `playwright.config.ts` copies the example into the main test project (the gallery's live
   panel); the full gallery screenshot adds `-appCards` (the live section has its own screenshots).
8. `offscreen.ts` `viewBounds`/`outside` and `viewport.ts` `isFar` were extracted so the frames
   reuse the board's own bounds and far rule, not a copy.

**Design reviews** (live board card and gallery section, light and dark): design-critique (no
critical finding; the flow reads: panel, ask, confirm, toast, focus on the card), accessibility-review
(fixed: the frame's focus ring, and focus lost when Check again/Restart redraws the state view),
ux-copy (fixed: "The agent changed this app since you allowed it.", "It stops now and won't run
until you allow it again.", "<App> updated", "<App> is still stopped.", key row "Leave an app").

**Screenshots** (each diff viewed light and dark): `gallery-{light,dark}` (only the node section's
four app cards: the endless "Loading…" became the frame placeholder with the card's title);
`key-bubble-open-{light,dark}`, `key-bubble-gallery-{light,dark}` (only the new "Leave an app ·
Esc" row, the bubble 21px taller). New: `app-gallery.spec.ts/app-cards-{light,dark}`.

**Known limits** (proposed tracker rows, not fixed): (a) a page with app cards on against a server
with them off (`VB_FLAGS=-appCards`, page flag on) loads the panel route's 404 into the frame; the
page can't tell the server's flag. (b) Match card widths can widen an app card; the panel keeps its
size at the card's left (the layout's box stays the drawn box). (c) Focus moved by pointer straight
from one panel into another keeps the first frame's ring until focus returns to the board (no window
event between). (d) Page weight 146.1 KB of 150 KB gzip.

**Gates** (one after another, after the last change; BE_03's finished files in the tree): `npm run
check` 0; `npm test` 1451 + 7 pass; `npm run verify` 0 warnings; `node scripts/gen-api.mjs --check`
current; `npm run build` 0; `npm run test:pages` 505 passed (first full run: 499 passed and the 6
screenshots above, viewed and re-baselined). No runner, server or browser of this run left running.

**Long File Strategy**: the spec files, the server helper and these notes were written in chunks of
under about 60 lines; `app-cards.ts` (about 175 lines), `app-state.ts` and `app-section.ts` each went
in one write over 50 lines, with no connection error.

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-app] FE_02: <what you did> → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/FE_02_page-wiring.md]]`
