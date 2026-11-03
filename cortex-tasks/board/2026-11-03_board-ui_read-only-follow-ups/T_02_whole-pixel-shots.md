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

**Status**: Completed

### Changes Made
- `tests/pages/host-styles.spec.ts`: new `wholePixels(t)` (box shrunk to whole pixels: near edges ceil, far edges floor); `sameUnderHost`'s `shot` scrolls the target into view and takes `page.screenshot({ clip })`, so every shot of a target (own, before, under, after) takes the same clip. Run: host-styles 8/8 three times (4.7, 4.9, 5.0 min), defaults both on. Deliberate rule (`.vb-board * { color: red !important }` in HOST, removed) failed the 550px light test (first pass 231). `verify` ok, `check` 0 errors.
### Caught Beyond the Brief
- Step 1 (reproducing the F16 partial row) was not done separately: the dialog sample is excluded (-ledgerFolders) and the flake was intermittent; the fix removes the partial rows by construction.
- Gallery group takes ~2.2-2.5 min per theme, near the 5 min group limit when two themes run on 3 workers.
### Deviations from Plan
- none

## On Completion

Notes; your TASK-STATUS row; one LOG line, `[project-tooling] T_02: … → Task: [[cortex-tasks/board/2026-11-03_board-ui_read-only-follow-ups/T_02_whole-pixel-shots.md]]`, ending in a newline; the return block.
