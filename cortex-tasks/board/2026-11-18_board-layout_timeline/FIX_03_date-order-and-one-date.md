# FIX_03_date-order-and-one-date: Tab in Date Order, the Date Said Once

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The maintainer's result review (PLAN.md § Design review, 2026-11-19, points 601 and 602).

## Steps (each starts with a test that fails before it)

1. **Tab in date order inside a timeline (601)**: within a container that has a timeline, Tab and Shift Tab move
   through the dated cards in the order the line draws them (`#format` `sortByTimeline`, or the layout's `timeline`
   order the page already has), then on to the container's other cards in today's order; boards and containers with
   no timeline keep card-number order (`card-numbers.ts` `readingOrder`) exactly. Find the one place the reading order
   is decided and extend it; no per-card listeners. Page test (both forms) and unit test.
2. **The date said once (602)**: remove the visually hidden full date from a dated card's content (FE_01's accessible
   form); the card's accessible name already carries it (FIX_02, `dateInName`). Copying a dated card's text gives the
   date once; `<time datetime>` stays. Unit test on the markup, page test on the copied text and the name.
3. Docs: `components.md` § The timeline (focus order, the date's accessible form); PLAN.md call 10 is superseded by
   point 602 (say so in your notes; the orchestrator records it).

## Where

`.claude/worktrees/app-window`, branch `spike/stage-apps`. `VB_TEST_PORT=8210` (a try-out board runs on 6611: leave
it). Page specs with `--config tests/pages/playwright.config.ts`. Never git-add anything.

## Validation

`npm run check`, `npm run gen -- --check`, `npm run verify`, `npm test`, `npm run test:plugin`; page specs `timeline`,
`focus-ring`, `focus-return`, `keyboard*` or whichever cover Tab order, `node-edges`, `command-lens`, `gallery`.

## Constraints

No git commands that change state. No PII. Deviation: stop and report. Budgets never block: report measured numbers.

## On Completion

Fill Implementation Notes, update your TASK-STATUS row, append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-ui] FIX_03: [what changed] → Task: [[cortex-tasks/board/2026-11-18_board-layout_timeline/FIX_03_date-order-and-one-date.md]]`

## Implementation Notes

**Status**: Completed (2026-11-19)

**601, Tab in date order.** The one place is `apps/board/src/board/card-numbers.ts` `readingOrder` (it orders the cards
in the page, `cards/cards.ts` `order`, so native Tab and Shift Tab, and J/K through `canvas/focus.ts`). Still card-number
order; a container whose cards carry a date (the page's view after `datedView`, so flag off changes nothing) is read at
its first card's place: its dated cards by `#format` `sortByTimeline` (the layout's order), then its other cards by
number. Every other card keeps its place. No per-card listener. Tests first: `apps/board/tests/card-numbers.test.ts`
("reading order with no timeline", "reading order in a container with a timeline") and `timeline.spec.ts` "Tab and
Shift Tab walk a timeline in date order..., across / down; flag off, card-number order" (replaces FE_02's "Tab reaches
the dated cards... by card number"); both failed before, pass after.

**602, the date said once.** `packages/ui/src/node/node-edges.ts` `datedHeading`: the `<time datetime>` holds only the
short form (`aria-hidden`); the visually hidden full form is gone. The name keeps it (`nodeLabel`, FIX_02 `dateInName`);
`timelineLabel().full` stays for the name. Tests first: `packages/ui/tests/node-dated.test.ts` (markup, both skins, no
`vb-visually-hidden`) and `timeline.spec.ts` "a dated card's date is said once" (a real copy: select the content, the
copy keys, the clipboard; both skins; the name still has the full date). Note: `String(getSelection())` in Chromium
already left the hidden form out, so the page test reads the clipboard; that version failed before ("Nov 33 November
2026") and passes after.

**PLAN.md call 10 is superseded by point 602**: the date's accessible form is the card's name, not a hidden full form in
the content (for the orchestrator to record).

**Docs**: `components.md` § The timeline: the node and the page, items 2 and 12, and § the app panel's "never moves a
card" sentence; `node/pattern.json` (`vb-node-date`), `timeline/pattern.json` (accessibility), `app-frame/pattern.json`
(`unload()`).

### Caught Beyond the Brief

- **A loaded app panel reloaded when date order moved its card** (found while checking the change; a probe proved it:
  a calculator first in a container with a dated card, the date dropped, the panel's document loaded twice). Before
  FIX_03 the card order never moved a card already in the page. Fixed with a failing test first
  (`app-alive.spec.ts` "a timeline reordering the cards around a loaded panel does not load it again"): `cards.ts`
  `order` moves a connected card with `moveBefore` where the browser has it (else `insertBefore`, as before), and
  `vb-app-frame` has an empty `connectedMoveCallback`, so a move is no disconnect (`unload`). `moveBefore` keeps focus as
  well. [INFERENCE] In a browser without `moveBefore` (Safari today) the old behaviour stays: a panel would reload, and a
  focused card the order moves would lose focus; both only when an agent's write changes a container's date order.
- **Budgets** (never blocking): plugin `view/board.js` 200,472 gzip over 200,400; raised to 200,500 in
  `apps/board/tests/plugin-build.test.ts` `BUDGET`. Page 211,046 bytes = 206.10 KB, inside 206.1 by under a byte (not
  raised).
- `tests/pages/timeline.spec.ts` is now 495 lines (verify warns over 300, fails over 500): the next test added there
  needs a split or a `verify: long-file` line.

**Verification**: `npm run check` 0 errors; `gen -- --check` current; `verify` ok (45 warnings, none new but the
timeline spec's length); `npm test` 2,724, one failure before the budget raise (the plugin JS budget), 10/10 after in
`plugin-build.test.ts`; `npm run test:plugin` 116 passed. Page specs: the named list was given as file filters and
matched the whole suite, so it ran in full: 1,097 passed, 2 skipped, 12.4 min, no screenshot renewed (the dated cards'
light and dark, both skins, look unchanged: the hidden span drew nothing). No new gallery entry: no new look.

