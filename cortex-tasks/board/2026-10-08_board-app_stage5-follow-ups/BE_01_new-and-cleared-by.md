# BE_01_new-and-cleared-by: NEW condition and declared clearing

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (rulings 1-3)
> · **Decision**: D-033 · **Model**: Opus 5.5

## Objective

The conditions table says which cards are NEW and, for every card label, what clears it.

## Rulings (do not reopen)

1. **Round start** in the fold (`packages/actions/src/fold.ts`, 299 lines: move code out if it
   passes 300): per board, the `seq` of the first agent drawing line after a Send that came
   after the previous round start; before any such line, the end of the board's first run
   (`runs`), so the first drawing is never NEW.
2. **`item.new`** row (`conditions.ts`): about `card`, audience `person`, shows `card`: an
   undecided item whose first version's line is after the round start (ruling 1), with no seen
   at any version. `item.unseen` (the "N updates" tab) leaves out cards `item.new` holds for,
   for the page; keep the agents' `list_open` `unseen` as it is.
3. **`clearedBy`** on `ConditionRow`: a typed list, `'select' | 'act' | 'round'` (add more
   only if needed), required on rows shown on a card and empty elsewhere. `item.new`:
   select, act, round. `item.unseen`: select, act. A test reads each row's `clearedBy` and
   checks it against the fold (an act raises seen; a new round ends `item.new`); export a small
   helper the page will use, e.g. `clearsOnSelect(kind)`.
4. If `references.ts` needs a kind, add it with its row. api.md: append a point for `item.new`
   and `clearedBy`. Skill notes (`skills/vision-board/NOTES.md`): re-saving a card for later
   after taking it out asks for a fresh handover with the new context (PLAN ruling 3).

## Steps

1. [ ] Failing tests first: round start (no Send; Send then no drawing; Send then drawing; two
   rounds), `item.new` (fresh board none; later card new; seen ends; act ends; next round
   ends; decided ends), `item.unseen` without new cards, `clearedBy` consistency.
2. [ ] Build; `npm run gen` if the contract changes; `npm run map`.

## Validation

- [ ] The five gates exit 0.

## Constraints

- If deviation is needed, stop and say so; no silent breaking changes. No PII in examples.
- No git commits or stash. Scratch in the system temp folder. Stop only your own processes.
- Fill Implementation Notes below, your row in TASK-STATUS.md, and your own LOG line.

## Implementation Notes

**Status**: Completed 2026-10-08

**Round start (`packages/actions/src/rounds.ts`, new, internal).** `addDrawing` (called by the fold
for each agent drawing line) starts a round when the board's last Send is after the current round
start, extends the runs (`addRun`, moved here from fold.ts) and records each card's first drawing
line. `roundStart(s, board)`: `s.rounds.get(board)` (the first drawing line after a Send), else the
end of the first run (`runs[0].seq`), else undefined. `inLatestRound(s, board, seq)`: after the start,
or at it when a Send began the round (that line is the round's own: an `append` right after a Send
is new). fold.ts gains `rounds` and `firstDrawn` (n -> seq of its first version's line); 296 lines.

**Conditions.** `item.new` (card, person, shows card, `clearedBy: ['select', 'act', 'round']`):
undecided, not seen at any version, first drawn in the latest round; `seq` is that line. `ClearedBy`
type and a required `clearedBy` on every `ConditionRow` (`[]` off the card, and on `item.awaiting`,
`proposal.open`, `proposal.stale`: none of the three ends them). `item.unseen` `['select', 'act']`.
`clearsOnSelect(kind)` exported from the front door (true for `item.new`, `item.unseen`).
`item.unseen`'s derive is unchanged (so `list_open`'s `unseen` and the oracle stay as they were); the
page leaves NEW cards out: `pageConditions` (board-data.ts) gains `fresh` (`item.new`) and drops those
cards from `unseen`. No `references.ts` kind needed; no contract change (`gen --check` current).

**For FE_01.** Read `pageConditions(s, board).fresh` for the NEW tab. Selecting a NEW card sends no
`seen` today (it left `unseen`): drive seen-on-select from `fresh` plus `unseen` through
`clearsOnSelect`. A board drawn by two agents in turn has the second agent's cards NEW (the first run
is one agent's); the gallery ledger has many such cards (board `gallery`: 28, `container-notes`: 2),
so the NEW tab will change gallery screenshots unless the fixture marks them seen.

**Tests.** New `packages/actions/tests/rounds.test.ts` (12): round start (no Send, Send with no
drawing or a reply, Send then drawing, two rounds, a Send before the first drawing), `item.new`
(fresh board none; later card new and person-only; newer version keeps it; seen, act, decision,
next round end it; `list_open` unseen unchanged), and `clearedBy` against the fold: for each card
row a ledger where it holds, then select (a `seen`), act (a comment), round (Send + draw); the row
ends exactly when its `clearedBy` names it. `conditions.test.ts`: `item.new` row case, and a row
with `clearedBy` must show on a card. `apps/board/tests/updates.test.ts`: a NEW card is in `fresh`,
not `unseen`.

**Docs.** api.md 97; actions README; skill notes (re-saving for later owes a fresh park, PLAN ruling
3). `npm run map`: no change (rounds.ts is internal).

**Gates (all exit 0):** `npm test` (736 + 6); `npm run check`; `npm run verify` (0 warnings);
`npm run gen -- --check`; `npm run test:pages` (223 passed, no screenshot changes).

**Revised (orchestrator correction to ruling 1; maintainer wording "NEW only on a card the agent
adds after you've already opened the board").** Before any Send-started round the baseline is the
`head` of the person's first board seen on the board, not the end of its first run: the fold keeps
`firstSeenBoards` beside `seenBoards` (`rounds.ts` `seeBoard`, called by fold.ts; 298 lines), and
`roundStart` is `rounds` else `firstSeenBoards`. With no board seen no card on the board is NEW, and
a round needs a Send after that baseline. Two agents drawing in turn before the first open: none NEW;
the gallery ledger now has no NEW cards (the earlier 30 are gone), so the "For FE_01" note about
gallery screenshots no longer applies; the seen-on-select note still does. Tests: rounds.test.ts
reworked (13: never opened; first board seen and a later one; two agents in turn; no board seen with
a Send; a card after the first board seen and before any Send is NEW; card rows' `HOLDING` open the
board so a round really starts); the `item.new` row case and the page test open the board first.
api.md 97 and the row's `trueWhen` say so. Gates again, all exit 0: `npm test` (737 + 6);
`npm run check`; `npm run verify` (0 warnings); `npm run gen -- --check`; `npm run test:pages` (223).

## On Completion

Fill in notes, update your row, append your own LOG line (`[board-actions] BE_01: …`).
