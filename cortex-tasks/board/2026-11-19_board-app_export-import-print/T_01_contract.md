---
skills: [cortex-architecture, cortex-docs]
---
# T_01_contract: Contract First

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The shapes everything else builds on (PLAN.md decisions 3-7, 11, 13-14).

## Steps

1. `export-file.schema.json`: `{ v: 1, title, items: write items, answers?: [{ key, answer: "check" | "cross" }],
   notes?: [{ key, text, thread? }] }`; items reference `write-item.schema.json`, no copy. Cards are keyed (the
   write items' own `key`) so answers and notes name their card.
2. `write-request.schema.json`: an optional `import: { into: "new" | "current", file: <export file> }` (or the
   shape that reuses the request best; say which). A route for export in `openapi.json`
   (`GET /boards/{board}/export?region=&notes=`); `export: true` (and `notes`) on `get_board` and
   `show_container` returning the export file (PLAN.md decision 7). `write_board`'s tool description names the
   `import` mode in one sentence, within the tool cap. `npm run gen`.
3. `packages/format/src/export/`: `upgradeExport` (a step list by `v`, empty, tested with a fake v0 step in the
   test only), `conditionExport` (drops what the schema does not know, names each drop; fills required defaults).
4. `BoardHost`: `saveFile?`, `openFile?`, `print?` (types and doc comments only); `plugin.md` § the hooks; the flag
   `boardFiles` (off); `api.md`. Refusal and drop words in `packages/format/src/words/`.
5. Tests: schema accepts an export of each node kind; the upgrade chain; conditioning (an unknown field and kind
   dropped and named, a missing title defaulted).

## Validation

`npm run check`, `npm run gen -- --check`, `npm run verify`, `npm test`. Port 8410.

## Constraints

No git commands that change state. No PII in examples. Deviation: stop and report. Each behaviour starts with a failing
test. Sentences in words files. Budgets never block: report measured numbers.

## On Completion

Fill Implementation Notes, update your TASK-STATUS row and notes, append one LOG line:
`[[YYYY-MM-DD HH:MM]] [category] ID: [what changed] → Task: [[cortex-tasks/board/2026-11-19_board-app_export-import-print/<file>]]`

## Implementation Notes

**Status**: Completed, with one decision for the maintainer (Caught Beyond the Brief 1)

**What was built**
- `packages/format/schema/api/export-file.schema.json`: `{ v: const 1, title, items, answers?, pins?, notes? }`.
  `items` reference `write-item.schema.json` (no copy), narrowed to `region | node | link`. Notes are
  `{ key | keys, text, thread?: [{ text }] }`: `keys` is a note on a group of cards, the same as the act's `n` / `nodes`.
- `write-request.schema.json`: `import: { into: new | current, file }`. You send either `items` or `import`
  (`$defs.itemsOrImport`, referenced by `$id` so the `not` gets the words beside it). In the request, `file` is any
  object, for two reasons: an older or messy file has to get as far as the upgrade and the conditioning, and a strict
  file would inline the write items a second time in the tool schema (about 19k characters).
- `write-result.schema.json` `dropped`. `openapi.json` 1.44.0 adds:
  - `export_board` (`GET /api/boards/{board}/export?region=&notes=`, page, `security: []`)
  - `export` and `notes` query parameters on `get_board` and `show_container`, answering `oneOf` (own response | export file)
  - one sentence each in the get_board, show_container and write_board descriptions
  - `npm run gen`
- `packages/format/src/export/`:
  - `upgrade.ts`: `EXPORT_VERSION`, `EXPORT_STEPS` (empty), `upgradeExport`. It runs on the ledger chain's runner,
    which is now shared as `migrate/index.ts` `runUpgradeChain`, and `upgradeLine` uses the same runner.
  - `condition.ts`: `conditionExport`. Field checks come from the ledger's hand-written twin, through
    `ledger-shape.ts` `shapeFieldProblems`.
  - `index.ts`: `ExportFile = OperationOutput<'export_board'>`.
- Words: `packages/format/src/words/format-export.ts`, with a row in `docs/specification/words.md`.
- Flag `boardFiles` (off), with a test. `BoardHost` gets `saveFile?`, `openFile?` and `print?` (types only); the seam
  stays at 2 (an addition) and `SEAM_TYPES` is re-hashed.
- Docs: `api.md` points 197-200, the table row and the version; `plugin.md` § What the host gives.

**Tests**: `packages/format/tests/export.test.ts` (10) and `apps/board/tests/schema-export.test.ts` (6), each written
first and seen failing. The second one also proves that whatever conditioning produces is accepted by the schema.

**Tests changed because the contract moved** (outside the listed files; each change is the smallest that keeps it green):
- `apps/board/tests/openapi.test.ts`: version 1.44.0.
- `apps/board/tests/route-table.test.ts`: `export_board: 'none'`.
- `packages/cli/tests/commands.test.ts` and `help-format.test.ts`: `items` and `import` are optional, because the
  schema requires one of the two.
- `packages/mcp/tests/session.test.ts`: the output check accepts a `oneOf` of components.
- `apps/board/tests/plugin-types.test.ts` HOST uses the three hooks, and `apps/board/plugin/seam.ts` has the new hash.

**Verification** (wide; port 8410):
- Passing: `npm run gen -- --check`, svelte-check, and the targeted suites.
- `npm run check` (tsc) fails on one line: `apps/board/server/handlers.ts` has no `export_board` handler. That is
  BE_01's work.
- `npm test`: 2,740 tests, 2,732 passed. All 8 failures were looked at:
  - Handler table: BE_01.
  - Tool budget: the orchestrator.
  - Five tests came from my openapi edit landing in the middle of the run; they pass on rerun.
  - The plugin.md citation path is fixed and passes on rerun.
- `npm run verify` has one failure: `docs/specification/modules.md` is out of date, so `npm run map` needs running.
  That is the orchestrator's.
- Budgets, measured: get_board 1,413 (cap 1,150), show_container 1,044 (cap 850), write_board 20,126 (cap 19,400),
  tool list 38,265 (cap 38,000). Descriptions: write_board 1,975 and get_board 693, both under the 2,048 cap.

**Security**: an imported file is untrusted. Every key is checked against an allow list (`known`, or `Object.hasOwn`
in `shapeFieldProblems`), so a `__proto__` key is dropped and named, never assigned. Values go through the ledger's
own checks, and after that the normal write checks.

**Caught Beyond the Brief**
1. **Decision needed (blocks BE_01 step 2 and FE_01 step 4): who writes the cards when the person imports.**
   - Today `write_board` takes only an agent's secret.
   - In ledger format 21, `region`, `node` and `link` lines are agent-only: `AGENT_EVENTS`, and
     `PERSON_TOO = board, retire, icon`.
   - So nothing in the format can author a person's import. Answers can be the person's acts after the cards, but the
     cards themselves need an author.
   - Recommended: those three line types join `PERSON_TOO`, ledger format 22 (a restamp step), and `write_board`
     takes the person's cookie for `import` only (the precedent is `retire_cards`, the person's own retire line).
   - Not built.
2. **Places on an agent's import.** A pin is the person's act, just as ✓/✗ are. Recommended: an agent's import drops
   `pins` and names them, as it does answers. The person's import applies them. Needs a ruling on decision 7a. `pins`
   was added to the wrapper because 7a keeps places and the file had nowhere to hold them.
3. **A radial container's `center`** names a card by number, and the container is written before its cards. So
   conditioning drops it and names it, and a radial container loses its centre on a round trip. A fix would be
   `center` taking `{ key }` plus a region rewrite after the cards. Proposed as a follow-up.
4. **Size.** `write_board` takes 512 KiB and 200 items per call; the export file allows 2,000 items. BE_01 has to
   decide how an import larger than 200 items runs (one batch past the bound, or chunked).
5. **Two doors to one export.** The page's `export_board` and the agents' `export=true` both exist, as the plan says.
   The page could call `get_board?export=true` instead, which would remove one route. That is the only near-copy left;
   it is kept per the plan.
