---
task_name: Node Overhaul
created: 2026-11-16
completed:
status: in-progress
categories: [board-ui, board-format, board-actions, board-tokens, board-layout, board-app, board-agent]
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
| 1 | T_01 | 1 | strong | no | Principal API engineer — a contract is one source; a field that old files can't read or an agent can abuse never ships. | [Contract first](./T_01_contract-first.md) | Pending | |
| 2 | DESIGN_01 | 1 | strong | no | Principal product designer — a state nobody drew is a state that ships broken; every one gets a place before a line of code. | [The states nobody drew](./DESIGN_01_undrawn-states.md) | Pending | |
| 3 | T_02 | 2 | strong | no | Design-systems engineer — a colour has one home and a measured contrast; a skin is values, never a fork. | [Tokens, skin layer and fonts](./T_02_tokens-skins-fonts.md) | Pending | |
| 4 | FE_01 | 3 | strong | no | Principal front-end engineer for design systems — a pattern owns every state, updates in place and is reachable by keyboard and screen reader. | [The node's edges and the icon set](./FE_01_node-edges-and-icon-set.md) | Pending | |
| 5 | FE_02 | 4 | strong | no | Interaction engineer — a control never does two things depending on timing, and no click is lost or doubled. | [The board wires the edges](./FE_02_board-wires-the-edges.md) | Pending | |
| 6 | FE_03 | 5 | strong | no | Interaction engineer for messaging — words a person typed are never lost, and Enter never does the unexpected thing. | [One conversation box](./FE_03_one-conversation-box.md) | Pending | |
| 7 | FE_04 | 6 | strong | no | Design-systems engineer — a second skin proves the first was a system; if the node needs an `if (skin)`, the registry is wrong. | [The Command Lens skin](./FE_04_command-lens-skin.md) | Pending | |
| 8 | FE_05 | 7 | standard | no | — | [Zoom groups](./FE_05_zoom-groups.md) | Pending | |
| 9 | FE_06 | 8 | standard | no | — | [The selection bar and Z](./FE_06_selection-bar-and-z.md) | Pending | |
| 10 | FE_07 | 9 | standard | no | — | [One layout control](./FE_07_one-layout-control.md) | Pending | |
| 11 | BE_01 | 10 | strong | no | Graph-layout engineer — a layout is a pure function; a line that weaves round cards is a bug in the layout, not in the router. | [Flow branching and direction](./BE_01_flow-branching-and-direction.md) | Pending | |
| 12 | FE_08 | 11 | strong | no | Front-end engineer for sandboxed embeds — the app owns everything under its title bar, and the sandbox is never loosened. | [The app window](./FE_08_app-window.md) | Pending | |
| 13 | T_03 | 12 | strong | no | Prompt engineer — an instruction is code: every sentence earns its place and is proven on scenarios before it lands. | [The agent skill](./T_03_agent-skill.md) | Pending | |
| 14 | VERIFY_01 | 13 | strong | no | Operations lead who plans live events on boards like this all day — expects every mark to do what it shows, at any zoom, without reading a manual. | [Final verification](./VERIFY_01_testing.md) | Pending | |
| 15 | T_04 | 14 | strong | no | Staff engineer who owns deprecations — a removal is done only when nothing, not code, tests, words nor docs, still points at the old thing. | [Switch over and remove the old](./T_04_defaults-on.md) | Pending | |

**Status Values**: `Pending` | `In Progress` | `Completed` | `Blocked` | `Deferred`

**Wave**: execution order. Same number = safe to run in parallel. A wave completes before the next starts.

**Gates the orchestrator holds**: before wave 1, the kickoff (PLAN.md § Planner's calls, § Decision entries).
Before wave 3, the maintainer's yes on DESIGN_01's pages. Before wave 14, the maintainer's yes on the result.

---

## Shared Foundations

| Artifact | Created by | Consumed by |
|----------|-----------|-------------|
| `packages/format/src/view.ts` (`ViewNode.icon`, `ViewNode.tone`, `ICON_NAMES`, `TONES`, `SKINS`, `Skin`) | T_01 | T_02, FE_01, FE_02, FE_04, T_03 |
| `packages/format/src/ledger.ts` (acts `bookmark`, `unbookmark`, `skin`; a container's `seen`; `LEDGER_FORMAT` 20) | T_01 | FE_02, FE_06, FE_08 |
| `packages/format/src/flags.ts` (`nodeEdges`, `skins`, `layoutControl`, `flowDirection`, `appWindow`) | T_01 | every later task |
| `packages/actions/src/` (`bookmarksOn`, the fold of a board's skin and of a seen container) | T_01 | FE_02, FE_06 |
| `design/mockups/node-states/` (the agreed place of every undrawn state) | DESIGN_01 | FE_01, FE_04, FE_08 |
| `packages/tokens/src/tokens.css` (edge-mark, tone, answer and skin tokens; `[data-vb-skin]` values), `packages/tokens/fonts/` | T_02 | FE_01, FE_03, FE_04, FE_08 |
| `packages/ui/src/icons/` (`ICONS`, `icon(name, cls)`) | FE_01 | FE_02, FE_04, FE_06, FE_07, FE_08 |
| `packages/ui/src/skins.ts` (`SKIN_DEFS`: per skin, where the answer and each mark sit) | FE_01 | FE_02, FE_04, FE_08 |
| `packages/ui/src/menu/` (the fixed-size menu used by the number menu, the answer picker and right-click) | FE_01 | FE_02, FE_06, FE_07 |
| `packages/ui/src/note-bubble/` (the conversation box with its reply field) | FE_03 | FE_08 |

---

## File Ownership

| Wave | Owner | Files |
|------|-------|-------|
| 1 | T_01 | `packages/format/`, `packages/actions/`, `packages/client/`, `packages/cli/`, `packages/mcp/`, `apps/board/server/`, `apps/board/tests/`, `scripts/gen-*`, `docs/specification/api.md`, `docs/specification/api-reference.md` |
| 1 | DESIGN_01 | `design/mockups/node-states/`, `design/README.md` |
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

### T_01: Contract first
_Status:_ Pending  
_Notes:_ 

### DESIGN_01: The states nobody drew
_Status:_ Pending  
_Notes:_ 

### T_02: Tokens, skin layer and fonts
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
