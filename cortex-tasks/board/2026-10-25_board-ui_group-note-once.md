---
task_name: Group Note Drawn Once
created: 2026-10-25
completed:
status: pending
categories: [board-ui]
type: implementation
model: strong
skills: [cortex-architecture, cortex-docs]
tracker:
---

# Task: A note on a selection is drawn once, on the selection

> **Source**: maintainer, chat 2026-10-25 (points 91-93; 93 in the maintainer's words: "see the note
> applied to the selection ... show the selection afterwards on the extents of the selected nodes and
> the comment added") · **Branch / worktree**: `feat/tool-rail-and-examples` in `.claude/worktrees/tool-rail`

## Problem Statement

Comment on a selection of two or more cards stores ONE note on the group (api.md 63-65: an act with
`nodes`; agent reads show it once; one reply answers it on every card). The page draws it in every
card's note block and pin, so it reads as the same comment copied onto each card, and the agent's reply
repeats on each too. The ledger is right; only the drawing is wrong.

## Design

1. **One group marker.** A group note (an `ItemNote` with `nodes`, `packages/actions/src/notes.ts`) is
   drawn once: a note pin at the top-right corner of its cards' extents (the box around them,
   `boxAround` in `packages/ui`, the same box the selection uses), in the board's overlay layer, placed
   from the layout so it follows pans, zooms and relayouts (as `note-anchor.ts` places the bubble).
2. **The extents outline.** A dashed outline of that box, in the note's tone, shows on hover or focus of
   the group pin and while its bubble is open; selecting the pin also selects the group's cards. Not
   drawn at rest, so a busy board stays calm.
3. **Cards stop repeating it.** A card's pin and "Your note" block (`packages/ui/src/node/node-notes.ts`
   `notesView`) leave out group notes; the agent's replies to a group note show once, in the group's
   bubble (`note-views.ts`), not on each card.
4. **Opening, editing, removing** a group note work from the group pin exactly as from a card today
   (`notes.ts` `NoteFlow.group`, `note-edit` / `note-remove` acts unchanged).
5. **Skill.** `skills/vision-board/SKILL.md`, one line where notes are answered: a note with `nodes` is
   one note on a group; answer it once, by its `seq`. Bump `status` (v3.13); add a scenario for it in
   `scenarios.md` and run it once with a fresh `sonnet` agent on a test port.
6. **Flag** `groupNoteOnce`, on by default; off = today.

## Steps

1. Tests first: unit (`notesView` leaves out group notes; the group marker's rows come from one
   function over the folded notes); page (one pin per group, outline on hover / focus / open, select
   the group from the pin, edit and remove from it, reply shown once, axe, flag off).
2. Actions / UI view function, group pin element (reuse the note pin's look and states), anchor.
3. Gallery entry (group pin at rest, hovered with outline, bubble open), `pattern.json`, `components.md`
   and api.md if it describes the page, via `cortex-docs`. Look at it in a browser, light and dark.

## Constraints

- **DO NOT** change the ledger format, any schema or what agents read. **DO NOT** touch the
  new-and-updated task's files (`packages/actions/src/conditions.ts`, `packages/tokens`, toolbar files,
  `packages/ui/src/region/*`, `node-popover.css`); it runs in parallel.
- Page tests on `VB_TEST_PORT=4600` under `temp/pages.lock`; never port 4466. No git commits.
- Files over 300 lines: split, never squeeze. Writes over 50 lines in chunks. No PII.
- **STOP** and report if a group spans containers such that the extents box would cover unrelated
  cards badly; propose the drawing, don't guess.

## Success Criteria

- [ ] A group note appears once, as a pin on its cards' extents; no card repeats it
- [ ] Outline on hover / focus / open; pin selects the group; edit, remove and replies work from it
- [ ] Skill v3.13 line and scenario run recorded
- [ ] `npm test`, `npm run verify`, `npm run check`, changed page specs pass; gallery and docs updated

## Implementation Notes

_To be completed by agent after task execution._

## On Completion

1. Frontmatter `status: completed`, `completed:` date.
2. Append one LOG line: `[[YYYY-MM-DD HH:MM]] [board-ui] Completed: Group Note Drawn Once → Task: [[cortex-tasks/board/2026-10-25_board-ui_group-note-once.md]]`
3. Do not write to `AUDITED.md`.
