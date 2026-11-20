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
