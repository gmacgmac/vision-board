# ACT_01_insert-into-flow: Insert a card into a flow in one item

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) · **Flag**: `insertBetween`

## Objective

An agent puts a card between two linked cards of a `flow` or `lanes` container with one `node` item carrying
`insert: { after, before }` (PLAN Decision 5): new or existing card, all or nothing, retry-safe, refusals that
say what to fix.

## Context

Today it takes an unlink and two links (the handover's example: card 24 between 12 and 13). A `flow` places cards
only by their links (SKILL.md § layouts); `row`/`column`/`grid` order by number, so insert is for flows only.

## Inputs

- **Contract first**: `packages/format/schema/events/node.schema.json` `$defs/sent` gains `insert` (two card
  refs, as `nodeRef` / `{ key }` take elsewhere); the stored node event does not. `npm run gen`.
- **Write path**: `apps/board/server/write-board.ts` (`writeItems`), `write-refs.ts` (card refs, keys),
  `write-replay.ts` (retry), `write-result.ts` (`written`), `write-problem.ts`, `examples.ts`; the ledger's
  own node / unlink / link checks. Links are identified as the unlink item identifies them today.
- **Words**: refusal sentences in the server's write words home (`docs/specification/words.md` names it).
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. Failing tests first: insert between two linked flow cards (new card; existing card by `n` + `base`); the
   old link's label carried to both new links; refusals: no link `after`→`before`, the two in different
   containers, a container not `flow`/`lanes`, the item's `region` naming another container, `after` = `before`,
   the card itself one of them; a retry with the same key writes nothing twice; one refusal writes nothing.
2. Schema and `gen`; the expansion in the write path, checked whole before any line is appended; the result
   reports the card's `n`/`ver`/`title` as a node item does (and the links it made, if the result shape allows
   without a breaking change).
3. `docs/specification/api.md` (the node item) and the tool's example if the generated description shows one.
4. A layout check: after an insert the flow places the card between its neighbours (`show_layout` or the
   layout's own unit test on the resulting view).

## Validation

- [ ] Unit tests of the write path green; `gen -- --check`; `check`; `npm test`; `test:plugin` (the plugin
      engine shares the write path); flag off: `insert` refused as unknown, exactly as before

## Constraints

Deviation from a PLAN decision: stop and report (`DEVIATION`). No PII in examples. No git commits. Long writes in
chunks. Only your files; other needs under `REQUESTS`. Behind your flag (PLAN Decision 12), on by default; off is
exactly the old behaviour.

## Implementation Notes

_Re-run? Add a `### Run N` block; never overwrite an earlier run._

## On Completion

Notes here (Changes Made, Verification, Caught Beyond the Brief, Deviations); your TASK-STATUS row; one LOG line,
`[board-actions] ACT_01: … → Task: [[cortex-tasks/board/2026-11-05_board-ui_insert-markdown-signals/ACT_01_insert-into-flow.md]]`, ending in a
newline; the return block.
