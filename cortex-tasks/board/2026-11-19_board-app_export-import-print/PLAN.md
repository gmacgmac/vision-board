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
7. **Answers are the person's clicks** (board invariant): an import the person makes on the page applies them as the
   person's acts, after the cards. **Planner**: an agent's `write_board` in `import` mode drops `answers` and says so,
   so ✓/✗ never come from an agent.

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
12. **One entry each** (Export, Import, Print) on the board menu and the container's menu, opening one small dialog
    with the choices.

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
- **Ports**: T_01 8410, BE_01 8510, FE_01 8610, VERIFY_01 8710, T_02 8810.
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

---

## Decision entry to append

```
## D-107 Export, import and print: the current state, through write_board and host hooks
- **Date**: 2026-11-19 · **Status**: Accepted (maintainer, points 605-607) · **From**: tracker N56
- **Decision**: A board or one container exports its current state as `{ v, title, items, answers?, notes? }`, the items being what `write_board` takes; no history. Import goes through `write_board` in an `import` mode, into a new board or the current one, as if freshly written: older versions upgrade by `v`, unsupported parts are dropped and named, missing required parts get defaults; answers apply only as the person's own acts. Print is a print stylesheet over the live page (board or container, the container border optional), then the browser's PDF. Files and printing go through three optional host hooks (`saveFile`, `openFile`, `print`); a host without one shows no such item.
- **Why**: the most direct way that still lets older files in and lets nclite add the hooks when ready.
- **Task**: cortex-tasks/board/2026-11-19_board-app_export-import-print/TASK-STATUS.md
```
