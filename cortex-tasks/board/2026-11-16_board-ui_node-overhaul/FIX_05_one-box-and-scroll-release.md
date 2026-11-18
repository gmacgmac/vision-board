# FIX_05_one-box-and-scroll-release: One Box Behaviour, and Letting Go of a Scroll

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The maintainer's use after FIX_04 (2026-11-18, points 484, 485). Run after T_04.

## Rulings (maintainer)

1. **One box, one behaviour (484)**: the history box and the proposal box behave exactly as the conversation box: the
   same fixed pointer (`placeBeside` `BOX_ARROW` beside, the middle of the top edge below) and the same zoom rule
   (clamp(k, 0.8, 1.2), one row in `#ui` `ZOOM_RULES` for all three). This replaces the part of D-101 that kept history
   at one size: the orchestrator appends the decision entry (draft below) with the maintainer's yes, already given.
2. **Letting go of a scroll (485)**: on macOS a flick's momentum keeps sending wheel events for one to two seconds, so
   the board, waiting for the gesture to end, keeps the scroller and won't pan; at the end an elastic bounce shows.
   Once the scroller has reached its end, the rest of that momentum is swallowed quietly (no bounce, no pan), and a
   fresh push of the fingers is a new gesture at once and pans. Detect momentum from the wheel stream itself (a
   decaying run of deltas after the fingers lift; a fresh push breaks the decay with a rise) rather than a long gap,
   and never wait for the momentum to die out. No elastic bounce on board scrollers (`overscroll-behavior: none` where
   it applies).

## Steps

1. Ruling 1 at the one box pattern (`mark-place.ts`, `mark-boxes.ts`, `node-box.css`, `ZOOM_RULES`); tests that fail
   before (`mark-place.test.ts`, `node-boxes.spec.ts`, `zoom-groups.spec.ts`, `zoom-rules.test.ts`).
2. Ruling 2 in `input/wheel-latch.ts` (`createWheelLatch`): tests with recorded-style streams (fingers then a decaying
   momentum tail; a fresh push during the tail; a mouse notch), unit and page (`scroll-before-pan.spec.ts`).
3. Docs: `components.md`; PLAN.md design rulings (points 484, 485).

## Decision entry to append (orchestrator, with the maintainer's yes)

```
## D-104 Every box beside a node behaves the same (replaces D-101's "history keeps one size")
- **Date**: 2026-11-18 · **Status**: Accepted (maintainer, point 484) · **From**: the maintainer's use of the merged board
- **Decision**: The conversation, history and proposal boxes share one placement and one zoom rule: beside the node with a fixed pointer near the box's top, or below it centred with the pointer at the middle of its top edge; and they scale with the board between 80% and 120% zoom, holding one size outside that range. This replaces D-101's listing of history among the parts that keep one size; menus, the answer picker, the right-click list, the selection bar and the toolbar still keep one size.
- **Why**: one box should behave one way, whatever it holds.
- **Task**: cortex-tasks/board/2026-11-16_board-ui_node-overhaul/FIX_05_one-box-and-scroll-release.md
```

## Validation

`npm run verify`, `npm run check`, `npm run gen -- --check`, `npm test`, `npm run test:plugin`; the page specs above
plus `conversation-box`, `card-history`, `proposals`, `app-window`. A look in a browser, dark.

## On Completion

Fill Implementation Notes, update your TASK-STATUS row, append your own LOG line:
`[[YYYY-MM-DD HH:MM]] [board-ui] FIX_05: [what changed] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/FIX_05_one-box-and-scroll-release.md]]`

## Implementation Notes

**Status**: Completed (run 1, 2026-11-18)

**Ruling 1, one box, one behaviour (484).** The pointer was already one rule (FIX_04's `placeBeside` serves all three
boxes). The zoom rule is now one row, `ZOOM_RULES.boxes` (clamp 0.8 to 1.2, writes `--vb-box-scale`), in place of
`markBoxes` (1/zoom) and `conversationBox`; `viewport.ts` `BOX_MIN_K`/`BOX_MAX_K` read it. `mark-boxes.ts` `place`
draws the history and proposal boxes at `boxScale(k)` on screen (in the node, `boxScale(k) / k`), measures them at that
size for `placeBeside`, and writes the pointer in the box's own pixels (`arrow / s`), as `notes.ts` does for the
conversation box. Tests first: `zoom-rules.test.ts` "one row for every box" and `zoom-groups.spec.ts` (the history and
proposal boxes now expected at `first × boxScale(k)`; both failed, 297.6 vs 238.1 at 80%); `node-boxes.spec.ts` (pointer)
passes as it was. Docs: `node-box.css` comment, node `pattern.json` (`--vb-box-scale`), `components.md` (§ the box beside
a node, § Zoom groups). D-104 is yours to append. Looked at, dark: `temp/fix05/history-{50,100,200}-dark.png` and
`conversation-{50,100,200}-dark.png`.

**Ruling 2, letting go of a scroll (485).** In `input/wheel-latch.ts` `createWheelLatch`: besides the quiet gap, a
gesture now also ends at once when a fresh push rises out of a momentum tail. The tail is read from the stream: a run of
`DECAY_RUN` (4) events none faster than the last (`WOBBLE` 1.15 allowed, so real momentum's jitter does not break it);
then an event at least `RISE` (1.5) times the slowest of that run and `RISE_PX` (3) more is a fresh push, and is found
afresh: at the scroller's end it pans straight away. The tail itself stays the scroller's, so it moves nothing; a
mouse's even notches never rise out of a decay; a push whose speed wobbles has no long decay and stays one gesture.
Nothing waits for the momentum to die out. No elastic bounce: `.vb-stage * { overscroll-behavior: none }` (was
`contain`). The wheelChaining flag's description says so.
Tests first: `wheel-latch.test.ts` with streams in the shape a trackpad and a mouse send (a flick and its jittery tail
at the end: all the scroller's; a push during the tail: pans by its third event, failed before; a push with room: found
afresh, failed before; a wobbling push; a mouse spin then a pause); `scroll-before-pan.spec.ts` "a flick with a momentum
tail ... a fresh push during the tail pans at once" (fails with the rise detection off: "the push pans without waiting
the tail out") and "no elastic bounce" (failed: `contain`). The thread tests now wait for the reply in the thread before
scrolling (`longThread`): a reply that landed after the box opened redrew it at the latest, which made a flick start at
the end in about one run in four. Stable after: 30 of 30.
Not established: the numbers against the maintainer's own trackpad. They are named constants in one place, so a look
on his machine can tune them.

**Budgets.** Plugin `view/board.js` measured 195,479 over T_04's 195,400: raised to 195,500
(`apps/board/tests/plugin-build.test.ts`, PLAN.md § Temporary size budgets). Page and CSS within.

**Checks.** `npm run check` clean, `npm run gen -- --check` current, `npm run verify` clean, `npm test` (after the
raise) all pass, `npm run test:plugin` 116 passed. Page specs scroll-before-pan, wheel-chaining, zoom-groups, node-boxes,
conversation-box, card-history, proposals, app-window, app-pan-key, zoom-and-lasso, command-lens: 109 passed.
