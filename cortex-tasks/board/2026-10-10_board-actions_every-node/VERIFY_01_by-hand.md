---
category: board-actions
status: completed
created: 2026-10-10
---

# VERIFY_01 By hand with real agents

> Plan: [PLAN.md](./PLAN.md) · Orchestrator

## Steps

1. [x] Claude through the chat panel draws a mixed board (questions, a decision, an action,
   findings, notes); every card numbered; plain cards show three actions.
2. [x] Comment on one plain card; lasso three mixed cards and comment once; Later on a finding;
   ✓ and a comment on two questions; Send. The agent gets them in card order, answers each note,
   parks the finding, and the counts match.
3. [x] The same round with Kiro.

## Implementation Notes

**Status**: Completed 2026-10-10 (orchestrator, by hand; a test server on 4483 with a scratch project)

- **Claude** (chat panel, `claude` 2.1.295, default model): asked for a mixed board on a board the
  person made; drew 8 cards in two `grid` containers, no links, kinds right (questions, a decision
  with options, an action, findings, a risk, a note); chat one line. Person: ✓ on question 1, a
  comment on question 2 (counted decided), Later on finding 6 (moved to Later, "Awaiting"), three
  mixed cards (finding 5, risk 7, note 8) selected with shift-click and commented once ("Note on 3
  cards: 5, 7, 8"), Send, then a chat message. Claude answered in card order: replied on 2, one
  reply on the group note plus a new "Mobile layout track" container (cards 9-11), the handover
  for 6, and said 3 and 4 are still open. `list_open` afterwards: only decision 3 and action 4.
- **Kiro** (new session): added question 12 and finding 13 in a new container; tooltips read "Yes ·
  a | No · x | …" on 12 and three actions on 13. Person: ✗ on 12, a comment on 13, Send, chat
  message. Kiro started with its to-do list, read in card order, appended draft copy to 13 and
  replied; 12 settled.
- **Found (not blocking, for the maintainer):**
  1. In the chat panel, Send records the answers but doesn't start the agent's turn; the person
     also has to type a message. 
  2. With no boards (a folder just created), the chat says "Open a board to talk about it", so a
     board must be made from the picker first; the agent can't draw the first board from the panel.
  3. Kiro narrates in the chat (3-4 interim messages per turn); Claude kept to one or two lines.
  4. Kiro called ✗ on a yes/no question "dropped, settled" rather than "No".
