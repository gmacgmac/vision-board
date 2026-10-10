---
category: board-format
status: blocked
created: 2026-10-10
---

# BE_01 Contract: the kind decides, numbers on every node

> Plan: [PLAN.md](./PLAN.md) rulings 1-3, 8 · Model: Opus 5.5

## Steps

1. [x] `NODE_TYPES`: `answer` true for question, decision, action; `ANSWER_ACTIONS` (ack, drop,
   comment, context, later) and `NOTE_ACTIONS` (comment, context, later); every kind takes one.
2. [x] Ledger v11: the node event drops `item`; a v11 write naming it fails with a message saying
   the kind now decides (question, decision or action to ask for an answer). v10 and older lines
   still read; `item` ignored by every reader. Schema `$id`s, fixtures and the version tests.
3. [~] View: `n` on every node (`board-view.ts`); OpenAPI 1.13.0 examples without `item`;
   `DECIDED` gains `commented` (it decides only on answer cards: BE_02 enforces where it counts).
4. [x] `npm run gen`; `api.md` lines; D-040 wording proposed in the notes (the kind decides;
   supersedes the `item` part of D-017).

## Validation

- [~] Failing tests first (schema, version, view, node types): done. The five gates: `check`,
  `verify`, `gen -- --check` exit 0; `npm test` 4 failing (gallery fixture); `test:pages` 100
  failing. Stopped: see Implementation Notes.

## Constraints

- If deviation is needed, stop and say so. No PII in examples. No git commits or stash.
- Protected files (steering, `docs/decisions.md`, `tokens.css`): propose wording, never edit.
- Scratch in the system temp folder; stop only your own processes; never touch `.visionboard/`.
- One job per file, under 300 lines; tests first; fill Implementation Notes below and in
  TASK-STATUS, and append your own LOG line.

## Implementation Notes

**Status**: Blocked 2026-10-10, contract done, gates red. Stopped per "if deviation is needed,
stop and say so": the contract cannot go green on its own.

**Built (the contract).**
- `node-types.ts`: `NodeType.answer`; `ANSWER_ACTIONS` (five) and `NOTE_ACTIONS` (three);
  question, decision, action ask (`asks`), every other kind tells (`tells`).
- Ledger v11: `LEDGER_FORMAT` 11, `LEDGER_FORMATS` adds 11, every `$id` at `/ledger/11/`,
  `common.schema.json` `v` and `stampAgent` take 11. Node schema: `body.item` kept (deprecated,
  v10 and older only); new `$defs/noItem` (`item: { not: {}, description: ITEM_REMOVED }`) in
  `sent`, and `$defs/rules` (`if v` not 2-10 `then noItem`) in `stored`. `ledger.ts`
  `ITEM_REMOVED`; `ledger-shape.ts` `eventProblems` refuses `node.item` from v11 (hand twin).
  `apps/board/server/schema.ts` `removedWords`: a `not` error reads the description beside it, so
  the agent gets "`item` is not allowed here. Removed in ledger v11: the kind decides ..." at
  `/node/item` (one problem). Node `kind` description names the answer kinds.
- Readers ignore `item`: `boardView` (`n` on every node, `item` dropped), `show_node` versions
  (`reads.ts` `versionView`), `versionChanges` (no `item` field), `write-board.ts` `appended`
  (an append to an old card carries no `item`, else its v11 line would be refused).
- View schema: `n` required, descriptions updated. OpenAPI 1.13.0: every `item: true` gone from the
  examples (and the serialized line); `write_board` says the kind decides. `npm run gen` run.
- api.md 118-119 (new section).

**Forced beyond the contract (said here, as asked).** Removing `item` from v11 writes leaves the
action layer, which read `.item`, with no items at all, so:
- `act.ts`: the kind decides, no `item` check (single card, group note, Later). This is BE_02
  step 1, done because nothing written at v11 could be acted on otherwise.
- Interim readers ask `NODE_TYPES[kind].answer` where they asked `.item`: `conditions.ts`
  (`itemsOn`, `proposalsAt`), `reads.ts` (`status`, `openItems`); `fold.ts` `counts` and
  `reply.ts` (`replyText`: a line for any answered card, "still open" only answer cards) follow
  rulings 6-7 already. The page (`isItem`, reads `n`) is unchanged, so every card now shows its
  number and its kind's buttons.
- Tests moved to the new rules: v10 to v11 literals; server-written fixtures (API tests, MCP
  session, 19 page specs, perf redraw) send no `item`; actions/ui tests for what a finding,
  topic or note offers; group note on any cards; Later for any kind; card 3 a decision in
  `apps/board/tests/proposals.test.ts` (proposals are for answer cards); conditions oracle by kind.

**Deviation: `DECIDED` gains `commented` not done.** Adding it made 16 tests fail in BE_02's area:
`owedOn` skips a decided card, so a comment stopped being owed (ruling 5), and `list_open` dropped
commented cards. Every reader of `DECIDED` needs BE_02's per-kind rule; left to BE_02.

**Why the gates are red (what stays).**
1. `npm test`, 4 failing, `apps/board/tests/gallery-fixture.test.ts`: the gallery ledger acks a
   finding (n 7, seq 20), acks a risk (n 9, seq 24), drops a risk (n 13, seq 32), proposes on a
   risk and a finding (94, 95), and its Changed cards board is risks and findings (96-98), which
   the interim conditions no longer cover; topic and note now have actions, so the "every kind in
   every status" grid needs topic and note cells.
2. `npm run test:pages`, 100 failing, 205 passed: most are one cause, the gallery page throws
   ("Cannot read properties of undefined (reading 'count')", the Changed cards section on 96-98),
   so every gallery section test fails. Then: toolbar counts now count answer cards ("14 open",
   not "16 open"); `card-updates.spec.ts` draws risk cards, so no update tabs; `notes.spec.ts`
   and `move-and-later.spec.ts` act on finding 5; zoom-and-lasso off by one pixel (numbers on
   more cards); every board screenshot changes because every card is numbered.
Fixing these is gallery content, page behaviour and screenshot baselines (FE_01), plus the
conditions over every card (BE_02 step 3), not a minimal change.

**Options for the orchestrator.**
- A. Treat BE_01 + BE_02 + FE_01 as one gate unit: keep this tree, run BE_02 then FE_01, gates
  at the end of FE_01.
- B. Let BE_01 continue into: conditions over every card (assumption A), gallery fixture data,
  the page-test expectations and screenshots (about 30 baselines).
- C. Interim page to FE_01's flag-off view (`isItem` = an answer kind): fewer screenshots now,
  but about 20 ui unit tests move to answer kinds and FE_01 turns it back.

**Proposed D-040 (protected file, not edited):**

> ## D-040 The kind decides which cards ask for an answer
> - **Date**: 2026-10-10 · **Status**: Proposed · **From**: maintainer (chat 399, 420, 421, 425, 428B, 452A, 455A)
> - **Decision**: Every card carries its number and takes the person's comment, more context or
>   Later. A card's kind alone decides whether it asks for an answer: `question`, `decision` and
>   `action` also offer ✓ and ✗, and ✓, ✗ or a comment decides them; every other kind never
>   blocks. Ledger v11 removes the agent's `item` mark from the node event (a v11 line naming it
>   is refused); older lines keep it and every reader ignores it. Supersedes the per-node `item`
>   mark of the ledger design (D-017, api.md 6).
> - **Why**: The board is a threaded conversation in context: the person must be able to answer
>   any card, and one meaning per button on every card keeps it learnable.
> - **Alternative rejected**: Keeping `item` as the agent's choice (a card the agent forgot to mark
>   can't be answered, and one kind behaves two ways).
> - **Task**: [[cortex-tasks/board/2026-10-10_board-actions_every-node/PLAN.md]]

**Hand-off to BE_02.** `DECIDED` + `commented`; owed/new/unseen/awaiting over every card
(`conditions.ts` `itemsOn`, and the oracle in `packages/actions/tests/conditions.test.ts`);
`list_open` answer cards plus owed; `show_node` `status` on every card or not (the schema
description now says answer cards only); proposals refused at write on non-answer cards;
`responsesAfter` order; MCP instructions. `act.ts` step 1 is done.
