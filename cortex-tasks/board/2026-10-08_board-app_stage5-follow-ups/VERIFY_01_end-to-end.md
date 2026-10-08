# VERIFY_01_end-to-end: End-to-end check

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Who**: the orchestrator, by hand

## Steps

1. [x] Scratch project and server; the page in the browser pane; a stdio MCP caller as the agent.
2. [x] Fresh board: no NEW. Agent adds a card: NEW. Select it: gone.
3. [x] Agent adds two cards; person Sends; agent draws again: only the newest cards are NEW.
4. [x] A NEW card the agent updates before it is seen shows NEW only.
5. [x] Select cards: the pill; click opens; outside click, pan and Esc close; a key acts closed.
6. [x] Hover each bar button, light and dark.

## Implementation Notes

**Status**: Completed 2026-10-08, by the orchestrator, by hand (scratch server on port 4802, stopped by PID; stdio MCP caller as the agent; browser pane).

- Step 2: a fresh board (cards 1, 2) showed no NEW; card 3 added while the board was open showed NEW live; selecting card 5 later cleared its NEW.
- Step 3: cards 3 and 4 NEW; Send; the agent drew card 5: only 5 was NEW, 4 lost NEW.
- Step 4: card 3 appended before it was seen stayed NEW only. Noted: once the next round ended its NEW, card 3 (never looked at, now v2) showed "1 update" while card 4 (v1) showed nothing. That follows the rules as built (`item.unseen` past max(seen, 1)); raised with the maintainer.
- Step 5: selecting showed the pill "1 selected"; click opened the compact bar; a background click closed it (and cleared the selection, as before); Esc closed it and kept the selection.
- Step 6: Comment hover reads as a lighter accent, not grey; FE_02 measured every state light and dark.

No bugs found. Gates after FE_02 (orchestrator): all five exit 0, 240 page tests.
