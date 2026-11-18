# The Timeline - Plan

> **Status Doc**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Created**: 2026-11-18 · **Tracker**: N53 · **Runs after**: the Node Overhaul set closes
> (`cortex-tasks/board/2026-11-16_board-ui_node-overhaul/`)

Start here. Then read, in this order: § Decisions below (every ruling, so no agent reads the chat), `CODE-MAP.md` in
this folder (where the code is), the two run-2 pages in `design/mockups/timeline/` (`default-timeline-dark.html`,
`command-lens-timeline-dark.html`: open them in a browser) and, once DESIGN_01 has run, the pages it adds,
`.kiro/steering/vision-board-proj.md` and `docs/principles.md` (how we build). Where a page and § Decisions differ,
**§ Decisions wins**.

---

## Problem Statement

Plans, roadmaps and histories have dates, and nothing on the board shows order in time. The maintainer settled a model
(tracker N53, points 466-541) and reviewed two rounds of mock-ups (DESIGN_02 runs 1 and 2, `design/mockups/timeline/`):
a node may carry a date, and the dated nodes of a container share one line across its top, each on its own dot, with
the date as the node's header. Nothing of it is built: a node has no date (`packages/format/src/view.ts` `ViewNode`),
the layout has no line (`packages/layout/src/board.ts` `layoutRegion`), the node has no date header
(`packages/ui/src/node/node-edges.ts` `heading`), and the skill says nothing about dates.

---

## Decisions

Every ruling is the maintainer's (tracker N53; points 466-473, 486, 503-541; the run-2 review in
`design/mockups/timeline/README.md`) unless marked **planner**. Planner's calls are listed again in § Planner's calls,
for the kickoff. Where the mock-up README says otherwise (it still speaks of "WEEK OF", a `timeline` mode, a
precision field and a grip), these decisions supersede it.

### The key (contract)

1. **A node carries an optional `timeline` key**: an ISO 8601 date at one of four precisions, `2026`, `2026-10`,
   `2026-10-13`, `2026-10-13T14:30`. The precision is what is written; there is no separate precision field.
2. **Normalised at the edge, one spelling stored.** The server normalises a model's habits without changing the
   precision: a time zone or offset (`Z`, `+02:00`, `-0500`) is dropped, seconds and fractions of a second are dropped,
   a space between date and time becomes `T`, a lower-case `t` or `z` is read as upper case, and surrounding spaces are
   trimmed. **Planner**: a JSON whole number from 1000 to 9999 is read as a year (`2026` → `"2026"`), the commonest
   model habit for a year; the time digits are kept as written. Everything else is refused (quarters `2026-Q4`, ISO
   weeks `2026-W42`, words "next week", an hour without minutes `2026-10-13T14`, an impossible date `2026-02-30`, a
   two-digit year) with words that name the four forms. The ledger and every read hold the normalised value only.
3. **Times are shown as written**, with no zone conversion. No "week of": a week is not a precision.
4. **The key is intentional.** A date in a card's Markdown is just text; only the key places a node on the timeline.
5. **Planner**: `timeline` is refused on an `app` card (an app card is a window with its own title bar and no header
   for a date), with words saying so. Every other kind may carry it, items and tellers alike.
6. **Planner, per D-103: the ledger format moves to 21, and its migration step is a restamp.** Adding an optional key
   changes the meaning of no existing line, so the step rewrites nothing but `v` (`restamp(20)`, as formats 12 to 18
   were). The bump is still needed: the reader refuses an unknown field, so a format-20 build (the maintainer's board
   on `main` runs format 20 today) would refuse every dated card line while staying writable. With format 21 an older
   build opens such a ledger read-only and says why (D-103 4), which is the rule's purpose. Every ledger `$id` moves
   to `.../schema/ledger/21/`, as it did for 20 (api.md 182).

### The line (layout)

7. **One timeline per container.** The nodes of a container that carry the key form its one timeline, drawn across the
   top of the container whatever the container's layout. Every other node of the container lays out below it, in the
   container's own layout mode (the person's layout button sets it, as today). **No new layout mode**: `MODES` is
   unchanged. The timeline goes only when the last key in the container goes; changing the container's mode never
   removes it. D-021 (a ledger-history layout mode, unbuilt) is a different thing and stands.
8. **Each dated node sits on its own dot**, joined to the line by a stem, alternating above and below the line (the
   first above); run down, alternating left and right of it (the first on the left; maintainer, point 594). Two nodes
   never share a dot. The stem meets the middle of the node's facing edge (point 587).
9. **Order**: by start (`2026` starts on 1 January, `2026-10` on 1 October, `2026-10-13` at 00:00); at the same start,
   coarser before finer (`2026-10` before `2026-10-01` before `2026-10-01T00:00`); exactly equal values in the order
   the nodes were made (card number `n`).
10. **Not to scale.** A gap of months and a gap of minutes look the same. Across, one step for the whole line. Run
    down, normal spacing (point 587): each dot as close to the one before as keeps nodes apart by the board's own gaps,
    so a short node leaves no empty run below it.
11. **The year is shown on the line**: at its start, and where it turns between two dots. Day and time headers carry
    no year for that reason.
12. **A same-date band** lies on the line behind consecutive dots whose values are exactly equal (`2026-11-03` and
    `2026-11-03`; not `2026-11-03` and `2026-11-03T09:00`).
13. **Links work**: links to, from and between dated nodes route as they do between any cards.
14. **The vertical form** follows the container's flow direction (`directionOf`: the person's choice for the container,
    else theirs for the board, else the container's own `direction`, else across). Run down, the line runs down the
    middle of the timeline's column and the dated nodes alternate left and right of it (point 594). **Maintainer (kickoff 569C)**: across, the
    container's other nodes lay out below the timeline; run down, the timeline is the container's first column and the
    other nodes lay out beside it, to its right, in the container's own layout mode (one container, two columns). The
    container's layout menu offers Across, Down and Auto on a container that has a timeline, as it does on a flow.
15. **A dated node's place is its date**: the layout ignores a pin on a dated node; nothing on the board writes one.
    **Planner**: a person's pin on an undated node in the same container still wins, as everywhere, and the layout
    keeps unpinned undated nodes out from under the line.

### The node (display)

16. **The date is the node's header**: the first thing on the node, large and bold, month first and upper case:
    `OCT 13` (a day), `OCT 2026` (a month), `2026` (a year), `OCT 13 · 14:30` (a time). No year on a day or time
    header (the year is on the line). Its colour is the kind's colour, or the node's tone when it has one; it is a short
    coloured label, so its contrast tier is Lc 45 (D-009), in light and dark, in both skins.
17. **No grip on a dated node.** Default skin (run-2 option B): the kind tab leaves the top edge and nothing replaces
    it; the kind becomes a small word at the end of the date line; the number, the disc, the change badge and the notes
    mark stay where they are. **Move to** (the selection bar's Move, and its command) still moves a dated node to another
    container, where it joins that container's timeline. A drag never starts on a dated node.
18. **Command Lens keeps its plate** (number, kind, marks), and the date heads the body above the title. The plate is
    not a drag handle on a dated node.
19. **Entries.** Inside a timeline (a node with the key), a `###` heading, a paragraph opening with a bold name, or a
    list item opening with a bold name draws as an entry: a bar in the kind's colour (or tone), the bold name, then its
    text. `##`, `####` and plain lists stay ordinary. The agent learns no new syntax; the board does the presentation.
20. **Bigger type only inside a timeline**: the date about 23px, the title about 18px (run 2: date 23px, weight 800 in
    the default skin and 700 in Command Lens; title 17.5 to 18px). The rest of the board keeps its sizes. **Planner**:
    both sizes are tokens, the date uses each skin's display font (`--vb-font-display`), and the title is 18px in both
    skins.
21. **The build takes the board's real values** for the frame's spacing and the line's colour, not the mock-ups'
    (run 2). **Maintainer (point 595)**: dated nodes follow the container's widths setting (`Widths`: `match` or
    `own`, `widthsOf`, the same control in the container's menu); with no choice made, a timeline run down is `match`
    (every dated node as wide as the widest) and across is `own`. The setting is the container's: it covers its dated
    and its other nodes alike. The mock-ups' 300px width is not adopted.

### The agent (skill)

22. **One core sentence**: "To put an event on a timeline, give its node a `timeline` key with its date; nodes with one
    share their container's timeline", followed by when to read the reference. Everything else is in
    `references/timeline.md`, written in the skill's one source (`skills/vision-board/source/`, node-overhaul T_05) and
    built into both builds.
23. **Haiku 5.5 eval scenarios prove the reflex**: dates in the four forms without being told the key, and entries
    written as `###` headings or bold leads.

### Process

24. **Contract first**: the schemas, `openapi.json` and `npm run gen` land before any drawing (T_01). The layout stays a
    pure function (`packages/layout`). Any zoom number is a row in `#ui` `ZOOM_RULES`. Every sentence lives in a
    words file. A bug fix starts with its failing test. A gallery entry for every new look, both skins, light and dark.
25. **One flag**, `timeline` (planner), off by default until T_03, which removes it with its guard after the
    maintainer's yes, as node-overhaul T_04 did ("no legacy"). The contract has no flag (node-overhaul call 13).
26. **A decision entry**, D-105 (§ Decision entry to append), is appended on the maintainer's yes at kickoff, before
    wave 1.

---

## Current State

`CODE-MAP.md` maps every file and symbol this set touches (surveyed 2026-11-18, after FIX_06 and T_05 merged). In short:

- **Contract**: `ViewNode` (`packages/format/src/view.ts`) has `icon` and `tone`, no date. Node fields are checked by
  `NODE` in `ledger-shape.ts` (`iconProblems`, `toneProblems` from `view-shape.ts`), by `validate.ts` for a view, and by
  `common.schema.json`, `events/node.schema.json`, `api/view.schema.json`, `api/write-item.schema.json`.
  `LEDGER_FORMAT` is 20; the migration chain is `packages/format/src/migrate/steps.ts` `FORMAT_STEPS`. Nothing
  normalises an agent's field today: `tone` is refused, never repaired. A refused item comes back with an example
  (`apps/board/server/write-board.ts` `refuse`, `examples.ts`); a word-level refusal before the schema has a precedent,
  `checkProposeWord`. No ISO date parser exists in the repo.
- **Layout**: `layoutRegion` runs one mode (`MODE_FNS`) over a container's nodes, applies pins (`applyPins`), moves
  unpinned cards out of the way of obstacles (`makeRoom`, which already takes the lane gutters as fixed boxes), and
  returns a `RegionPiece`; `packRegions` places frames and routes links (`routeLinks`). `headInset` is the precedent
  for room under the title line. `structureOf` (`structure.ts`) answers `show_layout` from the same mode.
- **Node**: `nodeTemplate` → `edgesMarkup` (`node-edges.ts`): `handle()` draws the kind tab (or the grip, for an icon
  node) in the default skin and the kind inside the plate in Command Lens; `heading()` draws the title (and, for an
  icon node, the kind "kick" and the icon tile). Drags start on `HANDLE` (`apps/board/src/board/input/pointer.ts`:
  `.vb-node-kind, .vb-node-grip, .vb-node-plate`).
- **Markdown**: `renderMarkdown(src, MarkdownOptions)` (`packages/ui/src/markdown/render.ts`); `###` to `######` are the
  small label (`vb-md-label`); options are given by whoever renders (`more`, `details`, `images`).
- **Drawing outside nodes**: lane bands are SVG in the wires layer (`apps/board/src/board/links/wires.ts` `lanesOf`),
  behind frames and cards; the world scales them with the board (`ZOOM_RULES.world`).
- **Skill**: one source (`skills/vision-board/source/core.md`, `differences.md`, `references/*.md`), built by
  `npm run build:skill` (standalone) and `npm run build:plugin` (the plugin's, within `SKILL_BYTES`, 8 KiB). Evals:
  `tests/evals/bot/` (`SCENARIOS`, `STANDALONE`, `--dry`, `--model haiku`).
- **Budgets** (temporary, node-overhaul House Rules): the page's start 201.3 KB gzip (T_01 raised it to 201.6, measured 201.5) (`scripts/verify-weight.mjs`
  `PAGE`), the plugin's `view/board.js` 195,500 (T_01 raised it to 195,900, measured 195,849) and `view/board.css` 24,950 gzip (`apps/board/tests/plugin-build.test.ts`
  `BUDGET`). Headroom is a few dozen bytes, so this set raises them (§ House Rules).

---

## Proposed Solution

The date is a field of the contract with one spelling, one grammar module everyone imports, and one normaliser at the
write edge. The layout learns a timeline as a pass beside the container's mode, not a mode: dated nodes go on the line,
the rest go through the mode as before, below it. The node learns a date header and Markdown entries, driven only by
the node's own key, so it needs no knowledge of its container. The page draws the line in the wires layer, where lane
bands already are, from geometry the layout returns, through one `#ui` template. The skill gets one sentence and a
reference.

### Key changes

1. **Contract** (T_01): `#format` `timeline.ts` (the grammar: forms, normaliser, order, precision, year), the field in
   every schema and type, the normaliser in `write-board.ts`, refusal words, the `show_layout` `timeline` block, the
   timeline drawing's geometry type (`geometry.ts`), format 21 with `restamp(20)`, fixtures restamped, the `timeline`
   flag, api.md.
2. **Pages** (DESIGN_01): the vertical pages brought in line with run 2 and § Decisions; light versions of the run-2
   pages; a container with a timeline and other nodes below it, and run down with them to its right; the four header forms.
3. **Layout** (BE_01): `packages/layout/src/timeline.ts` `layoutTimeline`; `layoutRegion` splits dated from undated,
   offsets the rest below (or to the right, run down), ignores pins on dated nodes; `RegionPiece`/`RegionBox` carry the geometry; `structureOf`
   and `show_layout` report it; components.md § The timeline.
4. **Node and entries** (FE_01): the date header and its words, no grip and the kind word on a dated node, Command
   Lens's date above the title, bigger type tokens, Markdown entries (`MarkdownOptions.entries`), the `timeline`
   pattern (`timelineMarkup`: line, dots, stems, years, bands, arrow) and its gallery section.
5. **Skill and evals** (T_02): the core sentence, `references/timeline.md`, both builds, Haiku scenarios, live runs.
6. **Board wiring** (FE_02): the flag's one gate, the line drawn in the wires layer, no drag on a dated node, Move to,
   links, the direction choice on a container with a timeline, the live gallery section, page specs.
7. **Verification** (VERIFY_01) and **switch on** (T_03).

### How it meets the principles

- **Reuse before create**: the date grammar is one `#format` module, imported by the server, the layout and the page;
  the drawing goes where lane bands go (`wires.ts`), as one `#ui` template; entries are an option of the one Markdown
  renderer; the date header extends `heading()`; Move to, the selection bar, links, pins, `directionOf` and the layout
  menu's direction row are reused unchanged or widened by one condition. New: `#format` `timeline.ts`,
  `#layout` `timeline.ts`, `#ui` `timeline/` (pattern), `#ui` `node/node-date.ts`. All are Shared Foundations.
- **Contract first**: T_01 lands the schema, generated files and their tests in wave 1; every later task reads its
  types. `show_layout` changes in the contract before the layout fills it.
- **One action layer**: no new action. Move to is the existing `move`; a dated node simply never writes a `pin`.
  Nothing an agent or the person does changes meaning.
- **Registries**: no new registry row. The flag is a row of `FLAGS`. No zoom number is expected (the line scales with
  the world, like links and lane bands); any a task needs is a `ZOOM_RULES` row.
- **Words**: refusals in `packages/format/src/words/format-ledger.ts` (T_01); the date's month names and accessible
  forms in `#ui` words (FE_01); agent-facing field descriptions in `openapi.json` (T_01); the skill in its source
  (T_02). No sentence in code.
- **Tokens**: the two type sizes and any colour the line needs are tokens (FE_01; `tokens.css` is protected: the exact
  diff is shown at the gate). Colour literals stay in `tokens.css` only.
- **Pure layout**: `layoutTimeline` is a pure function of the dated nodes, their sizes and the direction; a container
  with no dated node lays out byte for byte as before (a test).

---

## Dependencies

- **Kickoff gate** (before wave 1): the maintainer's yes on D-105 (§ Decision entry to append) and on § Planner's
  calls; the orchestrator appends D-105 and makes the steering change below.
- **Wave 1**: T_01 and DESIGN_01 together (DESIGN_01 writes only under `design/mockups/timeline/`).
- **Design gate** (before wave 2): the maintainer's yes on DESIGN_01's pages and its open choices. The orchestrator
  records each answer in § Design review below; FE_01 and FE_02 build from that list.
- **Wave 2**: BE_01, FE_01 and T_02 together, each in its own git worktree. All three read T_01's contract; none reads
  another's work. FE_01 draws the line from T_01's geometry type with hand-made geometry; BE_01 fills the same type.
- **Wave 3**: FE_02, which joins BE_01's geometry to FE_01's template on the page.
- **Wave 4**: VERIFY_01. Then the **result gate**: the maintainer uses the board and says yes (fix tasks, if any, are
  added by the orchestrator as `FIX_NN`, wave 4).
- **Wave 5**: T_03 (switch on), after the result gate.
- No new npm package. No font, icon or other download.

---

## House Rules

- **Where**: `.claude/worktrees/app-window`, branch `spike/stage-apps` (as the Node Overhaul), unless the maintainer
  names another branch at kickoff (the orchestrator records it here). Never the main checkout: the maintainer's board
  runs there. Never port 4466.
- **Ports** (`VB_TEST_PORT`; page workers use base + 10 to base + 59, so tasks in one wave never overlap): T_01 7610,
  DESIGN_01 7710, BE_01 7810, FE_01 7910, T_02 8010, FE_02 8110, VERIFY_01 8210, T_03 8310. The eval's `--port` is the
  task's port.
- **Own worktrees** (wave 2: BE_01, FE_01, T_02): before dispatch the orchestrator commits the set's state on the
  branch, then runs `npm run worktree -- timeline-<id-kebab> --base spike/stage-apps` (for example
  `timeline-be-01`; `scripts/worktree.mjs` makes `.claude/worktrees/timeline-<id-kebab>` on `feat/timeline-<id-kebab>`
  with `node_modules` linked) and names the path and the port above in the brief, never the printed port. The
  sub-agent checks `git branch --show-current` first. After the wave's gate the orchestrator merges each branch, runs
  the project checks on the merge, removes the worktree (`git worktree remove`) and deletes the branch. A `no` task
  works in `.claude/worktrees/app-window`.
- **Orchestrator-only files**: `docs/decisions.md` (D-105, on the yes), `docs/principles.md`,
  `.kiro/steering/vision-board-proj.md`, `AGENTS.md`, `CLAUDE.md`, `package-lock.json`, `docs/specification/modules.md`
  (run `npm run map` after a task changes imports), `cortex-tasks/tracker.md` (row N53 is deleted when the set closes).
  In wave 2 also the budget files (`scripts/verify-weight.mjs`, `apps/board/tests/plugin-build.test.ts` `BUDGET`,
  `docs/specification/performance.md`): each wave-2 task reports what it measured, and the orchestrator raises the
  temporary figures once, measured on the merge.
- **Protected, with a named owner**: `packages/tokens/src/tokens.css` is changed only by FE_01 (type sizes, any line,
  band or dot token); FE_01 lists the exact diff in its notes and the orchestrator shows it to the maintainer at the
  wave-2 gate.
- **Commits**: the orchestrator commits each checked task on the branch; nothing is pushed. No sub-agent runs a git
  command that changes state.
- **Flag**: `timeline` (T_01) is off by default until T_03. With it off, the board, its tests and its screenshots are
  exactly as before the set: the page drops the key from the nodes it draws (FE_02, one gate). New behaviour is tested
  with it on (`?flags=timeline`). The contract and the server have no flag: an agent may write the key, and
  `show_layout` reports a timeline, from T_01 on.
- **Ledgers**: no task opens the maintainer's `.visionboard/` or any real ledger; tests make their own folder under the
  OS temp folder. Nobody edits `packages/format/fixtures/legacy/`.
- **Size budgets are temporary and never block** (maintainer, node overhaul, 2026-11-17): when the work needs more, the
  task (in wave 2, the orchestrator) raises the temporary figure to what it measured, says so in its notes, and
  carries on. Size is optimised once, later, in a pass of its own. What keeps size down meanwhile is reuse.
- **Done** for a UI task: every state, accessibility (axe) and contrast (APCA tiers, light and dark, both skins), unit
  tests, the page specs for what changed, a gallery entry, `pattern.json` updated, and a look in a browser in light and
  dark, both skins, as the person sees it.
- **Words**: every new sentence in its area's words file (`docs/specification/words.md`); a new words file is
  registered in `scripts/words-homes.mjs` and `words.md` by the task that makes it.
- **Docs**: a task that changes code a doc describes updates that doc in the same task (`cortex-docs`).
- **Interim files** in `temp/` (git-ignored). **Writes over 50 lines in chunks** (cortex rule 10).
- **Models**: `strong` is Opus 5.5, `standard` is Sonnet 5.5; every sub-agent is started with its model named.
- **Stop and ask** when a task would change what an existing action, mode or record means beyond this plan, or when a
  page and § Decisions disagree.

### Tests: what runs when (timing-aware)

The full page suite (125 specs, about 1,100 tests) takes about 25 minutes; it runs **once**, in VERIFY_01. Every other
task runs only the specs below, by name: `VB_TEST_PORT=<port> npx playwright test --config
tests/pages/playwright.config.ts <spec files>` (renew a screenshot only with `--update-snapshots` on the named spec,
and list every renewed file in the notes).

| Task | While working | At the end (time limit) |
|---|---|---|
| All code tasks | the unit files it touches: `node --test <files>` | `npm run verify`, `npm run check`, `npm run gen -- --check`, `npm test` (10 min) |
| T_01 | `packages/format/tests/*` it touches, `apps/board/tests/api-*.test.ts` for write and `show_layout`, `migrate.test.ts` | pages: `board.spec.ts`, `gallery.spec.ts` (fixtures restamped; 10 min) |
| DESIGN_01 | none (no board code) | its own screenshot script under `temp/` |
| BE_01 | `packages/layout/tests/*`, `apps/board/tests/api-layout*.test.ts`, `layout.timing.ts` | no page spec (pure; the page joins in FE_02) |
| FE_01 | `packages/ui/tests/*` it touches, tokens' contrast tests | pages: `gallery.spec.ts`, `node-edges.spec.ts`, `command-lens.spec.ts`, `markdown-more.spec.ts`, `big-titles.spec.ts`; `npm run test:plugin` (15 min) |
| T_02 | `skills/vision-board/source/build.test.mjs`, `apps/board/tests/plugin-skill.test.ts`, `tests/evals/bot/bot-eval.test.ts` | `npm run eval:bot -- --dry` and `--dry --standalone`; live Haiku once each (§ Requests 4) |
| FE_02 | its new `tests/pages/timeline.spec.ts` | pages: `timeline.spec.ts`, `gallery.spec.ts`, `move-and-later.spec.ts`, `flow-direction.spec.ts`, `layout-control.spec.ts`, `wires.spec.ts`, `reset-places.spec.ts`, `select.spec.ts`, `node-edges-board.spec.ts`, `same-picture.spec.ts`; `npm run test:plugin` (20 min) |
| VERIFY_01 | — | the full suite once: `nice -n 15 env VB_TEST_WORKERS=3 VB_TEST_PORT=8210 npm run test:pages` (35 min); `npm run test:plugin`, `npm run test:plugin:webkit`; `npm run eval:bot -- --dry` |
| T_03 | `timeline.spec.ts`, `gallery.spec.ts` | the specs whose screenshots the switch changes, by name (15 min) |

A run that passes its time limit is stopped and reported, never left running. A failure the task did not cause (it
fails the same on the branch before the task) is reported with that evidence, not fixed.

---

## Planner's calls to confirm at kickoff

Choices the planner made where the rulings left room. The orchestrator reads these to the maintainer with D-105 and
records any change here, and in § Decisions, before wave 1.

1. **A whole-number year** (`2026` as a JSON number) is normalised to `"2026"` (decision 2).
2. **No timeline on an app card** (decision 5).
3. **Format 21 with a restamp step** (decision 6): no line's meaning changes; the bump makes an older build open such
   a ledger read-only instead of refusing dated cards while staying writable.
4. **The vertical form puts the other nodes beside the line, to its right** (maintainer, 569C; was "below"), and a
   container with a timeline offers Across, Down and Auto in its layout menu (decision 14).
5. **Pins**: a dated node's pin is ignored; an undated node's pin still wins, even over the line; unpinned undated nodes
   are kept out from under it (decision 15).
6. **Spacing** (BE_01): one step `s` for the line, the least that keeps two nodes on the same side `SIDE_GAP` (28px, as
   run 2) apart: `s = max(MIN_STEP, max over i of ((w[i] + w[i+2]) / 2 + SIDE_GAP) / 2)`, also taken over neighbours
   `i, i+1` so two or three nodes never crowd; run down, no single step: superseded by § Design review 587 (packed, alternating left and right). The
   stem is one fixed length in both forms (`TIMELINE_STEM`); nodes above sit on their bottom edge, nodes below hang
   from their top edge; run down, the stem meets the middle of the node's facing side (§ Design review 587; no
   `TIMELINE_STEM_AT`). The line runs from the start of the content to its right edge (the
   wider of the timeline and the nodes below), ending in an arrow; run down, to the last dot, ending in an arrow.
7. **Type**: 23px date and 18px title, both skins, as tokens; the date in the skin's display font (decision 20).
8. **The node's width follows the container's widths setting** (decision 21, point 595): no forced 300px.
9. **Entries in detail** (FE_01): a `###` entry is the heading and the blocks after it up to the next heading, rule or
   entry start; a bold-lead paragraph is one entry, its name the bold run and its text the rest, with one leading
   `:`, `-`, `–` or `—` and the spaces after it dropped; in a list, each top-level item that opens with a bold name is
   an entry and keeps its list semantics (`li`), the other items keep their bullets. A `###` entry's name stays a
   heading for assistive technology; a bold lead stays bold text.
10. **The date's accessible form** is the full date ("13 October 2026, 14:30"), from the words file, with the short
    form hidden from assistive technology; the value is in `<time datetime>`.
11. **One flag, removed at the end** (decision 25), with the page's single gate in FE_02.
12. **The steering change** (protected; with the same yes): in `.kiro/steering/vision-board-proj.md` § Words, after
    `link ·`, add `timeline (a container's line of dated nodes; a node joins it by its timeline key) ·`.

---

## Kickoff answers

_Recorded by the orchestrator: the answer to each call above and to the Requests in TASK-STATUS.md._

2026-11-18 (points 569A-E):
- **A, D-105 and the steering line**: yes. D-105 appended with item 2 worded for 569C (run down, the other nodes lay
  out beside the line); the steering line added as drafted (call 12).
- **B, format 21 with a restamp step**: yes (decision 6, call 3).
- **C, the vertical form**: changed. Run down, the timeline is the container's first column and its other nodes sit in
  a second column to its right, in the container's own layout; across, they sit below. Decision 14 and call 4 now say
  so. Calls 1, 5 to 11 stand as written (no change asked).
- **D, live Haiku eval runs in T_02**: yes, within the default caps.
- **E, no timeline on an app card**: yes (decision 5, call 2).
- **Branch**: `spike/stage-apps` in `.claude/worktrees/app-window`, fast-forwarded to `main` (616f2c1f) first; checkpoint
  tag `checkpoint/pre-timeline` on 616f2c1f.

## Design review

_Recorded by the orchestrator at the design gate: the maintainer's answers on DESIGN_01's pages and open choices.
Where a page and this list differ, this list wins._

2026-11-18 (points 587-595), after the run-1 pages of DESIGN_01:
- **587 and 594, the vertical form**: run down, the line runs down the middle of the timeline's column and the dated
  nodes alternate left and right of it, the first on the left, as across alternates above and below. Spacing is
  normal, not one even step: dot `i` sits as high as both of these allow: its node's top at least `ROW_GAP` below the
  bottom of the last node on the same side (`i - 2`), and the dot at least `TIMELINE_MIN_DOT` (the dot plus room for a
  year label) below dot `i - 1`. Nodes on opposite sides may overlap in height; that is the point of alternating. The
  container's other nodes sit to the right of the whole timeline (569C stands). Contract: `TimelineSide` is
  `above | below | left | right` (orchestrator, before wave 2: `geometry.ts`, `show-layout-response.schema.json`,
  generated).
- **587, the stem**: the stem meets the middle of the node's facing edge in both forms: across, the middle of the top
  or bottom edge (as drawn); run down, the middle of the right side for a node on the left, of the left side for a
  node on the right. `TIMELINE_STEM_AT` is dropped. Command Lens needs no special case.
- **591, distances**: one stem length for both forms (`TIMELINE_STEM`, 30). Every other gap is a gap the layout
  already has: `ROW_GAP`, `REGION_GAP` (the other nodes below the line), `COL_GAP` (the other nodes to the right of
  a timeline run down). No new spacing number except the stem, the year's room and the arrow's.
- **595, widths**: dated nodes follow the container's widths setting (decision 21): run down defaults to `match`,
  across to `own`; the person's choice in the container's menu wins and covers the whole container.
- **588 line colour, 589 dot, 590 year label, 592 tone ink, 593 same-date band**: kept as DESIGN_01 run 1 drew them
  (no objection from the maintainer).
- **DESIGN_01 run 2's open choices** (orchestrator, on the run's recommendations, under the maintainer's autonomy;
  he may overrule on his look): (1) the row gap run down is the skin's own row gap, the layout's `rowGap` option
  (`EDGE_ROW_GAP` 40 in the default skin, `ROW_GAP` 30 in Command Lens), not a fixed `ROW_GAP`; (2) `TIMELINE_MIN_DOT`
  56; (3) under `own`, run down, the line sits one stem from the widest node on each side (the column's middle under
  `match`); (4) run down, the first dated node starts at the top of the content and the other nodes start level with
  it; (5) no special link routing around the line (out of scope); (6) the same-date band keeps its length.
- **M84** (tracker): rolled into this set as FIX_01 (the `anyOf` refusal wording), wave 2.
- **D-106** (appended on the maintainer's yes, point 596; D-105 item 3 says run down puts the nodes on one side): "Run down, a
  timeline's dated nodes alternate left and right of the line, the first on the left, spaced by the board's gaps
  rather than one step; the stem meets the middle of the node's facing edge in both forms; dated nodes follow the
  container's widths setting, `match` by default run down and `own` across."

---

## Decision entry to append

Draft for `docs/decisions.md`, in its format. The orchestrator shows it to the maintainer at kickoff and appends it,
word for word, on his yes (with any change he makes recorded in § Kickoff answers first).

```
## D-105 A node may carry a date, and a container's dated nodes share one timeline
- **Date**: 2026-11-18 · **Status**: Accepted (maintainer, points 466-541) · **From**: tracker N53; design/mockups/timeline (DESIGN_02 runs 1 and 2)
- **Decision**:
  1. A node may carry `timeline`, an ISO 8601 date at one of four precisions: `2026`, `2026-10`, `2026-10-13`, `2026-10-13T14:30`. The precision is what is written; there is no precision field. The board normalises a time zone or offset, seconds and a space for `T` without changing the precision, and refuses anything else (quarters, weeks, words) with words naming the four forms. A time is shown as written, with no zone conversion.
  2. The key is intentional: a date in a card's text is only text. The nodes of a container that carry the key form its one timeline, a line across the top of the container in whatever layout the container has; its other nodes lay out in the container's own layout, below the line, or beside it to the right when the line runs down. No layout mode is added. The timeline goes only when the last key goes.
  3. Each dated node sits on its own dot, joined by a stem, alternating above and below the line; ordered by start (`2026-10` starts on 1 October; a coarser date before a finer one with the same start; equal dates in the order the nodes were made); evenly spaced, not to scale; the year on the line where it turns; a band behind consecutive equal dates; links as anywhere. Run down (the container's flow direction), the line runs down the left with the nodes on one side.
  4. The date is the node's header, large and bold, month first: `OCT 13`, `OCT 2026`, `2026`, `OCT 13 · 14:30` (the year is on the line), in the kind's colour or the node's tone. A dated node has no grip: its place is its date; Move to still moves it. In the default skin its kind is a small word at the end of the date line; Command Lens keeps its plate and the date heads the body.
  5. Inside a timeline, a `###` heading, or a paragraph or list item opening with a bold name, draws as an entry: a bar in the kind's colour, the bold name, then its text. Other headings and plain lists stay as they are. Dates and titles are larger only inside a timeline.
- **Why**: plans, roadmaps and histories have dates, and nothing on the board showed order in time. A key the agent sets on purpose keeps a date in prose from moving a card, and a line beside the container's layout keeps the rest of the container as the person arranged it.
- **Alternative rejected**: a `timeline` layout mode, which would take over the container and its undated nodes; a separate precision field; dates read from card text.
- **Task**: cortex-tasks/board/2026-11-18_board-layout_timeline/TASK-STATUS.md
```

---

## Out of Scope

- The person setting or editing a node's date on the board (only agents write the key; a tracker row if wanted).
- Dates drawn to scale, zoomable time axes, a "today" marker, ranges (a start and an end), weeks or quarters.
- Links routed around the line, its stems and dots (links route around cards, as today; VERIFY_01 judges readability).
- A timeline across containers, or more than one line in a container.
- The ledger-history layout mode of D-021.
- Size optimisation (a later pass; budgets are temporary).
- Anything for nclite beyond not breaking the hosted board: the timeline works hosted as it does standalone, with no
  plugin contract change.

---

## Risks & Considerations

| Risk | Mitigation |
|------|------------|
| A model writes dates in many shapes | One normaliser at the write edge for the habits named in decision 2; anything else refused with the four forms and the item's example; Haiku scenarios prove the reflex |
| An older build writes into a ledger with dated cards | Format 21: an older build opens it read-only and says why (D-103 4); the step is a restamp, so migration is trivial and proven by `migrate.test.ts` |
| Restamping fixtures and `$id`s touches many files | Mechanical, one task (T_01), through the chain (`npm run ledger:migrate` on fixture folders or the same `restamp`), never by hand; `gen --check` and the schema tests hold it |
| A container without dates draws differently | BE_01 proves byte-for-byte equal layouts and structures for every existing layout test view with no key; flag off, the page drops the key |
| Overlapping nodes on the line | The step formula (call 6; run down, § Design review 587) keeps same-side nodes apart for any widths and heights; a no-overlap test over random widths (`no-overlap.test.ts` shape) |
| A dated node still drags (a skin's handle) | FE_01 marks dated nodes (`data-timeline`) and gives no grip; FE_02 refuses a drag start on them in `pointer.ts` and in a selection drag; the layout ignores a pin anyway |
| The kind colour as a 23px date fails contrast in light | FE_01 measures every kind colour and tone ink on each skin's node surface, light and dark, at Lc 45; a miss is fixed in the token with the maintainer's yes, never per screen |
| The plugin skill outgrows 8 KiB | T_02 measures; the core sentence is one line; a miss is reported with the bytes, never fixed by cutting other rules unasked |
| Budgets fail every task | Temporary and never blocking; in wave 2 the orchestrator raises them once on the merge |
| Live evals cost money or stall | Haiku, the default caps (`limits.ts`), never raised; the stall watchdog from node-overhaul T_05 |

---

## References

- `cortex-tasks/tracker.md` row N53; `design/mockups/timeline/` (README, pages, PNGs, `timeline.css`)
- `cortex-tasks/board/2026-11-16_board-ui_node-overhaul/PLAN.md` (§ House Rules, decisions 12, 14, 17, 25; D-099 to
  D-104) and its `CODE-MAP.md`
- `docs/decisions.md` D-009, D-021, D-023, D-099, D-100, D-103; `docs/principles.md`
- `docs/specification/api.md` (§ Migration 176-181, § Ledger v20 182-187, show_layout 133), `components.md`,
  `words.md`, `plugin.md`, `performance.md`
- `skills/vision-board/source/` (`core.md`, `differences.md`, `references/layouts.md`), `tests/evals/bot/`

---

## Success Criteria

- [ ] A node written with `timeline` in any of the four forms, or in a habit decision 2 names, is stored in its
      normalised form; anything else is refused with words naming the four forms
- [ ] A format-20 ledger migrates to 21 line for line (only `v` changes); a ledger in a newer format than the build opens
      read-only (D-103 4, the existing code path; proven with a line stamped 22)
- [ ] With the flag on, a container's dated nodes draw on one line across its top, in order, alternating, evenly
      spaced, years where they turn, a band behind equal dates; the other nodes below in the container's layout; run
      down, the vertical form
- [ ] A container with no dated node, and every board with the flag off, draws exactly as before
- [ ] The date heads every dated node in both skins, light and dark, passing Lc 45; titles 18px only there; entries
      drawn for `###` and bold leads only
- [ ] A dated node never drags; Move to moves it and it joins the target's line; links to and from it route
- [ ] `show_layout` reports the timeline in drawn order
- [ ] The skill's core has the sentence; `references/timeline.md` ships in both builds; the Haiku scenarios pass live
- [ ] `npm run verify`, `check`, `test`, `gen -- --check`, `test:pages` (once, VERIFY_01), `test:plugin` pass
- [ ] The gallery shows the dated node, entries and the line in both skins; `pattern.json` files and specification
      docs match the code
- [ ] The maintainer has used it and said yes before T_03 removes the flag
