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

- [x] `tests/pages/ledgers.spec.ts`, `header-tiers.spec.ts`, `current-folder.spec.ts`, `new-board.spec.ts` green (`nice -n 15`, `VB_TEST_WORKERS=3`, port 6400)
- [x] `npm run verify`, `check`, unit tests green; the gallery shows every state; axe and APCA pass
- [x] The look done and described

## Implementation Notes

_To be completed by the agent. Re-run? Add a `### Run N` block; never overwrite an earlier run._

**Status**: Completed (2026-11-03, Opus 5.5, worktree `feat/ledger-ui-01`, `VB_TEST_PORT` 6400)

### Changes Made
- **Page parts** (`board/host.ts` `BoardPageParts`): `ledgerChip` (the path, full and half), `ledgerField` (a row of "⋯" at a
  third, under the folder's), `ledgerRow` (New ledger…, a row of "⋯"'s own after Open folder…). Filled by
  `shell/page-parts.ts` `pageParts` when `shell/folder.ts` `ledgersOn` (openFolder + `ledgerFolders`); each draws nothing until
  `get_project` names a ledger, so page flag on / server flag off shows nothing. `BoardPageParts` is the standalone's: the
  plugin types hash does not move (`plugin-types.test.ts` green).
- **The table** (`board/chrome/header-tier.ts`): control `ledger` after `folder`; in the bar at full and half, in "⋯" at a third.
  `Toolbar.svelte`: the ledger after the folder in the path with its "/" at full (and after the folder chip with
  adaptiveHeader off); `HeaderFields.svelte` draws `ledgerField` under `folderField`; `ToolbarMenu.svelte` draws `ledgerRow`
  unless `ledgerAbove` (threaded through `ToolbarEnd.svelte`). `ButtonIcon.svelte` gains `ledger` (a bound book).
- **The chip** (`shell/LedgerPart.svelte`, chip and row): the board picker's pattern (native select unseen over a face,
  `.vb-menu-face`); rows "name · N boards[ · kept out of git]", the open one selected, `<hr>`, New ledger…. Choose →
  `shell/ledgers.ts` `openLedger` (`open_project` `{ path, ledger }`) → `reloadOnto`; loading: face "Opening name…",
  `aria-busy`, select disabled; error: toast; a note's unsaved words ask first (`mayLeave`/`unsavedAsk`, App.svelte
  `guardLedgers` with leavePrompt), as the folder dialog does.
- **New ledger** (`shell/LedgerRow.svelte`, `shell/LedgerDialog.svelte`, `shell/LedgerForm.svelte`): BoardDialog's and
  FolderDialog/FolderPicker's pattern (`#ui` `syncModal`, `backdropClick`, `whenShut`; the form split out so the gallery draws
  its states). The name shown as an id while typed (`typedLedgerName`: lowercase, space/`_` → `-`, caret kept), live check by
  `#format` `ledgerNameProblem` (imported, no copy) and the folder's ledger names, `aria-invalid` + `aria-live` line; Create
  sends nothing while there is a problem; "Keep out of git" (off) → `keepOutOfGit`; refusal in a `role="alert"` line, name kept;
  busy "Creating…", Esc/Cancel/backdrop wait.
- `shell/page-io.ts` `openProject(path, create, { ledger, keepOutOfGit })`, types `LedgerEntry`, `LedgerChoice`;
  `shell/shell.svelte.ts` `ledgerDialog`, `ledgerOpening`.
- **LEDGERS_01-R1**: `shell/folder.ts` `folderMoved` compares `ledger` as well as `path` (spec "another tab follows a ledger
  switch"). `lastBoardKey` per folder and ledger: `main` keeps the folder's own key (the last board before the move into
  `main/` still opens), another ledger keys on `ledgerFolder(path, ledger)` (the paths module).
- **Styles**: `styles/ledgers.css` (new, registered in `styles/page.ts`): chip `flex: none`, max 16ch (12ch on a full bar
  under ~1385px), at half `flex-shrink: 1`, min 44px; the dialog's check/problem line, checkbox row (18px, `accent-color`).
- **Words**: `shell/words/ledgers.ts` (new; area `ledgers`), registered in `docs/specification/words.md`. Cancel / Create /
  Creating… imported from `board/words/chrome-common.ts` (one group: no duplicate).
- **Gallery**: `gallery/ledger-section.ts` (flag `ledgerFolders`, last): three forms, "⋯" at full and at a third, the chip
  idle/hover/focus/pressed/opening/one ledger, the list as a list box, the dialog idle / rule refused / name taken / refused /
  creating. `gallery.css` `.g-header[data-open='full']`, `.g-ledger-list`, `.g-ledger-dialog`.
- **Specs**: `tests/pages/ledgers.spec.ts` (new, 17 tests); `tests/pages/header-fit.ts` (new: `expectWhole`, `expectBarPasses`
  promoted out of `header-tiers.spec.ts`, which now imports them; the fit check now also measures the page's parts inside
  `.vb-part`, which it silently skipped before). `apps/board/tests/header-tier.test.ts`: the ledger's place.
- **Docs**: `components.md` § 5 (the header by its own width: the `ledger` control and the re-measure) and § 6 (new paragraph
  "The ledger chip and New ledger"); `words.md` (the new home).
- **PATHS_01-R1**: `gallery/attach-section.ts` `DAY` from `projectFiles('').attachments`; `scripts/verify-data-folder.mjs`
  `PENDING` emptied. Its test `scripts/verify-data-folder.test.mjs` "a pending file warns…" asserted that row, so it now asserts
  `PENDING` is empty and the same literal fails (a direct consequence of the one line; said here as a deviation).
- **GATE1-R1** (cause: the environment). At `f03ac48`, the commit that last wrote `chat-attach-{light,dark}` (code extracted
  with `git archive` into the session's scratch folder, same Playwright 1.63 / chromium-1243, run on this machine), the same
  screenshots fail with the same counts (1430 / 1567 px; nodeSize 3 / 6 px). The diffs are glyph rasterisation only: the CJK
  and Arabic file names in the attach section (system font fallback draws them heavier here) and single anti-aliased pixels
  in nodeSize's text; Latin text and layout identical. The `DAY` path is not drawn. So the screenshots were written on
  another computer (the repo is shared over Dropbox). Updated: `chat-attach-gallery.spec.ts/chat-attach-{dark,light}-darwin.png`,
  `gallery.spec.ts/gallery-nodeSize-{dark,light}-darwin.png`, and `gallery.spec.ts/gallery-cardHistory-{dark,light}-darwin.png`
  (7 / 9 px, the ✓ and ✗ glyphs in its description: masked until now because "screenshot of each section" stops at its first
  failure, nodeSize, which comes before it). No other section differs.

### Issues & Resolutions
- The ledger chip first shrank in proportion to the board's long name, and even a fraction of a pixel showed "main" as "m…".
  Now `flex: none` at full with a cap (16ch / 12ch), `flex-shrink: 1` only at half where the board's name has basis 0.
- `ink-subtle` is Lc 49 on the dialog's surface in dark: the name rule and the git note use `--vb-ink` (Lc 72 dark, 94 light).
- An agent call from `page.request` carries the person's cookie (403): the spec's agent uses the `request` fixture.
- No `timeout` binary: every run limited with `perl -e 'alarm N; exec …'`.

### Room (step 4): `FULL_MIN` 1300 and `HALF_MIN` 620 unchanged
Measured by `ledgers.spec.ts` "long folder, ledger and board names" (folder `atlas-customer-research-programme-2027`, ledger of
40 characters, a 105-character board name, a flagged card, Locked), every form whole: 1470 folder 170 / ledger 158 / board 163;
1400: 97 / 158 / 220; 1300: 80 / 118 / 176 (folder + board 256 ≥ the 206 header-tiers keeps for Send's longest word and Chat's
marks); 1299 (half): 32 / 158 / 631; 900: 32 / 158 / 324; 620: 32 / 121 / 80 (the board at its floor, the ledger gave way); 619
and under: the ledger in "⋯". Nothing is cut, so the numbers stay.

### Look (step 8)
Built page on a server of my block (port 6402, temp `HOME` and project in the session's scratch folder, `VB_FLAGS=ledgerFolders`,
`?flags=ledgerFolders`), ledger `customer-research-interviews` made through New ledger… with Keep out of git (its `.gitignore`
`*` checked on disk). 1400: "atlas-customer-re… / customer-res… / Interview notes, round one / v4", nothing else cut; 900: folder
icon, "customer-res…", the board's whole name; 600: a third, "⋯" holds Folder then Ledger rows; the dialog with a refused name
("bad-name!" typed as "Bad Name!"), light and dark. Screenshots (session scratch): `look/shots/bars.png`, `menus.png`,
`dialogs.png`. Gallery: `__screenshots__/ledgers.spec.ts/ledgers-{light,dark}-darwin.png`.

### Caught Beyond the Brief
- `#ui` `base/dialog.css` `.vb-dialog-item` (every dialog's body line) and `.vb-dialog-hint` use `--vb-ink-subtle`: Lc 49 on the
  dialog surface in dark, under the reading tier (Lc 60). Shared pattern, not this task's (`packages/ui`).
- `shell/kept.ts` `pageStore` is not per folder (nor per ledger): a board's zoom (`vb.view.<board>`, this tab) and
  `proposals-hidden` are shared by two ledgers' boards of the same id (host.ts `BoardStore` asks a host for "its own store" per
  folder). Already true across folders before this set.
- The header fit check (`expectWhole`) never measured the folder chip (inside `display: contents` `.vb-part`); it does now.
- The "⋯" tooltip (`toolbarWords.moreTitle`) does not name the Ledger row or New ledger…: its words live in
  `board/words/toolbar.ts`, not this task's (request).

### Deviations from Plan
- Small: `scripts/verify-data-folder.test.mjs` changed with the PENDING line (above).
- `ledgerRow` is New ledger… in "⋯"'s own rows (the folder's `folderRow` is Open folder…); the half form shows the ledger's icon
  and its name (task step 2), not the icon alone.

### Verification
- Tier: wide (a contract consumer in shell, chrome and host types; shared spec helpers). `npm run check` 0 errors; `npm run
  verify` ok (33 warnings: `ledgers.spec.ts` 342 lines is new; PATHS_01's pending warning is gone); `node scripts/verify.mjs
  --write-map` leaves `modules.md` as it is.
- Unit: `header-tier.test.ts`, `plugin-types.test.ts`, `tests/plugin/spec-truth.test.ts`, `scripts/*.test.mjs` (incl. words,
  verify-data-folder) 113 pass; shell tests (`chat-*`, `kept`, `folder-path`, `pdf-pages`, `app-samples`) 72 pass.
- Pages (`nice -n 15`, 3 workers, port 6400): `ledgers.spec.ts` 17/17 (flag on; flag off case inside); `header-tiers`,
  `current-folder`, `new-board`, `ledger-folders` 53/53; `open-folder`, `toolbar`, `gallery`, `chat-attach-gallery`,
  `last-board`, `note-folder` 54 passed and gallery's "screenshot of each section" (2) failed on cardHistory, which then passed
  (2/2) once its screenshot was updated (flag off).

## On Completion

Notes; your row; one LOG line (`[board-ui] LEDGER_UI_01: …` → this file, one line ending in a newline); the return
block with `REQUESTS`. No commit.
