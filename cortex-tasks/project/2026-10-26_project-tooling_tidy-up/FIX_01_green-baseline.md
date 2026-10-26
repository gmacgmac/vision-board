# FIX_01_green-baseline: Green Baseline

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Every test passes before the tidy-up starts: the page suite's known failures fixed, `temp/` cleared.

## Context

A refactor needs a green start, or nobody can tell what it broke. The full page suite currently fails
these, run on 2026-10-26 (`.claude/worktrees/tool-rail` notes):

1. `tests/pages/send-access.spec.ts` "axe passes on the board with the strip, a refusing note and
   holders" (light, dark): axe `target-size` on a card's `.vb-size-trig`, too close to a container
   holder button that has wrapped out of sight under the title line (`packages/ui/src/region/region.css`
   `.vb-region-holders`: wraps out of sight but stays focusable, FIX_48). The two tests after it
   ("a request that arrives…", "the strip moves the board down…") fail only because it leaves a
   request pending.
2. `tests/pages/every-node.spec.ts` (around its axe test): axe `target-size` on the container's
   "Move container" button (the grip), seen since container titles became `--vb-text-lg` (D-051).
3. `tests/pages/size.spec.ts` "gallery: Node size passes axe and matches its screenshot" (light,
   dark): 3-6 px of text anti-aliasing; seen before any of this week's work.
4. `tests/pages/board.spec.ts` "screenshot" (light, dark): passes alone, fails in a full run because
   earlier specs write to the shared board (it shows v153 and "6 boards updated").

## Inputs

- **Files to modify**: the specs above; `packages/ui/src/region/region.css`, `region-narrow.css` (only
  if the fix belongs there); `packages/ui/src/node/*.css` (only for the size control's target);
  `tests/pages/__screenshots__/` for those four specs; `temp/` (delete leftovers).
- **Skills**: `cortex-architecture`.

## Steps

1. [ ] Reproduce each failure on your port; record the error for each.
2. [ ] Fix 1 at its cause: something wrapped out of sight is not a target the page can hit. Either it
   leaves the hit-testing and the tab order while hidden (and is announced another way), or the size
   control meets the 24px target rule. Pick the one that keeps FIX_48's intent (the holders stay
   reachable), say why. No `axe` rule disabled.
3. [ ] Fix 2 at its cause (the grip's 24px target clear of its neighbours at the larger title).
4. [ ] Fix 3: if the pixels differ only by anti-aliasing, make the comparison robust the way the other
   gallery specs do (their threshold or masking), not by refreshing a baseline that will drift again.
5. [ ] Fix 4: the screenshot test draws on a board of its own (as `rail-board.ts` and other specs do), so
   no earlier spec can change it. Refresh its two baselines once, from that board.
6. [ ] Delete `temp/` leftovers (rule 8). Keep `temp/pages.lock` handling as is.
7. [ ] Run the full page suite twice; both runs green.

## Validation

- [ ] Full page suite green twice; `npm test`, `npm run verify`, `npm run check` green
- [ ] No axe rule disabled; every changed baseline listed with why

---

## Implementation Notes

_To be completed by agent after task completion. Re-run? Add a `### Run N` block; never overwrite._

**Status**: Pending  
**Completed**: YYYY-MM-DD HH:MM  

### Changes Made
- 

### Issues & Resolutions
- 

### Caught Beyond the Brief
- None

### Deviations from Plan
- None

---

## On Completion

1. Fill in Implementation Notes; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append your own LOG entry to `cortex/LOG.md` — one line ending in a newline, append-only:
   `[[YYYY-MM-DD HH:MM]] [project-tooling] FIX_01: what you did → Task: [[cortex-tasks/project/2026-10-26_project-tooling_tidy-up/FIX_01_green-baseline.md]]`
4. Return the `cortex-task-exe` Return Contract, with `REQUESTS` for anything outside your files.
   Never write the set entry or `AUDITED.md`. No commits.
