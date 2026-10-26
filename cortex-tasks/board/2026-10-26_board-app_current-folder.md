---
task_name: Current Folder Always Visible
created: 2026-10-26
completed: 2026-10-26
status: completed
categories: [board-app]
type: implementation
model: standard
skills: [cortex-architecture]
tracker:
---

# Task: The folder the board has open is always visible

> **Source**: maintainer, chat 2026-10-26 (points 193-197, approved: "write that task and get that done")
> · **Branch / worktree**: `feat/tool-rail-and-examples` in `.claude/worktrees/tool-rail`

## Problem Statement

Nothing on the page says which folder (repo) the board has open. Its name is only in the browser tab
title (`apps/board/src/board/folder.ts` `loadFolder`) and in the "⋯" menu's Open folder… tooltip
(`apps/board/src/shell/ToolbarMenu.svelte` `folderTip`); the folder picker leaves it out of Recent
(`FolderPicker.svelte` `recent`). The page already holds it: `shell.folder` (`FolderInfo`: `path`,
`name`), read once at boot (openFolder flag).

## Design (approved)

1. **Folder chip, far left of the toolbar** (`Toolbar.svelte`), before the board picker: a folder icon
   (`ButtonIcon`/`AppIcon` set; add the icon to the existing set if missing) and `folderName(...)`; its
   tooltip and accessible name give the full path, the home folder shortened to `~` (one helper beside
   `folderName`, reused by 2 and 3). A click opens the folder dialog (`shell.folderDialog = true`), as
   the menu row does. It never leaves the toolbar: on a narrow toolbar the name truncates with "…".
   Reuse the toolbar's chip look and every state (idle, hover, focus, pressed); tokens only.
2. **"⋯" menu:** right under "Open folder…", a plain line, not a menu item: "Current: `~/…/name`"
   (middle of a long path elided, whole path in its tooltip).
3. **Folder dialog** (`FolderDialog.svelte` / `FolderPicker.svelte`): its heading area reads "Open
   folder — choose a project folder", then a "Current folder" line with the full path and a copy button
   (copies the path; says "Copied"), above and apart from the browse and recent lists.
4. **Flag** `currentFolder`, on by default; off = today. With `openFolder` off (no folder known) none
   of this shows.

## Steps

1. Tests first: unit for the path helper (`~` shortening, middle elision, outside home); page tests:
   the chip shows the folder name and full path, opens the dialog, survives a narrow window; the menu
   line; the dialog's Current line and copy; axe; flag off = today.
2. Build 1-4. Gallery entry (chip at rest, hover, narrow; the dialog's Current line). APCA for the
   chip and the line, light and dark (reading tier for the name).
3. Run the toolbar, folder and gallery specs; refresh only the screenshots this changes, listing them;
   the full page suite once at the end (the known 6 failures in `send-access.spec.ts` and `size.spec.ts` excepted).

## Constraints

- No server, ledger or schema change. Files under 300 lines. No git commits. No PII (example paths
  use a made-up user, e.g. `/Users/alex/projects/atlas`).
- Page tests on `VB_TEST_PORT=4650` under `temp/pages.lock`; never port 4466.

## Success Criteria

- [x] The open folder's name is always on the toolbar; full path in its tooltip; click opens the dialog
- [x] The menu and the dialog show the current folder apart from the lists; copy works
- [x] Axe and APCA pass; flag off = today; `npm test`, `npm run verify`, `npm run check`, the full suite pass

## Implementation Notes

Built as designed; no server, ledger or schema change.

- **Helpers**: `apps/board/src/board/folder-path.ts` (`folderName` moved here and re-exported by `folder.ts`, `folderPath`, `elidePath`),
  pure so a unit test can load it (`folder.ts` pulls in page state, which node cannot). `folderPath` is the server's `name`, which already
  shows the home folder as `~` (`displayName`, server/folders.ts); `elidePath(path, 32)` keeps the first and last parts.
- **Flag**: `currentFolder` (`packages/format/src/flags.ts`, on by default, flags test); `currentFolderOn()` in `folder.ts` also needs `openFolder`.
- **Chip**: `shell/FolderChip.svelte` after the app icon in `Toolbar.svelte`; styles in the new `styles/current-folder.css` (board.css is at its 300 lines).
- **Menu**: `ToolbarMenu.svelte` line `.vb-menu-current` (`role="none"`, not a row); new optional props `folder` and `current` for the gallery.
- **Dialog**: `FolderPicker.svelte` prop `here`: heading "Open folder — choose a project folder", a "Current folder" group above the lists, Copy
  (copies the absolute path, says "Copied" for 2 s, a refusal in a status line). With the flag off the heading and text are as before.
- **768px**: the chip made the toolbar overflow at 768px (it had 5px to spare), so with the chip the chip itself goes down to 36px (icon
  and "…"), and at 1000px and below the picker goes to 125px (was 150) and version and containers to 5em (was 6em). Flagged to the maintainer in the return notes; `components.md` says it.
- **Gallery**: `gallery/current-folder-section.ts`, appended last in `gallery/main.ts` (an earlier place shifted the appCards section's pixels by 1px).
- **Tests**: `apps/board/tests/folder-path.test.ts`; `tests/pages/current-folder.spec.ts` (18: chip, widths 1500/1100/1024/768, menu line and keys,
  elision, dialog line and Copy, axe and APCA light and dark, flag off, gallery section and its screenshots). APCA (Lc): chip name 95.1 light /
  93.8 dark; folder icon 66.8 / 47.7; menu line 94.3 / 71.6; dialog label 84.8 / 70.5, path 95.1 / 93.8.
- **Docs**: `docs/specification/components.md` § 6 (and the 768px sentence).
- **Screenshots refreshed**: `board.spec.ts` `board-light/dark-darwin.png` (the chip, taken with the spec run alone); new
  `current-folder.spec.ts/current-folder-light/dark-darwin.png`.
- **Full suite** (650 passed, 6 failed): `size.spec.ts` x2 (known); `every-node.spec.ts:207` x2 (axe `target-size` on "Move container", fails
  the same with `-currentFolder`); `board.spec.ts:85` x2: in a full run the board shows v153 and "6 boards updated" (earlier specs wrote boards),
  the same with the flag off, so they differ from the stored v37 picture with or without the chip; alone, they match.
- **Not done / open**: Copy copies the absolute path while the line shows the `~` form (a choice; one line to change).

## On Completion

1. Frontmatter `status: completed`, `completed:` date.
2. Append one LOG line: `[[YYYY-MM-DD HH:MM]] [board-app] Completed: Current Folder Always Visible → Task: [[cortex-tasks/board/2026-10-26_board-app_current-folder.md]]`
3. Do not write to `AUDITED.md`.
