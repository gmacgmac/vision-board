# Export, Import and Print - Plan

> **Status Doc**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Created**: 2026-11-19 · **Tracker**: N56 · **Runs after**: the Timeline set closes
> (`cortex-tasks/board/2026-11-18_board-layout_timeline/`)

Start here: § Decisions is every ruling, so no agent reads the chat. Then `.kiro/steering/vision-board-proj.md`,
`docs/principles.md` (§ One action layer, § The contract comes first, § The board is a plugin) and
`docs/specification/plugin.md`.

---

## Problem Statement

A board can't leave its ledger or enter another, and can't be printed. The maintainer wants the most direct way, right
sized: neither over- nor under-built (2026-11-19, points 605-607).

---

## Decisions

All the maintainer's (2026-11-19) unless marked **planner**.

### Export
1. **Scope**: the whole board, or one container. **The current state only**, never the history.
2. **What**: the cards, containers and links as the very items an agent sends to `write_board`
   (`packages/format/schema/api/write-item.schema.json`), plus the person's answers (✓/✗, point 606). The
   conversations on notes are optional (a checkbox, off by default **planner**).
3. **The file**: `{ v, title, items, answers?, notes? }`. The wrapper is the only new shape; `items` reuse the write
   item schema. `v` is the export format's version (1). Extension `.vboard.json` **planner**.

### Import
4. **Through `write_board` in an `import` mode**, into a new board or into the current one, as if freshly written: new
   card numbers, no history, no ids kept.
5. **A chain by `v`**: older export versions upgrade step by step before the write, the same pattern as the ledger's
   (`packages/format/src/migrate/`). Today the chain is empty; the path exists.
6. **Conditioning**: anything not supported is dropped and named in the reply; anything required and missing gets its
   default; then the normal `write_board` checks.
7. **Agents export and import too** (point 608D): export through the reads they already have (`get_board` and
   `show_container` with `export: true` return the export file; no new tool); import through `write_board`'s
   `import` mode, which the tool description and the skill name. Import differs from a write only in what comes
   before the normal checks: the upgrade by `v`, the conditioning, fresh keys so the file's keys never clash with the
   writer's own, and a reply naming what was dropped. **Answers are the person's clicks** (board invariant): an
   import the person makes on the page applies them as the person's acts, after the cards; an agent's import carries
   the cards, links and notes and drops ✓/✗, naming them.
7a. **Places on import** (point 608E): import never merges into an existing container; every imported container is
   new. A card's place is kept relative to its own container (pins are region-local), and the containers themselves
   are placed by the layout beside what the board already holds, so nothing lands on top of existing cards.

### Print
8. **Scope**: the whole board or one container. **The container border** is a choice; off by default when printing a
   container.
9. **How**: a print stylesheet over the live page, then the browser's PDF. No PDF library. `print-color-adjust: exact`
   keeps colours; link paths also carry `fill="none"` as an attribute so a curve never fills.

### The host
10. **The standalone app is one host of the plugin** (D-074): build once in the plugin; each host supplies hooks.
11. **Three optional hooks on `BoardHost`** (`apps/board/src/board/host.ts`, beside `store?`, `pageChanged?`):
    `saveFile(name, type, bytes)`, `openFile(accept) → { name, bytes } | undefined`, `print()`. The standalone host
    implements them (a download, a file picker, `window.print`). A host without one: that menu item does not show.
12. **Where** (points 608-609): the board's ⋯ menu has its own section with Print, Export and Import; a container's
    settings (cog) menu, beside Reset places, has Print container and Export container. Where you click sets the
    scope, so one small dialog asks only: Print, the container border (off by default for a container); Export,
    include the conversations on notes; Import, into a new board or this one.

### Not built (right-sized)
History; merging into or de-duplicating existing cards; keeping card numbers; any PDF or image library; PNG/SVG
export; any format beyond the wrapper.

### Process
13. Contract first (T_01): the export schema, the `import` mode, the hooks in `plugin.md`, generated types, D-107.
14. One flag, `boardFiles` **planner**, off until the maintainer's yes, then removed (T_02).
15. Every sentence in a words file; every state, both skins, light and dark; a gallery entry for the dialog.

---

## House Rules

- **Where**: `.claude/worktrees/app-window`, branch `spike/stage-apps`. Never the main checkout; never port 4466.
- **Ports**: T_01 8410, BE_01 8510, FE_01 8610, VERIFY_01 8710, T_02 8810, T_03 8910.
- **Own worktrees** (wave 2): `npm run worktree -- files-<id-kebab> --base spike/stage-apps`; the orchestrator
  merges, checks and removes them.
- **Page specs** always with `--config tests/pages/playwright.config.ts`; baselines are tracked in
  `tests/pages/__screenshots__/`; renew only what a task changes, and say which.
- **Budgets** are temporary and never block: report the measured number; the orchestrator raises them once a wave.
- **Orchestrator-only**: `docs/decisions.md`, steering, `package-lock.json`, `docs/specification/modules.md`
  (`npm run map`), `cortex-tasks/tracker.md`, budget files.
- **Commits**: the orchestrator, per wave. Sub-agents run no git command that changes state.

---

## Kickoff answers

_Recorded by the orchestrator._

2026-11-19 (points 615-619, after wave 2): **615** Print offers light or dark, default the screen's theme. **617** the
whole conversation comes in whoever imports: every note and reply, each keeping its original author (an imported line
carries that author; no further format bump, it rides ledger 22); one "Imported" divider after the last imported
message, no per-message icons. **618-619** the conversation box: the board's one scrollbar pattern (a skinny thumb at
the scroller's far right edge, always visible, no rail, CSS only, as nclite's chat; for every board scroller);
padding inside the thread; labels "User" (the note's number on hover) and "Agent · <name> <id>" on one line, no wrap,
an ellipsis and the full name on hover only when cut; no "Asked now" or "Sent", only "Not sent" when a note has not
reached an agent. The import reply's dropped list worded for a person. All in FIX_01, before VERIFY_01.

2026-11-19 (points 613-614, after T_01): **613** export and import are the person's function: a person's import is
authorised by the browser session (as `retire_cards` is) and writes the containers, cards and links as the person
(those line kinds join `PERSON_TOO` for import; ledger format 22, a restamp, per D-103); no agent is needed. Agents keep
export and import as decision 7 says. **614** an agent's import drops the pins (the person's moves) and names them, as it
drops answers; the person's import keeps them. A radial container's `center` must round-trip (BE_01).

2026-11-19 (points 608-609): A D-107 yes (worded for 608D and 7a below before appending); B conversations off by
default; C `.vboard.json`; D agents export (through `get_board`/`show_container`) and import (through `write_board`'s
`import` mode), answers only from the person (decision 7); E places kept within each container, containers placed by
the layout, import never merges into an existing container (decision 7a); F flag `boardFiles`. 609: Export container
beside Print container (decision 12).

---

## Decision entry to append

```
## D-107 Export, import and print: the current state, through write_board and host hooks
- **Date**: 2026-11-19 · **Status**: Accepted (maintainer, points 605-607) · **From**: tracker N56
- **Decision**: A board or one container exports its current state as `{ v, title, items, answers?, notes? }`, the items being what `write_board` takes; no history. Import goes through `write_board` in an `import` mode, into a new board or the current one, as if freshly written: older versions upgrade by `v`, unsupported parts are dropped and named, missing required parts get defaults; answers apply only as the person's own acts. Print is a print stylesheet over the live page (board or container, the container border optional), then the browser's PDF. Agents export through `get_board` and `show_container` and import through the same mode; an import never merges into an existing container, and cards keep their places within their own container. Files and printing go through three optional host hooks (`saveFile`, `openFile`, `print`); a host without one shows no such item.
- **Why**: the most direct way that still lets older files in and lets nclite add the hooks when ready.
- **Task**: cortex-tasks/board/2026-11-19_board-app_export-import-print/TASK-STATUS.md
```
