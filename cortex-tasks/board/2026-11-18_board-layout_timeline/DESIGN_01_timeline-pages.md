# DESIGN_01_timeline-pages: Pages in Line with the Rulings

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Bring `design/mockups/timeline/` in line with PLAN.md § Decisions, so FE_01 and FE_02 build from pages that agree with
every ruling: the vertical pages redrawn on run 2's header, light versions of the run-2 pages, the one case never
drawn (a timeline with other nodes below), and a README with no superseded choice in it.

---

## Context

Run 2 (`default-timeline-dark`, `command-lens-timeline-dark`) is the reference. Since it, the maintainer ruled (PLAN.md
decisions 1-21): no "week of"; no grip on a dated node (run 2's option B drew a grip; now the top edge has none); no
`timeline` mode (the line sits across the top of a container in any layout, the other nodes below); the time form
`OCT 13 · 14:30`; the vertical form follows the container's direction. The vertical pages (run 1) still draw the date
on the tab. The pages are a proposal for the maintainer; nothing here is built.

**Read previous task notes in TASK-STATUS.md before starting.** Wave 1, beside T_01. Works in
`.claude/worktrees/app-window`; writes only under `design/mockups/timeline/`. `VB_TEST_PORT=7710` if a screenshot
script needs a port (never 4466).

---

## Inputs

- **Files to modify**: `design/mockups/timeline/` (pages, `timeline.css`, PNGs, `README.md`).
- **Files to reference**: run-2 pages and PNGs; `design/mockups/node-states/` (the agreed node, both skins, light and
  dark) and `design/mockups/containers/containers.css` (open-corner frames, FIX_06); `packages/tokens/src/tokens.css`
  (the board's real colours, so light pages use real token values); PLAN.md § Decisions and calls 4-10.
- **Patterns to follow**: how each run-2 page loads `../node-states/*.css`, `../containers/containers.css`, then
  `timeline.css`; standalone, no network; a 1440px full-page PNG beside each page.
- **Skills**: none beyond the project's design pages; `design:design-critique` may be used on your own pages.

---

## Steps

1. [x] Read run 2's README and pages, PLAN.md § Decisions, and the node-states pages (the node as built).
2. [x] **Run 2, corrected** (both skins, dark): the default skin's dated node has no grip and no kind tab (the stem from
   the line meets the plain top edge, centred); the kind is a small word at the end of the date line; drop "WEEK OF"
   (use a day); the four header forms appear on the page: a day, a month, a year and a time (`OCT 13 · 14:30`).
3. [x] **Light pages**: `default-timeline-light.html` and `command-lens-timeline-light.html`, same content.
4. [x] **A timeline with other nodes below**: on each run-2 page (or one new page per skin), a container whose dated
   nodes form the line across its top and whose undated nodes lay out below it in a `row` and in a `grid`, so the
   relation between the line and the container's own layout is drawn once.
5. [x] **The vertical pages** (`default-vertical-*`, `command-lens-vertical-*`): redrawn with run 2's header, no grip,
   the kind word, entries; the line down the left, every dated node to its right, the stem meeting the left edge level
   with the date line; years on the line; the other nodes in a second column to the line's right, in the container's
   layout (PLAN.md decision 14 and call 4, maintainer 569C).
6. [x] **README**: replace "Choices to confirm" with what was ruled (cite PLAN.md decisions by number); remove "WEEK OF",
   the `timeline` mode, the precision field and the grip; list each page; then "Open choices" for anything the pages
   had to decide that § Decisions does not (at most 6, each with a recommendation): for example the line's colour
   token, the dot's size, the year label's style, the stem's length, a band's tint.
7. [x] PNGs for every page at 1440px (a script in `temp/`, Playwright's Chromium, no network).
8. [x] Measure with APCA-W3 0.0.98G-4g the date colour of every kind and of a few tones on each skin's node surface,
   light and dark; list each Lc in the README beside the 45 tier. A miss is reported, not fixed on the page.

---

## Validation

- [x] Every page opens standalone with no network request and no console error, light and dark as named
- [x] Nothing on any page contradicts PLAN.md § Decisions (check each decision 7-21 against each page; list the check
      in the notes)
- [x] README lists every page, the rulings and at most 6 open choices with recommendations

---

## Constraints

- Write only under `design/mockups/timeline/` (and `temp/`). Made-up content only, no PII. No git commands that change
  state. Writes over 50 lines in chunks.
- If a ruling cannot be drawn as stated, stop and say why; do not draw around it.

---

## Implementation Notes

_To be completed by agent after task completion._

**Status**: Completed  
**Completed**: 2026-11-18 20:57  

### Changes Made
- All eight pages redrawn from one generator (`temp/design-01-timeline/`: `lib.mjs`, `content.mjs`, `place.mjs`,
  `gen.mjs`, `measure.mjs`, `shot.mjs`, `apca.mjs`): `default-timeline-{dark,light}`, `command-lens-timeline-{dark,light}`
  (light pages new), `default-vertical-{dark,light}`, `command-lens-vertical-{dark,light}` (redrawn). A PNG at 1440px
  beside each.
- Timeline pages: the four headers with their keys (`SEP 15`, `OCT 2026`, `2027`, `DEC 1 · 17:00`); what the agent
  writes; the launch plan (no "week of", no grip, no kind tab, kind word on the date line, entries three ways incl. a
  bold-lead list item, band, link, years); two new containers with other nodes below the line, in a `row` (row wider
  than the timeline: the line runs on) and in a `grid` (with a teal-toned dated node).
- Vertical pages: 569C: line down the left, dated nodes to its right, stem at 37px (the default skin's date line),
  even step (tallest + `EDGE_ROW_GAP`), years on the line, band, the other nodes in a second column (grid, `COL_GAP`
  right), a link from a dated to an undated node.
- `timeline.css` rewritten: run-1 flow classes and the A/B comparison removed; the line, run-down variants, dated node,
  entries (incl. `li.ent`), tones (OKLCH as `tokens.css` builds them), and the real `tokens.css` kind colours (light),
  Command Lens kinds and muted ink (`skins.css`) so dates are drawn in build values.
- Geometry follows call 6: step = max(120, over neighbours and i/i+2 of ((w_a + w_b)/2 + 28)/2); node widths are size
  tiers (s 280, m 360), not 300. Steps drawn: 174 (launch plan), 154 (row, grid); run down 303.9 / 335.8.
- `README.md` rewritten: pages, what was ruled (by decision number), APCA tables, 6 open choices.

### Issues & Resolutions
- First pass: the launch plan container overflowed the 1440px page (stage indent) and the run-down link crossed a node
  in the grid; fixed (no indent; link target moved to the grid's first column, entering at its middle).

### Validation
- Standalone: `shot.mjs` loads every page in Chromium and fails on any console error, page error or non-`file:`
  request: none on all eight.
- APCA (Lc 45 tier): every kind and tone passes in both skins, light and dark; lowest dark topic 48.0 (46.4 on the
  default skin's 9% tinted top). Tables in the README.
- Decisions 7-21 against each page: 7 (line across the top in row and grid; no mode added) ✓ timeline pages, ✓ run
  down (569C); 8 (own dot, stem, alternating, first above) ✓ all across containers; 9 (order; equal by `n`: 4 then 5) ✓;
  10 (one step) ✓; 11 (year at start and turn; no year on day/time) ✓; 12 (band only for exactly equal values; `Nov 3`
  vs `Nov 3 · 09:00` in different containers) ✓; 13 (links: dated-dated across, dated-undated down) ✓; 14 (run down
  per 569C) ✓ vertical pages, the Across/Down/Auto menu not drawn (FE_02's); 15 (nothing under the line) ✓; 16 (four
  forms, kind or tone colour, Lc 45) ✓; 17 (no grip, no tab, kind word, marks in place) ✓ default pages; Move to not
  drawn; 18 (plate kept, `cursor:default`) ✓ Command Lens pages; 19 (`###`, bold-lead paragraph, bold-lead list item)
  ✓; 20 (23px date, 18px title only on dated nodes; undated keep board sizes) ✓; 21 (tier widths, build kind colours;
  frame spacing and line colour still mock-up values, stated in README) ✓.

### Caught Beyond the Brief
- Run down, the even step (decision 10, call 6) is the tallest dated node + 40: one node with three entries spaces the
  whole column about 300px apart, and the same-date band becomes a long bar. Drawn as ruled; worth a look at the gate.
- In Command Lens, run down, `TIMELINE_STEM_AT` 37px meets the plate 4px above its bottom rule (plate 41px): inside the
  plate as call 6 says, but near its edge.
- Dark topic is the tightest date colour (48.0; 46.4 on the default skin's tinted top): passes, little margin.
- A row of undated nodes wider than the timeline makes the line run on past the last dot (call 6) to the row's edge.

### Deviations from Plan
- None

### Run 2

**Status**: Completed  
**Completed**: 2026-11-18 (design review 587-595, decisions 8, 10, 14, 21)

#### Changes Made
- Vertical pages redrawn (`default-vertical-{dark,light}`, `command-lens-vertical-{dark,light}`) and their PNGs, three
  containers each: the launch plan run down with no width chosen (`match`, all 360 px, the widths button on); "Pricing"
  with the four undated nodes `COL_GAP` (72) right of the whole timeline in a grid, a toned node, and a link from an
  undated node into a dated one; the launch plan again with `own` (each its tier).
- Run down: the line down the middle of the timeline's column; nodes alternate left and right, the first left; the stem
  (30, as across) meets the middle of the facing side; packed per 587 (`dots` in `temp/design-01-timeline/place.mjs`):
  node top at least the skin's row gap below the last node on its side, dot at least 56 below the one before. The
  launch plan run down is 815 px tall (default skin), was about 2,000.
- Across pages: same geometry (stems already at the middle of top or bottom; other nodes already `REGION_GAP` 56 below);
  the grid's row gap is now the skin's (Command Lens 30, was 40); lede and row caption say the stem rule, `REGION_GAP`
  and `own`. The rail's widths button shows the container's setting.
- `timeline.css`: header comment only (run down). `README.md`: run-down rulings (8, 10, 14, 21, 569C, 587-595), run 1's six
  open choices moved to "kept as drawn" (588-593) or ruled (591), `TIMELINE_STEM_AT` and the 46 px stem gone, six new
  open choices.
- Generator: `content.mjs` (`DOWN_*` copies keyed apart, `match` widths), `place.mjs` (`dots`, `down` rewritten, `G`
  with `MIN_DOT`, `ARROW`, per-skin `ROW`), `lib.mjs` (`ct` `widths`), `gen.mjs`, new `check.mjs`.

#### Validation
- `shot.mjs`: eight pages, no console error, no non-`file:` request; every PNG 1440 px wide.
- `check.mjs`: no two nodes overlap in any container on any page; run down, every stem ends within 1 px of its node's
  facing-side middle.
- Looked at: default and Command Lens vertical (dark, light) and Command Lens across (dark).
- Rulings against the pages: 8 (alternate, first above / first left) ✓; 10 (across one step; run down packed, 587) ✓;
  14 (line in the column's middle, others right, 569C) ✓; 21/595 (`match` run down, `own` across, `own` drawn as the
  person's choice) ✓; 587 stem (middle of facing edge, both forms, no `STEM_AT`) ✓; 591 (one stem 30; `REGION_GAP`,
  `COL_GAP`; new numbers only stem, year room 56, arrow 30) ✓; 588-590, 592, 593 unchanged ✓.

#### Caught Beyond the Brief
- 587 names `ROW_GAP` (30); the board's row gap in the default skin is `EDGE_ROW_GAP` (40, `draw.ts`), because its marks
  sit on the edges. Drawn with the skin's gap; open choice 1 recommends the layout's `rowGap` option.
- Under `own`, run down, "the middle of the column" holds only when both sides' widest nodes are equal; drawn with the
  line one stem from the widest node on each side (open choice 3).
- A link from the other nodes to a node on the left of the line would cross the line; only a right-side target is
  drawn (open choice 5).
- Packing still leaves the "Nov 3" band 193 px long (237 in Command Lens): a tall node on the other side pushes the next
  dot down (open choice 6).

#### Deviations from Plan
- None

---

## On Completion

1. Fill in Implementation Notes; set **Status** to `Completed`.
2. Update your row and notes block in [TASK-STATUS.md](./TASK-STATUS.md).
3. Append your own LOG entry to `cortex/LOG.md`, one line, append-only:
   ```
   [[YYYY-MM-DD HH:MM]] [board-ui] DESIGN_01: [what changed] → Task: [[cortex-tasks/board/2026-11-18_board-layout_timeline/DESIGN_01_timeline-pages.md]]
   ```
4. Return block: `TASK_ID`, `STATUS`, `FILES`, `VERIFICATION`, `REQUESTS` (the open choices for the design gate),
   `NOTES`.
