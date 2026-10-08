---
task_name: Navigation - Toolbar, Versions, Finder, Keys, Icon, New Board
created: 2026-10-07
completed: 2026-10-08
status: completed
categories: [board-app, board-ui, board-tokens, board-format]
tracker: cortex-tasks/tracker.md#U11,N18,N19,N20,N21,N22
---

# Navigation - Task Status

> **Plan**: [PLAN.md](./PLAN.md) · Waits for the awareness tables set. Task files are written
> from this plan when that set is complete.

## Resume point (paused by the maintainer, 2026-10-08 ~00:15)

- Done and gated (five gates exit 0 after each): FE_01 toolbar and versions, FE_02 finder, FE_03
  selection reset, FE_04 key bubble, FE_05 app icon. Not yet committed: everything after commit
  c487c79 (Set 1) is in the working tree.
- BE_01 (new board and rename) was paused mid-task: read its task file's "Resume point" first.
  Then VERIFY_01, then commit Set 2.
- Waiting on the maintainer: 228, whether to set Dropbox's ignore mark on `node_modules`,
  `apps/board/dist`, `temp`, `test-results`. Playwright output already goes to the system temp
  folder (`tests/pages/playwright.config.ts` `outputDir`); the other computer still recreates an
  empty `test-results/` until it has that config.
- For sub-agents: scratch projects and logs in the system temp folder, never the repo's `temp/`;
  stop only your own processes by PID or port, never `pkill -f`.

## Token for the icon (approved by the maintainer 2026-10-07: "pick something that passes, a popular teal")

> `--vb-brand-mark: light-dark(#0d9488, #2dd4bf); /* The app icon's teal (N21): APCA Lc 64.5 on the light toolbar, 66.6 on the dark one. */`
>
> Measured 2026-10-07 with `temp/apca-2b.mjs` `lc` against `--vb-surface-region` (#ffffff,
> #1a1a1c). One-colour alternative: `#12b3a0` (Lc 50.7 light, 49.8 dark).

| # | ID | Wave | Task | Model | Status | Notes |
|---|-----|------|------|-------|--------|-------|
| 1 | FE_01 | 1 | [Toolbar and read-only version view](./FE_01_toolbar-versions.md) (U11) | Opus 5.5 | Completed | `boardVersions` + fold `runs`; `versions.ts`; flag `versionView` |
| 2 | FE_02 | 2 | [Container finder](./FE_02_container-finder.md) (N18) | Sonnet 5.5 | Completed | `finder.ts`; flag `containerFinder`; no key |
| 3 | FE_03 | 3 | [Reset places for a selection](./FE_03_selection-reset.md) (N19) | Sonnet 5.5 | Completed | `reset-places` command (R); bar button `disabled`; `places.resetCards` |
| 4 | FE_04 | 4 | [Key commands bubble](./FE_04_key-bubble.md) (N20) | Sonnet 5.5 | Completed | `key-help.ts` `keyGroups()`; `KeyHelp.svelte`; flag `keyBubble`; `?` opens it |
| 5 | FE_05 | 5 | [App icon](./FE_05_app-icon.md) (N21) | Sonnet 5.5 | Completed | `--vb-brand-mark`; `AppIcon.svelte`; `public/favicon.svg` |
| 6 | BE_01 | 6 | [New board and rename](./BE_01_new-and-rename-board.md) (N22) | Opus 5.5 | Completed | Ledger v9; `put_board`; `BOARD_ACTIONS`; `BoardDialog.svelte`, `board-edit.ts`; flag `boardEdit` |
| 7 | VERIFY_01 | 7 | [End-to-end check](./VERIFY_01_end-to-end.md) | Orchestrator | COMPLETED | 3 bugs found and fixed (picker width, dialog text, wording) |

Gates after every task, run by the orchestrator: `npm test`, `npm run check`, `npm run verify`,
`npm run test:pages`, `npm run gen -- --check`. No git commits or stash by sub-agents. Each task
appends its own LOG line and fills its Implementation Notes and its row here.

## Implementation Notes

### FE_01: Toolbar and read-only version view
_Status:_ Completed. Fold `runs` (`BoardRun`) and `boardVersions` (reads.ts, next to `boardList`): a run is an agent's consecutive drawing lines among the board's own lines (board seen skipped), so a person act or another agent ends it; "now" is the board's head. Flag `versionView` (on): picker titles only, hidden `h1#title`, `#version` select; flag off is the old toolbar exactly. `apps/board/src/board/versions.ts`: past fold from `read_ledger` pages up to the line, `guard` for acting stage handlers, `listed` for the dropdown; read-only via `sender.ts` (`READ_ONLY`), `attention.ts` (no board seen), `#world[data-readonly]` CSS, `COMMANDS.acts`, `pointer.ts` (no move when nothing carried). `VersionBanner.svelte` + gallery section. For later tasks: `--vb-banner-h` beside `--vb-strip-h` in the stage inset; `controller.ts` is at 300 lines. Board and gallery screenshots use `-versionView`; new baselines `versions.spec.ts/past-version-*`. All five gates 0.

### FE_02: Container finder
_Status:_ Completed. Toolbar `<select id="containers">` after the version dropdown, shown with flag `containerFinder` (on). Rows from `finder.ts` `containerRows` (board order, counts, Later last and disabled with "0 items" while empty); choosing calls `Board.goToContainer` -> `vp.fit` on the `layout.regions` box and focuses the title heading; works in a past version. No key (none obvious and free). Board screenshots now also use `-containerFinder`; new `tests/pages/finder.spec.ts`. CSS: `.vb-select-menu`, and only `#board` may shrink in the toolbar. `controller.ts` still 300 lines. All five gates 0.

### FE_03: Reset places for a selection
_Status:_ Completed. Command `reset-places` (key R, `acts`) in the selection bar; disabled while no selected card is pinned (`BarButton.disabled`, new pattern state). `places.resetCards` sends one `unpin` per pinned selected card as one `sender.run` step (one redraw). With no selection R still resets the focused card. Refused in a past version. `controller.ts` still 300 lines. New `tests/pages/reset-places.spec.ts`; gallery full-page baselines updated (bar's new button only). All five gates 0.

### FE_04: Key commands bubble
_Status:_ Completed. A round "?" bottom left (`shell/KeyHelp.svelte`, `styles/key-help.css`) via `bindHoverTip`: hover or focus lists every command, it stays while the pointer is on it, Esc closes, `?` opens it (the component's own listener, so `controller.ts` stays at 300). The list is `board/key-help.ts` `keyGroups()`: Items from the registry `ACTIONS` with keys, Selection/Board/View from `COMMANDS` (`GROUP_OF` is a Record over `CommandId`, so a new command needs a group); only keys neither table owns (J/K, Space, Alt+arrows, H, pointer gestures) are listed by hand, in `OTHER`. The old `.vb-help` bar is gone. Flag `keyBubble` (on); off shows no key help (no old markup remains). `bindHoverTip` exported from the `packages/ui` front door. Board screenshot baselines updated (bar strip became the bubble); gallery full-page screenshot uses `-keyBubble`; new `tests/pages/key-bubble.spec.ts` and `apps/board/tests/key-help.test.ts`. All five gates 0.

### FE_05: App icon
_Status:_ Completed. Token `--vb-brand-mark` (approved wording, `tokens.css`). `shell/AppIcon.svelte` (the A · Flow drawing on a 24 grid, `currentColor`, still) replaces the placeholder in the toolbar; `.vb-brand` in `board.css` sets its size and colour. `apps/board/public/favicon.svg` (Vite copies `public/`; light value as base, dark under `prefers-color-scheme`) linked from both pages; `apps/board/tests/app-icon.test.ts` fails if the favicon's colours differ from the token. Gallery gets an unflagged "App icon" section, so the gallery full-page baselines changed; board baselines changed because the icon is 24px not 22px (toolbar shifts 2px). `controller.ts` untouched (300 lines). All five gates 0.

### BE_01: New board and rename
_Status:_ Completed (paused overnight 2026-10-08, resumed). Ledger v9 (`PERSON_TOO`, board `$defs/rules`), `put_board` `PUT /api/boards/{board}` (201 create, 200 rename; openapi 1.8.0; api.md 90-92). Person-made board: no agent creator, every agent needs the board granted, its `board` item `forbidden`. A rename keeps containers and is no `board.drawn` or version (fold counts agent lines only). Registry `BOARD_ACTIONS`; flag `boardEdit`; picker entries "New board…" / "Rename board…" (off in a past version) open `shell/BoardDialog.svelte`; `board/board-edit.ts` makes the id from the title; the sender's `board()` carries the read-only guard. `controller.ts` 297 lines. New `api-boards.test.ts`, `board-edit.test.ts`, `tests/pages/new-board.spec.ts` (EMPTY_BASE); no baselines changed. Skill note added. All five gates 0.
