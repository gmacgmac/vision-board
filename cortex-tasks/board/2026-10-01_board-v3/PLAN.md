---
category: board-app
type: plan
status: approved
created: 2026-10-01
scope: Board v3 — notes beside cards, containers as threads, Send and vb wait, kiro-cli chat panel
---

# Board v3: plan

Approved by the maintainer in chat on 2026-10-01 ("All sounds good. Let's proceed"), after two
rounds on the board itself (`sessions/first-look`, views v1 and v2). Resume from
`TASK-STATUS.md`.

## Goal

One chat you work through, on the right of the board. kiro-cli powers it. When the subject suits
a board, kiro-cli draws one through a tool call, and its final text shows up in the chat. You
answer on the board in context: tick, comment beside a card, lasso a group, park things in Later.
Your notes go into the chat input as chips that refer to nodes. Send hands the round back.

## What the maintainer decided (first-look v1, v2)

1. Contrast: three APCA tiers (D-009, done).
2. Notes sit beside their card, Architect style, and can be edited and deleted (v2 items 14, 15, 19).
3. Group notes: lasso, plus Shift / Cmd / Ctrl-click to add to a selection (Architect line
   `if (e.shiftKey || e.metaKey || e.ctrlKey)`), plus keyboard Space then C (v2 item 16).
4. Notes on a whole container (v2 item 17).
5. Containers can be dragged, and their places are remembered (v2 item 20).
6. Everything lives in a container, and a container is a thread. The person drags items into
   another container, for example "Later" (v2 item 21). No freeform mode for now.
7. Get one container right before cross-region layout work, and bring Architect's look across
   (v2 items 22–24). The tick buttons stay.
8. kiro-cli powers the board. The chat moves to the right-hand panel, and there is no bottom
   chat bar. Notes become chips in the input, as references to nodes and not copies (v2 item 25).
9. `vb wait`: the agent blocks until the person presses Send (v2 item 26).
10. Mode picker: a pill showing the current mode, which opens a tiled picker on hover or click.
    This fixes the overflow (maintainer screenshot, 2026-10-01).
11. Anything not commented on can be accepted with one click by the person ("Mark the rest ok"),
    and Later parks a decision on purpose (v2 item 19).

## Stages

1. Plan and decisions: this file, D-010 (kiro-cli), D-011 (containers as threads), vision and
   tracker updates.
2. Card and container basics: mode picker pill, region sizing, the note callout (edit and
   delete), Architect styling within the tiers.
3. Selection and moving: lasso, multi-click, keyboard selection; container notes; dragging cards
   between containers; the Later container.
4. Send and `vb wait`: the `send` action with "Mark the rest ok", and the `vb` CLI (`validate`,
   `reply`, `wait`).
5. kiro-cli spike in `temp/`: drive `kiro-cli acp` from Node (session, prompt, streamed reply,
   resume), board updates as a tool call, the narrowest tool set.
6. Chat panel on the right: feed plus input, chips for notes, Send through kiro-cli.
7. Verification: unit tests, the smoke test, screenshots, design critique, then v3 on the board.

## Format changes (rule: change the format first)

- Transcript actions: `note-edit` (`replaces` = the earlier record), `note-delete`,
  `move` (node to region), `region-pin`, `send` (`accept_rest`). Notes gain `nodes[]` (a group)
  or `region`.
- View: a built-in `later` region the person can always drop into. No coordinates (rule 9).

## Risks

- A board-launched kiro-cli runs tools on this machine. Stage 5 restricts its tools before
  Stage 6 builds on it.
- The board's own server starting an agent reverses `docs/vision.md` ("Dropped: the app running
  Claude itself"). D-010 records the change.
