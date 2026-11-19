---
task_name: Folder chooser and setup guide
created: 2026-11-19
categories: [board-app, board-security, project-docs]
skills: [cortex-architecture, cortex-docs]
---

# Folder chooser and setup guide - Plan

## Problem Statement

1. The Open folder dialog is narrow and cuts long folder names. Its list shows only real folders under home (no links,
   no hidden folders, no `node_modules`, at most 500 per folder: `apps/board/server/folders.ts`), so people cannot find
   folders Finder shows them (an external drive, a share, a folder reached by a link).
2. There is no guide for setting Vision Board up on another machine: the board, its MCP server in each client, and
   the skill linked where each client loads skills globally. `packages/mcp/README.md` § Adding it to a client covers
   Kiro, Claude Code and Cursor only.

## Solution

1. Widen the dialog and let names wrap (T_01).
2. Add the system's own folder chooser beside ours: a "Choose in Finder…" button on macOS that opens the native
   chooser through our local server, which runs on the same Mac; our list stays as the fallback (T_01).
3. A folder the person picks there may be anywhere but hidden (D-110, appended by the orchestrator).
4. `SETUP.md` at the repo root, written for an agent on another machine to follow; the MCP entries stay in their one
   home, `packages/mcp/README.md`, which gains the clients it lacks (DOC_01).
5. A fresh agent follows `SETUP.md` in a test home folder and checks each ruling once (VERIFY_01).

## Decisions

Rulings from the maintainer (points 638-642, 2026-11-19). Agents never re-derive these from chat.

1. **Both choosers** (638-639): ours stays, wider, every name wrapping (never cut); the system's own chooser is
   offered beside it. On macOS only for now; elsewhere ours alone, no button. Inside nclite (the plugin) nothing
   changes now: a host folder-chooser hook is later.
2. **Any folder the person picks, except hidden** (639, D-110): a folder picked in the system's chooser opens wherever
   it is, unless any part of its real path starts with a dot. Everything else keeps today's rule: a path a page lists,
   types or sends, or an agent names, stays under home. Only a path the server's own chooser returned is trusted
   outside home: the server keeps it (in memory, for this run) and `open_project` accepts an outside-home path only
   when it is one of those. Once opened, such a folder joins Recent like any other (the recent file is the server's
   own, `~/.visionboard/recent.json`), so a recent folder outside home is trusted too, and the server may start in it.
   Home itself is still never a project.
3. **Setup guide** (640-642): `SETUP.md` at the repo root, steps an agent can follow and check one by one. MCP
   set-up stays in `packages/mcp/README.md` (its one home; SETUP links there). Clients: Claude Code, Claude Desktop,
   Kiro CLI, Kiro IDE, Kiro Crew, Codex. The ChatGPT app is named and left out, with why: it only connects to
   servers on the internet, and the board stays on the person's machine by design.
4. **Claude Desktop** (maintainer's note): quit the app, edit its MCP config file, reopen it; the guide says exactly
   that. Kiro: its config file. Each client's restart step is written out.
5. **Skills are links, never copies** (D-057): one link per client to the checkout's `skills/vision-board`.
6. **Carefully** (maintainer): no change to how agents are checked (`caller-folder.ts`), to the lock, or to the
   chat's permissions beyond what an outside-home folder strictly needs; each such need is a `REQUESTS` line, not
   a silent change.

## House Rules

- **Where**: `.claude/worktrees/app-window`, branch `spike/stage-apps`. Never the main checkout; never port 4466.
- **Ports**: T_01 8420, VERIFY_01 8720 (its test board) and 8730.
- **Home**: tests and checks never touch the person's real home folder: a temporary `HOME` for anything that writes
  there (the recent list, `~/.kiro`, `~/.claude`, `~/.codex`, `~/.agents`). The page tests' own recent list leak
  (they write into the real `~/.visionboard/recent.json`) is tracker material, not this set's.
- **Tests**: a task runs only the tests for what it changed; the full page suite runs once, at close, by the
  orchestrator. Page specs always with `--config tests/pages/playwright.config.ts`; baselines in
  `tests/pages/__screenshots__/`, renewed only for what a task changes, named in its notes.
- **Budgets** never block: report the measured number; the orchestrator raises them.
- **Orchestrator-only**: `docs/decisions.md`, steering, `package-lock.json`, `docs/specification/modules.md`,
  `cortex-tasks/tracker.md`, budget files, git.
- **No dependency** is added (the chooser is the system's own `osascript`, run with `execFile`, never a shell).

## Decision entry to append

## D-110 A folder the person picks in the system's chooser may be anywhere but hidden (amends api.md 110's home-only rule)
- **Date**: 2026-11-19 · **Status**: Accepted (maintainer, point 639) · **From**: points 635-639 (folders people could not find)
- **Decision**: The folder dialog keeps its own list (wider, names wrapping) and, on macOS, also opens the system's own folder chooser through the local board server. A folder the person picks there opens wherever it is, unless any part of its real path starts with a dot. Only a path the server's own chooser returned (or its own recent list then holds) is trusted outside home; a path a page lists, types or sends, or an agent names, stays under home as before. Home itself is never a project.
- **Why**: our list cannot show everything Finder does (drives, shares, links), so people could not find their folders; the person's own pick in the system's chooser is their intent, and only the server can vouch that a path came from it.
- **Task**: cortex-tasks/board/2026-11-19_board-app_folder-chooser-setup/T_01_chooser.md
