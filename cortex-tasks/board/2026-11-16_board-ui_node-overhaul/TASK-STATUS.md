---
task_name: Node Overhaul
created: 2026-11-16
completed:
status: in-progress
categories: [board-ui, board-format, board-actions, board-tokens, board-layout, board-app, board-agent, board-security]
tracker: cortex-tasks/tracker.md#U14,U15,U16,U17,U18,U19,U20,N47,N51,N52,L5
---

# Node Overhaul - Task Status

> **Plan**: [PLAN.md](./PLAN.md)  
> **Created**: 2026-11-16

---

## Instructions for Agents

1. **Read PLAN.md first**, then the files its first paragraph names. `CODE-MAP.md` tells you where things are
2. **Read notes from completed tasks** before starting yours
3. **Respect the Wave column** — do not start a task whose wave has not been reached
4. **Reuse Shared Foundations** — check that table before writing a helper, type, or component;
   if it is listed, import it, do not reinvent it
5. **Touch only the files you own** (your task's *Files to modify*). Need a change elsewhere? List it
   under `REQUESTS` in your return block — the orchestrator routes it
6. **If you need to deviate, STOP and inform the user**
7. **Update frontmatter `status`**: `planned` → `in-progress` when the first task starts. Closing the
   set (`completed`) is the orchestrator's job, after the full gates
8. **Update your row** in the Task List table below when you finish
9. **Add implementation notes** to your task file and brief notes here. Re-run? Add a `Run N:`
   line here and a `### Run N` block in your task file; never overwrite an earlier run
10. **No git commands that change state** — the orchestrator commits each checked task
11. **Work in `.claude/worktrees/app-window`** only; never the main checkout, never port 4466; use your
    task's `VB_TEST_PORT` (PLAN.md § House Rules)

---

## Task List

| # | ID | Wave | Model | Own worktree | Persona | Task | Status | Notes |
|---|-----|------|-------|--------------|---------|------|--------|-------|
| 1 | BE_02 | 1 | strong | yes | Principal data engineer for event-sourced systems — a migration that can lose or reorder one line is not a migration; it proves the same board line for line, keeps a backup and gives the same bytes when run twice. | [Ledger migration](./BE_02_ledger-migration.md) | Completed | Chain, runner, command, newer read-only; 2 existing tests need `backups` (REQUESTS) |
| 2 | DESIGN_01 | 1 | strong | no | Principal product designer — a state nobody drew is a state that ships broken; every one gets a place before a line of code. | [The states nobody drew](./DESIGN_01_undrawn-states.md) | Completed | 8 pages × dark/light in `design/mockups/node-states/`; 10 open choices in its README for the wave-3 gate |
| 3 | T_01 | 2 | strong | no | Principal API engineer — a contract is one source; a record that needs a second reader or a field an agent can abuse never ships. | [Contract first](./T_01_contract-first.md) | Completed | Format 20 and its step; all checks green but page weight 200.7/200 KB (needs a ruling) and `npm run map` |
| 4 | T_02 | 3 | strong | yes | Design-systems engineer — a colour has one home and a measured contrast; a skin is values, never a fork. | [Tokens, skin layer and fonts](./T_02_tokens-skins-fonts.md) | Completed | Tokens, skins.css, four OFL fonts vendored (whole files, pinned commits, SHA-256 held by fonts.test.ts); 360-hue tone sweep passes in Chromium and WebKit. Step 5a deviation: nclite refuses @font-face, so the plugin brings no font yet (option C now, A later; maintainer ruling). Plugin board.css 21,951 of 22,000. tokens.css diff in task notes. |
| 5 | BE_03 | 3 | strong | yes | Staff engineer for data formats — one format, one reader; a version branch kept just in case is a second format nobody tests. | [One format in the reader](./BE_03_one-format-reader.md) | Completed | One format: version branches and LEDGER_FORMATS gone; an older line is refused with migrate words; fixtures and perfLedger equal the frozen files migrated. Gate: write-board.ts `item`, checkSame compares against the in-memory upgrade. |
| 6 | BE_04 | 3 | strong | yes | Application security engineer — an agent-supplied drawing is hostile until cleaned: only what the path grammar allows reaches a page, on add and on every read. | [The icon library](./BE_04_icon-library.md) | Completed | Shared check `icon-file.ts`, handlers `icons.ts` (add once per name, every read checked, first use writes the line), `EngineOptions.icons`, access row; `list_icons` takes no credential. |
| 6b | PERF_01 | 3 | strong | yes | Web performance engineer — start weight is what makes a tool feel slow; it is cut by loading later, never by moving the line. | [Room in the start weight](./PERF_01_start-weight.md) | Completed | Run 2: 187.5 KB at start (2 files) from one start chunk, vb-app-frame and vb-image-view on first use, no upgrade chain in the page or view; engine-hooks fixed. Plugin CSS room not found (ruling: temporary budget until T_04 deletes the old footer CSS). |
| 7 | FE_01 | 4 | strong | no | Principal front-end engineer for design systems — a pattern owns every state, updates in place and is reachable by keyboard and screen reader. | [The node's edges and the icon set](./FE_01_node-edges-and-icon-set.md) | Completed | Edges behind nodeEdges (byte-for-byte off), icon set + library check, SKIN_DEFS, nodeMarks, menus; plugin CSS 23,753 (budget 24,000, temporary); page 193.9 KB; tokens.css `--vb-focus-edge` |
| 8 | FE_02 | 5 | strong | no | Interaction engineer — a control never does two things depending on timing, and no click is lost or doubled. | [The board wires the edges](./FE_02_board-wires-the-edges.md) | Completed | Marks, menus, boxes, tips and keys wired behind nodeEdges; flag renamed Bookmark (key B); a container's pill cleared on screen (N47 closed); library icons; skin rows. Page 196.77 KB; plugin view.js 189,819/190,000 gz. Baselines renewed (listed in the task). |
| 9 | FE_03 | 6 | strong | no | Interaction engineer for messaging — words a person typed are never lost, and Enter never does the unexpected thing. | [One conversation box](./FE_03_one-conversation-box.md) | Completed | Run 2: Ask now reaches the chat panel's agent (server hears the `ask`, notes alone, no Send); one box beside a node (`placeBeside`, node-box.css) for conversation, proposal and history; history box as designed with withdrawn rows; no group pin with edges. Page 199.88/210 KB; plugin JS 193,679/200,000, CSS 24,511/26,000. |
| 10 | FE_04 | 7 | strong | no | Design-systems engineer — a second skin proves the first was a system; if the node needs an `if (skin)`, the registry is wrong. | [The Command Lens skin](./FE_04_command-lens-skin.md) | Completed | Command Lens is the skins row plus node-plate.css, no skin name in node code; switch only on nodes that ask; plate is the drag handle; menus and selection bar on `--vb-glass-*`; tone (point 366) in both skins. Plate marks keep the node scale (no minimum; maintainer to confirm). Follow-ups to the gate: proposal chip press, box headers and tips on plate/glass tokens. |
| 11 | FE_05 | 8 | standard | no | — | [Zoom groups](./FE_05_zoom-groups.md) | Completed | Marks grow in place under 14px (`--vb-mark-grow`, steps of 1.2); history and proposal boxes keep one size; the conversation box scales to 0.75; zoom table in components.md; 2 conversation-box baselines renewed |
| 12 | FE_06 | 9 | standard | no | — | [The selection bar and Z](./FE_06_selection-bar-and-z.md) | Completed | Z failed only with a container's title line focused and a selection (selection now wins); bar gains Bookmark all, Save for later, Width behind nodeEdges; selection Comment = the conversation box with Ask now; bar steps aside for a node's menu or box |
| 13 | BE_01 | 10 | strong | no | Graph-layout engineer — a layout is a pure function; a line that weaves round cards is a bug in the layout, not in the router. | [Flow branching and direction](./BE_01_flow-branching-and-direction.md) | Completed | Run early beside FE_03. Branches on rows behind `flowBranches` (rows never cross more than stacked); a branching row or column laid out as a flow; flow down behind `flowDirection`; board-wide direction in "⋯" (FE_07 moves it to the header control); `show_layout` both ways; `EDGE_ROW_GAP` 40 with nodeEdges. For FE_07: a container choice redraws through `DrawDeps.direction`, write the act with `region`. Router jog on a straight main line left for the tracker. |
| 14 | FE_07 | 11 | standard | no | — | [One layout control](./FE_07_one-layout-control.md) | Completed | One button + the existing popover behind `layoutControl`; a flow's Across/Down/Auto write the container's `direction` act (`places.ts` `setDirection`); gallery "One layout control" compares the six layouts. Board-wide direction still in "⋯" (header move requested) |
| 15 | FE_08 | 12 | strong | no | Front-end engineer for sandboxed embeds — the app owns everything under its title bar, and the sandbox is never loosened. | [The app window](./FE_08_app-window.md) | Pending | |
| 16 | T_03 | 13 | strong | no | Prompt engineer — an instruction is code: every sentence earns its place and is proven on scenarios before it lands. | [The agent skill](./T_03_agent-skill.md) | Blocked | Skill v3.34 (one flow per container, icons, tone, skin, direction, bookmark, Ask now), 44,614 bytes after moving old history to NOTES; plugin skill unchanged; scenarios 44 `linked-pipeline`, 45 `architecture-icons` (standalone); dry 88/88 and 33/33. Live run: CLI sign-in expired, $0, no model ran: needs a login and a rerun (and `--standalone` for 45). |
| 17 | VERIFY_01 | 14 | strong | no | Operations lead who plans live events on boards like this all day — expects every mark to do what it shows, at any zoom, without reading a manual. | [Final verification](./VERIFY_01_testing.md) | Pending | |
| 18 | T_04 | 15 | strong | no | Staff engineer who owns deprecations — a removal is done only when nothing, not code, tests, words nor docs, still points at the old thing. | [Switch over and remove the old](./T_04_defaults-on.md) | Pending | |

**Status Values**: `Pending` | `In Progress` | `Completed` | `Blocked` | `Deferred`

**Wave**: execution order. Same number = safe to run in parallel. A wave completes before the next starts.

**Gates the orchestrator holds**: before wave 1, the kickoff (PLAN.md § Planner's calls, § Decision entries, § Ledger
review answers; D-099 to D-103 appended on the maintainer's yes). Before wave 4 (FE_01), the maintainer's yes on
DESIGN_01's pages and its open choices (the "wave-3 gate" its notes name). Before wave 15 (T_04), the maintainer's yes
on the result. Waves 1 and 3 run tasks in their own git worktrees, merged after the wave (PLAN.md § House Rules).

---

## Shared Foundations

| Artifact | Created by | Consumed by |
|----------|-----------|-------------|
| `packages/format/src/migrate/` (`UpgradeStep`, `UpgradeStop`, `UPGRADE_STEPS`, `upgradeLine`, `upgradeLines`: the step interface T_01 adds 19-to-20 to) | BE_02 | T_01, BE_03, VERIFY_01 |
| `apps/board/server/ledger-migrate.ts` (the runner: lock, backup, atomic replace; run on a writable open), `npm run ledger:migrate` | BE_02 | T_01, BE_03, VERIFY_01 |
| `packages/format/fixtures/legacy/` (today's fixtures, the mixed-format ledger and their frozen folds; never edited) | BE_02 | T_01, BE_03, VERIFY_01 |
| `packages/format/src/view.ts` (`ViewNode.icon`, `ViewNode.tone`, `ICON_NAMES`, `isLibraryIcon`, `TONES`, `SKINS`, `Skin`, `Region.direction`, `directionOf`) | T_01 | T_02, BE_04, FE_01, FE_02, FE_04, BE_01, FE_07, T_03 |
| `packages/format/src/ledger.ts` (acts `bookmark`, `unbookmark`, `skin`, `ask` with `ASK_CONTEXTS`, `direction`; the `icon` event; `LEDGER_FORMAT` 20; a `seen` names a card or a board, never a container: point 308) | T_01 | BE_03, BE_04, FE_02, FE_03, FE_06, BE_01, FE_07, FE_08 |
| `packages/format/src/data-folder.ts` (`ICONS_DIR`, `ProjectFiles.icons`) and `openapi.json` (`list_icons` with `paths`, `add_icon`) | T_01 | BE_04, FE_02, T_03 |
| `packages/format/src/flags.ts` (`nodeEdges`, `skins`, `layoutControl`, `flowDirection`, `appWindow`) | T_01 | every later task |
| `packages/actions/src/` (`bookmarksOn`, the fold of a board's skin, asked lines and directions; no container seen, point 308) | T_01 | FE_02, FE_03, FE_06, BE_01, FE_07 |
| `design/mockups/node-states/` (the agreed place of every undrawn state) | DESIGN_01 | FE_01, FE_04, FE_08 |
| `packages/tokens/src/tokens.css` (edge-mark, answer and skin tokens; tone tints from `--vb-tone-h`; `[data-vb-skin]` values), `packages/tokens/fonts/` | Completed | Tokens, skins.css, four OFL fonts vendored (whole files, pinned commits, SHA-256 held by fonts.test.ts); 360-hue tone sweep passes in Chromium and WebKit. Step 5a deviation: nclite refuses @font-face, so the plugin brings no font yet (option C now, A later; maintainer ruling). Plugin board.css 21,951 of 22,000. tokens.css diff in task notes. |
| `packages/format/src/icon-file.ts` (`ICON_BOX`, `ICON_LIMITS`, `iconPathProblem`, `iconFileProblem`, `iconPathsOf`), `apps/board/server/icons.ts`, `EngineOptions.icons` | Completed | Shared check `icon-file.ts`, handlers `icons.ts` (add once per name, every read checked, first use writes the line), `EngineOptions.icons`, access row; `list_icons` takes no credential. |
| `packages/ui/src/icons/` (`ICONS`, `icon(name, cls, library?)`) | FE_01 | FE_02, FE_04, FE_06, FE_07, FE_08 |
| `packages/ui/src/skins.ts` (`SKIN_DEFS`: per skin, where the answer and each mark sit) | FE_01 | FE_02, FE_04, FE_08 |
| `packages/ui/src/menu/` (the fixed-size menu used by the number menu, the answer picker and right-click) | FE_01 | FE_02, FE_06, FE_07 |
| `packages/ui/src/note-bubble/` (the conversation box with its reply field, Ask now and `askContext`) | FE_03 | FE_06, FE_08 |
| The board-wide direction control (`apps/board/src/board/chrome/`) and the layout's reading of `directionOf` | Completed | Run early beside FE_03. Branches on rows behind `flowBranches` (rows never cross more than stacked); a branching row or column laid out as a flow; flow down behind `flowDirection`; board-wide direction in "⋯" (FE_07 moves it to the header control); `show_layout` both ways; `EDGE_ROW_GAP` 40 with nodeEdges. For FE_07: a container choice redraws through `DrawDeps.direction`, write the act with `region`. Router jog on a straight main line left for the tracker. |

---

## File Ownership

| Wave | Owner | Files |
|------|-------|-------|
| 1 | BE_02 | `packages/format/src/migrate/`, `packages/format/src/index.ts`, `packages/format/src/data-folder.ts`, `packages/format/src/ledger-read.ts`, `packages/format/src/words/format-ledger.ts`, `packages/format/fixtures/legacy/`, new files in `packages/format/tests/` and `apps/board/tests/`, `packages/actions/tests/legacy-folds.test.ts`, `apps/board/server/` (`ledger-migrate.ts`, `ledger.ts`, `project.ts`, `editing.ts`, `engine/engine.ts`, `words/bin.ts`, `words/server-folders.ts`), `apps/board/bin/ledger-migrate.ts`, `package.json` (the script only), the page's read-only reason if it must change, `docs/specification/api.md`, `docs/specification/plugin.md` |
| 1 | DESIGN_01 | `design/mockups/node-states/`, `design/README.md` |
| 3 | Completed | Tokens, skins.css, four OFL fonts vendored (whole files, pinned commits, SHA-256 held by fonts.test.ts); 360-hue tone sweep passes in Chromium and WebKit. Step 5a deviation: nclite refuses @font-face, so the plugin brings no font yet (option C now, A later; maintainer ruling). Plugin board.css 21,951 of 22,000. tokens.css diff in task notes. |
| 3 | Completed | One format: version branches and LEDGER_FORMATS gone; an older line is refused with migrate words; fixtures and perfLedger equal the frozen files migrated. Gate: write-board.ts `item`, checkSame compares against the in-memory upgrade. |
| 3 | Completed | Shared check `icon-file.ts`, handlers `icons.ts` (add once per name, every read checked, first use writes the line), `EngineOptions.icons`, access row; `list_icons` takes no credential. |
| — | orchestrator | `docs/decisions.md`, `docs/principles.md`, `.kiro/steering/vision-board-proj.md`, `AGENTS.md`, `CLAUDE.md`, `package-lock.json`, `docs/specification/modules.md`, `cortex-tasks/tracker.md` |

Later waves hold one task each; a task's *Files to modify* is its ownership.

---

## Requests

| Request | From | Need | Routed to | Status |
|---------|------|------|-----------|--------|
| | | | | |

**Status Values**: `Open` | `Done` | `Closed`

---

## Implementation Notes

### BE_02: Ledger migration
_Status:_ Completed  
_Notes:_ Run 1. Frozen first (11:08): `fixtures/legacy/` (4 fixtures, `perf`, `mixed` 251 lines formats 7-19) with
`.fold.json` beside each; `legacy-folds.test.ts` holds both the as-is and the migrated fold. For T_01: append your
19-to-20 step to `FORMAT_STEPS` (`packages/format/src/migrate/steps.ts`); `migrate.test.ts` fails until a path exists;
map renamed fold keys (`flags`) in `legacy-folds.test.ts`, never the frozen files. For BE_03: old names live as literals
in `steps.ts`, so `RENAMED_MODES`, `LEDGER_FORMATS` and the version branches can go; delete the "read as it lies" half
of `legacy-folds.test.ts`. Runner: `apps/board/server/ledger-migrate.ts` (`migrateHeld`, `migrateLedger`,
`migrateOnOpen`, `planMigration`, `undoMigration`); `Ledger.newer()` and `readOnlyWords` in `ledger.ts`. A stop is
logged and the ledger opens as before. Requests: `backups` in `access-layout.test.ts` and `data-folder.test.ts`,
`npm run map`, the format README's name list.

### T_01: Contract first
_Status:_ Completed  
_Notes:_ Run 1. Format 20: `bookmark`/`unbookmark` (step 19 in `FORMAT_STEPS` renames `flag`/`unflag`; `bookmarks.ts`
`bookmarksOn`, `LedgerState`/`BoardState.bookmarks`), `BoardEvent.skin` + `skin` act (`skins.ts` `skinOf`, a rename
keeps it), `ViewNode.icon`/`tone` (`ICON_NAMES` 50, `isLibraryIcon`, `TONES`, `isTone`), `Region.direction` + `direction`
act (`directionOf` in `view.ts`), the `icon` line (`LedgerIndex.icons`), `ICONS_DIR`, a container `seen`
(`containerSeenDue`, `unseenContainerReplies`), the `ask` act (`asked.ts` `askedBy`; it wakes `check_responses`),
`list_icons`/`add_icon` stubs in `engine/reads.ts`/`writes.ts` for BE_04 to replace, flags off, `appStage` off. For BE_03:
the reader still takes 2-20 where they lie except `flag`; `legacy-folds.test.ts` maps `flags`. For FE_02: `flag-flow.ts`
sends `bookmark` only; the rest of the page still says flag. `verify` fails the page weight (200.7 KB, HEAD 198.7 KB):
needs the maintainer's ruling. Requests: `npm run map`; files touched outside the list are named in the task's notes.
Point 308 (after the run): the container `seen` (`{ board, region, head }`, `containerSeenDue`, `unseenContainerReplies`,
`seenContainers`) was taken out of format 20; a container's pill clears on the page only (FE_02 step 8, PLAN.md).

### DESIGN_01: The states nobody drew
_Status:_ Completed  
_Notes:_ Pages in `design/mockups/node-states/` (answers, places, input, app; default and Command Lens; dark and light),
shared styles `default.css`, `command-lens.css`, `default-app.css`, `command-lens-app.css`. Its `README.md` maps every
state and part of today's node (`pattern.json`) to its place, states the rules the drawings hold (24 px hit areas
around 22 px marks, colour never alone, an agent icon's drawing rules) and lists 10 open choices the maintainer answers
before wave 3. Recommended: proposal on the disc (Command Lens: plate chip plus the outlined half); handover and
Awaiting on the bottom edge / in the plate; ◆ at rest; group note on every member's notes mark; an app's bookmark
notched inside the bar; Ask now takes this node's queued notes. For FE_01/FE_04/FE_08: Command Lens's conversation box,
history box and right-click were never drawn on its skin page; they are on `command-lens-input-*`. New sentences on
the pages are drafts for the words files. Kickoff changes (node-scoped Ask now, agent icons, no legacy footer) are
drawn.

### T_02: Tokens, skin layer and fonts
_Status:_ Pending  
_Notes:_ 

### BE_03: One format in the reader
_Status:_ Pending  
_Notes:_ 

### BE_04: The icon library
_Status:_ Pending  
_Notes:_ 

### FE_01: The node's edges and the icon set
_Status:_ Completed  
_Notes:_ Run 1. For FE_02: render with `{ edges: SKIN_DEFS[skin], icons: iconLibrary(list_icons paths) }`, pass
`CardConditions.ver`; marks are `[data-mark=number|answer|badge|notes]` (switch: `tick`, `cross`); open the history
box (badge, `aria-controls`), the proposal box and the menus (`numberMenu`, `answerPicker`, `contextMenu`, rows by
`data-menu-act`) yourself: no popover is bound on marks; set `data-saving|data-failed|data-locked` on a pressed mark;
add `.vb-node-grip` to `HANDLE`; show `data-tip` after a 2 s hover; the picker needs Left/Right; put `data-vb-edges` on
the board root (fuchsia). For FE_04: the command-lens row draws a `.vb-node-plate` and a `.vb-mark-switch`, laid out in
flow only. App cards keep the old card (FE_08). `legacy-folds.test.ts` now allows format-20 lines after the frozen
gallery part. `npm run map` needed.

### FE_02: The board wires the edges
_Status:_ Completed  
_Notes:_ Run 1. For FE_03: the notes mark and C call `act(id, 'comment')` (`cards/mark-acts.ts` `press`, `run`), today's bubble; swap there. For FE_04: the switch halves (`data-mark=tick|cross`) already answer on a press (`mark-acts.ts` `answer`), with the same moments. For FE_05: menus and tips sit on the stage, placed by `mark-place.ts` from their anchor on every `vp.onApply` (`edges.place()`); the history and proposal boxes are still inside the node and scale. For FE_06: one menu or box at a time is `mark-acts.ts` `open`. `FreshCount.seq` added (`page-conditions.ts`). Requests: `npm run map`; `menu-template.ts` comment says the page uses `openMenu`; `fresh.ts` comment says a click on the frame changes nothing.

### FE_03: One conversation box
_Status:_ Completed (run 2)  
_Notes:_ Run 1. For FE_06 and FE_08: the box is `<vb-note-bubble>` mode `conversation` (`loadConversation` before the
first show); its page code is `notes/note-box.ts` (`boxView`, `addNote`, `askNow`, loaded by `loadNoteBox`), and Ask now's
board side `controller/ask-now.ts` (`BoxDeps`: blocked, listening, ask, looked). A selection's Ask now needs a group
target: `Open.group` already drives the group tab's writes. Tabs are per group of nodes. Requests: the plugin view.js
raise (192,725 gz) and `npm run map`. Not done: waking an idle chat-panel agent on an `ask` (tracker row).

Run 2: `BoxDeps` gains `asked`; every box beside a node is placed by `cards/mark-place.ts` `placeBeside` (with `nodeReach`)
and styled by `packages/ui/src/node/node-box.css` (`.vb-node-box`): FE_04, FE_06 and FE_08 reuse both, never a second
box. The server hands the board's chat session an `ask` (`chat-sessions.ts` `hearAsk`); `replyScope` carries `asked`. For
FE_05: the conversation box is on the stage (one size), the history and proposal boxes in the node (scaled).

### FE_04: The Command Lens skin
_Status:_ Pending  
_Notes:_ 

### FE_05: Zoom groups
_Status:_ Completed  
_Notes:_ `viewport.ts` (`markGrow`, `boxScale`, `markOn`), `mark-boxes.ts` (counter-scale), `notes.ts` `place`, `node-edges.css`/`node-box.css`. For FE_06: the selection bar was already one size (`pillGap`); no change. For FE_04: plate marks are not scaled. Requests: `npm run map`; FE_04 decides a plate minimum.

### FE_06: The selection bar and Z
_Status:_ Completed  
_Notes:_ For FE_07/FE_08: the bar's extras are `EDGE_COMMANDS` rows (`commands.ts`), acts in `selection/bar-acts.ts` (`run` one step, one act per node); `SelectionFlowDeps.covered` hides the bar for a node's open menu/box; a selection's conversation box is `notes.group` with several `anchor`s. Requests: `npm run map`; restore 18 unrelated gallery baselines my `--update-snapshots` rewrote.

### FE_07: One layout control
_Status:_ Completed  
_Notes:_ Run 1. Behind `layoutControl` (+ `flowDirection` for the direction row). Rail is default, so Right opens the popover from the button. Requests: `npm run map`; move the board-wide Flows rows from `ToolbarMenu.svelte` into the header; restore nothing (no baselines rewritten).

### BE_01: Flow branching and direction
_Status:_ Pending  
_Notes:_ 

### FE_08: The app window
_Status:_ Pending  
_Notes:_ 

### T_03: The agent skill
_Status:_ Blocked (live eval only)  
_Notes:_ Run 1. New text sits only in sections `skill-edits.ts` replaces, so the plugin skill is byte for byte the same (8,174/8,192) and a host's bot (no `list_icons`/`add_icon`) reads none of it. Checks `linkedInOneFlow`, `fewCrossLinks` exported from `scenarios/linked-pipeline.ts`. The approved live run stopped at the CLI's expired sign-in ($0); rerun after `/login`, plus `--standalone` for scenario 45. Requests: the plugin's `node.icon` input description names tools that bot lacks.

### VERIFY_01: Final verification
_Status:_ Pending  
_Notes:_ 

### T_04: Switch over and remove the old
_Status:_ Pending  
_Notes:_ 

---

## Completion Checklist

- [ ] All implementation tasks complete
- [ ] Verification task complete
- [ ] Every request `Done` or `Closed`
- [ ] LOG entry created (see below)

---

## On Completion

When ALL tasks are done and the project's full gates pass. Done once, by the orchestrator.

1. Update frontmatter: `status: completed` and `completed: YYYY-MM-DD`
2. Append the set LOG entry — one line, terminated with a newline, append-only:
   ```
   [[YYYY-MM-DD HH:MM]] [board-ui] Completed set: Node Overhaul → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/TASK-STATUS.md]]
   ```
3. Delete the tracker rows named in `tracker:` that the set finished, and add the follow-up rows T_04 lists.
4. Commit the close.
5. `cortex-garden` picks the entries up from `LOG.md` later. Nothing here writes to `AUDITED.md`.
