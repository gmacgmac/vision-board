# CHROME_01_controls-in-mount: The controls inside mount

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

`mount(root, host)` draws the whole board: header, strips (proposals, version, lock, access), dialogs, reply, search, help and toasts-through-`notify`. The standalone page keeps only its own: folder picking and the chat sidebar. Tracker M8, M27. Move, don't rewrite: no pixel and no behaviour changes.

## Inputs

- **Files to modify**: TASK-STATUS.md File Ownership (CHROME_01)
- **Files to reference**: PLAN.md Decisions (Svelte stays, compiled inside); `apps/board/src/shell/App.svelte`, `Toolbar.svelte`, `header-tier.ts`; `apps/board/src/board/mount.ts`; D-061 (scope); `tests/pages/board-host-fixture.ts`, `host-styles.spec.ts`
- **Skills**: `cortex-architecture`, `svelte conventions` (`.kiro/steering/svelte-conventions.md`)

## Steps

1. Split `App.svelte` along the line: what a host needs (`BoardChrome.svelte`, mounted by `mount` into `root`) and what is the standalone page's own (folder dialog, chat sidebar, page shell). Move the files to `apps/board/src/board/chrome/`; a host's page never needs `shell/`.
2. A control the host owns goes through the host or a slot: the folder chip and Chat button are the standalone page's, given to the header as `host.page` parts; absent, they're absent and the header reflows (its tiers are by its own width already).
3. The header's dialogs and menus draw inside `root`, or use `host.confirm` where the contract says so. Toasts go through `host.notify` (the standalone page draws them).
4. Behind `boardChromeInMount`; off, today's page. Remove the off branch at set close.
5. `tests/pages/board-host-fixture.ts` shows a whole board with no help from `shell/`. Every existing spec passes; a changed screenshot is a bug to fix, not to re-take.

## Validation

- [ ] A fixture host gets the header, search, help and every dialog; `/` works there (M27)
- [ ] The full page specs for the bar, dialogs and search pass unchanged; `host-styles` holds with the controls inside

## Implementation Notes

_To be completed by agent after task completion._

**Status**: Pending · **Completed**:

## On Completion

Notes; your row; one LOG line (`[board-ui] CHROME_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS`.
