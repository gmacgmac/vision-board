---
category: board-app
status: completed
created: 2026-10-10
tracker: cortex-tasks/tracker.md#N32
---

# Open folder: a Cloud storage group (Dropbox), safely

> **Follows**: `2026-10-09_board-app_open-folder.md`, `2026-10-10_board-security_folder-mismatch.md`
> · **From**: maintainer, 2026-10-10 (chat 470, 473) · **Model**: Opus 5.5 · **Go**: given (chat 477)

## Problem

The maintainer can't find any Dropbox folder in the "Open folder…" picker.

**Cause (checked 2026-10-10 on the maintainer's computer):** macOS keeps cloud folders in
`~/Library/CloudStorage/` (`Dropbox-Personal`, `Dropbox-Uplynk`, a ProtonDrive folder), and the
home folder only holds **links** to them (`~/Dropbox-Personal -> ~/Library/CloudStorage/Dropbox-Personal`).
`childFolders` (`apps/board/server/folders.ts`) keeps only `Dirent.isDirectory()`, which is false for
a link, so the two links never show. Reaching them through `~ › Library › CloudStorage` works today
(the real paths pass every check), but nobody would find that. Node reads these folders fine from a
terminal-started server (`readdirSync` of `~/Library/CloudStorage/Dropbox-Personal`: 13 entries, 0.02 s).

## What stays exactly as it is (the safety model; tests must prove each still holds)

1. Every path the server opens or lists is resolved with `realpath` and must be home or under it
   (`resolveFolder`, `isUnder`). Nothing outside home becomes reachable, through a link or not.
2. No part of the **real** path under home may be hidden (`.name`) or `node_modules`.
3. Home itself can't be opened (`open-folder.ts` `HOME_ITSELF`).
4. Listings hold folder names only, never files or contents; the routes are person-only.
5. Identity is the real path everywhere: the lock, `recent.json`, the open folder, `get_project`,
   and the folder-mismatch check (`caller-folder.ts` already resolves links, D-039). So a folder
   reached by its link and by its real path is one folder: one recent entry, one lock, a match.

## Rulings (maintainer, chat 477; do not reopen)

1. **Links stay out of listings, as today.** The home folder's links (`~/Dropbox-Personal`) are
   not shown; the maintainer prefers the real folders under their real names.
2. **A "Cloud storage" group** at the top of the picker on the home listing: each folder in
   `~/Library/CloudStorage/` that passes rules 1-2 above, under its real name (`places` in the
   `list_folders` answer, only when that folder exists, so other systems get none). Opening one
   goes in like any folder, and browsing continues with the real names.
3. **Display names stay real-path based** (`~/Library/CloudStorage/Dropbox-Personal/...`).

## Risks checked, and how the design handles each

| Risk | Handling |
|---|---|
| A cloud place that is a link, hidden, or leads outside home | Each place is resolved with `realpath` and checked like any folder; one that fails is left out (new tests). |
| One folder reachable two ways (a home link and its real path) | Opening by the link still gives the real folder (existing behaviour and test); recent, the lock and the open folder use the real path. |
| Slow cloud folders (Dropbox online-only, File Provider) | A listing does one `stat` per entry (metadata only, nothing downloaded); the board count (`countBoards`) reads a ledger only for the chosen folder, as today. Measured above. |
| macOS refuses a cloud folder (no Files permission for the process that started the server) | `readdirSync` throws: the existing "not allowed to read this folder" answer; the message adds "macOS may need Files and Folders access for the app that started the board". |
| Dropbox syncs `.visionboard/` between computers | Unchanged behaviour: the lock names the computer (D-017) and refuses a second server; worth knowing, not changed here. |
| The vb MCP started in a Dropbox repo | `projectOf` walks up from `process.cwd()` (Node gives the real path); the server compares real paths (D-039). Covered by a test with a linked project folder. |
| Existing listing tests ("no link", link to outside refused) | Unchanged and still passing. |

## Steps

1. [x] Contract (OpenAPI 1.14.0): `list_folders` gains optional `places` (entries, at most 20); descriptions updated in `folder-list.schema.json` and
   `project.schema.json`; `npm run gen`; `api.md` 110.
2. [x] Failing tests first (`apps/board/tests/api-project.test.ts`, temp home only):
   `places` lists the folders of a temp `Library/CloudStorage` under their real names and is absent
   without it, and only on the home listing; a place that is a link out of home, hidden, or a file
   is left out; links in home stay unlisted; opening a place gives one recent entry; home
   itself still refused; the mismatch test with a linked project still matches. Page test
   (`tests/pages/open-folder.spec.ts`): the Cloud storage group, by pointer and
   keyboard, axe light and dark.
3. [x] Build: `folders.ts` (a `cloudPlaces(home)` helper; the permission hint), `open-folder.ts` (`places` on the home listing),
   `FolderPicker.svelte` (the group; tokens only, APCA tiers), gallery state.
4. [x] Docs: `folders.ts` header, `api.md` 110, `docs/specification/components.md` picker lines.

## Validation

- [x] The five gates exit 0, one after another.
- [ ] By hand (orchestrator) on the maintainer's real layout: the picker shows the Cloud storage
  group (Dropbox-Personal, Dropbox-Uplynk, the ProtonDrive folder); open a repo inside
  Dropbox on a test server port, draw one card from the chat panel, switch back. (Opening writes
  `~/.visionboard/recent.json`: the maintainer's real recent list; acceptable, it is what the
  feature does.)

## Constraints

- If deviation is needed, stop and say so. No PII in examples (`~/projects/a`, `Library/CloudStorage/Cloud-Example`). No git commits or stash.
- Protected files: propose wording, never edit. No new decision entry expected (D-038's rules hold);
  say so if one is needed.
- Scratch in the system temp folder; stop only your own processes; tests use a temp home and never
  the real one; never touch the repo's `.visionboard/`.
- One job per file, under 300 lines. Fill Implementation Notes below and append your own LOG line.

## Implementation Notes

**Status**: Completed 2026-10-10 (Opus 5.5). The by-hand check in Validation is the orchestrator's.
No ruling changed; no decision entry needed (D-038 and D-039 hold).

### Contract (OpenAPI 1.14.0)
- `folder-list.schema.json`: optional `places` (entries, `maxItems` 20): the real folders in
  `~/Library/CloudStorage`, by their own names, only on the home folder's listing and only when that
  folder exists; each a real folder (not a link) passing the same checks as `path`. Top description
  names it. `project.schema.json` `entry.name`: "own name … in the cloud storage list (`places`)".
- `openapi.json` 1.14.0, `list_folders` description adds `places`. `npm run gen` regenerated
  `api-reference.md` and `tools.generated.json` (apiVersion). `openapi.test.ts` expects 1.14.0.

### Server
- `server/folders.ts`: `folderNames(dir)` (the real folders in a folder, by name; shared by
  `childFolders` and the new `cloudPlaces`), `cloudPlaces(home)`: `resolveFolder` on
  `~/Library/CloudStorage` (so that folder itself must be real-path under home), then each real
  folder in it through `resolveFolder` again (one that fails is left out), at most `MAX_PLACES` (20);
  undefined when the folder is missing, unreadable or fails the checks. The unreadable message now
  reads "…not allowed to read this folder (macOS may need Files and Folders access for the app that
  started the board). Choose another one." Header comment updated.
- `server/open-folder.ts`: `list_folders` adds `places` only when the listed folder is home.
- A place's entries are `Dirent.isDirectory()` only, as every listing: links in the cloud folder
  are left out even when they lead somewhere allowed (ruling 1 applied there too). Nothing else in
  the safety model changed: `resolveFolder`, `isUnder`, `HOME_ITSELF`, `recent.ts`, `project.ts`
  and `caller-folder.ts` are untouched.

### Page
- `board/io.ts` `FolderList.places?`. `shell/FolderPicker.svelte`: a "Cloud storage" `h3` and list
  (`aria-labelledby`) at the top of the lists box when `places` is non-empty; rows reuse the folder
  row (the `row` snippet takes an icon). `shell/ButtonIcon.svelte` gains `cloud` (same stroke style).
  No new CSS or colour pairs: the heading and rows reuse `.vb-folder-head` / `.vb-folder-row`.
- Focus is unchanged (first folder in the chosen one); the Cloud storage group is a Shift+Tab away
  on the home listing when there are no recent folders, above Recent otherwise.
- Gallery `gallery/folder-section.ts`: a new first state, "Home" (two places, recent, folders in
  `~`, "Choose a project folder under ~", Open disabled). Seven states now.

### Tests (written first; 4 failed before the build)
- New `apps/board/tests/api-cloud-places.test.ts` (7, own temp home with `Library/CloudStorage`):
  places by real names, home's link not listed; only on the home listing (not on `projects`,
  `Library`, the cloud folder or a place), browsing a place and by home's link gives real paths and
  `~/Library/CloudStorage/...` names; none without the cloud folder or when it is a link out of
  home; left out: a link out of home, a link to a folder under home, a link to home, a hidden folder,
  `node_modules`, a file; an unreadable place is `forbidden` with the Files and Folders hint; home
  itself refused (directly and by a link in the cloud folder); opened by link and by real path is one
  folder (one recent entry each, the lock in the real folder, `get_project` real); an agent whose
  `VB-Project` is the link path (from `projectOf` with a cwd through the link) joins and writes, the
  real path matches too, another folder gets `wrong-folder`.
- `api-project.test.ts` and `api-folder-mismatch.test.ts` unchanged and passing (the home listing
  there has no cloud folder, and its exact `deepEqual` shows no `places`).
- Page: `tests/pages/open-folder.spec.ts` +4 (pointer: the group, home's link not listed, browsing
  under real names, Open, the row's tooltip names the real path; keyboard: Shift+Tab to the place,
  Enter in, Enter on the repo, Enter on Open; axe light and dark with the group shown); the gallery
  test counts seven states. `tests/pages/folder-server.ts` gains `addCloud()` / `removeCloud()`
  (in its temp home only).

### Contrast (no new pairs; values from the open-folder task's scripted APCA-W3 0.0.98G-4g)
"Cloud storage" heading `--vb-ink-subtle` on `--vb-surface-card` 76.2 / -48.8 (bar 45); place rows
`--vb-ink-strong` on card 104.5 / -94.9, on sunken 95.1 / -93.8 (bar 60); cloud icon
`--vb-ink-subtle` 76.2 / -48.8, on sunken 66.8 / -47.7 (bar 30). All pass.

### Screenshots
Viewed before accepting (actual against expected): `open-folder.spec.ts/folder-picker-{light,dark}-darwin.png`
gain the new first "Home" state with the Cloud storage group (the gallery description also names
cloud storage); the six earlier states are as before, moved down. No other baseline changed.

### Gates (2026-10-10, one after another)
`npm test` 0 (955 + 6), `npm run check` 0, `npm run verify` 0 (0 warnings), `npm run gen -- --check`
0, `npm run test:pages` 0 (318 passed). Only temp home folders were used.

### Deviations and things to know
1. The API tests are in a new file, `api-cloud-places.test.ts`, not `api-project.test.ts`: they need
   a home with `Library/CloudStorage`, which would change that file's exact home-listing checks, and
   the two together would pass 300 lines.
2. `places` is given when `~/Library/CloudStorage` exists and passes the checks, even if empty
   (`[]`); the page shows the group only when it has a place.
3. A link inside `~/Library/CloudStorage` is left out even when it leads to an allowed folder (ruling
   1's "links stay out of listings"); the File Provider folders there are real folders.
4. The Files and Folders hint is in every "not allowed to read" answer, not only on macOS.

### Orchestrator check (2026-10-10, the maintainer's real layout, test port 4484)

Five gates exit 0 (`npm test` 955 + 6, `check`, `verify`, `gen -- --check`, `test:pages` 318). On the
real home folder: `places` = Dropbox-Personal, Dropbox-Uplynk and the ProtonDrive folder; the home
links not listed; the picker shows the Cloud storage group at the top (viewed). Browsing to this repo
inside Dropbox: "found, 3 boards"; opening it refused with the lock holder's message (the
maintainer's own server on 4466 holds it), nothing changed. Nothing was written: no
`~/.visionboard/recent.json`, nothing in Dropbox. Drawing in a Dropbox folder from the chat panel was
not repeated, to avoid writing into the maintainer's Dropbox; the open and create paths are the same
code as for any folder (covered by tests and the open-folder hand check).
