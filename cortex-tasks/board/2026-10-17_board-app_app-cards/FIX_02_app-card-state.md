# FIX_02_app-card-state: App cards follow their files and never jump

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Fix VERIFY_01 findings 1, 2, 3 and 6 (TASK-STATUS.md § VERIFY_01, with steps and screenshots): an app
card shows its app's real state without the person trying the app first, a past version keeps the
panel's size, and no state change moves the card.

## Context

The page keeps one copy of `list_apps` (`apps/board/src/board/app-state.ts`, FE_02) and reads it again only
on app ledger lines, Allow/Stop, Check again/Restart and a refused call. So a deleted folder, a restored
folder or a changed `tools.mjs` stays unseen. Page weight is 149.7 of 150 KB gzip after FIX_01's few
bytes: keep the change small and trim within the app-card code if needed; never raise the budget. If the
budget truly cannot hold, report DEVIATION with the smallest option.

## Inputs

- **Finding 1** (rulings 10, 11): a deleted app folder never says "not found"; the frame reloads to a
  blank grey box because the panel route's 404 carries the page's `frame-ancestors 'none'`; restoring the
  folder never heals the card. Fix: read `list_apps` again when a frame loads or fails to load; give the
  `missing` state a Check again button (copy from `node-app.ts` `COPY`, plain words); the panel route's 404
  (`apps/board/server/apps/panel.ts`) carries the panel's own frame headers (`frame-ancestors 'self'`) so a
  failed load is seen, not blank.
- **Finding 2** (ruling 7, 11): a changed `tools.mjs` shows "Code changed. Allow it again?" only after
  the person presses `=`. Fix: read `list_apps` again when an app card is selected (select hook in
  `draw.ts` or wherever selection is handled) and when its frame loads (same seam as 1). One read for many
  cards selected at once; no timers, no polling.
- **Finding 3** (rulings 3, 10): a past version draws app cards at 360×320, ignoring the manifest size.
  Fix: `app-cards.ts` `input()` keeps the app's known `info` (its `size`) with `past: true`; assert the
  size in `tests/pages/app-states.spec.ts` "a past version".
- **Finding 6** (great UX; components.md § App card's claim "a state change never moves the card"):
  Allow removes the ask line, the card shrinks 44 px and the container below jumps. Fix: keep that row's
  height in every app state (e.g. the ready state holds Stop app in that row), so Allow, Stop app and a
  code change never change the card's height. Files: `packages/ui/src/node/node-template.ts`
  `appStateMarkup`, `node-app.css`, `node-app.ts` header, components.md stays true.
- **Patterns**: reuse `app-state.ts` (one cache), `io.ts` `listApps`, the existing Check again path; no
  second copy of state.
- **Skills**: `cortex-architecture` (one state source, one I/O layer) · `design:design-critique` and
  `design:accessibility-review` on the changed states, light and dark · `cortex-docs` (components.md,
  apps.md, `apps/board/README.md` if a claim changes).

## Steps

1. [x] Page tests first, each seen failing: folder deleted on screen → "not found" without a reload, and
   restored → the panel back; `tools.mjs` changed + card selected → "Code changed" before any call; a past
   version keeps the manifest size; Allow, Stop app and a code change leave the card's height unchanged
   (assert the box). Put them where they fit (`app-states.spec.ts`, `app-cards.spec.ts`; split a file
   before it passes 300 lines).
2. [x] The fixes. Then the gallery app states: view every screenshot diff light and dark before updating.
3. [x] Gates one after another: `npm run check`, `npm test`, `npm run verify` (0 warnings, page weight
   held), `node scripts/gen-api.mjs --check`, `npm run build`, `npm run test:pages` — all exit 0.

## Validation

- [x] The four findings no longer reproduce (name the test for each); all gates exit 0; page weight held.

## Constraints

- No git commits. Never port 4466 or this repo's `.visionboard/`. Deviation: TASK-STATUS.md instruction 5.

## Implementation Notes

**Status**: Completed (2026-10-18)

**What changed.**
- **Finding 1** (rulings 10, 11): `apps/board/server/apps/panel.ts` `servePanel`: every 404 of the route carries
  `PANEL_CSP` (`FRAMED`), so a frame loads the refusal instead of a blank the page's `frame-ancestors 'none'` made.
  `vb-app-frame.ts` `AppFrameWiring.onLoad` (each load of the frame's document); `app-cards.ts` wires it to the one
  cache's `refresh()`, so the card says "App <id> not found" once its frame loads again. `node-app.ts` `COPY.missing`
  has Check again; `app-words.ts` `retryDone` says "<name> found" / "<name> still not found.".
- **Finding 2** (rulings 7, 11): `app-cards.ts` listens to the selection (`AppCardsDeps.selection`, passed on
  `controller.ts`'s existing line): a change that selects any app card reads list_apps once. No timer, no polling.
- **Finding 3**: `app-cards.ts` `input()` gives `{ info, past: true }`, so `panelSize` keeps the manifest's size.
  `app-state.ts` lost `known` (no longer read).
- **Finding 6**: the row (`.vb-app-ask`) is the first child of the slot (`node-template.ts` `appSlot`) and holds Allow
  and Stop app (`APP_STOP`, out of the footer); one height (space-6 + space-1). `node-app.css`: the slot is a grid
  (row, gap, frame); a state without a panel hides row and frame with `visibility` (their room kept) and draws its view
  over both. Over a ready panel: "Allowed to run" and Stop app, or "Nothing to allow" (`appView` `text`). `vb-node.ts`
  `updateApp`: `data-ask` gives the accent box; a change that hides the focused element puts focus on the card.
- **Trim** (page weight): `problemLine` drops the pointer (FIX_01: the server sends none).

**Proof by name** (each seen failing first; 1 and 2 seen failing on the behaviour itself once the row was in):
- 1: `tests/pages/app-follow.spec.ts` › "a deleted app folder › says "not found" once its panel loads again, without a
  page reload, at the same height; put back, Check again brings the panel back (finding 1)" (failed: `ready` stayed,
  `ERR_BLOCKED_BY_RESPONSE`); `app-panel.test.ts` "404 for a missing or invalid app, … (finding 1)"; `node-app.test.ts`
  "missing: … (finding 1)"; `app-words.test.ts` "Check again on an app not found: … (finding 1)".
- 2: `app-follow.spec.ts` › "a changed tools.mjs asks again as soon as the card is selected, before the panel calls
  anything, and nothing asks on a timer (finding 2)" (failed: "Allowed to run" stayed after the select).
- 3: `app-states.spec.ts` › "a past version: app cards are placeholders, read-only, with no panel, at the size the
  manifest gives (light|dark)" (failed: `data-h` 320, not 440; the card's box now equal now and past).
- 6: `app-follow.spec.ts` › "Allow, a code change and Stop app leave the card's height as it was, so nothing under it
  moves (finding 6)"; `app-states.spec.ts` › "every state the app host gives, each drawn in its card (light|dark)"
  (one height; failed `[304, 260]`) and "loading: … (light|dark)" (no card moves when list_apps answers).
- Focus: `app-follow.spec.ts` › "a state change that takes the focused button away leaves focus on the card".

**Deviations, all inside the rulings:**
1. Words beyond the task's Check again: the kept row's "Allowed to run" and "Nothing to allow" (an empty row read as a
   gap; ux-copy kept the one term "allow"), and the toasts "<name> found" / "<name> still not found." (`retryDone` said
   "still has problems" for a missing app).
2. The row moved into the slot (`.vb-app` = row, then frame) and carries no `hidden`: `board.css` has
   `[hidden] { display: none !important }`, so the CSS hides it by the slot's state and keeps its room.
3. The panel route's 404s carry `PANEL_CSP`; BE_02's `app-panel.test.ts` asserted no sandbox on them. Now: the route's
   own 404s carry exactly ruling 4's policy (never a manifest's), paths outside the route keep the page's.
4. Focus stays on the card for any state change in `updateApp` (accessibility review), not only after the buttons.
5. The gallery gained "Ready, nothing to allow" (9 samples; `app-gallery.spec.ts` lists `ready` twice).
6. The select hook is a selection listener in `app-cards.ts`, not a `draw.ts` hook (one place; `controller.ts` stays
   at 300 lines).

**Design reviews** (board and gallery, light and dark, `$TMPDIR/vb-fix02/shots-after2/`): design-critique (fixed: the
quiet row was an outlined box that read as an empty text field; it is now a plain line edge to edge with the panel,
and only an ask is a box), accessibility-review (fixed: focus lost when a read hid the focused Stop app; APCA
0.0.98G-4g quiet line `--vb-ink` on the card Lc 94.3 light / 71.6 dark, on its tinted top 86.1 / 69.6; Stop app and
Check again are the 26 px buttons already measured; hidden rows leave the tab order), ux-copy (the words above).

**Screenshots**: `gallery.spec.ts/gallery-{light,dark}` re-baselined after viewing each diff light and dark: only the
app cards changed (the app-frame section's states at one height, the row, the new sample, Check again; the node
section's app cards gain "Nothing to allow"); everything else is the same content moved down (437, then 657 px; at
most 2 anti-aliased pixels elsewhere). `app-cards-{light,dark}` unchanged.

**Page weight**: 153,310 → 153,457 B gzip (+147 with the `problemLine` and `known` trims): 149.86 of 150 KB, 143 B left.

**Docs**: `components.md` § App card 1-5 and 8 (the row, one height, states table, focus, `onLoad`, the reads);
`apps.md` § Panel CSP route (404 headers), § States (missing: Check again), § Kept true by (`app-follow.spec.ts`);
`node/pattern.json`, `app-frame/pattern.json`.

**Known limits** (not this task): tracker row 24 stays (a card with no agent size falls back to 360×320 when its
folder goes: no manifest to read). Each frame load costs one list_apps read (shared while one is on its way).

**Gates** (one after another after the last change, 2026-10-18): `npm run check` 0 (348 files, 0 errors, 0 warnings);
`npm test` 0 (1478 pass, 0 fail: 1477 + 1 new; `test:timing` 7 pass); `npm run verify` 0 ("verify: ok (0 warning(s))");
`node scripts/gen-api.mjs --check` 0 ("generated files are current"); `npm run build` 0; `npm run test:pages` 0 (532
passed, 11.2 min: 528 + 4 in `app-follow.spec.ts`). The run before the screenshot update: 530 passed, only the two
gallery shots failing. Logs: `$TMPDIR/vb-fix02/logs/`. No process of mine left running; this repo's `.visionboard/`
and port 4466 untouched.

**Long File Strategy**: `app-follow.spec.ts` was created with its first section and appended in three chunks; every
other change was an exact-string edit. No connection error.

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-app] FIX_02: app cards follow their files and never jump → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/FIX_02_app-card-state.md]]`
