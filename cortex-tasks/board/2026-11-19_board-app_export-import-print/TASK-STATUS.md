---
task_name: Export, Import and Print
created: 2026-11-19
completed:
status: planned
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
| 1 | T_01 | 1 | strong | no | Principal API engineer — one shape reused, never a near-copy; an import refuses nothing silently and names what it dropped. | [Contract first](./T_01_contract.md) | Pending | |
| 2 | BE_01 | 2 | strong | yes | Data-migration engineer — a file from an older version comes in or says exactly why not, and a person's answers are never an agent's. | [Export and import on the server](./BE_01_export-import.md) | Pending | |
| 3 | FE_01 | 2 | strong | yes | Interaction designer for document tools — three menu items, one dialog, and a printout that looks like the board. | [Menus, dialog, print view, standalone hooks](./FE_01_menus-dialog-print.md) | Pending | |
| 4 | VERIFY_01 | 3 | strong | no | Programme manager who shares boards across teams — exports, imports and prints a real board without reading a manual. | [Final verification](./VERIFY_01_testing.md) | Pending | |
| 5 | T_02 | 4 | standard | no | Staff engineer who owns deprecations — done when nothing points at the flag. | [Switch on](./T_02_switch-on.md) | Pending | |

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
| | | | | |

## Implementation Notes

### T_01
_Status:_ Pending
### BE_01
_Status:_ Pending
### FE_01
_Status:_ Pending
### VERIFY_01
_Status:_ Pending
### T_02
_Status:_ Pending
