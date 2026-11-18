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

1. [ ] Read run 2's README and pages, PLAN.md § Decisions, and the node-states pages (the node as built).
2. [ ] **Run 2, corrected** (both skins, dark): the default skin's dated node has no grip and no kind tab (the stem from
   the line meets the plain top edge, centred); the kind is a small word at the end of the date line; drop "WEEK OF"
   (use a day); the four header forms appear on the page: a day, a month, a year and a time (`OCT 13 · 14:30`).
3. [ ] **Light pages**: `default-timeline-light.html` and `command-lens-timeline-light.html`, same content.
4. [ ] **A timeline with other nodes below**: on each run-2 page (or one new page per skin), a container whose dated
   nodes form the line across its top and whose undated nodes lay out below it in a `row` and in a `grid`, so the
   relation between the line and the container's own layout is drawn once.
5. [ ] **The vertical pages** (`default-vertical-*`, `command-lens-vertical-*`): redrawn with run 2's header, no grip,
   the kind word, entries; the line down the left, every dated node to its right, the stem meeting the left edge level
   with the date line; years on the line; the other nodes below (PLAN.md call 4, pending the kickoff answer: if the
   maintainer chose "to the right", draw that instead).
6. [ ] **README**: replace "Choices to confirm" with what was ruled (cite PLAN.md decisions by number); remove "WEEK OF",
   the `timeline` mode, the precision field and the grip; list each page; then "Open choices" for anything the pages
   had to decide that § Decisions does not (at most 6, each with a recommendation): for example the line's colour
   token, the dot's size, the year label's style, the stem's length, a band's tint.
7. [ ] PNGs for every page at 1440px (a script in `temp/`, Playwright's Chromium, no network).
8. [ ] Measure with APCA-W3 0.0.98G-4g the date colour of every kind and of a few tones on each skin's node surface,
   light and dark; list each Lc in the README beside the 45 tier. A miss is reported, not fixed on the page.

---

## Validation

- [ ] Every page opens standalone with no network request and no console error, light and dark as named
- [ ] Nothing on any page contradicts PLAN.md § Decisions (check each decision 7-21 against each page; list the check
      in the notes)
- [ ] README lists every page, the rulings and at most 6 open choices with recommendations

---

## Constraints

- Write only under `design/mockups/timeline/` (and `temp/`). Made-up content only, no PII. No git commands that change
  state. Writes over 50 lines in chunks.
- If a ruling cannot be drawn as stated, stop and say why; do not draw around it.

---

## Implementation Notes

_To be completed by agent after task completion._

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
2. Update your row and notes block in [TASK-STATUS.md](./TASK-STATUS.md).
3. Append your own LOG entry to `cortex/LOG.md`, one line, append-only:
   ```
   [[YYYY-MM-DD HH:MM]] [board-ui] DESIGN_01: [what changed] → Task: [[cortex-tasks/board/2026-11-18_board-layout_timeline/DESIGN_01_timeline-pages.md]]
   ```
4. Return block: `TASK_ID`, `STATUS`, `FILES`, `VERIFICATION`, `REQUESTS` (the open choices for the design gate),
   `NOTES`.
