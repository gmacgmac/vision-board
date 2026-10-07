---
task_name: Found In Use - Connectors, Live Updates, Watch Mode, Polish
created: 2026-10-07
completed: 2026-10-07
status: completed
categories: [board-app, board-ui, board-format, board-layout, project-tooling]
tracker:
---

# Found In Use - Task Status

> **Plan**: [PLAN.md](./PLAN.md)  
> **Created**: 2026-10-07

## Execution record (read this first if resuming)

- Branch `main`. Gates after every task, run and read by the orchestrator: `npm test`,
  `npm run check`, `npm run verify`, `npm run test:pages`, `npm run gen -- --check` (exit 0 each).
- Page tests can't run in parallel (fixed ports 4468-4470), so every wave is one task.
- The 4 gallery screenshot baselines differ by 3-6 pixels on the new test browser (Playwright
  1.63, chromium-headless-shell 1243), with or without this work (checked 2026-10-06 by stash).
  FE_01 regenerates them after viewing the diffs.
- Open for the maintainer, not decided here: the version chip shows the ledger position
  (`view().version`) while the picker shows the board's own last line.

---

## Instructions for Agents

1. **Read PLAN.md first** to understand full context
2. **Read notes from completed tasks** before starting yours
3. **Respect the Wave column** — do not start a task whose wave has not been reached
4. **Reuse Shared Foundations** — check that table before writing a helper, type, or component;
   if it is listed, import it, do not reinvent it
5. **If you need to deviate, STOP and inform the user**
6. **Update frontmatter `status`** per `cortex-task-exe`'s Task-Set Frontmatter Lifecycle:
   `planned` → `in-progress` when you start, → `completed` when the table below is all done
7. **Update your row** in the Task List table below when you finish
8. **Add implementation notes** to your task file and brief notes here
9. **No git commits** throughout these tasks

---

## Task List

| # | ID | Wave | Task | Model | Status | Notes |
|---|-----|------|------|-------|--------|-------|
| 1 | FE_01 | 1 | [Connectors behind cards: record, tests, gallery](./FE_01_wire-layers.md) | Sonnet 5.5 | COMPLETED | Test, gallery section, pattern states, baselines done |
| 2 | BE_01 | 2 | [Project stream, board heads in the fold, build event](./BE_01_project-stream.md) | Opus 5.5 | COMPLETED | `watch_project`, `build` event, `heads`/`boardList`; API 1.5.0 |
| 3 | FE_02 | 3 | [Page follows the project: list, badge, empty wait, view kept](./FE_02_live-boards.md) | Opus 5.5 | COMPLETED | One stream, `listed()`, new badge + chip, `kept-view.ts`, flag `keepView`; port 4470 |
| 4 | BE_02 | 4 | [npm run board:watch](./BE_02_board-watch.md) | Sonnet 5.5 | COMPLETED | `scripts/board-watch.mjs`, test, `npm run board:watch`, READMEs |
| 5 | FE_03 | 5 | [Container polish: stack gap, two-line titles, popovers](./FE_03_container-polish.md) | Sonnet 5.5 | COMPLETED | List/lanes `GAP`, 2-line title + `titleTip`, popovers z 4, shared `bindHoverTip` |
| 6 | FE_04 | 6 | [Note polish: hover preview, growing editor](./FE_04_note-polish.md) | Sonnet 5.5 | COMPLETED | Card note hover tip (`bindNoteTip`, flag `notePreview`), notes are tab stops, growing editor |
| 7 | VERIFY_01 | 7 | [End-to-end check](./VERIFY_01_end-to-end.md) | Orchestrator | COMPLETED | Real MCP writes, watch reloads, maintainer's ledger checked |

**Status Values**: `Pending` | `In Progress` | `COMPLETED` | `Blocked` | `Deferred`

---

## Shared Foundations

| Artifact | Created by | Consumed by |
|----------|-----------|-------------|
| `watch_project` operation (`GET /api/events`) in `packages/format/schema/openapi.json`, regenerated `operations.generated.ts` | BE_01 | FE_02, BE_02 |
| `build` event (`packages/format/schema/api/sse-build.schema.json`), sent only under `VB_WATCH=1` | BE_01 | FE_02, BE_02 |
| Board heads in the fold: `LedgerState.heads` (`packages/actions/src/fold.ts`, `applyEvent`) and a `boardList(state)` read in `packages/actions/src/reads.ts` | BE_01 | FE_02 (picker), BE_01 server `listBoards` |
| `watchProject` in `apps/board/src/board/io.ts` | FE_02 | BE_02 (manual check only) |
| Hover tip: `bindHoverTip` (`packages/ui/src/tip/hover-tip.ts`) and the `.vb-tip` box (`packages/ui/src/tip/tip.css`) | FE_03 | FE_04 (card note hover preview) |

---

## Implementation Notes

### FE_01: Connectors behind cards
_Status:_ COMPLETED  
_Notes:_ `tests/pages/wires.spec.ts` (flag on/off, gallery, axe, screenshots; fails if `z-index: -1` is removed), gallery section `wire-section.ts` behind the flag, pattern state `see-through`, `gallery-*` and `node-size-*` baselines regenerated after viewing the diffs (browser update only). `gallery.spec.ts` full-page shot now passes `-wireLayers` too, as it does `-agentAccess`. `controller.ts` is 300 lines. All five gates exit 0.

### BE_01: Project stream
_Status:_ COMPLETED  
_Notes:_ `watch_project` (`GET /api/events`, API 1.5.0) and `sse-build.schema.json`; handler shares a `stream` helper with `watch_board` in `server/reads.ts`. `server/build-watch.ts` `watchBuild` runs only under `VB_WATCH=1` (`createBoardServer({ build })`, `Ctx.build`); test harness `startBoard({ watch: true })`. `LedgerState.heads` in `applyEvent`; `eventBoard` moved to `fold.ts` (avoids a fold/reads import cycle), `boardList` in `reads.ts`, `boardHeads` removed; `emptyState` now exported. FE_02: the page can fold `heads` incrementally and call `boardList(state)`. Stream tests are in a new `api-events.test.ts`. api.md 78-80. All five gates exit 0.

### FE_02: Page follows the project
_Status:_ COMPLETED  
_Notes:_ `client.watch` takes several event names (`on(data, event)`); `io.ts` `watchProject` replaces `watchBoard`, `listBoards`/`BoardSummary` removed, `shell.boards` is `BoardListItem[]`. `live.watch()` follows `watch_project` and reloads on a changed `build`. `boards.ts` `listed()` (from `onLines`) rebuilds the list, badges new boards (`shell.newBoards`), opens the first board of an empty project. `kept-view.ts` + `Viewport.snapshot/restore`, flag `keepView` (on). Chip `#new-boards` inside `#counts` (existing live region). `live-boards.spec.ts` (4) on a third server, `EMPTY_PORT` 4470. controller.ts 299 lines. All five gates exit 0 (pages 133). BE_02: `watchProject` reloads the page on a new `build` id; the view is saved on `pagehide`.

### BE_02: board:watch
_Status:_ COMPLETED  
_Notes:_ `scripts/board-watch.mjs` (77 lines) runs `npm run watch` and, after the first fresh build, `node --watch-path=… apps/board/server.ts` with `VB_WATCH=1`; each child in its own process group, prefixed output, either exit stops both. Test `scripts/board-watch.test.mjs`. Checked by hand on port 4480: a token edit gives a new `build` id with no restart; a server edit restarts the server and changes the id; Ctrl+C leaves nothing running. README.md (Running), `apps/board/README.md`; `npm run map` refreshed the actions row (BE_01 exports). All five gates exit 0.

### FE_03: Container polish
_Status:_ COMPLETED  
_Notes:_ `list` and `lanes` stack `GAP` apart (`stack-gap.test.ts`); `h2` clamps to 2 lines; flag `titleTip` (on) with the full-text tip, built on the reusable `bindHoverTip` + `.vb-tip` (`packages/ui/src/tip/`, rules of `previewStep`; FE_04 reuses it: pass `anchor`, `tip`, `group`, `attr`, `needed`, and place the box in the pattern's CSS). Popovers: tools box keeps the row height in the narrow query and the popovers are z 4. `region.css` split (`region-note.css`) to stay under 300 lines. Gallery "Long titles" group, `container-polish.spec.ts` (8), baselines regenerated after viewing (gallery, agent-access, node-size, see-through). All five gates exit 0 (pages 141).

### FE_04: Note polish
_Status:_ COMPLETED  
_Notes:_ `bindNoteTip` (`packages/ui/src/node/node-note-tip.ts`) on `bindHoverTip`, which now takes `:host` as anchor/group; one tip per note, markup in `notesMarkup`, flag `notePreview` (on, `data-note-preview` on the world). Each note is a tab stop (focus shows the tip, Enter opens the bubble). The 3-line clamp now also has a height cap so notes with lists or code are cut (and previewed). `vb-note-bubble` `grow()`: grows to 240px then scrolls, never shrinks (manual resize stays). Gallery: card 91 + two ledger lines, "Note preview" group, bubble "Long text" sample; `note-polish.spec.ts` (8). Baselines regenerated after viewing (gallery, markdown, agent-access, node-size, see-through). controller.ts 300 lines. All five gates exit 0 (pages 149).

### VERIFY_01: End-to-end check
_Status:_ COMPLETED  
_Notes:_

---

## Completion Checklist

- [x] All implementation tasks complete
- [x] Verification task complete
- [x] LOG entry created (see below)

## On Completion

1. Frontmatter: `status: completed`, `completed: YYYY-MM-DD`.
2. Append one LOG line: `[[YYYY-MM-DD HH:MM]] [board-app] Completed set: Found In Use → Task: [[cortex-tasks/board/2026-10-07_board-app_found-in-use/TASK-STATUS.md]]`
3. `cortex-garden` picks it up later. Nothing here writes to `AUDITED.md`.
