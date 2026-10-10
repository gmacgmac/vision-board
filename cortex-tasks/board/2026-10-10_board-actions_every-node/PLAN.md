---
task_name: Every node is part of the conversation
created: 2026-10-10
status: planned
categories: [board-actions, board-format, board-ui, board-agent]
tracker: cortex-tasks/tracker.md#U13
---

# Every node is part of the conversation — Plan

> **From**: maintainer, 2026-10-09/10 (chat 399, 406, 411, 416-455) · **Needs**: the maintainer's go

## Problem

Only cards the agent marks `item: true` get a number and buttons (`board-view.ts` `...(item && { n })`,
`node-core.ts` `offers`), and each kind offers its own list (`NODE_TYPES`). So the person can't
comment on, ask about or save most cards, and a group comment silently skips every non-item
(`selection-flow.ts` `comment`; `act.ts` refuses `nodes` that are not items). The board is meant to
be a threaded conversation in context: the agent explains through cards, the person answers any of
them.

## Rulings (maintainer; do not reopen)

1. **Every card shows its number** (420); numbers give the reading order (399).
2. **The kind decides** (428B, 452A): `question`, `decision` and `action` cards need an answer and
   offer all five actions (✓ acknowledge, ✗ drop, Comment, More context, Later). Every other kind
   offers Comment, More context, Later and never blocks. The agent's `item` mark goes away.
3. **One meaning everywhere** (421, 425): ✓ = OK / yes, ✗ = no / not wanted, Comment = the person's
   answer in words, More context = asking back. On a card that needs an answer, ✓, ✗ and a
   comment each decide it; More context keeps it open. On a question, ✓ and ✗ read "Yes" and
   "No" in their tooltips. The button stays "Comment" (the agent's answer is `reply`).
4. **Comment on any group** (418D, 411): a selection of any cards, any kinds, gets one note on
   exactly those cards, as a container note does for a container.
5. **Owed** (418A, 450): a comment or More context on any card is owed an answer (`reply` or
   `append`); Later on any card owes a handover (`park`, D-020).
6. **Counts** (418C): "N of M decided" counts only cards that need an answer.
7. **Send order** (424): the agent gets each batch of responses sorted by card number; a group or
   container note goes in at its lowest card and names all its cards; several acts on one card
   stay in the order made. The ledger keeps the order of the clicks.
8. **Old boards** (455A): nothing in the ledger is rewritten; an old `item` mark is ignored, old
   answers still show, cards of other kinds lose ✓ ✗ from now on. No legacy handling beyond that.

## Approach

Contract first (rule 6): ledger v11 and OpenAPI 1.13.0, then the action layer and server, then the
page, then the skill (rule 17), then a check by hand with real agents.

- **Format (BE_01)**: `NODE_TYPES` gains `answer: boolean` (question, decision, action) and one
  action list per class (`ANSWER_ACTIONS` five, `NOTE_ACTIONS` three). The node event drops `item`
  in v11 (a v11 write naming it is refused with a message saying what replaced it); older lines
  still read, `item` ignored. The view puts `n` on every node. `DECIDED` gains `commented` for
  answer cards. D-040 proposed (the kind decides; supersedes the `item` part of D-017).
- **Actions and server (BE_02)**: `act.ts` checks the action against the card's kind, not `item`;
  group notes accept any cards; conditions (`item.owed`, `item.new`, `item.unseen`,
  `item.awaiting`) run over every card; counts and `list_open` over answer cards plus anything
  owed; proposals only on answer cards; `check_responses` sorts a batch by card number (ruling 7).
- **Page (BE_02 done first) (FE_01)**: numbers and buttons on every card from the kind; Yes/No
  tooltips on questions; selection Comment on any cards; key help; gallery; page tests; flag
  `everyNode` (on by default; off shows numbers and buttons only on answer cards).
- **Skill (T_01)**: no `item`; ask with a question, decision or action card; what each action means
  on each kind; responses arrive in card order; owe a reply or append for every note and a park
  for every Later. Scenarios updated; one run against a real model.
- **Check (VERIFY_01)**: by hand with real Claude and Kiro through the chat panel.

## Assumptions to confirm with the maintainer (not rulings yet)

- A. NEW and "N updates" tabs show on every card, not only answer cards (they mean "not looked at").
- B. The `action` kind keeps its look; its ✓ tooltip reads "Done".
- C. On plain cards a comment shows the "commented" state on the card but counts nowhere.

## Out of scope

The seen indicator (N29, parked); content proposals (N26); the launcher (N28).
