---
category: board-app
status: planned
created: 2026-10-12
tracker: cortex-tasks/tracker.md#N39
---

# Archive a board: gone for agents, hidden from the picker, restorable

> **From**: maintainer, 2026-10-12 (chat 608-616: "a quicker version … archive it, and then it
> shouldn't be available within the MCP or to a chat agent") · **Model**: Opus 5.5 · **Needs**: the
> maintainer's go to build

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

## Steps

1. [ ] Contract first: the two acts in the ledger schema (a minor version bump, older lines still
   read), the act body, OpenAPI (person-only use of `act`, or a small `archive_board` operation if
   that's cleaner; say which), `npm run gen`, api.md lines.
2. [ ] Failing tests first: the fold keeps an archived set; every agent operation in ruling 3
   answers exactly as for an unknown board; `list_boards` omits it; a person act by an agent is
   refused; restore brings everything back; the panel's send refusal; page tests for the menu row,
   the confirm, the picker's Archived list, Restore, the next board opening, keyboard, axe light
   and dark.
3. [ ] Build: one check point for "this board is archived" in the action layer (no per-route
   checks); the server reads it; the page (menu row, `ConfirmDialog` reuse, the picker entry and
   list, the last-board memory skipping archived boards). Gallery entry. Flag `archiveBoard`, on by
   default.
4. [ ] Docs: api.md, components.md; the skill needs nothing (agents never see archived boards).

## Validation

- [ ] The five gates exit 0, one after another.
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

**Status**: Not started
