# FE_02_ledger-chip-and-memory: Ledger chip and page memory per ledger

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The ledger chip shows whenever the server names a ledger (tracker M51, PLAN decision 3), and the page's memory is kept
per folder and ledger (tracker M52, PLAN decision 4).

## Context

VERIFY_01 F11 and F15 in the previous set's findings. Today the header's page parts are built at boot, before the
folder is read, so the chip follows the page flag; and `apps/board/src/shell/kept.ts` `pageStore` keys by board id
only, so `main/plan` and `ui/plan` share zoom and proposals-hidden.

## Inputs

- **Files to modify**: `apps/board/src/shell/{page-parts.ts,App.svelte,shell.svelte.ts,kept.ts,LedgerPart.svelte}`,
  `apps/board/src/board/host.ts`, the header files in your ownership, `gallery/ledger-section.ts`, the specs you own
- **Reuse**: `get_project` `ledger` / `ledgers`; `host.ts` `ledgerChip` / `ledgerField` / `ledgerRow`;
  `header-tier.ts` (the one table for where a control sits); LEDGER_UI_01's last-board key rule (`main` keeps the
  folder's old key) for the memory move
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. Failing specs: a server with ledgers and a page with `?flags=-ledgerFolders` shows no chip; zoom set on
   `main/plan` shows on `ui/plan`.
2. Build the ledger parts from the server's answer (after the folder is read); the "⋯" row and its tooltip follow.
3. Key `pageStore` by folder and ledger as well as board; `main` of a folder keeps the old keys (nothing lost); a
   unit test of the key rule.
4. States unchanged; axe and APCA; a look at 1400, 900, 600 px, light and dark, on your own test server.
5. `components.md` / `words.md` updated where they describe these.

## Validation

- [ ] Both specs fail first, then pass; header-tiers, ledgers, last-board, current-folder green; `verify`, `check`, unit tests

## Constraints

Deviation from a PLAN decision: stop and report (`DEVIATION`). No PII in examples. No git commits. Long writes in
chunks. Only your files (TASK-STATUS File Ownership); other needs under `REQUESTS`.

## Implementation Notes

_Re-run? Add a `### Run N` block; never overwrite an earlier run._

**Status**: Completed (Run 1, 2026-11-03, Opus 5.5, worktree `feat/fe-02`, `VB_TEST_PORT=6200`)

- [x] Both specs fail first, then pass; header-tiers, ledgers, last-board, current-folder green; `verify`, `check`, unit tests

### Changes Made
- **M51** `shell/page-parts.ts` `pageParts`: `ledgerChip` / `ledgerField` / `ledgerRow` are getters, there only while
  the folder the page read names a ledger (`shell.folder.ledger`), whatever the page's own `ledgerFolders` flag. Svelte
  tracks the getter where the header reads it, so the chip, the path's "/", the "⋯" rows and the "⋯" tooltip follow the
  server, also when a page opened on the old layout presses Edit and the folder then names `main`. A gallery sample
  (`placement: 'gallery'`) still needs the page's flag too, as every gallery sample does.
  `board/chrome/Toolbar.svelte` `given` is `$derived` (it read the parts once). `shell/folder.ts` `ledgersOn` removed;
  `App.svelte` draws `LedgerDialog` while the folder names a ledger.
- **M52** `shell/kept.ts`: `ledgerScope(folder)` (the one rule: '' for `main`, the old layout and no folder; else
  `ledgerFolder(path, ledger)`) and `pageStore(scope)` (keys `vb.<key>`, plus `:<scope>` under another ledger, read at
  each call). `page-host.ts` passes `() => ledgerScope(shell.folder)`. `folder.ts` `lastBoardKey` uses `ledgerScope`
  (same keys as before). `App.svelte` reads the folder (`loadFolder`) before it mounts the board, so the proposals
  notice's first read (`ProposalsBar.svelte` `start`, at chrome mount) already has the ledger; `wanted()` reuses it.
- Comments: `board/host.ts` `BoardPageParts` (a part may come and go), `header-tier.ts`, `LedgerPart.svelte`,
  `LedgerRow.svelte`.
- Tests: `tests/pages/ledgers.spec.ts` "the page's flag off: the server names a ledger…" (replaces "the flag off: no
  ledger…") and "a server that names no ledger…" (its own one-ledger folder server); new `tests/pages/ledger-memory.spec.ts`
  (zoom of `main/plan` vs `ui/plan`, and the proposals notice hidden); `apps/board/tests/kept.test.ts` "ledgerScope…" and
  "pageStore: under another ledger…" (the existing pageStore test calls `pageStore(() => '')`).
- Docs: `components.md` (the host's store paragraph; § 5 the `ledger` control; § 6 the ledger chip paragraph);
  `words.md` (the ledgers row's scope).

### Caught Beyond the Brief
- A stray "/" in the path when the page's flag is on and its server names no ledger (a part given that drew nothing),
  and "Ledger" in the "⋯" tooltip at a third: both fixed by the getters (spec "a server that names no ledger").
- `proposals-hidden` is one key for every board (not per board), so before this it was also shared across folders and
  ledgers; now per ledger, still shared by `main`s of different folders (decision 4 keeps `main` on its old keys).
- `gallery/ledger-section.ts` meta still says "off by default · on with ?flags=ledgerFolders" (stale since the close);
  left, since its text is in the `ledgers-{light,dark}` screenshots (T_01's to re-take). Request.
- `packages/format/src/flags.ts` `ledgerFolders` comment: "Read by the standalone server (VB_FLAGS) and its page": the
  page now reads it only for the gallery. Request (orchestrator file).

### Deviations from Plan
- Step 2 says "built after the folder is read": the parts are getters over the folder rather than built once, so they
  also follow a folder that starts naming a ledger later (old layout → Edit). The board's mount does wait for the folder
  read (for M52). Same result as the decision, said here.
- The reading of decision 4: `main` (and the old layout) keeps `vb.<key>` exactly, so `main` of two folders still share a
  board id's zoom and `proposals-hidden` (as before this set). Another ledger is keyed by folder and ledger.

### Verification (normal tier)
- Failing first: M51 spec (no chip), "names no ledger" (3 path separators), zoom (ui/plan showed main's zoom),
  proposals (ui/plan's notice hidden). After: `ledgers.spec.ts` 19/19 and `ledger-memory.spec.ts` 2/2.
- Pages (nice 15, 3 workers, port 6200, 5 min each): header-tiers, last-board, current-folder 47/47; open-folder,
  read-only, ledger-folders, live-boards, proposals-notice 47 pass, 1 fail (read-only's gallery screenshot: the sample's
  ledger showed under `-ledgerFolders`; fixed by the gallery rule above, then green below); read-only, ledgers,
  ledger-memory, gallery 51/51; toolbar, board-chrome, chat-folder, note-folder, new-board, picker-archive, lock-board,
  board-host, read-only-writes 64/64; chat-panel, chat-follow, card-image-states, proposals, note-discard, host-styles 61/61.
- `npm run check` 0 errors; `npm run verify` ok (35 warnings, none new from this task); `--write-map` leaves
  `modules.md` as it is; unit: kept, header-tier, board-no-page, plugin-types, folder-path, start-board, scripts,
  spec-truth 136/136.
- axe and APCA: `ledgers.spec.ts` axe at every form and APCA, light and dark, pass (the chip's look is unchanged).
- Look: a two-ledger folder server on port 6219, page `?flags=-ledgerFolders`: 1400 light and dark (folder / main /
  board / v4), 900 light and dark (folder icon, "main", the board), 600 light and dark ("⋯": Folder, Ledger main, …).

## On Completion

Notes; your TASK-STATUS row; one LOG line, `[board-ui] FE_02: … → Task: [[cortex-tasks/board/2026-11-03_board-ui_read-only-follow-ups/FE_02_ledger-chip-and-memory.md]]`, ending in a newline; the return block.
