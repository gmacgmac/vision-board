---
task_name: Save as PDF through the host
created: 2026-11-20
status: in-progress
model: strong
categories: [board-app]
skills: [cortex-architecture]
persona: Platform engineer for plugin contracts — the host owns the page; the plugin asks once with the exact size and says what failed.
---

# Save as PDF through the host (nclite handover, 2026-11-20)

## Rulings (the maintainer: "do it, quickly and accurately")
nclite replaced printing with Save as PDF: `host.savePdf(ask)`, `PdfAsk` (nclite `shared/plugin-host.ts`, read only;
`print` is a deprecated alias that goes at the next re-vendor).
1. "Print…" (board and container) becomes "Save as PDF…"; the words telling the person to choose Save as PDF in a
   print dialog go. The item shows only when `host.savePdf` exists.
2. Call `await host.savePdf({ title, look, size: { width, height } })`: `size` is the extent of what is saved, in CSS px,
   giving one page exactly that size (no A4 fit, no empty space). No `orientation`. No `content` (the pane as laid out).
3. Drop the board's page rules and any `@page` use on the board's side; the host owns the page.
4. The page colour is read from what is saved: give the saved root the board's own background (no two-tone page).
5. Resolves once saved or cancelled; a rejection's words go through `notify`.
6. The standalone page implements `savePdf` the same way (the browser's print with `@page` at exactly `size`).

## Inputs
`apps/board/src/board/host.ts`, `canvas/print-view.ts` (fit and scope), `boards/board-files.ts`, the files dialog and
menus, words (`apps/board/src/board/words/chrome-files.ts`), `apps/board/src/styles/print.css`, `shell.css`,
`apps/board/src/shell/page-files.ts`, `page-host.ts`; our contract copies `tests/plugin/contract/nclite/` and their
README (refresh from nclite); `tests/plugin/fake-host/host.js`, `tests/plugin/print.spec.ts`, `tests/pages/board-files.spec.ts`,
`apps/board/tests/board-files.test.ts`, `plugin-types.test.ts`; `docs/specification/plugin.md`, `components.md`,
`plugin-patterns-merged.md`.

## Speed rules (the maintainer's)
- Do the work, run `npm run check`, `npm test`, `npm run test:plugin` and the functional page specs you touch
  (`board-files`), and look at a saved PDF yourself (light, dark, a board and a container).
- **Do not renew screenshots.** A screenshot mismatch is not yours to fix; name the specs that mismatch. The
  orchestrator renews all screenshots in one background run after the merge.
- Worktree `.claude/worktrees/app-window` (branch `spike/stage-apps`); ports 6510-6519; never 4466; a temporary HOME;
  no git command that changes state; budgets never block (report the numbers).

## Implementation Notes

**Done (2026-11-20, sub-agent, Opus 5.5).**

- **Host seam** (`host.ts`): `BoardHost.savePdf?(ask?: PdfAsk)`, `PdfAsk` the contract's (title, content, look,
  orientation, `size`). The board calls `savePdf` only; `print?(ask?: PrintAsk)` stays as the contract's deprecated alias
  (never called) and `PrintAsk = PdfAsk`, so the d.ts change is additive: **seam 2 kept**, `SEAM_TYPES` set to
  `3052f3cd…e981` (`plugin/seam.ts`). Dropping `print`/`PrintAsk` would have been a removal (seam 3), not worth it for an
  alias nclite drops at its next re-vendor.
- **Ruling 1**: the item shows only with `host.savePdf` (`controller.ts`, `chrome.svelte.ts`); `print` alone gives none.
  Words (`chrome-files.ts`, `packages/ui/src/words/region.ts`): "Save as PDF…", "Save container as PDF…" (the container
  item, parallel to "Export container…"), headings "Save board as PDF" / "Save container as PDF", button "Save as PDF",
  "Save in" for the look, "Saving…"; the "choose Save as PDF in the print dialog" sentences are gone. Internal ids stay
  (`print-board`, `data-print-region`, kind `'print'`, `data-vb-print*`): the print view is still CSS `@media print`.
- **Ruling 2**: `board-files.ts` asks `savePdf({ title, look, size })`, no `content`, no `orientation`.
  `print-view.ts` `printFit` is the padded box at its own size, rounded out to whole px, never scaled; `PRINT_PAGE` and
  the A4/Letter fit are gone; the transform is a translate only; `PrintSet.size` is the page size.
- **Ruling 3**: the board's side names no page (`print.css` root `margin: 0`, no centring; no `@page` anywhere on the
  board's side). The `@page` rule lives only in the standalone host (ruling 6).
- **Ruling 4**: `print.css` gives `.vb-board[data-vb-print]` the canvas background **outside** `@media print` too, because
  nclite reads the ground with `getComputedStyle(root).backgroundColor` once in screen media (`print-files.ts`
  `readGround`, `PRINT_READING`). `shell.css` no longer paints `html`/`body` with the canvas: the root fills the page.
- **Ruling 5**: unchanged flow (`FilesDialog.svelte`): resolves on saved/cancelled; a rejection's words go to `notify`.
- **Ruling 6**: `page-files.ts` `savePdf`; `printRules` gives `@page{size:Wpx Hpx;margin:0}` for a valid `size`, else the
  old paper/orientation rule (as nclite's browser path).
- **Contract copy** refreshed: `plugin-host.ts` to nclite `a7c2a706` (sha256 `21d1db67…bc38b`), README table and text.
- **Tests**: `board-files.test.ts` (savePdf ask, page rule, `printFit` at own size), `plugin-types.test.ts` (HOST uses
  `savePdf` and `print`; `Same<PdfAsk>`, `Same<savePdf>`, `Same<print>`), `region-template.test.ts`,
  `tests/plugin/fake-host/host.js` (`o.savePdf`, `o.printOnly`; records the root's background), `tests/plugin/print.spec.ts`
  (rewritten: no item for `print` alone; ask keys `look,size,title`; size = root's; root background = canvas),
  `tests/pages/board-files.spec.ts` (words; `@page { size: Wpx Hpx; margin: 0px; }`; root background = canvas; header
  trimmed to keep the file at 500 lines), `toolbar.spec.ts`, `person-remove.spec.ts` comment.
- **Docs**: `plugin.md` host row (`savePdf`) and updated line; `components.md` item 5; `api.md` point 200; `words.md`
  row; `plugin-patterns.md` § 1; `plugin-patterns-merged.md` § 2 note and table row. Gallery entry text
  (`files-section.ts`).

**Verification.** `npm run check`: 0 errors. `npm test`: 2807 + 15 pass, 0 fail. `npm run test:plugin` (one worker,
`VB_TEST_PORT=6510`): 120 passed. `npm run verify`: ok. Plugin `view/board.js` 713,749 bytes raw (the budget test in
`plugin-build.test.ts` passed).

**Not verified (blocked).** `tests/pages/board-files.spec.ts` and the look at a saved PDF (light, dark, board,
container): running the page suite (`VB_TEST_PORT=6500`, one worker, servers on 6510-6519) was refused twice by the
session's permission classifier, so it did not run. Unproven there: one page per save at the root's size, the
`@page` text Chromium serialises (`size: Wpx Hpx`), and `p.root.w > 1000` for the roadmap board.

**Screenshots** (not renewed): expected to mismatch from the words: `gallery.spec.ts` `gallery-exportImportPrint-{light,dark}`
(heading, groups, buttons); possibly `person-remove.spec.ts` `remove-{light,dark}` if it shows a container's settings
menu. Not run, so not confirmed.

### Caught Beyond the Brief
- **PDF page limit.** A page at the board's own size has no upper bound; PDF viewers commonly cap a page at 200 in
  (14,400 pt = 19,200 CSS px). A very wide board would save a page some viewers refuse or clip. Not handled (the ruling
  says exact size); a cap that scales only above it would be the plugin saying what failed, and is the maintainer's call.
- **Icon.** The "⋯" row keeps the printer icon (`ButtonIcon.svelte` `print`); a document/PDF glyph may read better.
- **Ground under hostStyling off.** The root's canvas resolves through `--vb-host-color-scheme`; nclite sets
  `--host-color-scheme` on the target while reading the ground. Held by `tests/plugin/print.spec.ts` (fake host, screen
  media), not by nclite's real read.
