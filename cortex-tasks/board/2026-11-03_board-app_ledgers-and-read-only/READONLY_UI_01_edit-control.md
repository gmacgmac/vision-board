# READONLY_UI_01_edit-control: Read-only and Edit in the header

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

With `readOnlyStart` on, the header always shows whether the ledger is read-only or being edited here, at all three
widths, with Edit and Stop editing beside the ledger; a refused Edit says who holds the ledger; every disabled write
control says why.

## Context

PLAN decisions 12, 13 and 16. READONLY_01's notes first: it gives `get_project` `readOnly` and `editing`, the
`edit_ledger` / `stop_editing` operations, the `read-only` problem and the page's widened read-only condition.
LEDGER_UI_01's notes: the ledger's page parts and its `ledger` row in `header-tier.ts`. Patterns (research):

- The Locked padlock: `apps/board/src/board/chrome/LockedChip.svelte` (padlock plus "Locked"); `styles/header.css`
  hides the word at a third (`[data-tier='third'] .vb-chip-locked .vb-chip-word`) and when crowded; `locked` is in
  neither `IN_MENU` nor `GONE`, so it stays in the bar at every tier. The read-only state does the same (decision 16).
- `ToolbarEnd.svelte` passes `SendButton` `paused` from `shown.locked`; `ToolbarMenu.svelte`'s Lock row (`isLocked`,
  `lockTip`). Gallery: `header-section.ts` (one sample `locked: true`), `lock-section.ts` `lockSection`. Specs:
  `tests/pages/lock-board.spec.ts`, `header-tiers.spec.ts`.
- The control is the standalone host's (the lock is the standalone server's): a page part beside the ledger's, so the
  plugin seam does not change. PLUGIN_RO_01 decides how a plugin host shows its own state.

## Inputs

- **Files to modify**: TASK-STATUS.md File Ownership (READONLY_UI_01, wave 5)
- **Files to reference**: `docs/specification/components.md` § The header by its own width, § the locked board;
  `docs/specification/words.md`; `packages/ui` chip and button patterns
- **Shared artifacts to reuse**: READONLY_01's operations, problem and condition; LEDGER_UI_01's page parts and table row
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. **The state chip**: a chip after the ledger: an eye icon and "Read-only" while read-only, a pencil and "Editing"
   while this server holds the lock; the word hides at a third and when crowded, the icon never does. Its tooltip and
   accessible name say the whole state ("Read-only: press Edit to change this ledger"; "Being edited on <computer>
   since <time>" when another holds it).
2. **Edit and Stop editing**: Edit in the chip's menu and as a button where room allows at full; Stop editing in the
   same places while editing; both rows of "⋯" at a third. Pressing Edit shows loading, then Editing, or the
   holder's words in a toast (`notify`, tone error) and stays read-only. Keyboard and focus as the board picker.
3. **Every disabled control says why**: Send, flag, ✓/✗, notes, New board…, Rename board…, Lock board…: disabled with
   READONLY_01's reason as the tooltip, the way a locked board's are. Nothing is hidden that the person would look for.
4. **States**: idle, hover, focus, pressed, loading (Edit taking the lock), success (Editing), error (refused),
   disabled (the folder cannot be written: the reason from `get_project`, if READONLY_01 gives one).
5. **Gallery**: the chip in the three forms, read-only and editing, held by another; the Edit refusal.
6. **Specs**: `tests/pages/read-only.spec.ts` (new): opens read-only; every write control disabled with its reason;
   Edit then a write works; a second server holding the lock makes Edit say who; Stop editing returns to read-only;
   the chip present at 1400, 900 and 600 px; axe and APCA, light and dark; flag off shows no chip and writes as today.
7. **Docs** (`cortex-docs`): `components.md` (the chip, Edit and Stop editing, in each header form).
8. **Look**: in a browser at three widths, light and dark, with both flags on; screenshots in your notes.

## Validation

- [ ] `read-only.spec.ts`, `header-tiers.spec.ts`, `lock-board.spec.ts`, `ledgers.spec.ts` green (port 6700)
- [ ] `npm run verify`, `check`, unit green; gallery complete; axe and APCA pass; the look done

## Implementation Notes

_To be completed by the agent. Re-run? Add a `### Run N` block; never overwrite an earlier run._

**Status**: Completed (2026-11-03, Opus 5.5, worktree `feat/readonly-ui-01`, `VB_TEST_PORT` 6700)

### Changes Made
- **The state chip** (`shell/EditChip.svelte`, page part `editChip`): after the path and before Locked, an eye and
  "Read-only" or a pencil and "Editing"; Locked's look (`styles/editing.css`), editing ringed in `--vb-accent-line`. A
  `.vb-chip-btn` opening a small menu (`toolbarPopup`, now exported from `board/chrome/index.ts`): the state in words, then
  Edit or Stop editing. Tooltip and accessible name = the whole state (`editing.ts` `stateTip`, with the holder's
  computer and time from `get_project` `editing`). A polite status says a change between read-only and editing. The page
  re-reads `get_project` when the board's reads flip `readOnly` (another tab, `editing` SSE) and when the menu opens.
- **Edit / Stop editing** (`shell/EditButton.svelte`, page part `editButton`): a button at full (pencil alone under 1500px;
  hidden under a 1360px content box and on a crowded full bar, where the chip's menu holds it), a row of "⋯" from half
  (`HeaderFields.svelte`). Stop editing carries the eye (what it turns the ledger to). Loading: spinner, "Opening for
  editing…"/"Stopping…", `aria-busy` + `aria-disabled`, focus kept. `shell/editing.ts` `toggleEditing` uses READONLY_01's
  `page-io.ts` `editLedger`/`stopEditing` (not re-created); a refusal re-reads the folder and toasts
  "Still read-only: <host> has been editing this ledger since <time>…" (else the server's words). `shell.editBusy`.
- **The table** (`header-tier.ts`): `editing` (in the bar at every tier, decision 16) and `edit` (bar at full, "⋯" at half
  and a third); `HEADER_CONTROLS` order: version, editing, edit, locked. `BoardPageParts` gains `editChip`, `editButton`
  (standalone only; plugin types hash unaffected, `plugin-types.test.ts` green).
- **Every write control says why** (READ_ONLY_PERSON): `#ui` `node-core` / `region-core` pause on `BoardState.readOnly` as on
  `locked`, plus `NodeState.readOnly` pausing the flag (`vb-node.ts` `FLAG`; read-only writes no flag); Send
  (`ToolbarEnd.svelte` `paused`); New board… / Rename board… options disabled with the title (`BoardPicker.svelte`); Lock
  board… / Archive board… rows (`ToolbarMenu.svelte`); Accept all (`ProposalsBar.svelte` `readOnly`, `BoardChrome.svelte`);
  Restore (`ArchivedList.svelte` `paused`, `ArchivedDialog.svelte`). pattern.json (node, region) and `paused.ts` say so.
- **READONLY_01-R3**: `chat-panel-types.ts` `show(board, past, readOnly?)`; `App.svelte` passes `shell.readOnly`. Edit
  control and `#ui` pause as above.
- **LEDGER_UI_01-R1**: "Ledger" lives once, in `board/words/chrome-common.ts` `ledger` (the words test forbids it in both
  toolbar.ts and shell/words/ledgers.ts; LedgerPart, page-parts and ledger-section now import it); `moreTitle` gains
  `ledger` (", New ledger", given `ledgerRow && !ledgerAbove`); `Toolbar.svelte` `ALSO` has `['ledger', …]` (shown when
  `ledgerField` is given). Test in `ledgers.spec.ts` ("the ⋯ tooltip names New ledger at full, and the Ledger row at a third").
- **GATE3-R1** (cause found, fixed in the page): the 8 characters were "Zoom 47%", `ZoomLevel.svelte`'s polite status.
  It announced the opening fit (status zoom 100 → the fitted level after the first draw) 600ms later, against its own
  rule ("the level the page opens at is not news"); whether `layoutOf` ran before or after those 600ms decided the
  test, and wave 3's heavier first open tipped the first open past it. Now a level change is news only after the open
  board's first draw and not in the turn a board opens (switch included). Failing test first:
  `zoom-level.spec.ts` "the level a board opens at is not news" (failed with "Zoom 47%", passes); host-styles 550px pane
  test 6/6 (`--repeat-each 3`, light and dark).
- **Words**: `shell/words/editing.ts` (area `editing`, registered in `docs/specification/words.md`).
- **Gallery**: `gallery/editing-section.ts` (flag `readOnlyStart`, last): the three forms read-only and editing ("⋯" open at a
  third), the chip idle/hover/focus/pressed/opening/editing/stopping/held by another (menu open), Edit button
  idle/hover/focus/pressed/loading and Stop editing, the rows, the refusal toast, "⋯" with Lock/Archive off, paused container
  and cards (flag paused), Send paused. `lock-section.ts` `pausedBoard` exported for it; `chrome-sample.ts` takes a status.
- **Specs**: `tests/pages/read-only.spec.ts` (new, 13 tests); `folder-server.ts` `readOnly` option (edit false,
  `readOnlyStart`); `zoom-level.spec.ts` +1; `ledgers.spec.ts` +1. Unit: `header-tier.test.ts`, `node-paused.test.ts`.
- **Docs**: `components.md` § 5 (the `editing`/`edit` controls and the fit), § 6 new paragraph "Read-only and Edit",
  § Lock a board 6a (pointer), § zoom level (opening level not announced); `words.md` (the new home).

### Issues & Resolutions
- At a full 1470px bar with long names the folder chip kept its room (header.css: no shrink from 1400px) and the path
  overflowed onto the chip: with the state chip present the folder now gives up its room, and a crowded full bar drops
  the Edit button first (the chip's word is what the person reads at a glance, so it stays longest).
- At 620px (half) the word did not fit beside the path: a half under a 720px content box shows the icon alone.
- The chip first counted as "crowding" for the half rule, which bared "N open" whenever read-only; now it only gives up
  its word with Locked's triggers.
- Gallery samples with no `editing` given read the page's folder (EditChip's re-read), which put the test machine's path
  into the lock and header sections' "Current:" line with the flag on: a gallery sample now gets `folder: null` unless given.
- Two Send samples shared id `send` with the flag on (gallery "no id twice"): the read-only sample has its own id.
- `state` as a variable name clashes with the `$state` rune in svelte-check: named `mode`.
- No `timeout` binary: runs limited with `perl -e 'alarm N; exec …'`.

### Caught Beyond the Brief
- The server's Edit refusal words (`server/lock.ts` `holderMessage`) say "running since <ISO time>. Stop that server first." —
  advice for a second server, not for a person pressing Edit, and an ISO stamp; the page now says it in its own words from
  `get_project`, falling back to the server's (request R1).
- Another computer taking or releasing the lock while this page is read-only reaches no stream (`editing` SSE is this
  server's own presses): the chip's "being edited on…" can be stale until the menu opens or Edit is pressed (it re-reads then) (request R2).
- Step 4's disabled state (the folder cannot be written) has no reason from `get_project` (READONLY_01 gives none): not drawn.
- The selection bar's acting commands are already off while read-only (`selection-flow.ts` `place`, `paused` covers it).

### Deviations from Plan
- Small: the chip sits after the whole path (before Locked), not between the ledger and the board: the path stays a path,
  and at a third, where the ledger is in "⋯", the chip keeps one place. Its words still name the ledger.
- Small: `board/words/chrome-common.ts` (no owner this wave) gained `ledger`, because the words test allows "Ledger" in
  one home only; `toolbar.ts` gets no `ledger` word, `Toolbar.svelte` imports the common one.
- Edit is also a row of "⋯" at half (not only the chip's menu), so nothing is hidden that the person would look for.

### Look (step 8)
Built page on my own server (port 6702, temp `HOME` and project in the session scratch folder, `VB_FLAGS=readOnlyStart,ledgerFolders`,
`?flags=readOnlyStart,ledgerFolders`), never 4466. 1400 light and dark: "atlas / main / Where Vision Board goes from here / v36
[eye Read-only ▾] [pencil]"; Edit → "Editing" with the eye button (Stop editing), cards unpaused, Send "Nothing new to send";
chip menu in dark ("Read-only: press Edit to change this ledger" / Edit). 900 light and dark: folder icon, "main", the board,
"Read-only ▾", "⋯" holding Edit first. 600 light and dark: the board's name and the eye alone; "⋯": Folder, Ledger, Edit,
Version…. Long names at 1470 (atlas-customer-research-programme-2027 / customer-research-interviews-2027-q1-q2 / a
105-character board, Locked, flagged): "atl… / customer-res… / Interview no… / v4 [Read-only ▾] [Locked]", nothing cut off.
Screenshots: the session's browser captures (tool results) and the gallery's `__screenshots__/read-only.spec.ts/read-only-{light,dark}-darwin.png`
(new; no existing screenshot changed).

### Verification
- Tier: wide (a shared `#ui` element change, the header table, chrome controls, a page part, spec helpers). `npm run check`
  0 errors; `npm run verify` ok (34 warnings: `read-only.spec.ts` 306 lines is new).
- Unit (flag off and with `readOnlyStart` defaulted on by a temporary local flip of `flags.ts`, reverted, no diff left):
  `scripts/*.test.mjs`, `packages/ui/tests/**`, `header-tier`, `plugin-types`, `chat-*`, `kept`, `tests/plugin/spec-truth`: 565/0 both.
- Pages (`nice -n 15`, 3 workers, port 6700), flag off: read-only 13, lock-board, header-tiers, ledgers, read-only-writes,
  zoom-level, toolbar, new-board, picker-archive (98), gallery, host-styles, board-chrome, chat-panel (46), proposals-notice,
  proposals (25): all passed. Flag defaulted on: read-only, lock-board, header-tiers, ledgers, gallery, read-only-writes,
  zoom-level: all passed but the four that assume the flag's default is off (the gallery sections "last"/"only with the flag"
  in header-tiers, ledgers and read-only, and read-only's "flag off on the page"), as expected.

## On Completion

Notes; your row; one LOG line (`[board-ui] READONLY_UI_01: …` → this file, one line ending in a newline); the return
block with `REQUESTS`. No commit.
