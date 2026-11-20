---
task_name: Save as PDF through the host
created: 2026-11-20
status: planned
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
