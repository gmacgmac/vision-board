---
category: board-app
status: completed
created: 2026-10-12
tracker: cortex-tasks/tracker.md#N39
---

# Archive a board: gone for agents, hidden from the picker, restorable

> **From**: maintainer, 2026-10-12 (chat 608-616: "a quicker version … archive it, and then it
> shouldn't be available within the MCP or to a chat agent") · **Model**: Opus 5.5 · **Go**: given (2026-10-12, "Proceed")

## Problem

Two boards with similar names (`multi-bot` and `multi-bot-plan`) confuse agents told to "update
the board", and the person can't get rid of the old one. Nothing removes a board today; the
ledger is append-only and nothing may remove its lines (D-017, D-041).

## Rulings (maintainer; do not reopen)

1. **Archive, not delete.** Archiving hides a board; the ledger keeps every line. Real deletion is
   a later item (tracker N14, N24).
2. **Only the person archives and restores** (rule 8): two person acts, `archive` and `restore`,
   on a board (no card, no container), recorded like `mode`. Agents can do neither.
3. **Gone for agents, as if it never existed:** `list_boards` leaves it out; every agent read or
   write naming it (`get_board`, `show_node`, `show_container`, `show_layout`, `list_open`,
   `check_responses`, `write_board`, `request_grant`) answers `not-found` with the same words as an
   unknown board; a chat-panel session on it can't send (a clear refusal in the composer).
   `join`'s answer and the MCP instructions don't mention archived boards.
4. **Hidden from the person's picker** and never opened by default (the remembered last board, a
   start-up, a folder switch); the page opens the next board, or the empty state.
5. **"⋯" › "Archive board…"** acts on the open board: a short confirm ("Archive 'Multi-bot'?
   Created 11 Oct, last updated 11 Oct. Agents won't see it; you can restore it from the board
   picker.") with Cancel and Archive.
6. **Restore:** the board picker ends with "Archived (N)…" (only when N > 0), opening a short list of
   archived boards (name, last updated) each with Restore; restoring opens it.

## Robustness (orchestrator's adversarial review, chat 620; part of the rulings)

7. **One visibility check.** "Is this board visible to agents" is one function in the action layer
   that every agent read and write goes through; no route checks on its own.
8. **A test that walks the contract.** For an archived board, iterate every agent operation listed in
   `packages/format/schema/openapi.json` (not a hand-written list) and assert each answers exactly as
   for an unknown board (status, problem type, words), so a future operation is covered or fails.
   Also: `list_boards`, `join`, `check_responses`/`list_open` across boards, the MCP tool list and
   instructions, and the panel's prompt never name it.
9. **The id stays taken, without saying so.** An agent writing a `board` item (or any item) with an
   archived board's id is refused with a neutral "That board id isn't available; choose another id."
   that reveals nothing about the archived board; never a write into it. Tested.
10. **Which board the agent works on.** One skill line (`skills/vision-board/SKILL.md`): when the
    person says "the board" and more than one board could be meant, ask which in one line; in the
    chat panel the panel's own board always wins.

## Steps

1. [x] Contract first: the two acts in the ledger schema (a minor version bump, older lines still
   read), the act body, OpenAPI (person-only use of `act`, or a small `archive_board` operation if
   that's cleaner; say which), `npm run gen`, api.md lines.
2. [x] Failing tests first: the fold keeps an archived set; every agent operation in ruling 3
   answers exactly as for an unknown board; `list_boards` omits it; a person act by an agent is
   refused; restore brings everything back; the panel's send refusal; page tests for the menu row,
   the confirm, the picker's Archived list, Restore, the next board opening, keyboard, axe light
   and dark.
3. [x] Build: one check point for "this board is archived" in the action layer (no per-route
   checks); the server reads it; the page (menu row, `ConfirmDialog` reuse, the picker entry and
   list, the last-board memory skipping archived boards). Gallery entry. Flag `archiveBoard`, on by
   default.
4. [x] Docs: api.md, components.md; the skill needs nothing (agents never see archived boards).

## Validation

- [x] The five gates exit 0, one after another.
- [ ] By hand (orchestrator): archive a board an agent was using; the agent's next call answers
  "not found"; restore it; the agent can use it again.

## Constraints

- Project rules (`.kiro/steering/vision-board-proj.md`): contract first, patterns first, one job per
  file about 300 lines (500 hard), tests first, tokens only, every state, accessibility.
- No git commits or stash. Protected files: propose wording. Scratch in the system temp folder;
  stop only your own processes and leave none running; never touch `.visionboard/` or real
  home-folder files; don't use the board on 4466.
- Fill Implementation Notes below and append your own LOG line.

## Implementation Notes

**Status**: done 2026-10-12. All five gates exit 0, one after another: `npm test` 1156 + 7 timing,
`npm run check` (svelte-check 0, tsc 0), `npm run verify` (0 warnings), `npm run gen -- --check`
current, `npm run test:pages` 386 passed. The by-hand validation is the orchestrator's.

**Contract (step 1).** `act`, not a new operation: it is already the person's route (an agent is
`forbidden`), records the line like `mode`, and runs `validateAct`. Ledger v14 (`LEDGER_FORMATS` 2-14,
every ledger `$id` at `/ledger/14/`, OpenAPI 1.19.0): actions `archive { board }` and
`restore { board }`, board only (no `n`, `ver`, `region`, `nodes`) in the schema rule and
`ledger-shape.ts`; context: the board exists (`ledger-index.ts` `actContext`). `CARD_MARKS` (flag) and
`BOARD_MARKS` (archive, restore) make up `PRIVATE_ACTIONS`: no head, no date, no seen, no answer, never
in `check_responses`. Registry: `archive` "Archive board" needs confirmation, `restore` "Restore" not.
Descriptions: `act`, `put_board`, `start_chat`, `send_chat`; no agent-facing description mentions
archiving (the act's action enum in `check_responses`' output says only "the person's own marks,
which no agent ever reads"). api.md 135-137; `npm run gen`.

**Action layer.** `packages/actions/src/archive.ts`: `boardVisibility(s, board)` (`visible` |
`archived` | `unknown`), the one check (ruling 7), with `visibleToAgents`; `foldArchive`
(`LedgerState.archived`); `archivedProblem(s, e)` (an agent line on an archived board: `UNAVAILABLE`;
a person's line but a seen or restore: "board: "b" is archived; restore it from the board picker
first"); `archiveRules` (already archived, isn't archived, unknown); `archivedBoards` (latest archived
first, with `dates`). The fold also keeps `dates` (each board's first line and own last line, beside
`heads`). `boardList`, the conditions (`boardsIn`, picker marks) and `linkedDetails` leave archived
boards out. `validateAct` refuses every act on an archived board but `restore`.

**Server.** `apps/board/server/visibility.ts` is the only module that asks (a test greps the server
for `.archived`, `boardVisibility`, `visibleToAgents`): `requireBoard` (every agent operation and
`watch_board`, the same `not-found` words as a board that never was; also re-checked after a
`check_responses` wait), `personBoard` (`act`, `mark_seen`, `read_ledger`, `list_chats`,
`start_chat`), `writeTarget` (`write_board`: not-found without a `board` item, else `invalid`
`UNAVAILABLE` for the whole batch, pointer at the board item, nothing written), `agentSees` (a retry
key stored on a line agents don't see is free again, in `write_board` and `request_grant`; a
`{ key }` naming a card there names nothing), `refuseArchived` (`start_chat` `invalid`, `send_chat`
`conflict`). The ledger module runs `archivedProblem` on every line it appends (defence: no agent line
lands on an archived board whatever the route; the person's rename is refused there).

**Rulings 7-10.**
- 7: one function, `boardVisibility`, in the action layer; one server module, `visibility.ts`;
  enforced by a source-scan test (`api-archive-writes.test.ts`, "ruling 7").
- 8: `apps/board/tests/api-archive.test.ts` reads the agent operations from `openapi.json`
  (`x-agent: true`, not a hand list), builds each input from the operation's own path parameters and a
  body table (a new operation without a value fails the test), and calls each on board "ghost" with no
  credentials and with its maker's secret: before it exists, drawn, archived, restored. Archived, every
  operation naming it deep-equals its before-it-existed answer (status, type, title, detail, pointers);
  `list_boards` and `join` never mention it; restored, every answer equals the drawn one but the
  ledger position. Checked by mutation: switching `show_layout` to `personBoard` fails it. Also:
  `watch_board`, a waiting `check_responses`, `list_open` and `check_responses` on another board, the
  panel prompt on another board (fake Claude), MCP descriptions and instructions
  (`packages/mcp/tests/tools.test.ts`).
- 9: `UNAVAILABLE` = "That board id isn't available; choose another id." for a batch making a board
  with an archived id (two agents, the board item first or not; the body never mentions "archiv", the
  title or the cards; the ledger's `seq` unchanged) and for any agent line the ledger module is handed.
- 10: `skills/vision-board/SKILL.md` v3.2, one line under Starting a board ("Which board"); scenario 20
  in `scenarios.md`.

**Page.** Flag `archiveBoard` (on). "⋯" › Archive board… (`ToolbarMenu`, aria-disabled with no board
or a past version) → `ConfirmDialog` with `archiveAsk` (`board-edit.ts`; days in the viewer's locale,
year only when not this one) → `sender.actOn`. `boards.ts`: whenever the open board leaves the list
(archived here or elsewhere) the next board in the picker opens, else the previous, else the page
reloads into its empty state (which counts the archived boards); the hash and the remembered board
never open an archived one (`start-board.ts` `nextBoard`, `startBoard(..., order)`). Picker:
"Archived (N)…" → `ArchivedDialog` + `ArchivedList` (Restore per row, busy, refused, empty; Esc,
Close, backdrop; focus back on the picker) → `restore` then open it. Chat: `blockedReason` gains the
archived reason (`ARCHIVED`); the panel's pure rules moved to `board/chat-rules.ts` (chat-panel.ts
was at 300 lines). New boards' ids avoid archived ids (already: every board). Styles
`styles/archived-dialog.css`; the menu's aria-disabled look reuses the Move to list's. Gallery
`gallery/archive-section.ts` (menu, confirm, list in four states, fixed dates).

**Tests added.** `packages/actions/tests/archive.test.ts` (14), `packages/format/tests/archive.test.ts`
(4), `apps/board/tests/api-archive.test.ts` (7), `api-archive-writes.test.ts` (8), additions to
`board-edit`, `start-board`, `chat-bridge`, `schema-cases` (6 broken lines), `references`
(`act:archive`, `act:restore`), `fold-v3`, MCP tools; `tests/pages/picker-archive.spec.ts` (9: confirm,
Cancel/Esc, archive by keyboard and the next board, the Archived list and Restore by keyboard,
archived in another tab plus hash and remembered board, the empty state, flag off, gallery, axe light
and dark throughout). Existing tests updated: stored `v` 13 → 14 (four API tests), OpenAPI 1.19.0,
toolbar menu rows (Archive board… before Open folder…), the gallery full-page screenshot runs with
`-archiveBoard`.

**Screenshots.** New only: `__screenshots__/picker-archive.spec.ts/archive-{light,dark}-darwin.png`
(viewed; the first version clipped the lone "⋯" menu off the strip's left edge, fixed by putting it
at the right end and giving that sample's strip more room). No existing screenshot changed.

**Deviations / for the maintainer.**
1. With the `toolbarMenu` flag off there is no "⋯" menu, so no Archive board… (the Archived entry in
   the picker still shows).
2. Archiving the last visible board reloads the page into its boot empty state rather than clearing
   the drawn board in place (the folder switch does the same); simpler and certain to reset every
   panel.
3. A retry key used on an archived board is free again for its agent; after a restore, the old line's
   key is shadowed by any newer use (a retry of the old item then answers `conflict`).
4. `write_board` with a `board` item on an archived id is one `invalid` for the whole batch (not
   per item), like the whole-call refusals of api.md 37; 409 was not used because the spec keeps 409
   on agent operations for `wrong-folder` only.
5. `mark_seen` (a board seen or a card seen) still goes on an archived board: the page sends one when
   it leaves a board, including the one just archived.
6. No protected file needed a change; no decision entry is proposed (it follows D-017/D-041; the
   maintainer may want one recording "archive hides from agents as if it never existed").

### Orchestrator check (2026-10-12)

Gates: `npm test` 1156 + 7, `check`, `verify`, `gen -- --check`; `test:pages` 382 + 4 failed on the
first full run (`picker-archive.spec.ts` from line 111: the Archived dialog didn't reopen after a
second selection; the rest followed), then 9/9 three times alone and 386 passed on a second full
run: a timing flake, handed to the lock task to make deterministic. By hand on a test port: two
boards; the person archives `multi-bot` (201); `list_boards` shows only `multi-bot-plan`;
`get_board` on it answers 404 "There is no board \"multi-bot\"…", word for word as a board that
never existed; writing a board item with its id: "That board id isn't available; choose another
id."; an agent's restore: 403; the person's restore: 201, both boards listed again.
