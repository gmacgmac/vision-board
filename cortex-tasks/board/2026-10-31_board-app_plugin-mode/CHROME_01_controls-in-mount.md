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

**Status**: Completed · **Completed**: 2026-10-31

### What moved
- **`apps/board/src/board/chrome/`**: 25 components, `header-tier.ts` and `toolbar-popup.svelte.ts` by `git mv`; `BoardChrome.svelte` is `App.svelte`'s host half; `index.ts` `mountChrome` is all `mount.ts` sees (no Svelte type crosses it, and the gallery imports the components from it, as `checkFeatureFolders` asks). `chrome.svelte.ts` `Chrome` is one mount's state, ids, flags (`host.settings`), `notify` and parts, carried by Svelte's context, so two boards never share a toolbar. `shell.svelte.ts` keeps only the page's own and the status mirror the chat reads.
- **Words**: `toolbar.ts`, `reply.ts` and the nine `shell-*.ts` moved to `board/words/` (`shell-x` became `chrome-x`). The page reads them from there (`words-homes.mjs`: shell reads board's). `docs/specification/words.md` updated.
- **`board/kept.ts`** (was `shell/kept.ts`): `ProposalsBar` keeps its hidden choice in it.
- **Page parts** (`host.ts` `BoardPageParts`, `shell/page-parts.ts`): Theme, Centre cards, the folder (chip, row, Open folder…) and Chat are drawn by the page into an element of the header's that takes no room (`PagePart.svelte`, `.vb-part`). Absent, the header reflows: `.vb-part:empty + .vb-path-sep` hides the path's "/" until the folder is read, and a host has none. New page files: `ThemeControl`, `AlignRow`, `FolderRow`, `FolderPart`, `theme.ts`.
- **Layout**: the root is the containing block (`:where(.vb-board)`, so a host's `position` wins); every control is `absolute`, no longer `fixed`; the stage is `.vb-board > .vb-stage` with its own `@container vb-board`, so what is inside it still sizes by the stage beside a chat. On the page the root is `position: absolute; inset: 0` with no z-index, so the header's menus still paint over the chat. Strip heights go on the root; the chat sidebar, outside it, keeps level by a `ResizeObserver` on the stage (`--vb-chat-top`, `App.svelte`), so the contract gained nothing for it.
- **Sheets**: `styles/board-sheets.ts` is what any host loads with the tokens (BUILD_01 builds from it); `page.ts` adds `shell.css` and the page's three. `--vb-ui-text-*` moved to `ui-scale.css`, custom properties on `:root` as tokens are, one exemption in `verify-style.mjs` `checkScope`.
- **Verify**: `checkBoardHost` lets only `board/chrome/` import Svelte (PLAN Decisions), with a test.
- **The flag**: `boardChromeInMount` defaults on. Off is thin and real, about ten lines: `mount` draws only the canvas with `root` as the stage, and `App.svelte` renders the same `BoardChrome` round its own `<main>`. Remove at set close: that branch, `STAGE_CLASSES`, `body > .vb-stage`, the `stage` snippet, the `pageChrome` mirror; `BoardControls` then only needs what `BoardChrome` calls and the test door. With it on, `App.svelte` takes only `rebuild` and `idle` from `MountedBoard.board`.

### Decided alone (reversible; for review)
1. Parts are plain functions (`(target, args) => undo`), not data: the header holds nothing of the folder or the chat, and no Svelte type crosses `host.ts`. Cost: a wrapper element, which is why `toolbar.spec.ts` `controls` also walks `.vb-part > *`.
2. The stage is `<main id="stage">` with `host.page`, else `<div role="group">`: a host may have its own `main`.
3. Ids carry the mount's prefix everywhere (first mount bare, so every spec's `#send` holds; second `vb2-`), as the existing "no id twice" test demands.
4. `?` is heard outside the root only with `host.page`, as keys are (`pageWide`). PROOF_01 still has M21 and M22.
5. `bind:value` in `BoardDialog` and `AccessRequests` became `value` and `oninput`: Svelte's `bind:value` adds a permanent `reset` listener on the document, which the "nothing outlives unmount" test caught. Avoid `bind:value` and `bind:checked` in `chrome/`.

### Behaviour changes, all at an edge
- Under a host `/` and the digits now open the box (M27: the point of the move). The test "under a host that draws no box" is retired; `board-chrome.spec.ts` holds the new behaviour. `controller.ts` search condition: `boardChromeInMount` or `host.page`.
- "⋯"'s tooltip says Folder at a third only when Open folder… exists (with `-openFolder` it said it wrongly); it says Theme only when there is a Theme.

### Tests
- New: `tests/pages/board-chrome.spec.ts` (a host's whole board: header in its pane, `/` and `?` in and out of the root, New board, Reply through `notify`, Archive through `confirm`, nothing of the page's; the standalone root, the chat level with the stage and under "⋯", checked with `elementFromPoint`; the flag off). `board-host-page.ts` holds what the two host specs share.
- Selectors changed only by structure: `board-host.spec.ts` (root and stage are now two), `host-styles.spec.ts` (`.vb-board`), `toolbar.spec.ts` (`.vb-part > *`), `proposals-notice.spec.ts` (`absolute`). **No screenshot changed; none re-baselined.** The one screenshot failure along the way (the Current line in the header gallery) was a bug here, fixed.
- Looked at the fake host's two panes in light and dark in a browser: whole, and the box and "⋯" stay in their pane. No gallery entry: no new pattern; `PagePart` draws nothing.

### For later tasks
- PROOF_01: `board/kept.ts` is still the page's `localStorage` under a fixed key (`vb.proposals-hidden`); `.vb-keys-body` and the "⋯" surface still cap by `100vh` and `100dvh`, not the root's height; `chrome.flag` already reads `host.settings`, so M12 has only `setMarkdownImages` and `setMarkdownSvg` left.
- BUILD_01: `styles/board-sheets.ts` plus `#tokens/styles.css` is the sheet; the host-level fixture needs the Svelte plugin to bundle (`board-host-page.ts`).
- CONTRACT_01: `BoardPage.parts` is standalone's own; state it as such.

## On Completion

Notes; your row; one LOG line (`[board-ui] CHROME_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS`.
