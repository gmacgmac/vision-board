---
task_name: Folder chooser and setup guide
created: 2026-11-19
status: in-progress
categories: [board-app, board-security, project-docs]
---

# Folder chooser and setup guide - Task Status

> **Plan**: [PLAN.md](./PLAN.md)

## Instructions for Agents

1. Read PLAN.md first (§ Decisions is every ruling). 2. Respect the Wave column. 3. Touch only your files; list other
needs under `REQUESTS`. 4. Deviation: stop and report. 5. Update your row and notes. 6. No git commands that change
state. 7. Never port 4466, never the real home folder.

## Task List

| # | ID | Wave | Model | Own worktree | Persona | Task | Status | Notes |
|---|-----|------|-------|--------------|---------|------|--------|-------|
| 1 | T_01 | 1 | strong | no | Principal security engineer for desktop file access — the person's own pick is trusted, nothing else is, and the dialog never hides a name. | [The folder chooser](./T_01_chooser.md) | Pending | |
| 2 | DOC_01 | 1 | standard | no | Developer-experience writer — a stranger's agent sets it up from the page alone, every step checked. | [SETUP.md](./DOC_01_setup-guide.md) | Pending | |
| 3 | VERIFY_01 | 2 | standard | no | Developer setting up a new laptop with only SETUP.md — no tribal knowledge, no shortcuts. | [Follow the guide; one check per ruling](./VERIFY_01_check.md) | Pending | |

## Shared Foundations

| Artifact | Created by | Consumed by |
|----------|-----------|-------------|
| The chooser operation and its `chooser` capability in the contract; the injectable runner (test hook) | T_01 | VERIFY_01 |
| `SETUP.md`; `packages/mcp/README.md` § Adding it to a client | DOC_01 | VERIFY_01 |

## File Ownership

| Wave | Owner | Files |
|------|-------|-------|
| 1 | T_01 | `apps/board/server/` (folders, open-folder, recent, project as needed, words), `packages/format/` (schema, flags, words, generated), `apps/board/src/shell/` (picker, dialog, words), styles, gallery, `docs/specification/api.md` and specs stating the home rule, their tests |
| 1 | DOC_01 | `SETUP.md`, `packages/mcp/README.md`, `README.md` |
| — | orchestrator | see PLAN.md § House Rules |

## Requests

| Request | From | Need | Routed to | Status |
|---------|------|------|-----------|--------|

## Implementation Notes
