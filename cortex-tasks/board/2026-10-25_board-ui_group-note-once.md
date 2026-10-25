---
task_name: Group Note Drawn Once
created: 2026-10-25
completed: 2026-10-25
status: completed
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

> **Ruling (maintainer, chat 2026-10-25, point 103): option B.** A box around the group covered
> unrelated cards (cards 1 and 16 on the roadmap fixture covered 2-15), so no box is drawn.

1. **One group marker.** A group note (an `ItemNote` with `nodes`, `packages/actions/src/notes.ts`) is
   drawn once: a note pin on the top edge of the group's lowest-numbered card, just left of that card's
   own note pin (`.vb-note-pin`, top-right), so the two never meet. It sits in its own layer inside
   `#world` (like `#link-marks` in `App.svelte`), placed from the layout so it follows pans, zooms and
   relayouts (as `note-anchor.ts` places the bubble).
2. **Rings, not a box.** On hover or focus of the group pin and while its bubble is open, each card in the
   group gets a dashed ring in the note's tone. Never a box, so no unrelated card is marked, within one
   container or across several. Selecting the pin also selects the group's cards. Not drawn at rest.
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

**2026-10-25, stopped before any code (STOP condition met).** On the roadmap fixture (served on a
test port, card boxes read from the page), a group that spans containers gets an extents box that
covers unrelated cards badly. Group {1, 16} (Review and Build): the box covers cards 2 to 15, every
container, and its top-right corner falls outside both cards' frames, in empty board. Group {3, 4}
(Review and Prove): the box covers 1, 2 and 5. A second issue: the top-right corner of the box is where
the corner card's own note pin hangs (`node.css` `.vb-note-pin`, top -12px, right -12px), so the two
pins collide. The drawing is proposed in the return report; awaiting the maintainer's ruling.

**2026-10-25, resumed on ruling point 103 (option B, no box) and completed.**

- **Pure parts** (`packages/ui/src/node/node-notes.ts`): `notesView(..., apart)` leaves group notes and
  the replies to them off a card; `groupMarkers` gives one marker per group from the folded notes;
  `groupAnchors` picks each pin's card; `groupPinAt` its place; `pinLabel` is shared with the card pin.
  Unit tests: `packages/ui/tests/group-notes.test.ts`.
- **Page**: `apps/board/src/board/group-pins.ts` (`createGroupPins`, its own `.vb-group-notes` layer
  appended to `#world`, rings via `data-group-ring`), created by `notes.ts` when `NoteDeps.groups` is
  on; the bubble opened from a pin returns focus to it (`groupPinOf`). `note-find.ts` was split out of
  `notes.ts` (the three "note not yet sent" lookups), so `notes.ts` is 296 lines; `controller.ts` stays
  at 305 (props added to two existing lines: `apart` on `createParking`, `world, selection, groups` on
  `createNoteFlow`). `note-views.ts` `cardView` leaves group notes out of a card's conversation;
  `parking.ts` passes `groupNotesApart`; `note-outside.ts` counts the pin as a press that opens.
- **Styles**: the card pin's rules in `node.css` now also match `.vb-group-notes .vb-note-pin`; the
  layer, the pin's place and the rings are in `node-notes.css`; `paused.css` covers the layer. Ring
  APCA on the canvas (`tests/pages/apca.ts` `lc`): accent 66.1 light / 48.5 dark, `--vb-ink-subtle`
  70.3 / 49.6, all over the decoration tier (Lc 30).
- **Deviations to know** (both easy to change, one constant or one function):
  (a) The pin is *under* the card's own pin on its right edge, not left of it: the top edge left of
  the card pin holds the size control (`.vb-size`, right 24px) and, on a moved card, the moved tab,
  so a pin there would cover a control. (b) Groups sharing their lowest card: the next group's pin goes
  on its next card that has none (`groupAnchors`); stacking two pins on one short card would cover its
  footer's Later button or the neighbour card's title. Only when every card of a group already holds
  a pin does it stack (down while clear of the footer, then a column out).
- **Flag** `groupNoteOnce` (on); off draws today's per-card note (page test). Gallery: "Notes on
  groups of cards" (`group-notes-section.ts`, a `groups` board appended to `gallery.ledger.jsonl`, seq
  346-353), the gallery screenshots updated (only the new section differs). Docs: `components.md`
  (3_FE_02 item 4), `node/pattern.json` (`flaggedStates` "group note"), the flag's description;
  api.md describes the API only, so unchanged. Skill v3.13 (`SKILL.md`, one line; `scenarios.md` 35).
- **Scenario 35 run** (2026-10-25, fresh `sonnet` sub-agent, real MCP `packages/mcp/bin/vb-mcp.ts`
  over a stdio bridge, board server on port 4607 with a temporary project under `temp/`, both removed
  after): it read `check_responses` (the note once, `nodes [1,3]`, seq 7), `show_node` 1 and 3, then
  one `write_board` with one `reply` on card 1, `to` 7; result ok, `pending: []`; the board then drew
  one group pin, the reply once in its bubble, none on the cards. Passed. Side finding: two
  `show_node` calls were refused for passing `secret` (it takes none); the skill's "on every call that
  takes it" is right, the agent over-applied it.
- **Tests**: `npm test` (1597 pass; the timing test "server starts on a 100,000-event ledger in under
  1000 ms" failed under the machine's load during the page run, see the return report), `npm run
  verify` ok (`modules.md` regenerated), `npm run check` 0 errors; page specs: group-note,
  zoom-and-lasso, every-node (updated to the drawn-once pin), notes, conversation, popover-thread,
  note-polish, parking-replies, note-discard, select, selection-pill, lock-board, versions, gallery,
  card-history, then the whole suite on port 4600.

## On Completion

1. Frontmatter `status: completed`, `completed:` date.
2. Append one LOG line: `[[YYYY-MM-DD HH:MM]] [board-ui] Completed: Group Note Drawn Once → Task: [[cortex-tasks/board/2026-10-25_board-ui_group-note-once.md]]`
3. Do not write to `AUDITED.md`.
