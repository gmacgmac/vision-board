# T_04 — Print through the host's `print(ask)`

Model: strong · Skills: cortex-architecture, cortex-docs · Ruling: PLAN § Decisions 6 (nclite's handover)

## Objective
The board prints through `host.print({ title, look, orientation })`; the host owns paper, margins and hiding the app;
the board no longer names pages or sets a print theme attribute, and sets nothing on `<html>`.

## Inputs
nclite's contract (read only): `/Users/dev/AI/nclite/shared/plugin-host.ts` (`print?(ask?: PrintAsk)`, `PrintAsk`,
`PrintLook`, `PrintOrientation`, `FILE_LIMITS`); our copies `tests/plugin/contract/nclite/` and their README's hash
table (refresh every copy whose source changed, as the README says; keep the README's one held edit only if still
needed). Board: `apps/board/src/board/host.ts` (`BoardHost.print`), `apps/board/src/board/canvas/print-view.ts`,
`apps/board/src/styles/print.css`, `apps/board/src/styles/shell.css` (standalone `@page` rules and theme),
`apps/board/src/shell/page-files.ts` (standalone `print`), the files dialog (Print in light/dark), the import path
(size check before posting), words files; `docs/specification/plugin.md` (the hooks table), `plugin-patterns.md`,
`plugin-patterns-merged.md` (§ 2 now built as proposed: say so); tests `tests/pages/board-files.spec.ts`,
`tests/plugin/`, `apps/board/tests/plugin-types.test.ts`.

## Steps
1. Contract first: `BoardHost.print(ask?: PrintAsk)` with the host's types (our `plugin.d.ts` builds from them); the
   copies refreshed; `plugin.md`'s row rewritten (no `@page` names, no `data-vb-print-theme`).
2. The board builds the ask: `title` (the board or container), `look` from "Print in" (light, dark; plain if offered),
   `orientation` from the fitted page; no `content` (the pane as it stands). Drop the page names and the print theme
   attribute; the print view still fits the chosen scope and hides chrome inside the board's own root.
3. A rejection shows its sentence through `notify`. Draw Print only when `host.print` exists.
4. The standalone host implements the same ask: its paper rules (orientation, margins) and theme on its own page.
5. Import: check the file's size before posting; over the host's limit (1 MiB in nclite; take the standalone's own
   route limit for the standalone) refuse with words, nothing posted.
6. Tests: the plugin contract tests, the print page specs (light, dark, landscape, portrait; PDF still prints colours
   and every link label whole), the size refusal. Look at a PDF yourself.

## Validation
`npm run verify`, `npm test`, `npm run test:plugin`, the print and import page specs pass.

## Constraints
Own files only; others are REQUESTS. nclite read only. No git command that changes state.

## Implementation Notes

### T_04 (2026-11-20) — Completed
- **Contract**: `BoardHost.print?(ask?: PrintAsk)` with `PrintAsk`, `PrintLook`, `PrintOrientation` in `host.ts` (the contract's
  shapes; `plugin-types.test.ts` holds them `Same` as nclite's, and `print`/`saveFile` as the contract's members). Seam 2
  still (an optional argument; the only hosts are nclite, already on `print(ask)`, and the standalone): `SEAM_TYPES` set
  again in `apps/board/plugin/seam.ts`.
- **Copies refreshed** to nclite `ec106c49` (plugin-host.ts `7415189d`, stylesheet.ts and provenance.ts `2f3ca585`,
  words/plugins.ts `06ab619d`); the README's held `pageChanged` edit dropped (nclite holds it), `EDITS` now empty. The newer
  stylesheet check (backslash, `image-set()`) passes on the board's sheet (`npm run test:plugin`).
- **Board**: `preparePrint` returns `{ orientation, undo }` and sets only `data-vb-print`, `data-vb-print-border` and the
  fit's properties on its root; `board-files.ts` asks `print({ title, look, orientation })`, title the board's or the
  container's, look from Print in, no `content`. `print.css` lost the `page:` names and the theme rules. A rejection is
  the dialog's existing `notify(…, 'error')`.
- **Standalone host** (`page-files.ts` `print`, `printRules`; `shell.css`): marks `<html>` (`data-vb-printing`,
  `data-vb-print-look`), one adopted `@page` sheet (the ask's side; 10 mm for `plain`, 0 for light/dark as nclite), the
  ask's title, the look's `color-scheme` at its root and the canvas edge to edge; all put back after.
- **Import**: refused in words, nothing sent, when the file is over the host's limit: `IMPORT_BYTES` 1 MiB (nclite's
  `MAX_BODY_BYTES`, its route to the engine), the standalone page's own 512 KiB through `BoardPage.importBytes`
  (`page-files.ts` `IMPORT_BYTES`, held equal to `server/engine/writes.ts` `WRITE_LIMIT` by `board-files.test.ts`).
- **Looked at** the PDFs (temp/print/): board portrait light and dark, container landscape light and dark: colours kept
  edge to edge, one page, link labels whole. The container test now prints one case dark, so each side prints in each look.
- **Budgets** (never block): plugin view 208,254 gzip vs 208,100; board page 213.6 KB vs 213.4 KB.

#### Caught Beyond the Brief
- nclite's contract names no request-body limit: the 1 MiB is its `engine/http/body.ts` `MAX_BODY_BYTES`, which the board
  can only copy. A `REQUEST_LIMITS` (or the limit on `PluginHost`) in `shared/plugin-host.ts` would let a plugin read it.
- The board's own `write_board` body limit (512 KiB) is not applied by the plugin engine (its body comes parsed), so under
  nclite the host's 1 MiB is the only limit; a 600 KB import works in nclite and is refused standalone.
- With `hostStyling` off, the host's look reaches the board's colours only through `:root[data-theme]` (color-scheme.css):
  nclite's print.css sets `color-scheme` on `[data-theme]` elements and `--host-color-scheme` on the target, which the
  board reads only under the flag. With the flag on (the default) a dark look prints dark.
- The standalone page ignores `content` (the board never sends it); a host other than nclite and the standalone would
  need it.
