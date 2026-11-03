# T_02_whole-pixel-shots: Whole-pixel host-styles shots

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

`tests/pages/host-styles.spec.ts` `sameUnderHost` compares shots clipped to whole pixels inside each box, so a partial
edge row never decides the check (tracker M54, PLAN decision 6).

## Context

In the previous set (FIX_01 Run 2, F16) the New ledger dialog sample differed only in its last, partial pixel row,
between two shots taken with no host sheet at all. The ledger section's exclusion stays (its own reason).

## Inputs

- **Files to modify**: `tests/pages/host-styles.spec.ts`
- **Skills**: `cortex-architecture`

## Steps

1. Reproduce: a box with a fractional height whose two shots differ with no sheet (FIX_01 Run 2's probe in its notes).
2. Clip each shot to the whole-pixel rectangle inside the box (floor the far edges, ceil the near ones), both shots
   the same clip.
3. Run host-styles with the flag defaults as they are (both on) several times; it stays green and still fails when a
   host rule really reaches a sample (a quick check with a deliberate rule, then removed).

## Validation

- [ ] host-styles 3 runs green; a deliberate host rule still fails it; `verify`, `check`

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

Notes; your TASK-STATUS row; one LOG line, `[project-tooling] T_02: … → Task: [[cortex-tasks/board/2026-11-03_board-ui_read-only-follow-ups/T_02_whole-pixel-shots.md]]`, ending in a newline; the return block.
