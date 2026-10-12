---
category: board-app
status: planned
created: 2026-10-12
tracker: cortex-tasks/tracker.md#N24
---

# The person removes cards and containers

> **From**: maintainer, 2026-10-12 (chat 652, 653: a, b, c ok) · **Model**: Opus 5.5 · **Go**: given;
> starts after the zoom-level task is committed

## Rulings (maintainer; do not reopen)

1. **A person version of retire** (652A): "Remove card" on a card (its menu, and on a selection of
   cards), and "Remove container" in a container's settings, each with a short confirm naming what
   goes ("Remove card 4 'Venue lead time'?", "Remove container 'Notes' and its 3 cards?").
2. **Same rules as an agent's retire** (652B): removed cards and containers leave the board and stay
   in the ledger with their versions and notes; numbers are kept and never reused; the container's
   "N cards retired" marker and board version history show them. One path: the existing retire in
   the action layer (`packages/actions/src/retire.ts`, the ledger `retire` event), not a second one.
3. **The person may remove a card that's still owed an answer** (652C); the confirm warns ("Card 4
   still has an unanswered comment."). Agents keep their refusal.
4. A locked or archived board refuses it (D-042, D-043): the controls pause with the lock's reason.
5. Agents see the removal like an agent's retire (the card is gone from reads; `retired` in
   `show_node`/`show_container`); anything they owed on it is no longer owed.

## Steps

1. [ ] Contract first: how a person's retire is recorded (the same `retire` event with `by: person`,
   or a person act; say which and why), OpenAPI if a route changes, `npm run gen`, api.md.
2. [ ] Failing tests first: remove a card, a selection, a container; owed card warned and removed;
   numbers never reused; the marker; locked/archived refused; agents' reads; keyboard; axe light and
   dark.
3. [ ] Build: the confirm reuses `ConfirmDialog`; flag `personRemove`, on by default; gallery entry;
   screenshots after viewing the diffs.
4. [ ] Docs: api.md, components.md.

## Validation

- [ ] The five gates exit 0, one after another.

## Constraints

- Project rules (`.kiro/steering/vision-board-proj.md`): contract first, patterns first, one job per
  file about 300 lines (500 hard), tests first, tokens only, every state, accessibility.
- No git commits or stash. Protected files: propose wording. Scratch in the system temp folder (never
  the repo's `temp/`); stop only your own processes and leave none running; never touch
  `.visionboard/` or real home-folder files; don't use the board on 4466.
- Fill Implementation Notes below and append your own LOG line.

## Implementation Notes

**Status**: Not started
