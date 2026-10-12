---
category: board-app
status: planned
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

1. [ ] Contract first: the two acts (ledger minor bump), `locked` on board reads, the refusal
   problem (`locked`, 409 or 423: say which and why), OpenAPI, `npm run gen`, api.md.
2. [ ] Failing tests first: the fold's locked set; the contract-walking write test; reads say
   `locked`; archive locks and restore returns the earlier state; agents can't lock; page tests for
   the menu rows, the toolbar state, paused buttons with the reason, the flag still working,
   keyboard, axe light and dark.
3. [ ] Build: the single check; server; page; the icon; gallery entry; flag `lockBoard`, on by
   default. One skill line: on "locked", tell the person in one line and stop.
4. [ ] Docs: api.md, components.md.

## Validation

- [ ] The five gates exit 0, one after another.
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

**Status**: Not started
