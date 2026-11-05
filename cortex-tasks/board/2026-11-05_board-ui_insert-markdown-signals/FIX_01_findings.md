# FIX_01_findings: Wave 2 findings and signal follow-ups

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

Close what wave 1 left and VERIFY_01 found blocking, so the set meets PLAN Decision 10 everywhere "new" and
"updated" show.

## Items

1. **FE_01-R3**: `packages/ui/src/region/region-note.css` `.vb-nblock-reply`: container note replies take the
   same edge as card replies under `[data-update-signals]` (bright amber while unseen, muted after).
2. **The "N updates" tab on hover/open** keeps the bright `--vb-state-updated`, not the duller changed amber:
   hovering must never look like a step down (`packages/ui/src/node/node-steps.css`).
3. **The toolbar's "N new" chip** is still the accent pink: one colour per meaning (Decision 10). New is teal:
   the chip takes `--vb-state-fresh` under `updateSignals`; if it counts updated cards too, say how it reads and
   pick the teal unless VERIFY_01 found it confusing.
4. **VERIFY_01's blocking findings**, as the orchestrator lists them in your brief.

## Steps

Failing test first for each; the specs and screenshots each touches; APCA (labels Lc 45, edges Lc 30), light and
dark; gallery entries updated; a look at 1400, 900, 600 px.

## Validation

- [ ] Each item's spec green, light and dark; `check`; `npm test`; flag off = as before

## Constraints

Deviation from a PLAN decision: stop and report (`DEVIATION`). No PII in examples. No git commits. Long writes in
chunks. Only your files; other needs under `REQUESTS`. Behind the flag each piece already uses; off is
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
`[board-ui] FIX_01: … → Task: [[cortex-tasks/board/2026-11-05_board-ui_insert-markdown-signals/FIX_01_findings.md]]`, ending in a
newline; the return block.
