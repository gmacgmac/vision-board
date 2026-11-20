---
task_name: Folders, labels, chat text and print through the host
created: 2026-11-20
categories: [board-app, board-security, board-layout, board-agent]
skills: [cortex-architecture, cortex-docs]
---

# Folders, labels, chat text and print through the host - Plan

## Problem Statement

Five rulings from the maintainer (points 646-654, 2026-11-19/20) and one handover from nclite:
which folders a Finder pick may open; agents' board tools hunting upward for a board; link labels that shrink to a
bare dot; the skill teaching "then" as a label; the agent's chat text smaller than the person's; and nclite's new
`print(ask)` hook, which replaces the board's own page rules.

## Decisions

1. **Which folders open (651, D-111, amends D-110).** Allowed: the person's home folder itself and everything under
   it; anything under `/Volumes/` (drives, network shares); `/Users/Shared`. Refused: everything else (system
   folders: `/System`, `/Library`, `/Applications`, `/usr`, `/private`, `/opt` and the rest), `/`, `/Users`, other
   people's home folders, and any hidden folder (a part starting with a dot). D-110's trust rule stands: outside home
   only a Finder pick or the server's own recent list. Home itself is now allowed when chosen (list or Finder).
2. **No hunting (652, D-111).** The board's tools work on the board the board has open, nowhere else. An agent's
   folder is exactly where its client starts it (`VB_PROJECT`, else its working folder); the MCP server never walks up
   to find another board. The board accepts an agent working in its open folder or a folder inside it (today's
   `caller-folder.ts` rule), and answers `wrong-folder` otherwise. This limits the board's tools only: what an agent
   reads elsewhere on the computer is its client's permissions, untouched. SETUP.md says to start agents in the
   project's folder (or one inside it).
3. **Link labels (646).** Labels stay as now: a word in a canvas tag on the line. Placement order: on a straight piece
   of the line (today); else just above or below a piece of the line, inside the gap between the two cards, covering
   no card and no other label; else centred on the elbow's upright piece. Only when none fits: a short tag, the first
   words and an ellipsis, a hairline border, the whole label on hover or focus (today's marker behaviour), never a
   bare dot. Cards never move. In print every label is drawn whole. Mockup: `design/mockups/link-labels/` (its
   two-line wrap is not wanted: labels are single words; its curves are not the board's elbows).
4. **The skill (647).** One sentence where the skill speaks of link labels: label a link only when it means more than
   "next" ("blocks", "feeds", "needs"), in short, simple words; the example stops using "then". `npm run eval:bot`
   passes before it merges.
5. **Chat text (648).** The agent's replies are the same size as the person's (the chat's own text size). Card body
   text stays 13px (654).
6. **Print through the host (nclite handover).** The board calls `await host.print({ title, content, look,
   orientation })` (nclite `shared/plugin-host.ts` `PrintAsk`, `PrintLook`, `PrintOrientation`): no `content` (the
   pane as it stands); "Print in" maps to `look`; the fitted page to `orientation`. The board drops its own `@page`
   names and `data-vb-print-theme`, and sets nothing on `<html>`. A rejection's sentence is shown through `notify`.
   The item is drawn only when `host.print` exists. `saveFile` and `openFile` stay; an import checks the file's size
   first: over the host's import limit (1 MiB in nclite today) it is refused with words before posting. The standalone
   page's own `print` hook implements the same ask (its paper rules, margins and theme live in the standalone host).

## House Rules

- **Where**: wave tasks in their own worktrees (`npm run worktree -- <name> --base spike/stage-apps`), merged into
  `.claude/worktrees/app-window` (branch `spike/stage-apps`) by the orchestrator. Never the main checkout.
- **Never** port 4466; never the real home folder (a temporary `HOME` for anything that writes there); never a real
  Finder dialog in tests.
- **Tests**: a task runs only the tests for what it changed; the full page suite runs once, at close, by the
  orchestrator. Page specs with `--config tests/pages/playwright.config.ts`; renew only the baselines you change.
- **Budgets** never block: report the measured number.
- **Orchestrator-only**: `docs/decisions.md`, steering, `package-lock.json`, `docs/specification/modules.md`,
  `cortex-tasks/tracker.md`, budget files, git.
- No new dependency. nclite (`/Users/dev/AI/nclite`) is read only.

## Decision entry to append

## D-111 Which folders a pick may open, and no hunting for a board (amends D-110)
- **Date**: 2026-11-20 · **Status**: Accepted (maintainer, points 651-652) · **From**: the folder chooser's review
- **Decision**: A folder opens when it is the person's home folder or under it, under `/Volumes/` (drives and network shares), or `/Users/Shared`; never `/`, `/Users`, another person's home, a system folder or a hidden folder. Outside home, only a Finder pick or the server's own recent list (D-110). The board's tools work on the board the board has open, nowhere else: an agent's folder is exactly where its client starts it, and the MCP server never walks up to find another board; the board accepts an agent working in its open folder or inside it.
- **Why**: system folders are no place for a project; the person chooses the folder and the board, and an agent must never land on a different board by searching upward. What an agent reads elsewhere stays its client's permissions.
- **Task**: cortex-tasks/board/2026-11-20_board-app_folders-labels-print/T_01_folders.md
