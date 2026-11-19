---
task_name: Export, Import and Print
created: 2026-11-19
completed:
status: in-progress
categories: [board-app, board-format, board-actions, board-ui]
tracker: cortex-tasks/tracker.md#N56
---

# Export, Import and Print - Task Status

> **Plan**: [PLAN.md](./PLAN.md)

## Instructions for Agents

1. Read PLAN.md first (§ Decisions is every ruling). 2. Read notes of completed tasks. 3. Respect the Wave column.
4. Reuse Shared Foundations. 5. Touch only your files; list other needs under `REQUESTS`. 6. Deviation: stop and
report. 7. Update your row and notes. 8. No git commands that change state. 9. Never port 4466; your port is in
PLAN.md § House Rules.

## Task List

| # | ID | Wave | Model | Own worktree | Persona | Task | Status | Notes |
|---|-----|------|-------|--------------|---------|------|--------|-------|
| 1 | T_01 | 1 | strong | no | Principal API engineer — one shape reused, never a near-copy; an import refuses nothing silently and names what it dropped. | [Contract first](./T_01_contract.md) | Completed | Contract and tests landed. One decision blocks the person's import (who writes the cards; see notes). BE_01 owes the `export_board` handler. |
| 2 | BE_01 | 2 | strong | yes | Data-migration engineer — a file from an older version comes in or says exactly why not, and a person's answers are never an agent's. | [Export and import on the server](./BE_01_export-import.md) | Completed | Ledger 22, the person's import by cookie, export read, import mode, centre by key; suite green but the tool budget. Two rulings asked (notes on an agent's import, replies on the person's). |
| 3 | FE_01 | 2 | strong | yes | Interaction designer for document tools — three menu items, one dialog, and a printout that looks like the board. | [Menus, dialog, print view, standalone hooks](./FE_01_menus-dialog-print.md) | Completed | Page side done and tested. The server round trip is `test.fixme` until BE_01. Budgets over (page 211.1/206.2 KB, plugin 206,315/200,600). A host must define two `@page` names (Requests). |
| 3b | T_03 | 3 | strong | no | Prompt engineer — an instruction is code: every sentence earns its place and is proven on scenarios. | [The agent learns export and import](./T_03_skill.md) | Pending | |
| 4 | VERIFY_01 | 4 | strong | no | Programme manager who shares boards across teams — exports, imports and prints a real board without reading a manual. | [Final verification](./VERIFY_01_testing.md) | Pending | |
| 5 | T_02 | 5 | standard | no | Staff engineer who owns deprecations — done when nothing points at the flag. | [Switch on](./T_02_switch-on.md) | Pending | |

## Shared Foundations

| Artifact | Created by | Consumed by |
|----------|-----------|-------------|
| `packages/format/schema/api/export-file.schema.json` (wrapper; `items` → `write-item.schema.json`), generated `ExportFile` type, `EXPORT_VERSION` 1 | T_01 | BE_01, FE_01 |
| `packages/format/src/export/` (`upgradeExport(file)`: the chain by `v`, empty steps; `conditionExport(file) → { file, dropped }`) | T_01 | BE_01 |
| `write_board` `import` mode in `write-request.schema.json` (`import: { into: 'new' \| 'current' }`), the export route in `openapi.json` | T_01 | BE_01, FE_01 |
| `BoardHost` `saveFile?`, `openFile?`, `print?` (`apps/board/src/board/host.ts`), `plugin.md` § the hooks | T_01 | FE_01 |
| Flag `boardFiles` (`packages/format/src/flags.ts`, off) | T_01 | FE_01, T_02 |

## File Ownership

| Wave | Owner | Files |
|------|-------|-------|
| 1 | T_01 | `packages/format/` (schema, `src/export/`, flags, words, tests), generated files, `apps/board/src/board/host.ts` (types only), `docs/specification/api.md`, `docs/specification/plugin.md` |
| 2 | BE_01 | `apps/board/server/` (write-board import mode, the export read), its tests, `packages/format/src/words/` for new refusals |
| 2 | FE_01 | `apps/board/src/` (menus, dialog, print view, standalone host hooks, `links/wires.ts` `fill="none"`), `apps/board/src/styles/`, `packages/ui/src/` (the dialog pattern if new, words), `tests/pages/` (new specs), gallery |
| — | orchestrator | see PLAN.md § House Rules |

## Requests

| Request | From | Need | Routed to | Status |
|---------|------|------|-----------|--------|
| `apps/board/server/handlers.ts` + engine: `export_board` handler (tsc and `api-errors.test.ts` red until then) | T_01 | blocking for the wave gate | BE_01 | Done (BE_01, `engine/reads.ts` `exportBoard`) |
| `docs/specification/modules.md`: `npm run map` (new `packages/format/src/export/`) | T_01 | blocking for verify | orchestrator | Open |
| `packages/mcp/tests/tools.test.ts` budgets: get_board 1,413, show_container 1,044, write_board 20,126, list 38,265 | T_01 | non-blocking | orchestrator | Open |
| The person's import: who writes the cards (ledger 22, `PERSON_TOO`, cookie on `import`); pins on an agent's import | T_01 | blocking BE_01 step 2, FE_01 step 4 | maintainer | Ruled (D-108, 613-614); built by BE_01 |
| `packages/mcp/tests/tools.test.ts` budgets: tools/list 38,543 (cap 38,300), write_board 20,404 (cap 20,150; a region's `center` takes `{ key }`) | BE_01 | non-blocking | orchestrator | Open |
| Ruling: an agent's import drops the person's notes (D-108) though decision 7 said it carries them; the person's import drops the agent's replies (`reply` not in `PERSON_TOO`) | BE_01 | non-blocking | maintainer | Open |
| Conditioning's `dropped` words are pointer-first (for an agent); the page shows them to the person as they are | BE_01 | non-blocking | orchestrator (T_03 or a words pass) | Open |
| `docs/specification/plugin.md` § What the host gives, `print()`: the board's root names its page `vb-print-landscape` or `vb-print-portrait`; a host defines both (`@page`, 10 mm margins) for the one-page fit to hold | FE_01 | non-blocking | orchestrator | Open |
| Budgets: `verify-weight.mjs` page 211.1 KB (budget 206.2), `plugin-build.test.ts` `view/board.js` 206,315 (budget 200,600) | FE_01 | non-blocking | orchestrator | Open |

## Implementation Notes

### T_01
_Status:_ Completed (2026-11-19). The full notes are in the task file. For wave 2:
- Shapes: `ExportFile` (`OperationOutput<'export_board'>`) adds `pins?` (decision 7a) and `notes[].keys` (a note on a
  group of cards). The request is `import: { into, file }`, and `file` is any object until `upgradeExport` and
  `conditionExport` have run. The result is `dropped: string[]`.
- `conditionExport(raw) → { file, dropped }` already drops refs to cards the file no longer holds, ✓/✗ on cards that
  don't ask, a card's number/`n`/`base`/`insert`, and a container's `center`. BE_01 only adds the agent-side drop of
  answers (and pins, if that is ruled).
- **Open, for the maintainer:** a person's import has no author for its region, node and link lines. `write_board` is
  agent-only, and in ledger 21 those line types are agent-only. Recommended: they join `PERSON_TOO`, ledger format 22
  (a restamp), and `write_board` takes the person's cookie for `import` only.
- Also open: pins on an agent's import (recommended: drop and name them, like answers).
### BE_01
_Status:_ Completed (2026-11-19, worktree `files-be-01`). Full notes in the task file. For FE_01, T_03, VERIFY_01:
- The page: `GET export_board?region=&notes=`; `write_board` `{ import: { into, file } }` with the cookie. A clash on
  `into: new` is `409 conflict` at `/import/into`; `items` from the person are `422 invalid` at `/items`. No refusal
  of a good cookie is `forbidden`. The reply's `dropped` is left out when nothing was.
- Keys in a file: a container's id, `card:<n>`, `link:<n>><n>`. An agent's import writes `import-<seq>-<key>` keys
  (in `results`); the person's lines hold no key. `results` can pass 200 (up to 2,000) for an import.
- Ledger format 22; openapi 1.45.0; a sent region `center` takes `{ key }`; api.md 201-205.
- Asked of the maintainer (Requests): notes on an agent's import, replies on the person's import.
### FE_01
_Status:_ Completed (2026-11-19). The full notes are in the task file.
- **For BE_01**
  - The page calls `export_board` (`?region=&notes=true`) and `write_board` with `{ import: { into, file } }` as the
    person (cookie, through `asPerson`, which reloads once on `forbidden`).
  - For `new`, the path's board id is `boardIdFor(file.title)`, unique among the boards.
  - The page shows the reply's `dropped` strings as a list.
- **Fixme until BE_01**: `tests/pages/board-files.spec.ts` "against the server (BE_01)". Two round-trip tests; remove the
  `test.fixme` line.
- **Print**
  - `canvas/print-view.ts` and `styles/print.css`.
  - The board's sheet can't hold `@page` (the host's sheet check), so the standalone page defines `vb-print-landscape` and
    `vb-print-portrait` in `shell.css`. A plugin host has to define them too (Requests).
- **Caught**: soft shadows print as grey blocks in a PDF (dropped in print); links were hidden while settling (fixed).
- **For the maintainer**: dark mode prints dark. Force light while printing? (Task file, Caught 4.)
### T_03
_Status:_ Pending
### VERIFY_01
_Status:_ Pending
### T_02
_Status:_ Pending
