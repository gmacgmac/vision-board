# T_01_subtle-ink-contrast: Subtle ink to the reading tier

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

`--vb-ink-subtle` in dark passes Lc 60 on the surfaces it is text on, fixed in the token (tracker N45, PLAN decision 2).

## Context

The tokens are protected. This task runs in two halves with a stop between: measure and propose, then (after the
maintainer's yes, relayed by the orchestrator) write and re-take screenshots.

## Inputs

- **Files to modify**: `packages/tokens/src/tokens.css` (after the yes only), `packages/tokens/README.md`,
  `packages/ui/src/base/dialog.css` (only if a line there is not reading text), screenshots that change,
  `docs/specification/components.md` (FE_01's doc requests, relayed in your brief)
- **Reuse**: `tests/pages/apca.ts` (`lc`, `pixel`, `resolved`) for every measurement
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. List where `--vb-ink-subtle` is text and on which surface (dialogs, notes kind, quiet labels…), dark.
2. The darkest same-hue value that reaches Lc 60 on all of them (between `#b3b3bb` and `#b8b8c0` by PLAN), with
   its Lc per surface; check it still reads quieter than `--vb-ink` (`#c7c7cc`, Lc 71.6 on card).
3. **Stop**: return `BLOCKED` with the exact one-line change for the maintainer.
4. Run 2, after the yes: write it; re-take only the screenshots it changes, named in notes; the apca specs, gallery
   and dialogs in dark pass.

## Validation

- [ ] Run 1: the measured table and the exact value returned; Run 2: token written, the changed screenshots named, apca/gallery/dialog specs green

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

Notes; your TASK-STATUS row; one LOG line, `[board-tokens] T_01: … → Task: [[cortex-tasks/board/2026-11-03_board-ui_read-only-follow-ups/T_01_subtle-ink-contrast.md]]`, ending in a newline; the return block.
