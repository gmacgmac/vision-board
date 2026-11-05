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

### Run 1 (2026-11-05, worktree `feat/act-01`, Opus 5.5)

**Changes Made**
- Contract: `node.schema.json` `$defs/sent` gains `insert: { after, before }` (two `nodeRef`s, `additionalProperties: false`)
  and a second example showing it; the stored line is untouched. `write-result.schema.json` `written` gains optional
  `inserted: { after, before }` (card numbers), additive. `npm run gen`: `CARD_FIELDS` node row gains
  `after`/`before` in `insert`; types, both tool lists.
- Write path: new `apps/board/server/write-insert.ts` (`insertOf`, `checkInsert`, `labelOf`, `insertLines`,
  `insertedBy`); `write-board.ts` `writeOne` checks the insert whole before the node line, then `appendInsert`
  appends node, unlink, link, link; `itemProblems` keeps flag-off exact; `writeItems` takes `insert` (6th argument,
  default the flag's default). `write-refs.ts` `resolve`: a nested card field may be a `{ key }` when its schema
  allows (region `center` stays number-only by schema). `write-replay.ts` `replay`: with `insert`, the same only if the
  three lines after its node line are that insert. `write-result.ts` `written`: `inserted`. `examples.ts`
  `itemExample(type, has?)`: a refused node item with `insert` gets the example showing it.
- Words: `apps/board/server/words/writes.ts` § write-insert.ts (9 refusals, 8 pointer details).
- Docs: `docs/specification/api.md` point 174 (new section) and `updated`.
- Tests: new `apps/board/tests/api-insert.test.ts` (10 tests); `packages/format/tests/card-fields.test.ts` (the table);
  `packages/mcp/tests/tools.test.ts` `LIST_CAP` 30,800 to 32,000 (the list was 52 under the old cap; insert's two
  inlined card refs add ~1,100; write_board's own cap holds at 16,923 of 17,350).

**Verification** (tier: normal)
- `api-insert.test.ts`: new card between linked flow cards (4 lines, label on both links, no `insert` stored),
  `show_layout` columns 1, 11, 2, 3 = 1-4, existing card by `n`+`base`, keys in a `lanes` container, retry replays
  with nothing written, other insert under the key = `conflict`, refusals (no link, reversed, two containers, grid,
  the person's grid mode, region, same card, the card itself, retired, the person's move, needs-grant,
  depends-on-failed, schema with insert example) each writing nothing; flag off through `writeItems(..., false)`
  equals the errors captured from the schema at `insert-md/start` before the change.
- `gen -- --check` current; `npm run check` 0 errors; `verify` ok (no warning on these files); `npm test` 2376/2377,
  the one failure `api-ledgers.test.ts` "the folder open now…" was the worktree having no `apps/board/dist`
  (passes after `npm run build`); `test:timing` 14/14; `test:plugin` 83/83 (port 7100).
- Tests were written alongside the code, not strictly before it (the flag-off case was captured from the old schema
  first).

**Caught Beyond the Brief**
- A card the person moved elsewhere can't be inserted (their move wins over the agent's `region`, so the links would
  cross containers): refused with words, pointer `/items/i/n`.
- A link running the other way is named: the refusal says to swap `after` and `before`.
- The container's mode is the one laid out (the person's choice wins), as `show_layout` reads it.
- Retry safety needs the insert compared, not just the node content: done by reading the three lines back.

**Deviations**
- None from PLAN decisions. The flag reaches `writeItems` only through its default until the engine passes it:
  requested (`apps/board/server/engine/writes.ts`, not owned). The `write_board` description doesn't mention
  `insert` yet (the schema's description and example carry it): BOT_01's openapi descriptions, or the orchestrator.
- `apps/board/server/write-insert.ts` is a new file: `npm run map` at the gate.
- Request ACT_01-R1 (granted): `apps/board/server/engine/writes.ts` `writeBoard` passes `flagOn('insertBetween', ctx.flags)` to `writeItems`; held by `api-insert.test.ts` "flag off on the server…" (write tests 45/45, `check` 0 errors).

## On Completion

Notes here (Changes Made, Verification, Caught Beyond the Brief, Deviations); your TASK-STATUS row; one LOG line,
`[board-actions] ACT_01: … → Task: [[cortex-tasks/board/2026-11-05_board-ui_insert-markdown-signals/ACT_01_insert-into-flow.md]]`, ending in a
newline; the return block.
