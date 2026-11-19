---
skills: [cortex-architecture]
---
# FE_01_menus-dialog-print: Menus, Dialog, Print View, Standalone Hooks

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The person's side (PLAN.md decisions 8-12), behind the flag `boardFiles`.

## Steps

1. **Menus** (PLAN.md decision 12): the board's ⋯ menu gets its own section, Print, Export, Import (the toolbar menu,
   `chrome/Toolbar.svelte`); a container's settings (cog) menu, beside Reset places, gets Print container and Export
   container (`packages/ui/src/region/region-row.ts`). An item shows only when the host has its hook and the flag is
   on.
2. **One dialog** (reuse the board's existing dialog pattern, `chrome/BoardDialog.svelte`, before making one): the scope
   comes from where it was opened: Export asks only to include the conversations on notes; Import, into a new board
   or this one (then the reply's dropped parts shown); Print, the container border (off by default for a container).
3. **Print view**: `@media print` in `apps/board/src/styles/`: no toolbars, rails, menus or chat; the chosen scope
   fitted to the page; the border per the choice; `print-color-adjust: exact`. Link paths get `fill="none"` as an
   attribute (`links/wires.ts`). Then `host.print()`.
4. **Standalone host hooks** (the page's host): `saveFile` (a download), `openFile` (a file input), `print`
   (`window.print`). Export calls the export route then `saveFile`; import calls `openFile` then `write_board` in
   `import` mode as the person.
5. **Tests**: page specs (with the config): each menu item shows with the flag and hook, hidden without; export
   downloads a file that round-trips; import into new and current; print media: chrome hidden, border on/off, every
   link path `fill: none` in print, colours kept; axe; both skins, light and dark. Gallery: the dialog's states.

## Where

Own worktree `files-fe-01`, port 8610. BE_01 runs at the same time: code against T_01's contract.

## Validation

`npm run check`, `npm test`, `npm run test:plugin`, `npm run verify`, the new and touched page specs. A look in a
browser, light and dark, and a real print to PDF of a board and of a container.

## Constraints

No git commands that change state. No PII in examples. Deviation: stop and report. Each behaviour starts with a failing
test. Sentences in words files. Budgets never block: report measured numbers.

## On Completion

Fill Implementation Notes, update your TASK-STATUS row and notes, append one LOG line:
`[[YYYY-MM-DD HH:MM]] [category] ID: [what changed] → Task: [[cortex-tasks/board/2026-11-19_board-app_export-import-print/<file>]]`

## Implementation Notes

**Status**: Completed on the page's side. Export and import against the real server wait on BE_01 (the `export_board`
handler, and the person's `import` once the maintainer rules who writes the cards): those two page tests are `test.fixme`.

**What was built** (all behind `boardFiles`; each item only with its host hook)
- **Menus**
  - `chrome/ToolbarMenu.svelte`: a section of its own after Archive board…, with Print…, Export… and Import… (`onfiles`).
    The ids are `print-board`, `export-board` and `import-board`, and the rows open a dialog.
    - Print… and Export… are off while no board is open.
    - Export… is also off while a past version shows, because an export holds now.
    - Import… is off while the ledger is read-only.
    - `toolbar.ts` `moreTitle` names the rows in the "⋯" tooltip.
    - `ButtonIcon` gains `print`, `export` and `import`.
  - The container's cog menu (`packages/ui` `region-template.ts` `settingsMenu`, `RegionFrameOptions.files`) gains Print
    container… and Export container…, after Put container back and before Remove container. They are never disabled, and
    the fixed Later frame has neither.
  - Plumbing: `render.ts`, `draw.ts`, `input/wiring.ts` (`printRegion`, `exportRegion`) and `controller/stage-handlers.ts`.
  - `chrome.svelte.ts` `files` is the flag plus each host hook.
- **One dialog**: `chrome/FilesDialog.svelte`, the modal, lazy like the others (`BoardChrome.svelte`), and
  `chrome/FilesForm.svelte`, its contents, which the gallery draws.
  - It reuses the board's dialog pattern: `.vb-dialog`, `syncModal`, `backdropClick` and `whenShut`, the same as
    BoardDialog and ArchivedDialog.
  - The scope comes from the board's status `files: FilesAsk` (`status.ts`; not in the plugin seam, since `PluginStatus`
    is a Pick).
  - It asks only:
    - Print: the border, on for the board and off for a container.
    - Export: the conversations on notes, off.
    - Import: a new board or this one. This board is off, saying why, with no board open or on a locked board. Once
      done, it lists the reply's `dropped` parts with Close.
  - States: busy (aria-busy; Cancel waits), a problem kept in the dialog, and done.
- **Flow**: `boards/board-files.ts` `createBoardFiles` (the controller's `files`; `Board.files`, `BoardControls`).
  - Export calls `io.exportBoard` (`export_board`), then `host.saveFile`, named `exportName`
    (`<board>[-<container>].vboard.json`, through `boardIdFor`).
  - Import calls `host.openFile('.vboard.json,application/json')`, reads it with `readExport` (any JSON object; the server
    upgrades and conditions it), then `io.importBoard`, which is `write_board { import: { into, file } }` as the person.
    - For `new`, the board id comes from the file's title (`boardIdFor`, unique), and that board then opens (`jump`).
  - Print sets the view, awaits `host.print()`, and takes the view off in `finally`.
- **Print view**: `canvas/print-view.ts` (`printFit`, `preparePrint`) and `styles/print.css`.
  - It hides every root child but the stage, and every stage child but the world.
  - The world gets `scale(s) translate(-x,-y)` to fit one page, never enlarged.
    - The page is landscape or portrait by the scope's shape.
    - `PRINT_PAGE` 976×714 px is the smaller of the A4 and Letter areas with 10 mm margins.
  - Cards print as at 100%: the stage's zoom marks are removed and `--vb-zoom`/`--vb-mark-grow` are set to 1 inline, then
    restored.
  - No card is skipped as offscreen.
  - The container tools are hidden, the same set as when zoomed out.
  - The border is off through `data-vb-print-border`.
  - `print-color-adjust: exact`.
  - For a container, `data-vb-print-out` marks the other frames, their cards and every link with an end outside it.
  - `links/wires.ts`: every path carries `fill="none"` and `data-from`/`data-to` (its label carries them too).
- **Standalone hooks**: `shell/page-files.ts`: `saveFile` (a blob download), `openFile` (a file input, with `cancel` as
  none chosen) and `print` (`window.print()`, awaited). `page-host.ts` gives all three.
  - `shell.css`: in print, the page prints the board alone. It also defines the named pages `vb-print-landscape` and
    `vb-print-portrait`.
- **Words**: `words/chrome-files.ts` (new, with a row in `docs/specification/words.md`), `packages/ui` `words/region.ts`
  (two items), and `toolbar.ts` (`moreTitle`).
- **Gallery**: `gallery/files-section.ts`, drawn last, only with the flag. It shows the open "⋯" menu, the cog menu, and
  every dialog state:
  - print board and container
  - export board and container with notes
  - exporting
  - import
  - import on a locked board
  - refused
  - imported with parts left out
- `styles/files-dialog.css` holds the dialog's choice rows and the dropped list.

**Tests**
- `tests/pages/board-files.spec.ts`: 25 tests, 23 passing and 2 fixme.
  - The menus with the flag on and off, and a fake host without hooks.
  - Export: request shape, file name and content.
  - Print and Esc/Cancel.
  - Import into new and current, the dropped list, and a bad file. These go through `page.route`, so the page side holds
    without BE_01.
  - APCA on the dialog, light and dark.
  - axe on each kind, light and dark.
  - Print in print media:
    - chrome hidden, one page, `printColorAdjust: exact`
    - every path `fill` attribute and computed `none`
    - border on and off
    - container: other frames hidden, cross-container links hidden, own links shown
    - both skins × light and dark
    - each print saved as a PDF in `temp/print/`
  - The gallery: shown only with the flag, axe light and dark.
  - Fixme: the round trip against the real server (board → new board; container → this board).
- `apps/board/tests/board-files.test.ts` (10) covers the flow and `printFit`. `packages/ui/tests/region-template.test.ts`
  has one new test.
- Test-first:
  - The menu, cog, dialog and print specs were written first and seen failing (no rows, no `data-print-region`).
  - The settle bug (below) was caught by a test added first.
  - The unit tests were written after the flow they cover, and pass.

**Verification** (wide; port 8610)
- `npm run check`: svelte-check is clean. tsc has only BE_01's `handlers.ts` `export_board`.
- `npm test`: 2,752 tests, 2,750 passing. The 2 failures:
  - BE_01's handler table.
  - The plugin bundle budget (below).
- `npm run test:plugin`: 116 passed.
- `npm run verify`: the only failure is the page budget (below).
- Full page suite (`VB_TEST_PORT=8610`, 5 workers): 1,111 passed, 2 failed, 4 skipped, 10 did not run.
  - The 2 failures were the archive gallery screenshot. My dialog rule `.vb-dialog .vb-btn[aria-disabled]` dimmed the busy
    Restore button. It is now scoped to `.vb-files`.
  - After the fix, `picker-archive.spec.ts` and `board-files.spec.ts` give 32 passed and 2 skipped; the 10 that did not run
    are in `picker-archive.spec.ts`.
- No screenshot baselines were renewed.
- Looked at in a browser, light and dark: the live menu and the Import dialog over the board, and every gallery state.
- Real prints to PDF were looked at. Pages are Letter by default; the container prints landscape, the board portrait:
  - the board with the border on and off
  - a container with the border on and off
  - the board in default and Command Lens, light and dark

**Budgets** (they never block; measured)
- Board page: 211.1 KB gzip against a budget of 206.2. HEAD measured 206.1, so this adds 5.0 KB.
  - 0.9 KB of that is `FilesForm` turning eager, because the gallery must import it through `chrome/index.ts` (verify's
    front-door rule), the same way ArchivedList is.
  - The rest is the menu rows, the flow, the print view, the words and the CSS.
- Plugin `view/board.js`: 206,315 gzip against a budget of 200,600 (HEAD was about 200.5k: +5.8 KB; it is one file, so the
  lazy dialog is in it).

**Security**: an imported file is read in the page as JSON only. Nothing in it is run or placed in the DOM as markup:
`dropped` strings render as text. The server owns the upgrade and the checks. A download is a blob URL that is revoked
right after.

**Caught Beyond the Brief**
1. **Soft shadows print as grey blocks.** Chrome's PDF draws a blurred box-shadow under the fit's scale as a solid grey
   rectangle round about half the cards (seen in the PDF; not visible in print-media screenshots). Print now drops
   box-shadows. The printout still looks like the board, without the lift.
2. **Links missing in print after a re-layout.** For SETTLE_MS after a layout change, `.vb-wires.settling` hides every
   link. A skin change followed straight away by Print printed no links (Command Lens PDFs). Print now shows them; routes
   are final once transitions are off. A test was added first.
3. **`@page` is refused in the board's sheet** (the host's sheet check). The named pages therefore live in the standalone
   `shell.css`. A plugin host must define `@page vb-print-landscape` and `vb-print-portrait` (10 mm margins) for the
   orientation and fit to hold; without them a landscape-fitted board can overflow a portrait page. This needs a line in
   `plugin.md` § the hooks (see the request).
4. **Dark mode prints dark.** With `exact`, the person's dark theme and the board's canvas fill and dot grid print as they
   look: ink-heavy on paper. Forcing light (`color-scheme: light` on the root while printing) or dropping the canvas fill
   is a one-line choice for the maintainer. It was not made here: decision 9 says "keeps colours".
5. **The browser's own Print** (Cmd+P, not the menu) prints the page as it is, untouched. Hooking `beforeprint` to set the
   whole-board view is possible; it was not done (outside decision 12).
6. **A large board fitted to one page** can make small text. There is no tiling across pages (right-sized per the plan).
   The Letter-portrait roadmap reads, with small body text.
7. **asPerson reloads once on `forbidden`.** If BE_01 answers a person's import with `forbidden`, the standalone page
   reloads once for a fresh cookie, as for any person call. BE_01 should answer with another code if the cookie is valid
   but import is refused.
