---
category: board-app
type: plan
status: approved
created: 2026-10-01
last_updated: 2026-10-02
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

## Stages (re-planned 2026-10-02)

Order agreed with the maintainer on 2026-10-02. Task files are written for one stage at a time,
from this PLAN as it stands when the stage starts, so later stages pick up what earlier ones
taught us. Every stage ends green on `npm test`, `npm run verify` and `npm run check`, plus a
browser check for UI work.

0. Framework (done): D-012, D-013, D-014, D-005 + D-015.
1. Plan and decisions (done): D-010, D-011; then D-017 to D-024 on 2026-10-02.
2. Card and container basics. Step 1 (Svelte + Vite move) **done**. Then:
   - 2a `<vb-node>` and `<vb-region>` with the node-type registry (D-015), today's look and
     behaviour unchanged. Nodes and regions read the ledger (U3 step 2 lands first).
   - 2b Architect's look (D-024, mockup `prototypes/board-v3-design/mockups/01b-cards-content-first.html`): tokens
     replaced by Architect's palette (exact values shown to the maintainer before the protected
     edit), the content-first card, border tabs, footer, selection in the card's own colour,
     open-frame containers, dot grid. Fixes N6. APCA check (N1) runs on every pair.
   - 2c Markdown renderer (D-023) in `packages/ui`, used by cards and notes.
   - 2d Mode picker pill (mockup 02) and region sizing (no overlaps).
   - 2e Notes beside cards, editable and removable, saved as ledger events.
   - 2f Shapes: decision diamond and start/end pill (components.md § Shapes). Mockups in
     Architect's look after 2b, picked by the maintainer, then outline and ports in the
     registry, the layout engine and the node CSS, behind a flag.
3. Selection and moving, ported from `prototypes/board-v3-design/architect-extract/` (README §2): click, Shift/Cmd/Ctrl
   multi-select, lasso with area notes, selection bar, pins, keyboard route (arrows, Space, C/N);
   container notes; dragging cards between containers; the Later container.
   Maintainer, 2026-10-05 (chat 665, 667): U5 (no text selection while dragging) and U6 (zoom)
   are part of this stage. Plain drag anywhere pans; Shift+drag draws the lasso; the selection
   bar then offers Comment or Zoom to selection; zoom in, out and fit buttons sit in the board
   header. How a card is moved without moving it by accident is being settled (chat 671).
4. Send: the `send` action with "Mark the rest ok". The `vb` commands and the API live in the
   API pattern set (U4); this stage wires the board's Send to it.
5. Proposals, seen and parking on the board (U3 step 3; mockup 03).
6. Chat panel on the right: feed plus input, notes as chips (Architect composer), change chips per
   version. It talks to any agent through the MCP (U4). kiro-cli comes after, as one more MCP
   client, behind its own spike in `temp/` with the narrowest tool set.
7. Decision flow mode and incremental layout (U3 step 4; mockup 04).
8. Verification: unit and page tests, screenshots, design critique, a fresh-eyes usability
   review, then v3 on the board itself.

## Format changes (rule: change the format first)

- All of these are ledger events (D-017, `packages/format/src/ledger.ts`): notes with `nodes[]` or
  a `region`, note edit and removal, `move` (node to region), region pins, `send` with
  `accept_rest`, a built-in `later` region. No coordinates except a person's pin (rule 9).

## Risks

- A board-launched kiro-cli runs tools on this machine. Its spike restricts its tools before the
  chat panel uses it.
- The board's own server starting an agent reverses `docs/vision.md` ("Dropped: the app running
  Claude itself"). D-010 records the change.
