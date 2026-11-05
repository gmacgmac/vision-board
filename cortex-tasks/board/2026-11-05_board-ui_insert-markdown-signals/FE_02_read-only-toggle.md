# FE_02_read-only-toggle: Read-only as one toggle

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) · **Flag**: `readOnlyToggle`

## Objective

The header's read-only menu becomes one toggle button that shows the current state ("Read-only" or "Editing") and
flips on a press (PLAN Decision 11).

## Context

D-085: a ledger opens read-only; Edit takes the ledger's lock, Stop editing gives it back. Today a chip opens a menu
(`apps/board/src/shell/EditChip.svelte`, `shell/editing.ts`, words `shell/words/editing.ts`), placed through
the header (`board/chrome/{Toolbar,HeaderFields}.svelte`, `header-tier.ts`, `board/host.ts`).

## Inputs

- The files above; a toggle-button pattern in `packages/ui` (`aria-pressed`) if one exists: reuse it; none fits:
  `BLOCKED` with the options, the maintainer chooses (principles § Component model)
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. Failing page tests first: one press goes to Editing (lock taken), one more back to Read-only; a refused lock
   (another server holds it) leaves it Read-only and says why, as the menu does today; keyboard (Space, Enter),
   `aria-pressed`, its name; every header tier (full, half, third, and inside "⋯" where it lives there).
2. The toggle; the menu removed under the flag; words in `shell/words/editing.ts`.
3. Gallery: both states, the refusal, light and dark; axe and APCA.

## Validation

- [ ] `tests/pages/{read-only,read-only-writes,read-only-controls,header-tiers}.spec.ts` + yours, light and dark;
      a look at 1400, 900, 600 px; `check`; `npm test`; flag off = the menu as before

## Constraints

Deviation from a PLAN decision: stop and report (`DEVIATION`). No PII in examples. No git commits. Long writes in
chunks. Only your files; other needs under `REQUESTS`. Behind your flag (PLAN Decision 12), on by default; off is
exactly the old behaviour.

## Implementation Notes

_Re-run? Add a `### Run N` block; never overwrite an earlier run._

## On Completion

Notes here (Changes Made, Verification, Caught Beyond the Brief, Deviations); your TASK-STATUS row; one LOG line,
`[board-app] FE_02: … → Task: [[cortex-tasks/board/2026-11-05_board-ui_insert-markdown-signals/FE_02_read-only-toggle.md]]`, ending in a
newline; the return block.
