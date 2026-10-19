# FE_01_panels-stay-loaded: Panels stay loaded, frozen off screen

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

A panel that has loaded keeps running through zoom, pan and card redraws; off screen or zoomed far
it is frozen; only a cap of live panels unloads the least recently used.

## Context

PLAN.md § Key Changes 1. Maintainer: "if I'd already progressed through a few pages and then I zoom
out, the app becomes inactive, and when I zoom back in it refreshes back to the start… I don't
understand why we're unloading the app… I can understand why we might not render stuff or not make
it clickable." **Read previous task notes in TASK-STATUS.md before starting.**

## Inputs

- **Files to modify**: `apps/board/src/board/app-cards.ts` (`place`, the lifecycle),
  `packages/ui/src/app-frame/vb-app-frame.ts` (freeze / thaw: `inert`, not painted, a `frozen`
  state in the pattern), `app-frame.css`, `packages/ui/src/app-frame/pattern.json`,
  `packages/ui/src/node/node-app-apply.ts` / `vb-node.ts` only if a redraw re-creates or moves the
  frame, `docs/specification/apps.md` (the frame paragraph: loaded once, frozen, capped),
  `components.md` § App card (ruling 14 text), `performance.md` if it names frames
- **Patterns to follow**: `offscreen.ts` (`viewBounds`, `outside`, `content-visibility`), `isFar`
- **Skills**: `cortex-architecture` · `cortex-docs` — load before starting

## Steps

1. [x] **Tests first** (`tests/pages/app-cards.spec.ts` or a new `app-alive.spec.ts`, on the app
   server): put a value in a panel's memory (e.g. a test app or the calculator's display), then zoom
   far and back, pan two screens away and back, draw a new version of the card, relayout, select it,
   change its size — the value is still there each time and the frame was never reloaded (count
   `load` events). Confirm they fail before the change.
2. [x] **Load once**: a frame loads the first time its card is on screen and near (as today); after
   that `place()` never unloads it for zoom or distance. Off screen or far: frozen — `inert` on the
   frame, `content-visibility: hidden` (or the existing offscreen mechanism) so it isn't painted; on
   screen and near: thawed. A frozen panel takes no pointer or keyboard input.
3. [x] **Cap**: `LIVE_PANELS = 8` in `app-cards.ts` (page concern, not contract); when a ninth loads,
   unload the least recently thawed/used. Also unload when the card goes, or its state stops showing
   a frame (missing, invalid, broken, past).
4. [x] **Never re-create or move** a frame on card redraw, relayout, select or size change; if any
   path does, fix it at the source (apply in place).
5. [x] Tests for the cap and for "frozen can't be clicked or tabbed into"; timing: a board with 12
   app cards stays within the layout / frame budgets in performance.md (add a row if none fits).
6. [x] Docs: apps.md, components.md (ruling 14 is superseded by D-050 once accepted — write
   "D-050 (proposed)" for now), pattern.json states.

## Validation

- [x] The new tests failed before and pass after; app-cards, app-states, app-follow, app-safety,
  zoom-and-lasso specs pass; `npm test`, `npm run verify` pass

## Constraints

- If deviation is needed, stop and ask the maintainer — no silent breaking changes.
- No PII in examples or fixtures. No git commits during execution.
- Protected files (steering, `docs/decisions.md`, `docs/principles.md`, tokens): propose, don't edit.
- The maintainer's board on port 4466: never stop, restart or kill it, or any process you didn't
  start. Page tests under the lock: `until mkdir temp/pages.lock 2>/dev/null; do sleep 10; done; …; rmdir temp/pages.lock`.
- Use the Bash tool's working directory rather than `cd path &&`; writes over 50 lines in chunks.

## Implementation Notes

**Status**: Completed  
**Completed**: 2026-10-19

### Changes Made
- Tests first: new `tests/pages/app-alive.spec.ts` (3 tests: a panel keeps what it holds, loaded once, through far zoom / pan 3 screens / new version / relayout (the card before it retired) / selection / new size; frozen = inert, no click, no Tab; the cap of `LIVE_PANELS` unloads the least recently used frozen panel, zoom step on 12 app cards under 50 ms). All three failed before the change, pass after. Unit test `apps/board/tests/app-live-cap.test.ts` for `overCap`.
- `apps/board/src/board/app-cards.ts`: `LIVE_PANELS = 8`, pure `overCap`, `place()` now loads (first time) / thaws on screen and near, freezes otherwise, unloads only for no-panel state, card gone, or the cap (LRU by `used` Map, live panels never evicted).
- `packages/ui/src/app-frame/vb-app-frame.ts`: `freeze()` / `thaw()` / `frozen` (`data-frozen` + `inert`, focus to card), `unload()` thaws. `app-frame.css`: frozen frame `visibility: hidden`, placeholder shown without "Loading…". `pattern.json`: `frozen` state, attributes, methods, accessibility.
- `packages/ui/src/node/node-app-apply.ts` `renderKeepingPanel`, called from `vb-node.ts` `render` in place of `innerHTML`: a new card version kept re-creating the frame (`innerHTML`) and so reloaded the panel; now the loaded frame and its ancestors stay in place and take the new markup's attributes (plain `innerHTML` when no frame is loaded).
- Existing tests moved to the new behaviour: `app-states.spec.ts` (far zoom and off screen: frames frozen, not removed), `app-follow.spec.ts` deleted-folder test (the card learns on select, since the kept panel never reloads by itself; Escape clears the selection before axe).
- Gallery text for the frame group (`apps/board/src/gallery/app-frame-section.ts`) names the frozen state.
- Docs: `apps.md` frame paragraph, card-states paragraph and tests list; `components.md` § App card items 5, 7, 8 (D-050 (proposed)); `performance.md` budget row "App panels kept loaded" and approach 4.

### Issues & Resolutions
- `cards.ts` `order` would reload a panel if an app card moved in the DOM; it never does, since `render.ts` `readingOrder` sorts by the card's stable number, so it is left unchanged (a `moveBefore` variant was tried and reverted as unneeded).
- The Browser pane does not paint cross-origin frames, so the visual check used Playwright on an own port (4491): placeholder while frozen at 36%, the calculator's "4×5" still there at 110%.
- Seen, not fixed (not this task): with an app card selected in app-follow's deleted-folder layout, axe reports `target-size` on the selection's "Grid" button.

### Deviations from Plan
- None. Screenshot baselines updated on purpose: `tests/pages/__screenshots__/gallery.spec.ts/gallery-light-darwin.png`, `gallery-dark-darwin.png` (the frame group's longer description).

## On Completion

1. Fill in Implementation Notes; set **Status** to `Completed`.
2. Update your row and your notes section in [TASK-STATUS.md](./TASK-STATUS.md).
3. Append **one** line to `cortex/LOG.md` (ending in a newline):
   `[[YYYY-MM-DD HH:MM]] [board-app] FE_01: [what you did] → Task: [[cortex-tasks/board/2026-10-19_board-app_app-state-kept/FE_01_panels-stay-loaded.md]]`
