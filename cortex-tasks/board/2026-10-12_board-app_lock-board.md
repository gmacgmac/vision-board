---
category: board-app
status: completed
created: 2026-10-12
tracker: cortex-tasks/tracker.md#N40
---

# Lock a board: read-only for everyone until the person unlocks it

> **Follows**: `2026-10-12_board-app_archive-board.md` (reuse its acts pattern and its single check)
> · **From**: maintainer, 2026-10-12 (chat 622-626, "I agree with everything in 626") · **Model**:
> Opus 5.5 · **Go**: given; starts when the archive task is committed

## Rulings (maintainer; do not reopen)

1. **Locked = read-only for everyone** (623). The board stays visible and readable for the person
   and agents; nobody changes it until the person unlocks it.
2. **Only the person locks and unlocks** (rule 8): two person acts, `lock` and `unlock`, on a board,
   recorded in the ledger like `archive`/`restore`. Agents can do neither.
3. **Agents:** every write on a locked board (`write_board`, `request_grant`, proposals, replies,
   appends, parks, retires) is refused with "This board is locked; ask the person to unlock it."
   Reads work as usual and say the board is locked (a `locked` field on `get_board` and
   `list_boards`), so an agent knows before it tries.
4. **The person:** card buttons (✓ ✗ comment, more context, Later, flag excepted?) and moves,
   resizes, mode and widths changes, notes and Send are paused while locked, with the reason shown
   ("Locked: unlock to change it"). The private flag stays usable (it never reaches an agent and
   changes nothing on the board) — confirm in the notes. "⋯" › "Lock board" / "Unlock board";
   the locked state shows in the toolbar beside the board name.
5. **Archive implies lock** (624): archiving locks the board; restoring returns it to the lock state
   it had before archiving.
6. **The icon is a flat SVG** in `apps/board/src/shell/ButtonIcon.svelte`'s style (24 grid, 1.5
   stroke, currentColor); never an emoji (maintainer: "I hate them").
7. **Robust like archive:** one "may this be written" check in the action layer that every write
   (person and agent) goes through; a test that walks every agent write operation in
   `packages/format/schema/openapi.json` and asserts each is refused on a locked board, so a future
   operation is covered or fails; the chat panel's messages still go (they are chat, not board
   writes) but the agent's board writes are refused, and the skill tells it what to say.

## Steps

1. [x] Contract first: the two acts (ledger minor bump), `locked` on board reads, the refusal
   problem (`locked`, 409 or 423: say which and why), OpenAPI, `npm run gen`, api.md.
2. [x] Failing tests first: the fold's locked set; the contract-walking write test; reads say
   `locked`; archive locks and restore returns the earlier state; agents can't lock; page tests for
   the menu rows, the toolbar state, paused buttons with the reason, the flag still working,
   keyboard, axe light and dark.
3. [x] Build: the single check; server; page; the icon; gallery entry; flag `lockBoard`, on by
   default. One skill line: on "locked", tell the person in one line and stop.
4. [x] Docs: api.md, components.md.
5. [x] Make `tests/pages/picker-archive.spec.ts` "the picker's Archived list: Esc closes it; Restore …"
   (line 111) deterministic: in a full run the Archived dialog sometimes doesn't reopen after a second
   picker selection (found by the orchestrator, archive task notes). Fix the cause, not the wait.

## Validation

- [x] The five gates exit 0, one after another.
- [ ] By hand (orchestrator): lock a board a chat-panel agent is using; its write is refused and it
  says so in one line; your card buttons pause; unlock; both work again.

## Constraints

- Project rules (`.kiro/steering/vision-board-proj.md`): contract first, patterns first, one job per
  file about 300 lines (500 hard), tests first, tokens only, every state, accessibility.
- No git commits or stash. Protected files: propose wording. Scratch in the system temp folder;
  stop only your own processes and leave none running; never touch `.visionboard/` or real
  home-folder files; don't use the board on 4466.
- Fill Implementation Notes below and append your own LOG line.

## Implementation Notes

**Status**: done 2026-10-12. The five gates exit 0, one after another: `npm test` 1188 + 7 timing,
`npm run check` (svelte-check 0, tsc 0), `npm run verify` (0 warnings), `npm run gen -- --check`
current, `npm run test:pages` 395 passed, then the full page suite again: 395 passed. The by-hand
validation is the orchestrator's.

**Contract (step 1).** `act`, like archive: ledger v15 (`LEDGER_FORMATS` 2-15, every ledger `$id` at
`/ledger/15/`, OpenAPI 1.20.0), actions `lock { board }` and `unlock { board }`, board only (schema
rule, `ledger-shape.ts`, whose article is now "a lock", "an unlock"); context: the board exists
(`ledger-index.ts`). Both join `BOARD_MARKS`, so `PRIVATE_ACTIONS`: no head, no date, no seen, no
answer, never in `check_responses`; agents learn of a lock only from `locked: true`, on `get_board`
(top level) and on each `list_boards` row, left out while open (schemas `const: true`, api.md 139).
Registry: `lock` "Lock board", `unlock` "Unlock board", no confirm. **The refusal is `locked`, 423**
(RFC 4918's Locked, in the IANA registry): the board itself is locked, and a client tells it from
every other refusal by status alone; 409 was not used because on agent operations it means
`wrong-folder` only (api.md 114), and elsewhere a stale `base`, a busy chat. Declared on
`write_board`, `request_grant`, `act`, `put_board` and `start_chat` (`components/responses/locked`),
api.md 40's table (14 codes), problem.schema's pattern. Descriptions: `get_board`, `list_boards`,
`request_grant`, `act`, `put_board`, `start_chat`, `send_chat`; `write_board`'s MCP tool is at 2,023
of its 2,048 characters, so it says nothing of the lock: the MCP instructions do ("A board marked
`locked` ... every write on it answers `locked`, so tell the person in one line and stop."), with the
refusal's own words. api.md 138-140; `npm run gen`.

**Action layer (ruling 7).** `packages/actions/src/lock.ts`, beside `archive.ts`: `foldLock`
(`LedgerState.locked`); `boardLocked` (locked, or archived through `boardVisibility`: archive
implies lock, ruling 5; nothing acts on an archived board but `restore`, so a restore returns the lock
it had, and a lock or unlock there is refused like any act: `archivedProblem` now passes only archive
and restore); `passesLock` (the person's own marks, flag, unflag, archive, restore, lock, unlock, and a
seen); `lockedProblem` (`LOCKED` "This board is locked; ask the person to unlock it." to an agent,
`LOCKED_PERSON` "Locked: unlock to change it" to the person); **`writeProblem`, the one "may this line
be written" check**: archived first (an agent is never told an archived board is locked), then
locked. `validateAct` and the ledger module ask it; `lockRules` (already locked, isn't locked).
`boardState` carries `locked`, `boardList` rows `locked`.

**Server.** The ledger module asks `writeProblem` of every line it appends and throws `locked` (423)
for a lock, so `act`, `put_board` and any route are covered. `visibility.ts` stays the only module
that asks (a source-scan test): `requireUnlocked` refuses `write_board` (in `writeTarget`, the whole
batch, nothing written) and `request_grant` (before it would answer `held` or `replayed`);
`refuseLocked` refuses `start_chat` (its grant can't be written; a CLI started meanwhile is closed if
the grant fails); `isLocked` gives `get_board` its `locked` and tells `chat-sessions.ts` that a
locked board's message goes without the round and records no Send (the answers wait for the unlock;
the page's composer chip agrees, `chat-bridge.ts` `boardContext`).

**How ruling 7 is met.**
- One check: `writeProblem` in the action layer, beside the visibility check; every line any route
  writes, person's or agent's, passes the ledger module, which asks it; the routes that answer before
  writing refuse up front through `visibility.ts`, which asks the same `boardLocked`; the page asks
  `passesLock` before it sends. Source scans: no server module but `visibility.ts` names
  `boardLocked`/`lockedProblem`, only `ledger.ts` `writeProblem`; no actions module but `lock.ts`
  reads `.locked` (`api-lock-person.test.ts`).
- The contract walk: `apps/board/tests/contract-walk.ts` (extracted from the archive test, which now
  uses it too) reads every `x-agent` operation from `openapi.json` with its inputs; an operation
  `writes` when its method is not GET. `api-lock.test.ts` calls each on a locked board as its maker
  and as another agent: every write naming the board answers exactly 423, `locked`, `LOCKED`, and the
  ledger gains only the walk's joins; every read answers as before but `locked: true`; unlocked,
  every answer is as before the lock. A new agent operation joins the walk by itself (and without
  inputs fails it). Checked by mutation: without `requireUnlocked` in `request_grant` the walk fails.
- The person's side walks every act in the registry (`ACTION_IDS`, a `Record<ActionId, …>` so a new
  action doesn't compile without a line): each is refused 423 with the person's words but the own
  marks (`api-lock-person.test.ts`, and `packages/actions/tests/lock.test.ts` for `validateAct`),
  and every agent event type is refused (`EVENT_TYPES`).
- The chat: a running session's message goes (no round, no Send); the agent's own write is refused;
  skill v3.3 (Access): "A write fails `locked` ...: tell them in one line ... and stop: no retry, no
  other board, no grant request." Scenario 21 in `scenarios.md`.

**Page.** `board/lock-flow.ts`: after every batch and switch, `data-locked` on the world and
`shell.locked`; `guard` wraps the stage's acting handlers (versions.ts `ACTING`, now exported, but
the flag, plus the widths switch): each says "Locked: unlock to change it" (error toast) and does
nothing, a drag's later moves quietly; `refuse` is the sender's question before every line
(`sender.ts` `refusal(board, line)`, which also carries the past version's `READ_ONLY`). The note
bubble doesn't open (`notes.ts` `paused`); the selection bar's acting commands show disabled
(`selection-flow.ts` `paused`). The elements pause their own controls from `BoardState.locked`
(`NodeState.paused`, `RegionState.paused`; `packages/ui/src/paused/` `pauseControls`, `paused.css`):
in place, aria-disabled, `data-paused`, quiet ink, no hover or press; a pressed answer and the
checked layout keep their colour; an out-of-date Accept stays aria-disabled after an unlock. Send to
agent: `SendButton` `paused`, disabled with the reason as its title. Toolbar: `LockedChip.svelte`
("Locked" with a padlock after the name and version; a visually hidden polite live region beside it,
outside the toolbar's flow, so it moves nothing while unlocked). "⋯": Lock board / Unlock board
(`ToolbarMenu` `onlock`, before Archive board…, off like it with no board or a past version; no
confirm; toast `LOCK_DONE`). Icons: `ButtonIcon` `lock`, `unlock` (24 grid, 1.5 stroke,
currentColor). Flag `lockBoard` (on) gates the menu rows only: the lock is the ledger's, so a board
locked elsewhere shows locked and paused whatever the flag. Gallery `gallery/lock-section.ts` (both
rows, "Locked", a locked container and cards from the fixture's marks board, Send paused). Styles
`styles/lock.css`. `io.ts` names the board on every `BOARD_MARKS` act.

**Ruling 4's flag (confirmed).** The flag and Shift+F stay usable on a locked board: `passesLock`
lets `flag`/`unflag` through on the server and in the sender, the flag button is in no pause list
(a test reads the lists), and `lock-board.spec.ts` flags and unflags on a locked board by click and
by Shift+F.

**Step 5, the flake: its cause and fix.** Esc on the Archived dialog shuts it at once (`oncancel`
set the state false) and the browser queues the dialog's `close` event as a task. When the picker's
"Archived (N)…" was chosen again before that task ran (a fast full run), the dialog opened again,
then the stale `close` event arrived and its handler set `shell.archivedDialog = false`, so the
effect closed the dialog just reopened. Fix: the `close` handler acts only while the dialog is
actually shut (`if (!dlg.open)`), as `BoardDialog.svelte` already did; `FolderDialog.svelte` had the
same cause and the same fix. The spec now plays the race in one task (cancel, close, choose again,
then let the queued event fire) and asserts the dialog stays open: without the fix it answers
"closed by the stale close event" every time (checked), with it "open". Then the two full page runs.

**Tests added.** `packages/actions/tests/lock.test.ts` (9), `packages/format/tests/lock.test.ts` (5),
`packages/ui/tests/node-paused.test.ts` (2), `apps/board/tests/api-lock.test.ts` (8),
`api-lock-person.test.ts` (5), `contract-walk.ts`; additions to `board-edit`, `chat-bridge`, MCP
`tools`, `schema-cases` (6 broken lines, v15 lines), `references` (`act:lock`, `act:unlock`);
`tests/pages/lock-board.spec.ts` (9: the menu row, "Locked", every paused control aria-disabled,
Send paused, axe light and dark; a press on a button, a key, C, a layout and the selection bar saying
why and writing nothing but seen lines; the flag; another tab; keyboard; the flag off; the gallery
section and its screenshots) and the archive spec's race. Updated: stored `v` now `LEDGER_FORMAT` in
four API tests (no literal to bump next time), OpenAPI 1.20.0, 14 problem codes, the toolbar menu's
rows (Lock board before Archive board…; the keyboard test's last row by `last()`), the gallery
full-page screenshot runs with `-lockBoard`, the format archive test no longer pins the latest
version.

**Screenshots.** New only: `__screenshots__/lock-board.spec.ts/lock-{light,dark}-darwin.png`
(viewed; the first version drew the container frame outside a frames strip, where it had no size,
fixed by giving it the gallery's `g-frames` strip). No existing screenshot changed (an empty live
region first sat in the toolbar's flow and moved the board screenshots by one gap; it is visually
hidden now).

**Deviations / for the maintainer.**
1. Strict: on a locked board only the person's own marks and a seen go; Allow, Refuse and Remove
   access are paused too (they change who may write). A grant request left open waits for the
   unlock; the requests strip's buttons are refused with the toast rather than drawn disabled.
2. `start_chat` is refused on a locked board (423), since it writes the new agent's grant; a running
   session keeps working (its messages go without the board's answers).
3. The note bubble doesn't open at all while locked, a sent note's read-only view included (its words
   show in the card's note block and the container's preview).
4. "Locked" is a status chip, not a button: unlocking is the "⋯" menu's row (ruling 4).
5. A lock moves no head, so a `check_responses` waiting on the board isn't woken by it; the agent
   learns of the lock from `locked` or its next refused write.
6. `write_board`'s description says nothing of the lock (its MCP tool would pass 2,048 characters);
   the instructions, the reads, the 423 response and the skill do.
7. No protected file changed. A decision entry could record "Lock a board: read-only for everyone
   until the person unlocks it; agents refused with 423 `locked`; archive implies lock" (proposed
   wording, for the maintainer). The tracker line for N40 is the orchestrator's.

### Orchestrator check (2026-10-12)

Gates: `npm test` 1188 + 7, `check`, `verify`, `gen -- --check`, `test:pages` 395 (the archive flake
gone). By hand on a test port: lock (201); `list_boards` shows `locked: true`; an agent write: 423
"This board is locked; ask the person to unlock it."; the person's ✓: 423; the person's flag: 201;
unlock (201); the agent write and the person's ✓ both go through.
