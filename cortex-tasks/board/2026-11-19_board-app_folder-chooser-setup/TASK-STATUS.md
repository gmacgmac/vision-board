---
task_name: Folder chooser and setup guide
created: 2026-11-19
status: completed
completed: 2026-11-19
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
| 1 | T_01 | 1 | strong | no | Principal security engineer for desktop file access — the person's own pick is trusted, nothing else is, and the dialog never hides a name. | [The folder chooser](./T_01_chooser.md) | Done | choose_folder + trust rule (D-110), 720px wrapping dialog, Choose in Finder…; refused pick is `invalid`; home's ancestors refused too (flag for maintainer); 58 baselines renewed (subpixel shift); budget 212.3/212.2 KB; see task notes |
| 2 | DOC_01 | 1 | standard | no | Developer-experience writer — a stranger's agent sets it up from the page alone, every step checked. | [SETUP.md](./DOC_01_setup-guide.md) | Done | SETUP.md, mcp README table, README link; see task notes |
| 3 | VERIFY_01 | 2 | standard | no | Developer setting up a new laptop with only SETUP.md — no tribal knowledge, no shortcuts. | [Follow the guide; one check per ruling](./VERIFY_01_check.md) | Done | All items pass (new machine, decisions 1-5); 7 guide gaps listed in task notes (read-only start, wrong-folder fix, duplicated table, stale dialog subtitle) |

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
| `apps/board/dist` budget: board page 212.3 KB gzip vs 212.2 KB (`docs/specification/performance.md`) | T_01 | Raise the budget by ~0.1 KB (the chooser's page code), or say what to trim | orchestrator | open |
| `docs/decisions.md` D-110 wording: home's ancestors (`/Users`, `/`) are refused as picks too, same reason as home | T_01 | Maintainer confirms or overrules (`folders.ts` `resolvePicked`, `holdsHome`) | orchestrator | open |

## Implementation Notes

- DOC_01: Sources read 2026-11-19 (URLs in SETUP.md Sources). Unclear in the docs: Kiro and Crew symlinked skill folders; Crew Discover & Sync file paths; Codex CLI restart; Claude Code restart after mcp add; Claude Desktop skills (ZIP upload only, sources conflict on menu names); Cursor not re-read. Codex docs say the ChatGPT desktop app can add STDIO servers (shares Codex config); ChatGPT web is remote-only: SETUP names the web app as left out. npm run verify ok.
- T_01: Server `server/chooser.ts` (+ `choose-folder.applescript`), `folders.ts` `resolvePicked`/`resolveVouched`, `open-folder.ts` `chooseFolder`, `recent.ts` `startFolder`; `createBoardServer({ chooser })` (default macOS's, `false` in `startTestBoard`: the VERIFY_01 test hook is `startBoard({ chooser })` / `startTestBoard({ chooser })`, as `apps/board/tests/api-folder-chooser.test.ts` and `tests/pages/folder-server.ts` use it). Page: dialog 720px, wrapping, Choose in Finder…, Chosen folder line; gallery section `folder-chooser-section.ts` last. Tests: api-folder-chooser (13), recent, openapi, route-table; pages folder-chooser.spec (12); the four "section is last" specs gain `systemFolderChooser`. Baselines: new `folder-chooser.spec.ts/folder-chooser-{dark,light}`; renewed (the wider dialog makes the gallery's Folder picker section ~23px shorter, every section below moves by a fraction of a pixel; HEAD untouched passed all 140): access-by-bot, app-fit, app-cards, big-titles, retired, alongside, chat-attach, folder-access, rail, current-folder, fresh-section, go-to-card, header, alignment, card-widths, link-labels, ledgers, lock, folder-picker, remove, archive, review-list, read-only-toggle, read-only, search, timeline-gallery, update-signals-replies, command-lens, node-edges (each dark and light; 58 files). Security: refused pick answers `invalid` (a `forbidden` makes the page reload for a fresh cookie, `asPerson`); exact-path trust, still its own real path; control characters refused; recent.json is user-writable (trust only reaches the person's own click) — see task notes § Caught Beyond the Brief.

**Close (orchestrator, 2026-11-19):** SETUP.md gaps from VERIFY_01 fixed (read-only start and Editing, the `wrong-folder` fix, step 4 points to the README table, folder before link, `VB_PORT`); the dialog's intro made true ("Choose one below." / "Choose a project folder.", point 650). Full page suite: 1,097 passed, 30 screenshot diffs (the intro text and sub-pixel shifts below it, renewed: 38 files) and 1 flake (`update-signals` APCA, passes alone). `npm test` 2,791/2,791 with a temporary HOME; verify ok (page budget 212.4 KB). Tracker M90 added.
