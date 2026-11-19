---
skills: [cortex-architecture]
---
# BE_01_export-import: Export and Import on the Server

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The export read and the `import` mode of `write_board` (PLAN.md decisions 1-7), on T_01's contract.

## Steps

1. Export (`apps/board/server/`, beside the reads in `engine/reads.ts`): the board's current state, or one
   container's, as write items with keys (regions, nodes with their current text, kind, tone, icon, timeline, size,
   links), the person's current answers, and, when asked, the notes and their conversations. Pins: the person's moved
   cards keep their places (a `pin` per moved card in `items` if the write items carry one; else say so).
1a. The agent reads: `get_board` and `show_container` with `export: true` answer the same export (one function).
2. Import (`write-board.ts`): `upgradeExport`, `conditionExport`, then the items through the normal write path
   into a new board (titled from the file) or the current one, every container new (never merged into an existing
   one), the file's keys made fresh so they never clash with the writer's own, pins kept relative to their container
   (decision 7a); then the answers as the person's acts only when the
   request comes from the page as the person; from an agent, answers are dropped and named (decision 7). The reply
   lists what was dropped.
3. Tests (`apps/board/tests/`): a round trip (export then import into a new board gives the same cards, links,
   answers, places); a container export; import into the current board; an agent's import drops answers; an unknown
   field dropped and named; an older `v` upgraded (with a test-only step).

## Where

Own worktree `files-be-01`, port 8510.

## Validation

`npm run check`, `npm test`, `npm run verify`.

## Constraints

No git commands that change state. No PII in examples. Deviation: stop and report. Each behaviour starts with a failing
test. Sentences in words files. Budgets never block: report measured numbers.

## On Completion

Fill Implementation Notes, update your TASK-STATUS row and notes, append one LOG line:
`[[YYYY-MM-DD HH:MM]] [category] ID: [what changed] → Task: [[cortex-tasks/board/2026-11-19_board-app_export-import-print/<file>]]`

## Implementation Notes

**Status**: Completed (2026-11-19), in worktree `files-be-01`, nothing committed.

**What was built**
- **Ledger format 22** (D-108): `region`, `node` and `link` join `PERSON_TOO`; their stored `by` is `agent | person`.
  Step `restamp(21)`; every ledger `$id` `/21/` → `/22/` (schemas, openapi, `gen-contract.mjs`, tests); fixtures (not
  `legacy/`) at `v` 22; openapi examples restamped; `info.version` 1.45.0; `npm run gen`.
- **The person's import**: `write_board` security is agent secret *or* the person's cookie (`agent-or-person`). From
  the person only `import`; `items` from the person are `invalid` at `/items` (never `forbidden`, which the page takes
  for a stale cookie). `checkCaller` lets an `agent-or-person` write through.
- **Radial centre round-trips**: a sent region's `center` takes `{ key }` (`nodeRef`); the stored line still names a
  ledger number (`region.schema.json` `$defs.rules`). Conditioning keeps a centre by key naming a card in the file.
- **Export** (`server/engine/export.ts` `exportFile`): one function behind `export_board` (page, `personBoard`),
  `get_board` and `show_container` with `export` (agents, `requireBoard`). Board as it shows; keys `<container id>`,
  `card:<n>`, `link:<n>><n>`; answers, pins, optional notes with `thread`.
- **Import** (`server/write-import.ts` `importFile`): upgrade → condition → `keptFor` (new, `packages/format/src/export/
  writer.ts`) → `importTarget` (visibility.ts) → board line for `new` → `freshIds` (`plan` → `plan-2`, never Later) →
  fresh keys (agent: `import-<seq>-<key>`; person: none stored) → one `writeBatch` (write-board.ts, now shared) →
  centres → for the person, notes, pins, answers as person acts (answers last so a ✓/✗ closes the notes, as on the
  source). `Batch` gained `person` and `made` (a batch-local key map; write-refs `keyed` reads it first).
- **Conditioning additions**: a later item with an earlier item's key is left out, named.
- **Result bounds**: `results` up to 2,000 (index ≤ 1,999) for an import; `dropped` capped at 2,000 with a "N more".
- **Refusals**: `into: new` on a board the writer sees → `conflict` at `/import/into`; on one an agent can't see →
  `UNAVAILABLE`; `into: current` unknown → `not-found`, locked → `locked`; a file the chain can't bring up → `invalid`
  at `/import/file`.
- Words: `format-export.ts` (`centerByKey`, `keyTaken`, `agentAnswer`, `agentPin`, `agentNote`, `personThread`),
  `server/words/writes.ts` (`thePersonWritesOnlyAnImport`, `boardExistsSoImportCurrent`, `importNotWritten`,
  `importNotApplied`, `importMoreLeftOut`). Docs: `api.md` 201-205, points 5, 11, 198 and the updated line.

**Tests** (each behaviour red first, except the schema-v22 centre case, written right after the schema change the
API test forced): `apps/board/tests/api-import.test.ts` (9: export, agent reads, person new round trip, person
current, agent import, unknown field and kind, refusals, 251 items in one call, an older `v` through a test-only step),
`apps/board/tests/schema-v22.test.ts` (4), `packages/format/tests/export.test.ts` (+3: centre by key, duplicate keys,
`keptFor`). Changed because the contract moved: `api-identity.test.ts` (person `items` → 422 at `/items`),
`route-table.test.ts`, `openapi.test.ts` (1.45.0), `schema-cases.ts` (a person's `unlink` is the broken case now),
`packages/format/tests/ledger.test.ts`, `schema-v21.test.ts` (`>= 21`), `/22/` in `schema*.test.ts`.

**Verification** (wide; worktree, `VB_TEST_PORT=8510`): `npm run check` clean; `npm run verify` ok (45 warnings, none on
touched files; page weight passes after `npm run build`); `npm test` 2,756 tests, 2,755 pass, 1 fails: the tool-list
budget (orchestrator's). `npm run test:timing` 15/15. Before the build, `api-ledgers.test.ts` "the folder open now…"
failed for want of `apps/board/dist/index.html` (no page served, no cookie): environmental, green after the build.
`plugin-build.test.ts` "same bytes" failed once under the full run's load and passed alone.
- Budgets, measured: tools/list 38,543 (cap 38,300); write_board 20,404 (cap 20,150; the centre's `nodeRef`);
  get_board 1,413, show_container 1,044 (under their caps).

**Security**: the cookie widens `write_board` for `import` only; the person's lines pass every ledger check
(schema, `eventProblems`, lock, context). The file is untrusted: allow-listed keys (conditioning), the 512 KiB body,
2,000 results, `dropped` capped. An agent's import never writes the person's acts; the person's never writes the
agent's words. Keys from a file never reach the writer's key space (fresh prefix; the person's none).

**Caught Beyond the Brief** (data-migration view)
1. **Notes on an agent's import are dropped, named** (D-108 "drops the person's own acts"; an agent can't write an
   `act` line). PLAN decision 7 said an agent's import "carries … notes". D-108 is the later ruling; confirm.
2. **The agent's replies (`thread`) are dropped on the person's import**: `reply` is not in `PERSON_TOO` (D-108 named
   containers, cards and links). A `notes=true` round trip loses the replies, named. Ruling needed if they should come.
3. **No retry for an import**: fresh keys mean a retried import (a timeout) writes the file twice. By design (D-107
   "as if freshly written"); worth a line in the skill (T_03).
4. **The words the page shows**: conditioning's drops (T_01) read `items[1].node.glow: not a field Vision Board knows`:
   pointer-first, for an agent. The page shows them as they are. One string serves both readers today; a person's
   wording would need a second form (a REQUEST, not done).
5. **The person's view choices travel as the container's own**: the export writes the mode, widths, direction and card
   size the board *shows* (the person's choice winning) into the items. On an agent's import they become the agent's.
6. **An agent importing into a board it holds no grant on** gets `needs-grant` per item (the normal checks), not one
   refusal.
7. **A card moved to Later** exports with `region: later` and imports into the new board's Later.
