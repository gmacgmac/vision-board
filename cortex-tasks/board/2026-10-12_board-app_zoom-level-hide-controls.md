---
category: board-app
status: in-progress
created: 2026-10-12
tracker: cortex-tasks/tracker.md#N13
---

# See the zoom level; hide card controls below a chosen level

> **From**: maintainer, 2026-10-12 (chat 651: "let's hide them, but let's pick a level … how can we
> find out what zoom level we're at") · **Model**: Sonnet 5.5 · **Go**: given

## Rulings (maintainer; do not reopen)

1. **The zoom level is visible**: the toolbar's zoom group shows the current zoom as a percentage
   (e.g. "75%"), next to or under Fit, always up to date (wheel, pinch, keys, buttons, Fit). The zoom
   buttons' tooltips say what they do and the level ("Zoom in · 75% now"). Every state, tokens only,
   APCA (reading text), screen readers announce the level politely on change (not on every frame).
2. **Hide card controls below a level**: the existing switch (`hideControlsZoomedOut`,
   `apps/board/src/board/viewport.ts` `FAR_K`) is turned **on** by default at today's level (0.75);
   the level stays one constant so the maintainer can pick a new one after reading the percentage.
   Below it, cards' buttons, the size control and containers' icon rows hide, as the switch already
   does; the board's axe checks follow (the existing `target-size` excuse at the opening zoom is
   reviewed: with hiding on, nothing small is drawn, so no excuse should be needed).

## Steps

1. [ ] Failing tests first: the percentage shows and follows every zoom path; tooltips; the live
   announcement; controls hidden below the level and shown above; keyboard focus never lands on a
   hidden control; axe light and dark at the opening zoom and at 1.
2. [ ] Build (`ToolbarEnd.svelte` zoom group, `viewport.ts`, `flags.ts` default); gallery state;
   screenshots after viewing the diffs, each with its reason.
3. [ ] Update tracker N13 in your notes (the orchestrator edits the tracker).

## Validation

- [ ] The five gates exit 0, one after another.

## Constraints

- Project rules (`.kiro/steering/vision-board-proj.md`): patterns first, one job per file about 300
  lines (500 hard), tests first, tokens only, every state, accessibility.
- No git commits or stash. Protected files: propose wording. Scratch in the system temp folder (never
  the repo's `temp/`); stop only your own processes and leave none running; never touch
  `.visionboard/` or real home-folder files; don't use the board on 4466.
- Fill Implementation Notes below and append your own LOG line.

## Implementation Notes

**Status**: Not started
