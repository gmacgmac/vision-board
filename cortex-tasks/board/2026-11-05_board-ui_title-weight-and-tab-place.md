---
model: strong
skills: [cortex-architecture, cortex-docs]
persona: Visual designer for dense boards — the headline reads first, and a status mark never crowds the card's own icons.
---

# Bold big title; the bottom tabs at a third of the card (points 442, tab place)

> **Created**: 2026-11-05 · **From**: maintainer, point 442 and the bottom-tab screenshot

## Decisions (maintainer, binding)

1. **442**: the big title on a structured card (D-090, `bigTitles`) is bold (the `#` weight), so it is clearly the
   headline over a bold `##`. Under `bigTitles`; plain cards unchanged.
2. **Tab place**: the card's bottom-edge tabs ("N updates", NEW, and any others in `.vb-node-btabs`) sit with their
   centre about a third of the way along the card's bottom edge, away from the card's kind icon and "Open" at the
   bottom left (today `packages/ui/src/node/node-popover.css` `.vb-node-btabs { left: 14px }`). On the smallest card
   (S) and with two tabs showing, they never cross the card's left edge (keep today's 14 px as the minimum) nor
   collide with the right-hand action icons; say what you chose where the third does not fit. Under `updateSignals`.

## Steps

1. Failing page test first (extend `tests/pages/update-signals.spec.ts` or `big-titles.spec.ts`, or a new spec):
   the big title's weight; the tab group's centre at about a third of the card's width on S, M and L, one tab and
   two; no overlap with the kind icon/"Open" or the action icons; flag off = today; light and dark, axe.
2. CSS in `node.css` / `node-popover.css`, tokens only. Re-take any screenshot it changes after checking each diff.
3. Before/after PNGs of an S, an M and an L card with "1 update" (and one with NEW plus "1 update"), and a big-title
   card, light and dark, in the worktree's `temp/tab-place/`; list absolute paths.
4. `docs/specification/components.md` (the bottom tabs and big titles passages).

## Constraints

Worktree `.claude/worktrees/tab-place` (branch `feat/tab-place`, from main), `VB_TEST_PORT` 8400. Never port 4466,
the repo's own `.visionboard/`, or `node_modules`. No git commits. Writes >50 lines in chunks. Time limit on every
run, `nice -n 15`, `VB_TEST_WORKERS=3`, full spec paths. `npm run build` once before page tests. Run the full page
suite once at the end.

## Implementation Notes

## On Completion

Notes in the main checkout's copy; one LOG line, `[board-ui] Title weight and tab place: … → Task: [[cortex-tasks/board/2026-11-05_board-ui_title-weight-and-tab-place.md]]`, ending in a newline.
