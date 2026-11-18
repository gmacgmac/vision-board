---
task_name: The Timeline
created: 2026-11-18
completed:
status: in-progress
categories: [board-layout, board-format, board-ui, board-agent, board-tokens]
tracker: cortex-tasks/tracker.md#N53
---

# The Timeline - Task Status

> **Plan**: [PLAN.md](./PLAN.md) · **Code map**: [CODE-MAP.md](./CODE-MAP.md)  
> **Created**: 2026-11-18 · **Runs after**: the Node Overhaul set closes

---

## Instructions for Agents

1. **Read PLAN.md first** (§ Decisions is every ruling), then `CODE-MAP.md`
2. **Read notes from completed tasks** before starting yours
3. **Respect the Wave column** — do not start a task whose wave has not been reached
4. **Reuse Shared Foundations** — check that table before writing a helper, type, or component;
   if it is listed, import it, do not reinvent it
5. **Touch only the files you own** (File Ownership below, or your task's *Files to modify*). Need
   a change elsewhere? List it under `REQUESTS` in your return block — the orchestrator routes it
6. **If you need to deviate, STOP and inform the user**
7. **Update frontmatter `status`**: `planned` → `in-progress` when the first task starts. Closing the
   set (`completed`) is the orchestrator's job, after the full gates
8. **Update your row** in the Task List table below when you finish
9. **Add implementation notes** to your task file and brief notes here. Re-run? Add a `Run N:`
   line here and a `### Run N` block in your task file; never overwrite an earlier run
10. **No git commands that change state** (commit, merge, branch, stash, checkout) — the
    orchestrator commits each checked task or wave
11. **Working in a git worktree?** Follow the Where You Work block in your prompt. Edit this file,
    your task file and `cortex/LOG.md` only in `.claude/worktrees/app-window`, never the main checkout; never
    port 4466; use your task's `VB_TEST_PORT` (PLAN.md § House Rules)

---

## Task List

| # | ID | Wave | Model | Own worktree | Persona | Task | Status | Notes |
|---|-----|------|-------|--------------|---------|------|--------|-------|
| 1 | T_01 | 1 | strong | no | Principal API engineer — a value has one spelling in the ledger; a model's habit is normalised at the edge and never stored, and a refusal says exactly what would have been accepted. | [Contract first](./T_01_contract.md) | Completed | Contract, write edge, format 21 landed; board.js budget +349 gzip (not raised); `npm run map` needed |
| 2 | DESIGN_01 | 1 | strong | no | Principal product designer for planning tools — a page the build follows must agree with the rulings in every detail, or the build inherits the contradiction. | [Pages in line with the rulings](./DESIGN_01_timeline-pages.md) | Completed | 8 pages + PNGs, README; 6 open choices for the design gate. Run 2: vertical pages redrawn (587-595), README; 6 new open choices |
| 3 | BE_01 | 2 | strong | yes | Graph-layout engineer — a layout is a pure function; the same view draws the same picture, and a container without a date draws exactly as it did. | [The timeline in the layout](./BE_01_timeline-layout.md) | Completed | `layoutTimeline`, split in `layoutRegion`/`structureOf`, `show_layout` filled; page 202.9 KB; `npm run map` needed |
| 4 | FE_01 | 2 | strong | yes | Design-systems engineer — the date is the loudest thing on the node and still passes its contrast tier in both skins, light and dark; a size used in one place is a token, never a literal. | [The dated node, entries and the line's drawing](./FE_01_dated-node-and-entries.md) | Completed | Date header, entries, `timeline` pattern, tokens (diff in task notes); budgets over (page 203.0 KB, board.js 196,993, board.css 25,519); `npm run map` needed |
| 5 | T_02 | 2 | strong | yes | Prompt engineer — an instruction is code: every sentence earns its place and is proven on scenarios before it lands. | [The skill and its evals](./T_02_skill-and-evals.md) | Completed | Run 2 on the orchestrator's option C: plugin skill 8,148 of 8,192; v3.36; timeline scenarios pass live in both hosts; $0.1051 |
| 5b | FIX_01 | 2 | standard | no | — | [A refusal names what was wrong (M84)](./FIX_01_anyof-refusal-wording.md) | Completed | Tone and icon refusals name what is accepted; words in `apps/board/server/words/schema.ts` |
| 6 | FE_02 | 3 | strong | no | Interaction engineer — a node whose place is its date never moves under the pointer, and every other control still works on it exactly as on any node. | [The board draws the timeline](./FE_02_board-wiring.md) | Pending | |
| 7 | VERIFY_01 | 4 | strong | no | Programme manager who runs launch roadmaps on boards like this every week — expects the dates to read at a glance and in order, and every card to answer like any other, without reading a manual. | [Final verification](./VERIFY_01_testing.md) | Pending | |
| 8 | T_03 | 5 | standard | no | Staff engineer who owns deprecations — a switch-over is done only when nothing, not code, tests, words nor docs, still points at the flag. | [Switch on](./T_03_switch-on.md) | Pending | |

**Status Values**: `Pending` | `In Progress` | `Completed` | `Blocked` | `Deferred`

**Wave**: execution order. Same number = safe to run in parallel. A wave completes before the next starts.

**Gates the orchestrator holds**:
- **Kickoff** (before wave 1): the maintainer's yes on D-105 and the steering change (PLAN.md § Decision entry to
  append, § Planner's calls 12), on § Planner's calls, and the answers to § Requests for the maintainer below. Record
  them in PLAN.md § Kickoff answers; append D-105 word for word.
- **Design** (before wave 2): the maintainer's yes on DESIGN_01's pages and open choices, recorded in PLAN.md § Design
  review.
- **Wave 2 merge**: FE_01's `tokens.css` diff shown to the maintainer; budgets raised once on the merge (PLAN.md
  § House Rules); `npm run map`.
- **Result** (before wave 5): the maintainer uses the board with `?flags=timeline` and says yes.

**DESIGN_01 run 2** (2026-11-18, design gate 587-595): the vertical pages redrawn, alternating left and right; runs beside wave 2.

**Own worktree**: wave 2 only (three code tasks that each run tests); the commands are in PLAN.md § House Rules.

---

## Requests for the maintainer (kickoff)

The planner's questions, each with a recommendation. The orchestrator asks them with D-105 and records the answers in
PLAN.md § Kickoff answers.

1. **D-105 and the steering line** (PLAN.md § Decision entry to append; § Planner's calls 12). Recommend: yes as
   drafted.
2. **Ledger format 21 with a restamp step** (PLAN.md decision 6). Recommend: yes. `main` already runs format 20, so a
   `timeline` key under 20 would be refused, card by card, by your board's build while it stayed writable; 21 makes it
   open read-only and say why. The step changes nothing but `v`.
3. **The vertical form**: the other nodes stay below the timeline in both forms, and a container with a timeline gets
   Across, Down and Auto in its layout menu, as a flow does (decision 14). Recommend: yes. The other way: run down,
   the other nodes sit to the right of the line.
4. **Live Haiku eval runs in T_02**: one plugin run and one standalone run, within the default caps in
   `tests/evals/bot/limits.ts`, never raised. Recommend: yes; without it, T_02 runs the dry evals only and the live
   runs wait.
5. **No timeline on an app card** (decision 5): refused with words. Recommend: yes; an app card is a window with no
   header to carry a date.

---

## Shared Foundations

| Artifact | Created by | Consumed by |
|----------|-----------|-------------|
| `packages/format/src/timeline.ts` (`TIMELINE_FORMS`, `normaliseTimeline`, `timelineProblems`, `isTimeline`, `timelinePrecision`, `timelineYear`, `compareTimeline`, `sortByTimeline`) | T_01 | BE_01, FE_01, T_02, FE_02 |
| `packages/format/src/geometry.ts` (`TimelineDrawing`, `TimelineDot`, `TimelineSide`: the line's geometry the layout returns and the page draws) | T_01 | BE_01, FE_01, FE_02 |
| `ViewNode.timeline`, the node schemas, `show-layout-response.schema.json` `timeline`, `LEDGER_FORMAT` 21 and `restamp(20)`, the generated types | T_01 | every later task |
| `packages/format/src/words/format-ledger.ts` (`timelineForms`, `timelineOnApp`) | T_01 | T_02 (the scenario checks name the refusal), VERIFY_01 |
| `packages/format/src/flags.ts` (`timeline`, off) | T_01 | FE_01, FE_02, T_03 |
| `design/mockups/timeline/` (run 2, plus DESIGN_01's pages and PLAN.md § Design review) | DESIGN_01 | FE_01, FE_02, VERIFY_01 |
| `packages/layout/src/timeline.ts` (`layoutTimeline`, the `TIMELINE_*` spacing constants), `RegionPiece.timeline`, `RegionBox.timeline`, `LayoutStructure.timeline` | BE_01 | FE_02, VERIFY_01 |
| `packages/ui/src/node/node-date.ts` (`timelineLabel`: the short header, the full accessible form, the `datetime`) and the `data-timeline` attribute on `vb-node` | FE_01 | FE_02, T_03 |
| `packages/ui/src/markdown/` (`MarkdownOptions.entries`, `.vb-md-entry`) | FE_01 | FE_02 |
| `packages/ui/src/timeline/` (`timelineMarkup(drawing, look)`, `timeline.css`, `pattern.json`) | FE_01 | FE_02, T_03 |
| Tokens for the dated node and the line (`packages/tokens/src/tokens.css`) | FE_01 | FE_02 |

---

## File Ownership

| Wave | Owner | Files |
|------|-------|-------|
| 1 | T_01 | `packages/format/src/` (`timeline.ts` new, `view.ts`, `ledger.ts`, `ledger-shape.ts`, `view-shape.ts`, `app-shape.ts`, `validate.ts`, `geometry.ts`, `flags.ts`, `index.ts`, `migrate/steps.ts`, `words/format-ledger.ts`), `packages/format/schema/`, `packages/format/fixtures/` except `legacy/`, `packages/format/tests/`, the generated files (`npm run gen`), `apps/board/server/write-board.ts`, `apps/board/server/examples.ts`, test files that hold a format-20 line or a `ledger/20/` `$id` (`apps/board/tests/`, `scripts/`), new `apps/board/tests/api-timeline.test.ts` and `schema-v21.test.ts`, `docs/specification/api.md`, `docs/specification/api-reference.md` (generated) |
| 1 | DESIGN_01 | `design/mockups/timeline/` |
| 2 | DESIGN_01 run 2 | `design/mockups/timeline/` (the vertical pages, README) |
| 2 | FIX_01 | `apps/board/server/schema.ts`, its refusal test, a words file under `packages/format/src/words/` only for a new sentence |
| 2 | BE_01 | `packages/layout/` (`src/timeline.ts` new, `board.ts`, `types.ts`, `structure.ts`, `index.ts`, `tests/`), `apps/board/server/engine/reads.ts` (`showLayout` only), `apps/board/tests/api-layout*.test.ts` and new `api-layout-timeline.test.ts`, `docs/specification/components.md` |
| 2 | FE_01 | `packages/ui/src/node/`, `packages/ui/src/markdown/`, `packages/ui/src/timeline/` (new), `packages/ui/src/patterns.ts`, `packages/ui/src/index.ts`, `packages/ui/src/words/`, `packages/ui/tests/`, `packages/tokens/src/tokens.css` and its contrast pair list and tests, `apps/board/src/gallery/timeline-section.ts` (new), `apps/board/src/gallery/main.ts`, `scripts/words-homes.mjs` and `docs/specification/words.md` (only for a new words file), the screenshots its specs renew |
| 2 | T_02 | `skills/vision-board/` (`source/`, the built `SKILL.md` and `references/`, `NOTES.md`, `scenarios.md`), `tests/evals/bot/`, `apps/board/tests/plugin-skill.test.ts`, `docs/specification/plugin.md` |
| 2 | orchestrator | `scripts/verify-weight.mjs`, `apps/board/tests/plugin-build.test.ts` (`BUDGET`), `docs/specification/performance.md` (raised once, on the merge) |
| — | orchestrator | `docs/decisions.md`, `docs/principles.md`, `.kiro/steering/vision-board-proj.md`, `AGENTS.md`, `CLAUDE.md`, `package-lock.json`, `docs/specification/modules.md`, `cortex-tasks/tracker.md` |

Waves 3 to 5 hold one task each; a task's *Files to modify* is its ownership. Nobody edits
`packages/format/fixtures/legacy/`.

---

## Requests

| Request | From | Need | Routed to | Status |
|---------|------|------|-----------|--------|
| | | | | |

**Status Values**: `Open` | `Done` | `Closed`

---

## Implementation Notes

### T_01: Contract first
_Status:_ Completed (2026-11-18 21:02)  
_Notes:_ `#format` `timeline.ts` is the one grammar (forms, normaliser, order via `sortByTimeline`, precision, year,
`timelineProblems`); `geometry.ts` `TimelineDrawing`/`TimelineDot`/`TimelineSide`; flag `timeline` off. The node
schema is split so reads stay strict and the sent item is lenient: `fields` + `body` (strict, stored and reads) +
`sentBody`/`sentCore` (lenient `timelineSent`, `sent` only). Generated `NodeBody.timeline` is `string`; the write item's
is `string | number`. `write-board.ts` `storedTimeline` normalises before the schema and the replay check (the only
agent node-line path). `show_layout` `timeline` is in the schema, left out until BE_01 fills it with `sortByTimeline`.
Format 21 = `restamp(20)`; fixtures restamped through the chain (only `v` changed). Field description is in
`node.schema.json` `sentBody`, not `openapi.json`. Budget: plugin `view/board.js` 195,849 gzip vs 195,500 (not
raised). `npm run map` needed. Pre-existing: `schema.ts` words a failed `tone`/`icon` anyOf as "must be a node number".

### DESIGN_01: Pages in line with the rulings
_Status:_ Completed (2026-11-18 20:57)  
_Notes:_ `design/mockups/timeline/`: `default-timeline-*`, `command-lens-timeline-*` (light new), `default-vertical-*`,
`command-lens-vertical-*` (redrawn per 569C), PNGs, `timeline.css`, `README.md` (rulings by decision number, APCA
tables, 6 open choices). Values for later tasks: node widths are tiers (s 280, m 360); step per call 6 with
`SIDE_GAP` 28, `MIN_STEP` 120 (174 and 154 drawn); `STEM` 30 across, 46 run down; `TIMELINE_STEM_AT` 37 (the default
skin's date line); other nodes `REGION_GAP` 56 below the line, run down `COL_GAP` 72 right. Every date colour passes
Lc 45 (lowest dark topic 48.0, 46.4 on the default skin's tinted top). Generator in `temp/design-01-timeline/`.
Run 2: (2026-11-18, § Design review 587-595) vertical pages redrawn: line down the column's middle, nodes left/right
(first left), stem 30 to the facing side's middle (no `TIMELINE_STEM_AT`), packed (`dots` in `place.mjs`: the skin's row
gap on a side, `TIMELINE_MIN_DOT` 56 between dots, arrow 30), other nodes `COL_GAP` right; `match` default run down,
`own` drawn as the person's choice. Across: Command Lens grid row gap 30 (the skin's). Values for BE_01: the row gap
is the skin's (`EDGE_ROW_GAP` 40 default, `ROW_GAP` 30 Command Lens; 587 says `ROW_GAP`: open choice 1); under `own`
the line is one stem from the widest node on each side (open choice 3). README: run 1's choices settled; 6 new.

### BE_01: The timeline in the layout
_Status:_ Completed (2026-11-18 23:40)  
_Notes:_ `#layout` `timeline.ts` `layoutTimeline` (pure, region-local) fills T_01's `TimelineDrawing` unchanged.
`layoutRegion` splits dated from the rest (no dated node: deep-equal to HEAD on 608 boards, a temp oracle); the rest go
through the mode with their own links, `REGION_GAP` below or run down `COL_GAP` right, tops level; dated pins ignored,
moved cards keep out of the timeline's band. `RegionPiece.timeline` (region-local), `RegionBox.timeline` (board),
`LayoutStructure.timeline`, `show_layout` `timeline`. New inputs for FE_02: `LayoutOptions.timelineWidths` (the page
resolves `timelineWidthsOf(direction, region.widths, chosen)`, since its `widths` is already resolved) and `Lane.x`
(a lane band beside a timeline run down starts there). Years: the start year's `at` is `line.from` (the label begins
there), a turn's is the label's centre. Constants: STEM 30, SIDE_GAP 28, MIN_STEP 120, MIN_DOT 56, YEAR_ROOM 56
(across only), END_ROOM 30; run down the row gap is `rowGap`. FE_02: add `n.timeline` and `timelineWidths` to the
layout cache's key. Page 202.9 KB gzip (budget 201.6); plugin `view/board.js` 197,492 (budget 195,900). `npm run map` needed.

### FE_01: The dated node, entries and the line's drawing
_Status:_ Completed (2026-11-18 23:05)  
_Notes:_ `#ui` `node-date.ts` (`timelineLabel`, `datedOf`; words in `words/node.ts`), `data-timeline` on `vb-node` (the
stored date), no tab/grip and the kind word on the date line (edges), the plate kept with `cursor: default` (Command
Lens), `MarkdownOptions.entries` (`.vb-md-entry`, `.vb-md-entry-name`), the `timeline` pattern (`timelineMarkup(drawing,
look)`, `applyTimelineLook(root)`: FE_02 calls it after setting the markup, as dot colours go in through CSSOM;
`TIMELINE_ARROW` 9 by 6). Tokens: `--vb-text-date`, `--vb-text-title-dated`, `--vb-node-date-l-dark` (dark topic missed
Lc 45 by 0.2), `--vb-timeline-*`, `--vb-md-entry-bar`, `--vb-timeline-line` (the frame's colour in light, halfway to the
muted ink in dark). Undated markup byte for byte (981 renders). `tests/pages/gallery.spec.ts` changed outside the row (a
flagged pattern's section is absent when its flag is off). Dated and entry states sit under `flaggedStates.timeline`, as
printed `states` move gallery screenshots. Measured: page 203.0 KB, `view/board.js` 196,993, `view/board.css` 25,519 gzip.

### T_02: The skill and its evals
_Status:_ Completed (2026-11-18 23:20), run 2; run 1 blocked at step 4  
_Notes:_ Core sentence word for word + "Before you date cards, read `references/timeline.md`."; `references/timeline.md`
(2,823 B) in both builds; scenarios `timeline-plan`, `timeline-unprompted`, `timeline-not-for-prose` in `SCENARIOS` and
`STANDALONE` (`timeline-checks.ts` judges by `normaliseTimeline`; `FakeBot.tools` + `secretArg` so one script plays both
hosts). Dry plugin 129/129, standalone 115/115, bad scripts fail exactly their `badFails`. **Blocked**: plugin
`skill.md` 8,301 of `SKILL_BYTES` 8,192 (+184 B bullet on 8,117). Options: A raise `SKILL_BYTES` (host contract); B
unwrap list lines (−86) + shorter read clause (−16) = 8,199, still over; C unwrap + drop Answering's restated "Done."
line (−53) = 8,162. Also: `SCENARIOS` is 18 > the 16-run cap; proposed plugin live run `--only` the timeline three +
`linked-pipeline`, `insert-step`. Live not run, $0 spent. Steps 4 (plugin.md), 6, 7 (v3.36, NOTES, scenarios.md) wait.
Run 2: on the orchestrator's ruling (option C: list items on one line, "(read `references/timeline.md` first)", the
restated Answering "Done." line dropped; `SKILL_BYTES` unchanged) the plugin `skill.md` is 8,148, standalone 19,079;
skill v3.36; `plugin.md`, NOTES.md, scenarios.md 53-55. Live Haiku: plugin `--only` 11 runs 85/86 $0.0302 (miss:
insert-step skipped reading layouts.md); standalone all 14, 113/115 $0.0749 (misses: architecture-icons recapped after
"Done." [INFERENCE: maybe the dropped line], radial-ideas linked). All timeline checks pass in both. Total $0.1051.
`check` 0 errors; `npm test` 2,662/2,665: `plugin-build.test.ts` `FILES` lacks `references/timeline.md` (request: add it),
and `api-ledgers` 215 is the known fresh-worktree failure until `npm run build` (T_05 note).

### FE_02: The board draws the timeline
_Status:_ Pending  
_Notes:_ 

### VERIFY_01: Final verification
_Status:_ Pending  
_Notes:_ 

### T_03: Switch on
_Status:_ Pending  
_Notes:_ 

---

## Completion Checklist

- [ ] All implementation tasks complete
- [ ] VERIFY_01 complete, its findings fixed or routed
- [ ] The maintainer's yes on the result, then T_03
- [ ] Every request `Done` or `Closed`
- [ ] Tracker row N53 deleted
- [ ] LOG entry created (see below)

---

## On Completion

When all tasks are done and the full gates pass, the orchestrator:

1. Sets frontmatter `status: completed` and `completed: YYYY-MM-DD`.
2. Appends the set's LOG entry, one line, terminated with a newline, append-only:
   ```
   [[YYYY-MM-DD HH:MM]] [board-layout] Completed set: The Timeline → Task: [[cortex-tasks/board/2026-11-18_board-layout_timeline/TASK-STATUS.md]]
   ```
3. Deletes tracker row N53.
4. Commits the close.
