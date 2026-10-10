---
category: board-actions
status: completed
created: 2026-10-10
---

# BE_02 Action layer and server

> Plan: [PLAN.md](./PLAN.md) rulings 2-7 · Model: Opus 5.5 · After BE_01

## Steps

1. [x] `act.ts`: an act on a card is checked against its kind's list, never `item`; group notes
   (`nodes`) accept any cards and any kinds (comment and context are on every list). Done by
   BE_01; checked, unchanged.
2. [x] Status and counts: ✓, ✗ or a comment decides an answer card; More context keeps it open;
   counts (`fold.ts`) and `list_open` (`reads.ts`) over answer cards, plus any card owing an
   answer or a handover.
3. [x] Conditions (`conditions.ts`): `item.owed` (a comment or context on any card; Later on any
   card until its park), `item.new`, `item.unseen`, `item.awaiting` over every card (PLAN
   assumption A); proposals only on answer cards.
4. [x] `check_responses` (`response-order.ts` `responsesPage`): each batch sorted by card number; a
   group note at its lowest card, a container note at the container's lowest card (or first if
   empty); acts on one card in ledger order. Paging cuts in ledger order, then sorts; tested.
5. [x] `api.md` 120 (119 tidied); MCP instructions where they name items.

## Validation

- [x] Failing tests first for each step (`every-node.test.ts`, `response-order.test.ts`, the
  proposal refusal in `api-proposals.test.ts`); gates per the orchestrator's ruling A: check,
  verify, gen-check exit 0; unit tests green but `gallery-fixture.test.ts` (3, gallery data,
  FE_01); `test:pages` left to FE_01.

## Constraints

- If deviation is needed, stop and say so. No PII in examples. No git commits or stash.
- Protected files (steering, `docs/decisions.md`, `tokens.css`): propose wording, never edit.
- Scratch in the system temp folder; stop only your own processes; never touch `.visionboard/`.
- One job per file, under 300 lines; tests first; fill Implementation Notes below and in
  TASK-STATUS, and append your own LOG line.

## Implementation Notes

**Status**: Completed 2026-10-10 on BE_01's working tree (orchestrator ruling A: the five gates
are checked at the end of FE_01).

**Built.**
- `registry.ts`: `DECIDED` gains `commented`; new `CLOSED` (ack, drop: nothing owed, proposals
  end) and `isDecided(kind, status)` (only an answer kind is ever decided). Exported.
- `conditions.ts`: `itemsOn` became `cardsOn` (every card, agent-scoped as before); `item.owed`
  skips only `CLOSED` cards, so a comment that decides a question is still owed (ruling 5);
  `item.new` uses `isDecided`; `item.unseen`, `item.awaiting` on every card; proposals stand on
  answer cards until ✓ or ✗ (`CLOSED`), so a comment leaves one standing. Row texts updated.
- `reads.ts`: `show_node`/`show_container` give `status` on every card (schema: required);
  `openItems` (`list_open`, write `pending`) = answer cards not decided + any card owed.
- `proposals.ts` `proposeProblem` + `write-board.ts` `checkProposal`: a `propose` on a card that
  needs no answer fails `invalid` at `/items/{i}/n`. At write only, so old ledgers still read.
- `response-order.ts` (new): `inCardOrder` (each batch up to its Send sorted by lowest card; a
  container note, place or `mode` at the container's lowest card now, first when empty; grant,
  deny, revoke after the cards; stable) and `responsesPage` (cut at `limit` in ledger order, then
  sort). `apps/board/server/reads.ts` `checkResponses` uses it.
- Paging (`more`): the cut is in ledger order so the cursor still works; the next page is
  `after` = the highest `seq` in `responses`. The old description said "pass back the head ...
  `more: true` means read again at once", which skipped what was cut even before this change;
  OpenAPI and the response schema now say so.
- Page consumers of `DECIDED` moved to `isDecided` so a commented plain card is never hidden or
  counted as decided: `board-data.ts` `decidedIds`, `region-core.ts` `regionState` (decided count).
- Schemas/OpenAPI descriptions (list_open, check_responses, write `pending`, openItem,
  pendingReason, nodeDetail status required; show_node `linked` example gains `status`); `npm run
  gen`; `npm run map`. OpenAPI stays 1.13.0 (same unreleased set as BE_01).
- MCP `INSTRUCTIONS`: "card by card", which kinds ask, responses sorted by card number, owe a
  reply/append per note and a park per Later. `api.md` 120 (new), 119's interim sentence tidied.
- Tests: `packages/actions/tests/every-node.test.ts` (9), `response-order.test.ts` (2), the
  conditions oracle moved to every card and `CLOSED`, `api.test.ts` list_open/check_responses/
  act expectations, `api-proposals.test.ts` refusal.

**Choices to confirm (not rulings).**
- A container note's act carries no `nodes` (its schema forbids them), so "names all its cards"
  (ruling 7) is met by its container; the agent reads the cards with `show_container`.
- `mode` (layout) sorts like a container note; grant/deny/revoke go after the cards; a Send ends
  its batch, so two Sends in one answer give two sorted batches.
- A batch split by `limit` is sorted per page (default limit 100, so rare).
- A comment on a question leaves an agent's proposal on it open (only ✓/✗ ends one).

**Gates (ruling A bar).** `npm run check` 0, `npm run verify` 0 (after `npm run map`),
`npm run gen -- --check` 0, `npm run test:timing` 0. Unit tests: 938 pass, 3 fail, all in
`apps/board/tests/gallery-fixture.test.ts` (gallery data, FE_01): seq 20 acks a finding; risk /
dropped status no longer reachable; proposals on a risk and a finding (94, 95) no longer show.
The fourth BE_01 failure (Changed cards samples) is fixed by the conditions over every card.


**Page tests (run once for FE_01, not a BE_02 gate; no screenshots updated).** 38 failed, 268
passed (BE_01 left 100 failing: the gallery no longer throws). What FE_01 must do:
1. Gallery data (`apps/board/src/gallery/gallery.ledger.jsonl`): no ✓/✗ on findings or risks
   (seq 20, 24, 32); proposals only on question/decision/action (94, 95, and `proposals.spec.ts`
   :179's fixture proposes on a risk, now refused at write); the "every kind in every status"
   grid by kind class. Fixes `gallery-fixture.test.ts` (3 unit tests), `proposals.spec.ts` :288,
   `proposals-notice.spec.ts` :209, `card-updates.spec.ts` :290 (Out of date tab).
2. Counts: `board.spec.ts` :24 expects "16 open" (now 14: answer cards only) and :129 "2 decided"
   (now 3: the comment decides, ruling 3). `region-core.ts` `regionState` still counts every
   numbered card in the total (`isItem`): filter to answer kinds (ruling 6); `gallery.spec.ts` :76
   ("No items, so no count" shows "0 of 1 decided").
3. Kinds: `gallery.spec.ts` :50 expects a topic with no buttons (now three actions);
   `move-and-later.spec.ts` :151/:176/:223 and then `notes.spec.ts` :70/:90 (card 5 left in Later
   by the earlier spec: one ledger across files) need re-reading against Later on any kind and the
   new counts; `zoom-and-lasso.spec.ts` :117 one pixel off (numbers on more cards).
4. Screenshots, after viewing the diffs: board (dark/light), gallery (dark/light), Changed cards,
   chat, markdown, folder picker, parking and replies, Agent proposals, selection pill, node size,
   toolbar, see-through cards.
5. "Hide decided" now hides a commented question (`decidedIds` uses `isDecided`): confirm that is
   wanted while its reply is owed.
