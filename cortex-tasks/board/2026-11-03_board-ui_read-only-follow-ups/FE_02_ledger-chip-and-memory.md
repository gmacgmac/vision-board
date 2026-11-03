# FE_02_ledger-chip-and-memory: Ledger chip and page memory per ledger

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The ledger chip shows whenever the server names a ledger (tracker M51, PLAN decision 3), and the page's memory is kept
per folder and ledger (tracker M52, PLAN decision 4).

## Context

VERIFY_01 F11 and F15 in the previous set's findings. Today the header's page parts are built at boot, before the
folder is read, so the chip follows the page flag; and `apps/board/src/shell/kept.ts` `pageStore` keys by board id
only, so `main/plan` and `ui/plan` share zoom and proposals-hidden.

## Inputs

- **Files to modify**: `apps/board/src/shell/{page-parts.ts,App.svelte,shell.svelte.ts,kept.ts,LedgerPart.svelte}`,
  `apps/board/src/board/host.ts`, the header files in your ownership, `gallery/ledger-section.ts`, the specs you own
- **Reuse**: `get_project` `ledger` / `ledgers`; `host.ts` `ledgerChip` / `ledgerField` / `ledgerRow`;
  `header-tier.ts` (the one table for where a control sits); LEDGER_UI_01's last-board key rule (`main` keeps the
  folder's old key) for the memory move
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. Failing specs: a server with ledgers and a page with `?flags=-ledgerFolders` shows no chip; zoom set on
   `main/plan` shows on `ui/plan`.
2. Build the ledger parts from the server's answer (after the folder is read); the "⋯" row and its tooltip follow.
3. Key `pageStore` by folder and ledger as well as board; `main` of a folder keeps the old keys (nothing lost); a
   unit test of the key rule.
4. States unchanged; axe and APCA; a look at 1400, 900, 600 px, light and dark, on your own test server.
5. `components.md` / `words.md` updated where they describe these.

## Validation

- [ ] Both specs fail first, then pass; header-tiers, ledgers, last-board, current-folder green; `verify`, `check`, unit tests

## Constraints

Deviation from a PLAN decision: stop and report (`DEVIATION`). No PII in examples. No git commits. Long writes in
chunks. Only your files (TASK-STATUS File Ownership); other needs under `REQUESTS`.

## Implementation Notes

_Re-run? Add a `### Run N` block; never overwrite an earlier run._

**Status**: Pending

### Changes Made
-
### Caught Beyond the Brief
-
### Deviations from Plan
-

## On Completion

Notes; your TASK-STATUS row; one LOG line, `[board-ui] FE_02: … → Task: [[cortex-tasks/board/2026-11-03_board-ui_read-only-follow-ups/FE_02_ledger-chip-and-memory.md]]`, ending in a newline; the return block.
