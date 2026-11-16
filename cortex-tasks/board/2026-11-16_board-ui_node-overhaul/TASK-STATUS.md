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
| 1 | BE_02 | 1 | strong | yes | Principal data engineer for event-sourced systems — a migration that can lose or reorder one line is not a migration; it proves the same board line for line, keeps a backup and gives the same bytes when run twice. | [Ledger migration](./BE_02_ledger-migration.md) | Pending | |
| 2 | DESIGN_01 | 1 | strong | no | Principal product designer — a state nobody drew is a state that ships broken; every one gets a place before a line of code. | [The states nobody drew](./DESIGN_01_undrawn-states.md) | Completed | 8 pages × dark/light in `design/mockups/node-states/`; 10 open choices in its README for the wave-3 gate |
| 3 | T_01 | 2 | strong | no | Principal API engineer — a contract is one source; a record that needs a second reader or a field an agent can abuse never ships. | [Contract first](./T_01_contract-first.md) | Pending | |
| 4 | T_02 | 3 | strong | yes | Design-systems engineer — a colour has one home and a measured contrast; a skin is values, never a fork. | [Tokens, skin layer and fonts](./T_02_tokens-skins-fonts.md) | Pending | |
| 5 | BE_03 | 3 | strong | yes | Staff engineer for data formats — one format, one reader; a version branch kept just in case is a second format nobody tests. | [One format in the reader](./BE_03_one-format-reader.md) | Pending | |
| 6 | BE_04 | 3 | strong | yes | Application security engineer — an agent-supplied drawing is hostile until cleaned: only what the path grammar allows reaches a page, on add and on every read. | [The icon library](./BE_04_icon-library.md) | Pending | |
| 7 | FE_01 | 4 | strong | no | Principal front-end engineer for design systems — a pattern owns every state, updates in place and is reachable by keyboard and screen reader. | [The node's edges and the icon set](./FE_01_node-edges-and-icon-set.md) | Pending | |
| 8 | FE_02 | 5 | strong | no | Interaction engineer — a control never does two things depending on timing, and no click is lost or doubled. | [The board wires the edges](./FE_02_board-wires-the-edges.md) | Pending | |
| 9 | FE_03 | 6 | strong | no | Interaction engineer for messaging — words a person typed are never lost, and Enter never does the unexpected thing. | [One conversation box](./FE_03_one-conversation-box.md) | Pending | |
| 10 | FE_04 | 7 | strong | no | Design-systems engineer — a second skin proves the first was a system; if the node needs an `if (skin)`, the registry is wrong. | [The Command Lens skin](./FE_04_command-lens-skin.md) | Pending | |
| 11 | FE_05 | 8 | standard | no | — | [Zoom groups](./FE_05_zoom-groups.md) | Pending | |
| 12 | FE_06 | 9 | standard | no | — | [The selection bar and Z](./FE_06_selection-bar-and-z.md) | Pending | |
| 13 | BE_01 | 10 | strong | no | Graph-layout engineer — a layout is a pure function; a line that weaves round cards is a bug in the layout, not in the router. | [Flow branching and direction](./BE_01_flow-branching-and-direction.md) | Pending | |
| 14 | FE_07 | 11 | standard | no | — | [One layout control](./FE_07_one-layout-control.md) | Pending | |
| 15 | FE_08 | 12 | strong | no | Front-end engineer for sandboxed embeds — the app owns everything under its title bar, and the sandbox is never loosened. | [The app window](./FE_08_app-window.md) | Pending | |
| 16 | T_03 | 13 | strong | no | Prompt engineer — an instruction is code: every sentence earns its place and is proven on scenarios before it lands. | [The agent skill](./T_03_agent-skill.md) | Pending | |
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
| `packages/format/src/ledger.ts` (acts `bookmark`, `unbookmark`, `skin`, `ask` with `ASK_CONTEXTS`, `direction`; the `icon` event; a container's `seen` with `head`; `LEDGER_FORMAT` 20) | T_01 | BE_03, BE_04, FE_02, FE_03, FE_06, BE_01, FE_07, FE_08 |
| `packages/format/src/data-folder.ts` (`ICONS_DIR`, `ProjectFiles.icons`) and `openapi.json` (`list_icons` with `paths`, `add_icon`) | T_01 | BE_04, FE_02, T_03 |
| `packages/format/src/flags.ts` (`nodeEdges`, `skins`, `layoutControl`, `flowDirection`, `appWindow`) | T_01 | every later task |
| `packages/actions/src/` (`bookmarksOn`, `containerSeenDue`, the fold of a board's skin, a seen container, asked lines and directions) | T_01 | FE_02, FE_03, FE_06, BE_01, FE_07 |
| `design/mockups/node-states/` (the agreed place of every undrawn state) | DESIGN_01 | FE_01, FE_04, FE_08 |
| `packages/tokens/src/tokens.css` (edge-mark, answer and skin tokens; tone tints from `--vb-tone-h`; `[data-vb-skin]` values), `packages/tokens/fonts/` | T_02 | FE_01, FE_03, FE_04, FE_08 |
| `packages/format/src/icon-file.ts` (`ICON_BOX`, `ICON_LIMITS`, `iconPathProblem`, `iconFileProblem`, `iconPathsOf`), `apps/board/server/icons.ts`, `EngineOptions.icons` | BE_04 | FE_01, FE_02, T_03, VERIFY_01 |
| `packages/ui/src/icons/` (`ICONS`, `icon(name, cls, library?)`) | FE_01 | FE_02, FE_04, FE_06, FE_07, FE_08 |
| `packages/ui/src/skins.ts` (`SKIN_DEFS`: per skin, where the answer and each mark sit) | FE_01 | FE_02, FE_04, FE_08 |
| `packages/ui/src/menu/` (the fixed-size menu used by the number menu, the answer picker and right-click) | FE_01 | FE_02, FE_06, FE_07 |
| `packages/ui/src/note-bubble/` (the conversation box with its reply field, Ask now and `askContext`) | FE_03 | FE_06, FE_08 |
| The board-wide direction control (`apps/board/src/board/chrome/`) and the layout's reading of `directionOf` | BE_01 | FE_07 |

---

## File Ownership

| Wave | Owner | Files |
|------|-------|-------|
| 1 | BE_02 | `packages/format/src/migrate/`, `packages/format/src/index.ts`, `packages/format/src/data-folder.ts`, `packages/format/src/ledger-read.ts`, `packages/format/src/words/format-ledger.ts`, `packages/format/fixtures/legacy/`, new files in `packages/format/tests/` and `apps/board/tests/`, `packages/actions/tests/legacy-folds.test.ts`, `apps/board/server/` (`ledger-migrate.ts`, `ledger.ts`, `project.ts`, `editing.ts`, `engine/engine.ts`, `words/bin.ts`, `words/server-folders.ts`), `apps/board/bin/ledger-migrate.ts`, `package.json` (the script only), the page's read-only reason if it must change, `docs/specification/api.md`, `docs/specification/plugin.md` |
| 1 | DESIGN_01 | `design/mockups/node-states/`, `design/README.md` |
| 3 | T_02 | `packages/tokens/`, `apps/board/plugin/theme.css`, `apps/board/server/static.ts`, `apps/board/server/app.ts`, `apps/board/vite*.config.ts`, `apps/board/tests/plugin-theme.test.ts`, `tests/plugin/` except `contract/nclite/shared/`, `docs/specification/dependencies.md`, `docs/specification/plugin.md` |
| 3 | BE_03 | `packages/format/src/` except `migrate/`, `index.ts`, `icon-file.ts`, `words/format-icons.ts`; `packages/format/schema/`; `packages/format/fixtures/` except `legacy/`; existing files in `packages/format/tests/`, `packages/actions/tests/` and `apps/board/tests/` (not `plugin-theme.test.ts`) that hold a ledger line; `packages/actions/src/` (version tests only); `tests/plugin/contract/nclite/shared/`; the generated files; `docs/specification/api.md`, `docs/specification/api-reference.md` |
| 3 | BE_04 | `packages/format/src/icon-file.ts`, `packages/format/src/index.ts`, `packages/format/src/words/format-icons.ts`, `packages/format/tests/icon-file.test.ts`, `apps/board/server/` (`icons.ts`, `engine/`, `write-board.ts`, `write-insert.ts`, `project.ts`, `words/icons.ts`), `packages/agent/src/access-rules.ts` and its words and tests, new files in `apps/board/tests/`; its `plugin.md` paragraph goes to the orchestrator as a request and is applied after the wave |
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
_Status:_ Pending  
_Notes:_ 

### T_01: Contract first
_Status:_ Pending  
_Notes:_ 

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
_Status:_ Pending  
_Notes:_ 

### FE_02: The board wires the edges
_Status:_ Pending  
_Notes:_ 

### FE_03: One conversation box
_Status:_ Pending  
_Notes:_ 

### FE_04: The Command Lens skin
_Status:_ Pending  
_Notes:_ 

### FE_05: Zoom groups
_Status:_ Pending  
_Notes:_ 

### FE_06: The selection bar and Z
_Status:_ Pending  
_Notes:_ 

### FE_07: One layout control
_Status:_ Pending  
_Notes:_ 

### BE_01: Flow branching and direction
_Status:_ Pending  
_Notes:_ 

### FE_08: The app window
_Status:_ Pending  
_Notes:_ 

### T_03: The agent skill
_Status:_ Pending  
_Notes:_ 

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
