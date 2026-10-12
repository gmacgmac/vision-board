---
category: board-app
status: in-progress
created: 2026-10-12
tracker: cortex-tasks/tracker.md#U1
---

# A shorter selection bar

> **From**: maintainer, 2026-10-12 ("the selection bar is huge … just change that to remove … zoom to
> selection could just be zoom … we don't need clear, we just click away") · **Model**: Sonnet 5.5 ·
> **Go**: given

## Rulings (maintainer; do not reopen)

1. "Remove card" / "Remove cards" reads **Remove**.
2. "Zoom to selection" reads **Zoom**.
3. **Clear** leaves the bar. Clearing stays as it is: a click on empty board, Esc, and the keys.
4. Comment, Move to and Reset places are unchanged.
5. Short visible words, full meaning for everyone else: each button's tooltip and accessible name
   still say what it does and its key ("Remove the selected cards · Delete", "Zoom to the selection
   · Z"), so screen readers and the key list lose nothing.

## Steps

1. [ ] Tests first: the bar's buttons and their names/tooltips; no Clear; Esc and a click away still
   clear; the key help still lists Z and Delete; axe light and dark.
2. [ ] Build (`apps/board/src/board/commands.ts`, `selection-flow.ts`, the bar in `packages/ui`);
   screenshots after viewing the diffs; the `every-node.spec.ts` axe test that closed the bar to its
   pill because the bar covered a grip: put it back if the shorter bar no longer covers it.

## Validation

- [ ] The five gates exit 0, one after another.

## Constraints

- Project rules (`.kiro/steering/vision-board-proj.md`). No git commits or stash. Scratch in the
  system temp folder (never the repo's `temp/`); stop only your own processes and leave none
  running; never touch `.visionboard/`; don't use the board on 4466.
- Fill Implementation Notes below and append your own LOG line.

## Implementation Notes

**Status**: Not started
