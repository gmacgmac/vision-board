# Navigation: toolbar, versions, finder, keys, icon, new board - Plan

> **Status Doc**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Created**: 2026-10-07 · **Tracker**: U11, N18-N22 · **Builds on**: the awareness tables
> set (`2026-10-07_board-actions_awareness-tables`) · Task files are written when that set lands.

## Problem Statement

The toolbar repeats the board's title and version, past versions can't be seen, containers are
hard to find, the key help sprawls across the page, the icon is a placeholder, a selection can't
be reset, and only an agent can create a board.

## Rulings (maintainer, 2026-10-07; do not reopen)

1. **Toolbar**: the board picker shows the board's title only (no version, no "Vision Board"
   prefix); the duplicate title beside it goes; to its right a version dropdown (the board's own
   versions, from `heads` and the board's lines). Choosing a past version shows the board folded
   up to that line, **read-only**: every action off, a clear "Viewing v42 · Back to now" banner,
   no seen recorded. "Rewind to this version" is tracker N23, not this set.
2. **Container finder**: a toolbar dropdown listing every container on the board, in board
   order, choosing one zooms to it; Later is always listed, greyed with "0 items" when empty.
3. **Reset places for a selection**: in the selection bar; R resets every selected card.
4. **Key commands**: the bar along the bottom becomes a small "?" bubble bottom left; hover or
   focus lists every command (reuse `bindHoverTip`, `packages/ui/src/tip/`).
5. **App icon**: the A · Flow drawing (maintainer's `Architect_illustration_options.html`) as the
   toolbar icon and favicon, in a teal measured at APCA Lc 45 or more against the toolbar in both
   themes; token wording to the maintainer before it lands (tokens are protected).
6. **New board from the page**: "New board…" at the foot of the picker asks for a title and
   writes a person `board` line; the person is its creator; agents need the board granted
   (D-034). A contract change.
7. **Rename a board**: the person can rename any board's title (maintainer 206), from the
   picker; a person act, recorded in the ledger. Today nobody can, so it is a contract change too.

## Order

Toolbar and version view first (urgent), then finder, selection reset, key bubble, icon, new
board, then a VERIFY task. Each is one task; page tests share ports, so they run in sequence.

## Success Criteria

- [ ] Picker shows titles only; version dropdown shows a read-only past board and Back to now
- [ ] Finder zooms to any container, Later included; selection reset; key bubble; icon at Lc 45+
- [ ] A person-created board that an agent can draw on once granted
- [ ] The five gates exit 0
