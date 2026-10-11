---
task_name: Field report batch 3 - layout, lines, labels, alignment, widths, show_layout
created: 2026-10-11
status: in-progress
categories: [board-layout, board-format, board-app, board-ui, board-agent]
tracker: cortex-tasks/tracker.md#M2
---

# Field report batch 3: layout — Plan

> **From**: the field report (points 1-5, 10, 16; nclite board `multi-bot`) and the maintainer,
> 2026-10-11 (chat 508, 509, 510, 512, 537, 538) · **Go**: given (538)

## What happened (the evidence)

Round 1 drew one `lanes` container (5 lanes, 16 cards, 16 links, about 8 crossing lanes) and it
came out as spaghetti: lanes mostly empty, cards pushed right, long lines through other lanes,
shared vertical trunks, labels floating mid-line. Today `lanes` (`packages/layout/src/modes/lanes.ts`)
puts every lane on one shared column grid where a card's column is its link depth across the whole
container (`layers.ts` `layersOf`), so one cross-lane chain pushes every lane right; connectors
(`route.ts`, 92 lines) are right angles with spread ports but no obstacle avoidance and no tracks
(tracker M2).

## Rulings (maintainer; do not reopen)

1. **Lanes, layered** (field 1): Sugiyama-style: layer by link depth, order within each layer to cut
   crossings, and pack each lane left where no dependency forces a gap.
2. **Routing** (field 2, M2): cross-lane links run in the gutters between lanes and columns, never
   under a card; parallel links get their own tracks instead of shared trunks.
3. **Link labels** (field 3, 508): shown whenever the label fits its stretch of line, near the
   source end; when it doesn't fit, a small marker sits on the line and hovering or focusing it
   floats the label above everything.
4. **Alignment** (field 4, 509): a per-viewer setting in the "⋯" menu, not shared with agents:
   horizontal layouts top-aligned and vertical layouts left-aligned by default (today a flow row is
   centred vertically); kept per viewer.
5. **Widths** (field 5, 510): per container, "Match widths" or "Own widths": under Match every card
   in a column takes that column's widest card's width. Defaults: match for `grid` and `column`, own
   for `flow`, `row`, `lanes` and `radial`. The person sets it from the container's toolbar (an act,
   like the mode); the agent may set it when drawing.
6. **`show_layout`** (field 10, 16): a read-only agent operation for one container: each card's
   lane, column and row, how many links cross, how many cells are empty. Not in `write_board`'s
   answer. The server works it out with the same layout package from the cards, links and mode
   (structure only, no pixel sizes). The skill: call it once after the first draw of a `flow` or
   `lanes` container, never after every write.

## Tasks

| ID | What | Model |
|---|---|---|
| BE_01 | Contract: the container `widths` field and its person act (ledger v13), `show_layout` (OpenAPI, MCP, `vb`); the layout package's structural answer type | Opus 5.5 |
| BE_02 | Layout engine: layered lanes (ruling 1), gutter routing with tracks (ruling 2), label placement with a fits flag (ruling 3), alignment and widths as inputs (rulings 4-5); pure, unit-tested, within the performance budget (rule 15) | Opus 5.5 |
| BE_03 | Server and actions: `widths` in the fold and the view; `show_layout` from the layout package's structure | Opus 5.5 |
| FE_01 | Page: labels (fit, marker, floating on hover and focus), the alignment setting in "⋯", the widths control in the container toolbar, gallery, screenshots | Opus 5.5 |
| T_01 | Skill: lanes vs flow (from batch 1) plus `show_layout` once, widths | Opus 5.5 |
| VERIFY_01 | By hand: redraw the field report's round 1 (5 lanes, 16 cards, 16 links) and compare; Claude and Kiro use `show_layout` once | Orchestrator |

Gates after each task; where a task can't go green alone it stops and says so, and the gates run
after the next (as batches 2 and U13 did).

## Out of scope

Obstacle-aware routing for `radial` and between containers (only within a container here); a
person-chosen lane order.
