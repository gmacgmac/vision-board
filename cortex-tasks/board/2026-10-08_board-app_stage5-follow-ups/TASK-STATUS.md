---
task_name: Stage 5 Follow-ups - NEW Cards, Declared Clearing, Selection Pill
created: 2026-10-08
status: completed
completed: 2026-10-08
categories: [board-app, board-actions, board-ui]
tracker: cortex-tasks/tracker.md#U1
---

# Stage 5 Follow-ups - Task Status

> **Plan**: [PLAN.md](./PLAN.md) (rulings 1-6 are the maintainer's; do not reopen)

| # | ID | Wave | Task | Model | Status | Notes |
|---|-----|------|------|-------|--------|-------|
| 1 | BE_01 | 1 | [NEW condition and declared clearing](./BE_01_new-and-cleared-by.md) | Opus 5.5 | Completed | `item.new`, `clearedBy`, `rounds.ts`; revised: baseline is the first board seen; gates 0 |
| 2 | FE_01 | 2 | [NEW tab and seen from the table](./FE_01_new-tab.md) | Sonnet 5.5 | Completed | NEW tab (`data-tab="new"`), `seenOnSelect` from `clearsOnSelect`, flag `newCards`, gallery card 103 |
| 3 | FE_02 | 3 | [Selection pill and compact bar](./FE_02_selection-pill.md) | Opus 5.5 | Completed | Pill + compact bar (`selection-pill.ts`, `vb-toggle`), flag `selectionPill`, primary hover fixed (specificity), gates 0 |
| 4 | VERIFY_01 | 4 | [End-to-end check](./VERIFY_01_end-to-end.md) | Orchestrator | Completed | All steps pass; no bugs; one behaviour raised (a NEW card updated before seen shows "1 update" after the next round) |

Gates after every task, run by the orchestrator: `npm test`, `npm run check`, `npm run verify`,
`npm run test:pages`, `npm run gen -- --check`. No git commits or stash by sub-agents. Each task
appends its own LOG line (real time from `date`) and fills its Implementation Notes and its row.
Scratch in the system temp folder; stop only your own processes by PID or port; never touch
`.visionboard/`.

## Shared Foundations

| What | Path + symbol | Owner | Consumers |
|---|---|---|---|
| `item.new` row, `clearedBy` field on card rows | `packages/actions/src/conditions.ts` `CONDITIONS`, `ConditionRow` | BE_01 | FE_01 |
| Round start per board | `packages/actions/src/fold.ts` (beside `runs`, `lastSend`) | BE_01 | FE_01 |

## Implementation Notes

### BE_01
_Status:_ Completed 2026-10-08. `rounds.ts` (internal): `roundStart`, `inLatestRound`; fold gains
`rounds`, `firstDrawn` (`addRun` moved there; fold.ts 296 lines). Row `item.new` (person, card,
`clearedBy` select/act/round); `clearedBy` on every row (`[]` off the card and on awaiting/proposal
rows); `item.unseen` select/act, derive unchanged. `clearsOnSelect(kind)` at the front door. For
FE_01: `pageConditions(...).fresh` is the NEW set and `unseen` now leaves those cards out, so selecting
a NEW card sends no seen until FE_01 drives it from `clearsOnSelect`; the gallery ledger has 30 NEW
cards (later runs, second agents), so the tab will touch gallery screenshots. Details in the task file.
Revised: before any Send-started round the baseline is the person's first board seen on the board
(`firstSeenBoards`, `rounds.ts` `seeBoard`), not the first run; no board seen, no NEW. The gallery now
has no NEW cards (the screenshot note above no longer applies); the seen-on-select note still does.

### FE_01
_Status:_ Completed 2026-10-08. NEW tab in the bottom slot (a span, toolbar chip tone, APCA 61.2 / 47.0); name ends ", new"; `update-flow.ts` seen on select = `seenOnSelect` over `fresh` + `unseen` by `clearsOnSelect`; flag `newCards`; gallery ledger gains a board seen and card 103 (a "A new card" group). Also fixed the `heads.test.ts` oracle (board seen never moves a head). Screenshots updated: card-updates (new), gallery, parking-replies (sub-pixel shift). Details in the task file.

### FE_02
_Status:_ Completed 2026-10-08. `<vb-selection-bar>` gains the pill (`.vb-sb-pill`, `aria-expanded`,
`vb-toggle`) and the compact bar (`data-pill`, 24px buttons); `selection-pill.ts` holds the open state
(closes on a press outside, a wheel pan, Esc via `flow.collapse()`, the selection clearing). Comment's
hover bug was CSS specificity (Lc 9.5 / 0.0 before; 83.3 / 66.9 now), fixed with the flag off too.
controller.ts still 300 lines. Specs that click bar buttons open the pill first (`openSelectionBar`
in helpers.ts). Screenshots: new selection-pill gallery pair; gallery full page (pattern text, samples
centred); six gallery sections re-shot for a sub-pixel shift. N27: a pointer press that opens a card
box closes the open bar; the closed pill can still overlap. Details in the task file.

### VERIFY_01
_Status:_ Completed. All six steps passed by hand; no bugs. Raised with the maintainer: a card updated before it was ever seen shows "1 update" once the next round ends its NEW.
