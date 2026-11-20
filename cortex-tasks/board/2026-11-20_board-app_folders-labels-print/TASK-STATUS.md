---
task_name: Folders, labels, chat text and print through the host
created: 2026-11-20
status: in-progress
categories: [board-app, board-security, board-layout, board-agent]
---

# Folders, labels, chat text and print through the host - Task Status

> **Plan**: [PLAN.md](./PLAN.md)

## Instructions for Agents

1. Read PLAN.md (§ Decisions are the rulings). 2. Work only in your own worktree. 3. Touch only your files; list other
needs under `REQUESTS`. 4. Deviation: stop and report. 5. Update your row and notes. 6. No git commands that change
state. 7. Never port 4466, never the real home folder.

## Task List

| # | ID | Wave | Model | Own worktree | Persona | Task | Status | Notes |
|---|-----|------|-------|--------------|---------|------|--------|-------|
| 1 | T_01 | 1 | strong | yes | Principal security engineer for desktop file access — the person chooses the folder and the board; nothing searches past it. | [Which folders open; no hunting](./T_01_folders.md) | Completed | `placeProblem` one rule (home, /Volumes/*, /Users/Shared; injectable `places`); home itself opens; `projectOf` = VB_PROJECT else cwd. 4 gallery baselines renewed. Request: openapi.json wording. |
| 2 | T_02 | 1 | strong | yes | Diagram-tool layout engineer — a word on a line is read where it sits; nothing becomes a mystery dot. | [Link labels in the gap](./T_02_labels.md) | Pending | |
| 3 | T_03 | 1 | standard | yes | — | [Skill sentence; chat text size](./T_03_skill-chat.md) | Completed | v3.38; eval:bot 113/114 ($0.0424), known insert-step miss; chat 16px; 2 baselines renewed |
| 4 | T_04 | 2 | strong | yes | Platform engineer for plugin contracts — the host owns the paper; the plugin asks once and says what failed. | [Print through the host](./T_04_print-host.md) | Pending | |
| 5 | VERIFY_01 | 3 | standard | no | Person who prints and shares boards from nclite — checks each promise once, no builder's shortcuts. | [One check per ruling](./VERIFY_01_check.md) | Pending | |

## File Ownership

| Wave | Owner | Files |
|------|-------|-------|
| 1 | T_01 | `apps/board/server/` (folders, open-folder, recent, chooser, caller-folder read only), `packages/mcp/`, `packages/client/`, `apps/board/src/shell/` (folder picker), `SETUP.md`, `docs/specification/api.md`, their words and tests |
| 1 | T_02 | `packages/layout/src/route/`, `apps/board/src/board/links/`, `apps/board/src/styles/board.css` (link rules), `apps/board/src/board/words/cards.ts`, the gallery's link sections, their tests |
| 1 | T_03 | `skills/vision-board/`, `apps/board/src/styles/chat-host.css`, `packages/chat/src/message/`, skill and chat tests |
| 2 | T_04 | `apps/board/src/board/host.ts`, `canvas/print-view.ts`, `styles/print.css`, `styles/shell.css`, `src/shell/page-files.ts`, the files dialog and import path, `tests/plugin/`, `docs/specification/plugin*.md`, their tests |
| — | orchestrator | see PLAN.md § House Rules |

## Requests

| Request | From | Need | Routed to | Status |
|---------|------|------|-----------|--------|

## Implementation Notes

### T_01 (2026-11-20)
- No flag added (plan names none; `flags.ts` not T_01's). Both rulings narrow access.
- Behaviour change to flag at close: an MCP client that starts `vb-mcp` outside the project now gets `wrong-folder` on every call unless its entry sets `VB_PROJECT` (before: no header, unchecked). README and SETUP.md say so.
- With `~` open, any agent started under home is accepted (caller rule unchanged). Security note, by the ruling.
- `packages/mcp/tests/support.ts` now starts `vb-mcp` in the fixture board's open folder (`Board.project`).
