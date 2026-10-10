---
category: board-app
status: completed
created: 2026-10-09
tracker: cortex-tasks/tracker.md#U12
---

# Open a folder from the board

> **From**: maintainer, 2026-10-09 (chat 400-412, after the handover) · **Model**: Opus 5.5
> (server lifecycle and a new home-folder surface) · **Needs**: the maintainer's go

## Problem

The board only works in the folder it was started for (`VB_PROJECT`, else this repo:
`apps/board/server.ts` `PROJECT`). To use it on another repo the maintainer must stop it and
restart it with an env variable. They need to open any project folder from the board itself, get
its boards (or create a fresh ledger there), and have the chat panel work in that folder.

## Rulings (maintainer; do not reopen)

1. **One ledger per folder, inside it**: `<folder>/.visionboard/` (400A, as today).
2. **The running board switches folder in place** (408A): same server, same port, one folder open
   at a time. Every open page reloads onto the new folder's boards. Opening a folder stops any
   running chat (its CLI works in the old folder).
3. **"⋯" gets an "Open folder…" row** that opens a folder picker (a dialog). The picker shows
   folders under the person's home folder only; the server lists them (a page can't see real
   paths). It also shows recent folders.
4. **Found or not found**: choosing a folder says "Vision Board found (N boards)" with **Open**,
   or "No Vision Board here" with **Create**. Create makes `.visionboard/` and an empty ledger and
   lands on a blank board.
5. **The chat panel follows the folder**: the agent's working folder is the open folder (it is
   already the project folder, `chat-sessions.ts`); file edits and commands still ask first.
6. **Start-up opens the last folder used**, unless `VB_PROJECT` is set (it wins). With neither,
   this repo, as today.
7. **Outside agents follow the open folder** (the `vb` MCP on 4466 talks to whatever is open). Each
   folder keeps its own agents (`agents.ts`), so an agent joins again after a switch; its old
   secret gets the usual refusal.
8. Not now (tracker): one board viewing a second ledger; the launcher and the desktop app.

## Design (the task may refine; stop and say so if a ruling can't hold)

- **Contract first** (OpenAPI 1.11.0, person-only routes, page tests and `gen` as usual):
  - `get_project`: the open folder (absolute path, display name relative to home, `found`).
  - `list_folders { path? }`: the child folders of a folder under home (default: home), each with
    `hasBoard` (has `.visionboard/ledger.jsonl`), plus `recent` (up to 10). Hidden folders and
    `node_modules` left out. Folder names only; never file names or contents.
  - `open_project { path, create? }`: switch. `not-found` without `create` when there's no
    ledger; `forbidden` outside home; `conflict` when another server holds that folder's lock (its
    holder message).
- **Safety (board-security)**: resolve with `realpath` and require the result under
  `os.homedir()` (no `..`, no symlink escape); reject non-directories; the person token only,
  never an agent or run token; Origin and Host checks unchanged. Tests inject the home folder (a
  temp dir); never touch the real home in tests.
- **Switch, in order**: take the new folder's lock (refuse on `conflict`, nothing changed) → stop
  chats → close live streams (pages reload) → release the old lock → swap the ledger, agents and
  chats in the server env (`app.ts` `createBoardServer`, today fixed at start) → record the
  folder in recent. A failed step leaves the old folder open and says why.
- **Recent folders**: `~/.visionboard/recent.json` (0600, validated on read, guarded: a bad file
  is ignored, not fatal). A per-person setting, so it lives in home, not in a repo. Propose a
  decision entry for it (D-038: the open folder changes at run time; recent list in home).
- **A new `.visionboard/`** gets the same `.gitignore` as today's (`agents.ts` ensures it); the
  ledger itself is the repo's choice to commit.
- **Page**: the "⋯" row "Open folder…" (flag `openFolder`, on by default; off is today); the
  picker reuses the existing dialog pattern (`BoardDialog.svelte` or `ConfirmDialog.svelte`):
  breadcrumb under `~`, recent first, folders with a board marked, keyboard reachable, Esc closes.
  The open folder's name shows in the page title and the menu row's tooltip. After Open or Create
  the page reloads onto that folder (the remembered last board is per folder).

## Steps

1. [x] Contract: the three routes in `packages/format/schema/openapi.json` (1.11.0), generated
   code (`npm run gen`), `docs/specification/api.md` lines for them.
2. [x] Failing tests first: server unit tests (list under home, refuse outside home and symlink
   escape, found/not found, create, switch order and rollback on `conflict`, chats stopped,
   recent file guarded, `VB_PROJECT` wins at start); page tests (the row, the picker by pointer
   and keyboard, Open, Create to a blank board, chat panel in the new folder, axe light and dark).
3. [x] Build the server side (a new `server/project.ts`, one job per file; `server.ts` start-up
   reads recent), then the page (menu row, picker, reload); gallery entry for the picker.
4. [x] Docs: api.md; propose the steering wording for "Running the board and connecting an
   agent" (protected file: wording only) and D-038.

## Validation

- [x] The five gates exit 0 (`npm test`, `npm run check`, `npm run verify`,
  `npm run gen -- --check`, `npm run test:pages`).
- [ ] By hand (orchestrator): open a second repo from "⋯", create its board, draw on it from the
  chat panel, switch back, restart the server and land on the last folder.

## Constraints

- If deviation is needed, stop and say so. No PII in examples (use `~/projects/example`). No git
  commits or stash.
- Protected files (`tokens.css`, steering, decisions): propose wording, never edit.
- Scratch in the system temp folder; stop only your own processes; never touch `.visionboard/`
  or the real home folder's files from tests.
- One job per file, under 300 lines (`controller.ts` is at its limit).
- Fill Implementation Notes below and append your own LOG line.

## Implementation Notes

**Status**: Completed 2026-10-10 (Opus 5.5). The by-hand check in Validation is the orchestrator's.

### Contract (OpenAPI 1.11.0)
- `GET /api/project` `get_project` → `{ path, name, found, boards? }`; `GET /api/folders?path=`
  `list_folders` → `{ path, name, found, boards?, parent?, folders[{ name, path, hasBoard }],
  recent[...], more? }`; `POST /api/project` `open_project { path, create? }` → the folder now open.
  All `x-agent: false`, `personCookie`. New schemas `packages/format/schema/api/project.schema.json`
  (with `$defs` `folderPath`, `displayName`, `entry`), `folder-list.schema.json`,
  `open-project-request.schema.json`; responses `folderForbidden`, `folderNotFound`, `folderConflict`;
  parameter `folderQuery`. `npm run gen` regenerated the route table, MCP tools (apiVersion only) and
  api-reference.md. api.md: three table rows and § "Opening a folder from the board" (109-113).

### Server
- `apps/board/server/project.ts` (new): the open folder (ledger, lock, agents, chats, a `closed`
  AbortSignal) and the only switch: same folder → unchanged; no ledger and no `create` → `not-found`
  before any lock; take the new lock (`conflict` with the holder message); make (create) and open
  the ledger (failure → new lock let go, `conflict`); then stop chats → abort `closed` (ends
  `watch_project`, `watch_board`, `watch_chat` and held `check_responses`) → release the old lock →
  swap → recent (old folder if under home, then the new one; a recent write failure is logged only).
  It beats the lock and releases it on server close and process exit (moved from server.ts/app.ts).
- `server/folders.ts` (new): realpath confinement under the real home, hidden/`node_modules` path
  parts refused (`forbidden`), not there / not a folder (`not-found`), child folders only (no links,
  files, hidden, `node_modules`; ≤500 then `more`), `hasBoard`, board count.
- `server/recent.ts` (new): `~/.visionboard/recent.json` `{ folders }`, newest first, ≤10, 0600
  atomic writes, validated on read (bad file → empty list); `startFolder` (VB_PROJECT, else the
  newest recent folder if still a folder under home, else this repo).
- `server/open-folder.ts` (new): the three handlers. `handlers.ts` adds them.
- `app.ts`: `createBoardServer({ ledger, lock?, home? })` (home defaults to `os.homedir()`; tests
  pass a temp folder); env is `{ person, project, build }`. `dispatch.ts`: Ctx gains `closed` and
  `project`; ledger/agents/chats come from the open folder per request. `reads.ts` `stream`/`hold`
  and `chat.ts` `watchChat` end on `closed` (`endWhenClosed`). `server.ts`: start folder from
  `startFolder`, passes its lock in; the beat interval moved into project.ts.

### Page (flag `openFolder`, on by default)
- `board/folder.ts` (new): `get_project` at boot → `shell.folder`, page title `<name> · Vision
  Board`; last board kept under `vb.lastBoard:<path>` (and still `vb.lastBoard`, read as fallback);
  on a live-stream reopen, a different folder reloads the page without its hash (`reloadOnto`).
- `live.ts` `watch(reopened?)`, `boards.ts` boot/last-board wiring, `io.ts` three calls,
  `shell.svelte.ts` `folder`, `folderDialog`.
- `shell/ToolbarMenu.svelte`: last row "Open folder…" (`#open-folder`, `aria-haspopup="dialog"`,
  tooltip "Open another folder (open now: ~/…)"); `ButtonIcon` `folder`.
- `shell/FolderDialog.svelte` (modal dialog, calls, focus) + `shell/FolderPicker.svelte` (view:
  breadcrumb under `~`, Recent (open folder left out), "In <folder>" list with a "board" chip, status
  "Vision Board found (N boards)" / "No Vision Board here" / "This folder is open now", Open/Create,
  Cancel; Esc/backdrop close; focus → Open when found, else first folder in it, else Create).
  `styles/folder-dialog.css`. Gallery: `gallery/folder-section.ts` (six states).
- Flag off: no row, no dialog, title unchanged, no folder route called (page-tested).

### Tests
- New: `apps/board/tests/api-project.test.ts` (11: get_project; listing under home; refusals outside
  home, `..`, link out, hidden, node_modules, missing, file, relative; person-only; not-found without
  create with nothing made; `conflict` on a live foreign lock with the chat still running; unreadable
  ledger → `conflict`, new lock released; switch stops the CLI, ends three streams and a held read,
  old secret 401, new lock ours, recent 0600; create; same folder no-op; back again; chat cwd),
  `apps/board/tests/recent.test.ts` (4, incl. VB_PROJECT wins), flags test, `tests/pages/
  open-folder.spec.ts` (11: row/title and flag off, pointer, keyboard, Create, a second page
  follows, chat cwd, axe light/dark with the picker open, gallery shown/hidden, gallery axe +
  screenshot light/dark) with its own server `tests/pages/folder-server.ts` (temp home, port +4).
- Changed: `openapi.test.ts` (1.11.0), `route-table.test.ts` (auth rows), `api-harness.ts` (`home`
  option, person ops), `chat-support.ts` + `packages/agent/tests/fake-claude.ts` (record `cwd`),
  `toolbar.spec.ts` (4th menu row, End/ArrowUp land on it), `gallery.spec.ts` (full-page shot adds
  `-openFolder`, like the other default-on sections).

### Contrast (APCA-W3 0.0.98G-4g, scripted from token values; light / dark)
Row text `--vb-ink-strong` on `--vb-surface-card` 104.5 / -94.9, on `--vb-surface-sunken` (hover,
focus) 95.1 / -93.8; status and current crumb on `--vb-surface-raised` 104.5 / -94.9 (bar 60).
Crumb `--vb-accent` on raised 72.0 / -47.7, on sunken 62.6 / -46.6; "board" chip `--vb-accent` on
`--vb-accent-soft` 61.2 / -47.0; list headings `--vb-ink-subtle` on card 76.2 / -48.8 (bar 45).
Folder icon and crumb separator `--vb-ink-subtle` 76.2 / -48.8, on sunken 66.8 / -47.7 (bar 30).
"No folders in here." `--vb-ink` on card 94.3 / -71.6 (bar 60). All pass. **Reported, not new:**
the shared `.vb-dialog-item` and `.vb-dialog-hint` (reused here, as BoardDialog does) are
`--vb-ink-subtle` on `--vb-surface-raised`, -48.8 in dark, under the reading bar 60; that is the
token's existing value (fix belongs in tokens.css, protected). Targets: rows 32px, crumbs 24px.

### Screenshots
Viewed before accepting. New: `open-folder.spec.ts/folder-picker-{light,dark}-darwin.png` (six
states). Updated on purpose: `toolbar.spec.ts/toolbar-{light,dark}-darwin.png` (diff viewed: only
the new "Open folder…" row in the open menu; the gallery sample got one more row of room so the
menu stays inside it). No other baseline changed.

### Gates (2026-10-10)
`npm test` 0 (907 + 6 pass), `npm run check` 0, `npm run verify` 0 (0 warnings), `npm run gen --
--check` 0, `npm run test:pages` 0 (307 passed). The real `~/.visionboard` was never created.

### Refinements and things to know (no ruling changed)
1. Field names as designed (`found` for the chosen/open folder, `hasBoard` on list entries), plus
   `boards` (the "N boards" of ruling 4) and `parent`/`more`.
2. Create makes `.visionboard/` and an empty ledger, as ruled; the page lands on that empty project
   ("No boards yet…", New board… in the picker). It does not make a first board.
3. Other open pages reload when their stream reconnects (EventSource retry, about 2 s) and
   `get_project` names another folder; no SSE contract change was needed.
4. `recent.json` is written only by `open_project` (the folder left, when under home, and the new
   one); start-up never writes it, so `VB_PROJECT` runs (page tests) never touch the home folder.
5. A path through a hidden folder or `node_modules` is refused (`forbidden`), not only left out of
   listings. Links are left out of listings; a link under home that resolves under home works.
6. "Open folder…" lives in the "⋯" menu, so with `-toolbarMenu` there is no row (the picker is not
   reachable); the title still names the folder.

### Proposed wording (protected files; not edited)
**Steering** (`.kiro/steering/vision-board-proj.md`, "Running the board and connecting an agent",
replace the first bullet):
> - Board: `npm run board`, then open http://localhost:4466 (`npm run board:watch` reloads the page
>   on changes). It opens `VB_PROJECT` when set, else the folder last opened from the board, else
>   this repo. "⋯" › Open folder… opens another project folder under your home folder (or creates
>   its `.visionboard/`) in place of this one; every open page reloads onto it, running chats stop,
>   and agents join again. One server per ledger; the lock refuses a second.

**D-038** (`docs/decisions.md`, append):
> **D-038 — The open folder changes at run time; the recent list lives in home.** Date: 2026-10-10.
> Status: Proposed. Decision: the board server opens one project folder at a time and can switch it
> in place (`open_project`, person only, folders under the home folder only, resolved with
> realpath): the new folder's lock first, then chats stop, live streams end, the old lock goes.
> Recent folders are a per-person setting in `~/.visionboard/recent.json`; at start `VB_PROJECT`
> wins, then the last folder opened, then the repo. Why: the maintainer works across repos and
> should not restart the server with an env variable to change folder (rulings 400A, 408A).
> Rejected: one server per folder on its own port (several servers to start and track), and a
> recent list inside a repo (it is personal, not the project's). Task:
> `cortex-tasks/board/2026-10-09_board-app_open-folder.md`.

### Orchestrator check (2026-10-10)

By hand on a spare port with a stand-in home folder (`HOME` set to a temp folder; the real home
untouched), together with `2026-10-10_board-security_folder-mismatch.md`: an agent joined in
folder A and drew a board; `~/projects/b` refused without `create`, then created (`.gitignore`,
empty ledger, lock); `/etc` refused; after the switch the A agent's write and its reads with its
folder header got `wrong-folder` naming both folders, a subfolder of B and no header read B; the
picker reopened A from Recent and showed its board; the A agent wrote again; a restart without
`VB_PROJECT` reopened A. **Found and fixed:** the picker starts at `~` and offered Create there,
which would make home itself every folder's nearest board (the vb MCP's upward search). Now the
server refuses `open_project` on home itself (`open-folder.ts` `HOME_ITSELF`, `forbidden`) and the
picker says "Choose a project folder under ~" with Open disabled; tests first
(`api-project.test.ts`, `open-folder.spec.ts`). Gates all exit 0: `npm test` (921 + 6), `check`,
`verify`, `gen -- --check`, `test:pages` (307).
