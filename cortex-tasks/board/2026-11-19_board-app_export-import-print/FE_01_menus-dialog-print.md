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

**Status**: Pending
