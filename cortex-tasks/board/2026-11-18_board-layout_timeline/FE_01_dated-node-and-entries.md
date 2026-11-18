# FE_01_dated-node-and-entries: The Dated Node, Entries and the Line's Drawing

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Draw a dated node as the rulings and the agreed pages show it, in both skins, light and dark: the date as its header,
no grip, the kind word on the date line (default skin), the date above the title (Command Lens), bigger type, Markdown
entries; and make the `timeline` pattern that draws the line, dots, stems, years and bands from T_01's geometry type.

---

## Context

PLAN.md decisions 16-21 and calls 7-10, and § Design review (the maintainer's answers on DESIGN_01's pages), are this
task's rulings; the pages in `design/mockups/timeline/` show them. Everything the node draws depends on the node's own
`timeline` key only, so the node needs no knowledge of its container. The page does not use any of this yet: FE_02
wires it in wave 3. BE_01 is filling the same geometry type in another worktree right now; draw from hand-made geometry
and keep the type exactly as T_01 left it (a change goes in `REQUESTS`).

**Read previous task notes in TASK-STATUS.md before starting** (T_01's, DESIGN_01's). Wave 2, own worktree
`.claude/worktrees/timeline-fe-01` (branch `feat/timeline-fe-01`; check `git branch --show-current` first),
`VB_TEST_PORT=7910`.

---

## Inputs

- **Files to modify**: `packages/ui/src/node/` (`node-date.ts` new, `node-edges.ts`, `node-template.ts`, `vb-node.ts`,
  `node-edges.css`, `node-plate.css`, `node.css`, `pattern.json`), `packages/ui/src/markdown/` (`render.ts`,
  `blocks.ts` if the entry grouping belongs there, `markdown.css`, `pattern.json`), `packages/ui/src/timeline/` (new:
  `timeline-template.ts`, `timeline.css`, `pattern.json`), `packages/ui/src/patterns.ts`, `packages/ui/src/index.ts`,
  `packages/ui/src/words/` (`node.ts`, or a new dates words file), `packages/ui/tests/`, `packages/tokens/src/
  tokens.css` with its contrast pair list and tests, `apps/board/src/gallery/timeline-section.ts` (new) and `main.ts`,
  `scripts/words-homes.mjs` and `docs/specification/words.md` (only for a new words file), the screenshots its specs
  renew.
- **Files to reference**: `node-edges.ts` (`handle`, `heading`, `topMarks`, `edgesMarkup`), `node-edges-apply.ts` (the
  tone hue), `skins.ts` (`SKIN_DEFS`), `markdown/render.ts` (`MarkdownOptions`, `heading`), `markdown/pattern.json`,
  `apps/board/src/gallery/command-lens-section.ts` and `edges-section.ts` (section shape),
  `apps/board/src/board/links/wires.ts` (`lanesOf`: how the wires layer draws bands), the run-2 pages and DESIGN_01's
  pages, `packages/tokens/src/tokens.css` (type scale, kind colours, `--vb-font-display`).
- **Shared artifacts to reuse**: `#format` `timelinePrecision`, `timelineYear`, `isTimeline`, `TimelineDrawing`,
  `TimelineDot`, `TimelineSide`, flag `timeline` (T_01). The tone hue helper of `node-edges-apply.ts` (extract a pure
  part if the line needs it; never a second copy). `.vb-visually-hidden`. The one Markdown renderer.
- **Skills**: `cortex-architecture` (pattern-owned UI, words, tokens, one home per icon), `cortex-docs` (the
  `pattern.json` files are the patterns' docs).

> Modify only the files this task owns. Need a change elsewhere? List it under `REQUESTS`.

---

## Steps

1. [ ] **Tests first** (`packages/ui/tests/`): the template's output for every node the existing tests and gallery
   draw, with no `timeline`, is byte for byte what it was (capture it before you change anything); a dated node in the
   default skin has no `.vb-node-kind` and no `.vb-node-grip`, its content starts with the date line (the short form
   hidden from assistive technology, the full form in `.vb-visually-hidden`, both inside `<time datetime>`), the kind
   word ends the date line, and an icon node keeps its tile and loses the kick (the kind is on the date line); in
   Command Lens the plate is unchanged and the date line, without the kind word, comes before the title; an app card
   never gets a date line (T_01 refuses one; the template ignores it if it ever arrives).
2. [ ] **`node-date.ts`** (new): `timelineLabel(value) → { short, full, datetime }` from `timelinePrecision`: day
   `Oct 13` / "13 October 2026"; month `Oct 2026` / "October 2026"; year `2026` / "2026"; minute `Oct 13 · 14:30` /
   "13 October 2026, 14:30" (times as written, decision 3); upper case by CSS, so the words read naturally. Month
   names, the separator and the full forms are words (`packages/ui/src/words/`; a new file is registered in
   `scripts/words-homes.mjs` and `words.md`). Unit tests over every month and form.
3. [ ] **The node** (`node-edges.ts`, `node-template.ts`, `vb-node.ts`): for a node with `timeline`, `handle()` draws
   nothing in the default skin (plate unchanged in Command Lens); `heading()` puts the date line first
   (`<p class="vb-node-date">`, the kind word `<span class="vb-node-date-kind">` at its end in the default skin);
   the element sets `data-timeline` on the host (the hook FE_02's pointer and CSS read) the way it sets `data-edges`,
   and updates it in place when a new version adds or removes the key. Keep each function near 50 lines (split the
   dated heading into its own function).
4. [ ] **Look** (`node-edges.css`, `node-plate.css`, `node.css`; tokens only): the date at the date token (about 23px),
   weight 800 (default) / 700 (Command Lens), the skin's display font; its colour the kind's, or the tone's ink when
   the node has a tone (DD tone rule: everything coloured by the node follows the tone); the title at the dated-title
   token (18px) only on a dated node; the kind word in the style of `.vb-node-kick`, coloured as the pages draw it; the
   plate of a dated node shows no grab cursor. Nothing changes on an undated node.
5. [ ] **Tokens** (`packages/tokens/src/tokens.css`, protected): the two type sizes, and the line, band and dot tokens
   if no existing semantic token fits (the build takes the board's real line colour: say which token you reused). Add
   every new foreground/background pair to the contrast list with its tier: the date in each kind colour and in the
   tone ink on each skin's node surface, light and dark, Lc 45; the line, stems and dots against the board, Lc 30.
   Measure (APCA-W3 0.0.98G-4g); a miss is fixed in its token by lightness within its hue and listed. Put the exact
   `tokens.css` diff in your notes for the gate.
6. [ ] **Entries** (`MarkdownOptions.entries`, default false; the template passes `entries: true` for a dated node):
   by PLAN.md call 9: a `###` heading and the blocks after it up to the next heading, rule or entry start; a paragraph
   opening with a bold run (name, then the rest with one leading `:`, `-`, `–` or `—` and its spaces dropped); a
   top-level list item opening with a bold run (keeps its `li`; other items keep their bullets). Markup:
   `.vb-md-entry` with `.vb-md-entry-name`; a `###` entry's name keeps `role="heading"` and its level. `##`, `####`,
   plain lists, quotes, tables, code and details stay as they are. Everything stays escaped. CSS: a 3px bar in the
   node's colour (kind, or tone), the bold name, the text, spacing as the pages draw it. Tests: each form, each
   separator, mixed lists, `##`/`####` untouched, entries off byte for byte unchanged, a name with markup escaped.
   Document the option, the classes and the states in `markdown/pattern.json`.
7. [ ] **The `timeline` pattern** (`packages/ui/src/timeline/`, a pattern with no element, like `markdown`):
   `timelineMarkup(drawing: TimelineDrawing, look: (id) => { kind, tone? } | undefined): string`, SVG markup for one
   container's timeline: the line with its arrow drawn as a path (no marker ids, so it never depends on the wires
   layer's `defs`), bands behind, stems, dots in the node's colour (kind or tone), year labels on the line where they
   fall; `aria-hidden="true"` (the dates are on the nodes). `timeline.css` (tokens only), `pattern.json` (`entry`,
   `selector: ".vb-timeline"`, `flag: "timeline"`, states: across, down, dot per kind, tone dot, stem above / below /
   beside, year at the start and at a turn, band, arrow), registered in `patterns.ts`. Unit tests on the markup from
   hand-made geometry (across with a band and a year turn; down). It scales with the board as part of the world
   (`ZOOM_RULES.world`): no zoom number; if one proves needed, it is a `ZOOM_RULES` row (say so in `REQUESTS`).
8. [ ] **Gallery** (`apps/board/src/gallery/timeline-section.ts`, appended in `main.ts` `build()`, shown with the
   `timeline` flag as `pattern.json` says): dated nodes in both skins (the four header forms; three kinds; a tone; an
   icon node; a node that asks, answered and waiting; entries of each form; a long title), and the line pattern from
   hand-made geometry, across and down. Check how `gallery.spec.ts` treats a flagged pattern and follow it.
9. [ ] **Look** in a browser, light and dark, both skins, against the pages; note what differs and why.
10. [ ] Project checks (PLAN.md § Tests); pages `gallery.spec.ts`, `node-edges.spec.ts`, `command-lens.spec.ts`,
    `markdown-more.spec.ts`, `big-titles.spec.ts` (only the new gallery section's screenshots may be new; any other
    change is a bug); `npm run test:plugin`. Report the page weight and the plugin's `view/board.js` and
    `view/board.css` sizes for the orchestrator; do not edit budget files.

---

## Validation

- [ ] Undated nodes' markup byte for byte unchanged; dated nodes as step 1 says, both skins
- [ ] Every new pair passes its APCA tier, light and dark, both skins (the tokens' contrast tests)
- [ ] axe clean on the new gallery section, light and dark
- [ ] The five page specs and `npm run test:plugin` pass; `npm run verify`, `check`, `test`, `gen -- --check` pass

---

## Constraints

- No inline SVG icon (the line is a data drawing, drawn where used, rule 8); no colour literal outside `tokens.css`;
  no sentence in code.
- If a page and § Decisions or § Design review differ, the decisions win; if a ruling cannot be drawn, stop and ask.
- No PII in examples. No git commands that change state. Interim files in `temp/`; writes over 50 lines in chunks.

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

1. Fill in Implementation Notes (with the `tokens.css` diff); set **Status** to `Completed`.
2. Update your row and notes block in [TASK-STATUS.md](./TASK-STATUS.md) (in `.claude/worktrees/app-window`).
3. Append your own LOG entry to `cortex/LOG.md` (in `.claude/worktrees/app-window`), one line, append-only:
   ```
   [[YYYY-MM-DD HH:MM]] [board-ui] FE_01: [what changed] → Task: [[cortex-tasks/board/2026-11-18_board-layout_timeline/FE_01_dated-node-and-entries.md]]
   ```
4. Return block: `TASK_ID`, `STATUS`, `FILES`, `VERIFICATION` (weights measured), `REQUESTS` (the components.md
   paragraph on the node's half for FE_02; `npm run map`), `NOTES`.
