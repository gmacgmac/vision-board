# LEDGER_UI_01_ledger-chip: The ledger chip

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

With `ledgerFolders` on, the header reads folder / ledger ▾ / board ▾ / version ▾. The ledger's dropdown lists the
project's ledgers, switches to one, and ends with New ledger…, at all three header widths, in light and dark.

## Context

PLAN decisions 1, 8 and 10. LEDGERS_01's contract gives `get_project` `ledger` and `ledgers`, and `open_project`
`{ ledger, create, keepOutOfGit }`; read its notes first. The ledger is the standalone host's, like the folder
(no seam change, decision 4). How the folder reaches the header today (research, 2026-11-03):

- `apps/board/src/board/host.ts` `PagePart`, `PagePartArgs { id, look, choose }`, `BoardPageParts { theme, alignRow,
  folderChip, folderField, folderRow, chat }`. The standalone page fills them in `apps/board/src/shell/page-parts.ts`
  `pageParts()` (`folderChip` / `folderField` are `draw(FolderPart, …)` when `currentFolderOn()`; `folderRow` is
  `FolderRow` when `openFolderOn()`), passed by `page-host.ts` `createPageHost(chat, parts)`. `FolderPart.svelte`
  reads `shell.folder` (`get_project` → `FolderInfo`, `page-io.ts`) and draws `FolderChip.svelte`; its `row` prop
  makes it a menu item. Styles: `apps/board/src/styles/current-folder.css`.
- `apps/board/src/board/chrome/header-tier.ts`: `FULL_MIN` 1300, `HALF_MIN` 620; `headerTier`, `HEADER_CONTROLS`,
  `inMenu`, `inBar`. Half moves version and containers into "⋯"; a third moves folder, version, containers, open,
  new, flagged, zoom, agents, boards-updated. `Toolbar.svelte`: `<nav class="vb-path">` holds `parts.folderChip`
  when `here('folder')` ("/" only at full), then `BoardPicker`, `VersionPicker`. `HeaderFields.svelte`: at a third,
  `parts.folderField` is a "⋯" row. `ToolbarMenu.svelte`: `parts.folderRow` unless `folderAbove`.
- The board picker (`chrome/BoardPicker.svelte`: native select unseen over a face, `.vb-menu-face`) and the New board
  dialog (`chrome/BoardDialog.svelte`; words `words/chrome-boards.ts`, `chrome-common.ts`) are the patterns to reuse.
- Gallery: `apps/board/src/gallery/header-section.ts` `headerSection` (three forms), `current-folder-section.ts`
  `currentFolderSection`, `chrome-sample.ts` `chromeSample`. Specs: `tests/pages/header-tiers.spec.ts`
  ("${width}px is the ${form} form and a long name leaves every control whole…", "full: one path…", "half: …",
  "a third: …", "axe at every form…", "APCA…"), `current-folder.spec.ts`, `new-board.spec.ts`.

## Inputs

- **Files to modify**: TASK-STATUS.md File Ownership (LEDGER_UI_01, wave 3)
- **Files to reference**: `docs/specification/components.md` § The header by its own width, § the folder chip and
  Open folder; `docs/specification/words.md`; `packages/ui` menu and dialog patterns the board picker and BoardDialog use
- **Shared artifacts to reuse**: the ledger contract and name rule (LEDGERS_01: `ledgerNameProblem` for the dialog's
  live check, never a copy of the rule)
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. **The page parts**: `BoardPageParts` gains `ledgerChip`, `ledgerField`, `ledgerRow` (optional, like the folder's);
   `pageParts()` fills them when `ledgerFolders` is on. One `LedgerPart.svelte` draws all three forms (`row` for the
   menu), as `FolderPart` does; `shell.ledger` and `shell.ledgers` from `get_project`.
2. **The table**: `header-tier.ts` gains a `ledger` control: in the bar at full (in the path) and half (icon and name
   cut with "…", as the folder's icon), a row of "⋯" at a third, next to the folder's row. `Toolbar.svelte`'s path
   gets the ledger between folder and board, with "/" at full.
3. **The dropdown**: lists ledgers by name with their board counts, the open one marked; choosing one calls
   `open_project({ dir, ledger })` and reloads onto it (`folder.ts` `reloadOnto`; the last board is remembered per
   folder and ledger: extend `lastBoardKey`). New ledger… opens a dialog built from `BoardDialog`'s pattern: the name
   (live check with `ledgerNameProblem`), "Keep out of git" (off), Create and Cancel; Create opens the new ledger.
   Every state: idle, hover, focus, pressed, loading (switching), error (a refusal shown in the dialog in its words),
   disabled (one ledger only: the list still opens and offers New ledger…). Keyboard as the board picker.
4. **Room**: re-measure `FULL_MIN` and `HALF_MIN` with long folder, ledger and board names; change them only if a
   control is cut, and say so in your notes with the measured widths.
5. **Gallery**: the three forms with a ledger, the dropdown open, the dialog (idle, invalid name, refused). Words in
   `apps/board/src/shell/words/` (the folder chip's file or a new `ledgers.ts`), registered as `words.md` says.
6. **Specs**: `tests/pages/ledgers.spec.ts` (new): the path order at full, the icon at half, the row at a third; switch
   and the board changes; create, kept out of git, and a bad name; axe and APCA at every form, light and dark; flag
   off shows no ledger. Update `header-tiers.spec.ts` only where the intended change shows, naming each screenshot that
   moved in your notes.
7. **Docs** (`cortex-docs`): `components.md` § The header by its own width (the ledger in each form), the ledger chip
   and New ledger dialog sections; `words.md` if a words file is added.
8. **Look**: the board in a browser at 1400, 900 and 600 px, light and dark, with the flag on; screenshots in your notes.

## Validation

- [ ] `tests/pages/ledgers.spec.ts`, `header-tiers.spec.ts`, `current-folder.spec.ts`, `new-board.spec.ts` green (`nice -n 15`, `VB_TEST_WORKERS=3`, port 6400)
- [ ] `npm run verify`, `check`, unit tests green; the gallery shows every state; axe and APCA pass
- [ ] The look done and described

## Implementation Notes

_To be completed by the agent. Re-run? Add a `### Run N` block; never overwrite an earlier run._

**Status**: Pending

### Changes Made
-
### Issues & Resolutions
-
### Caught Beyond the Brief
- None
### Deviations from Plan
- None

## On Completion

Notes; your row; one LOG line (`[board-ui] LEDGER_UI_01: …` → this file, one line ending in a newline); the return
block with `REQUESTS`. No commit.
