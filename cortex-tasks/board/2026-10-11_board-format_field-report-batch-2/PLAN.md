---
task_name: Field report batch 2 - retire, card numbers per board, the flag, column and row
created: 2026-10-11
status: in-progress
categories: [board-format, board-actions, board-app, board-ui, board-agent]
tracker: cortex-tasks/tracker.md#N24,N35,N36
---

# Field report batch 2 — Plan

> **From**: the field report (points 7-9, 15) and the maintainer, 2026-10-11 (chat 511, 516, 519,
> 520, 524; tracker N35, N36) · **Go**: given (524) · One data-format change
> (ledger v12), contract first.

## Rulings (maintainer; do not reopen)

1. **Retire** (field 7-9, 511): `write_board` gains a `retire` item naming a card `n` or a whole
   `region`. Retired cards leave the board and stay in the ledger with their versions and notes;
   board version history shows them. A container shows a small marker ("3 cards retired") that
   opens the board version where they last appeared. A card with an unanswered comment or More
   context can't be retired until the agent has answered it. Agents retire on containers they hold
   (their own, or granted); the person removing cards stays tracker N24.
2. **Card numbers per board** (N35, 520): each board numbers its cards from 1, in the order drawn.
   Existing boards are renumbered (numbers written inside old notes won't match; accepted).
3. **The flag** (N36, 516): a private mark the person puts on any card, kept in the ledger, never
   sent to agents (not in `check_responses`, the Send message, `show_node` for an agent, Send's
   "something new" test).
4. **Modes** (519): `list` is renamed `column` (old `list` lines read as `column`); a new `row`
   lays cards left to right in card order with no links needed; `flow` keeps its name and means
   "follow the links".

## The key design: numbers per board without breaking identity

D-017 made one project-wide number the card's identity and rejected per-board numbers, because
renumbering would repoint references. About 39 files and every folded index key cards by it.

**Recommended:** keep the project-wide number as the card's **internal identity** (never shown,
never in the API), and give each card a **board number** (`n`, 1, 2, 3… per board, in drawing
order) that the view, the API, the MCP tools, the page and the agent all use. The server
translates at its edge: an incoming `n` with its board becomes the internal identity, outgoing
answers carry the board number. Cards never change board, so the pair is fixed for ever, and every
internal index stays as it is. Old lines get their board numbers on read, in drawing order (the
renumbering ruling 2 accepts). A superseding decision (D-041) records it.

**Rejected:** making `(board, n)` the identity everywhere (rewrites every index and condition, high
risk for no gain); keeping project-wide numbers and teaching the skill (the field report's
complaint stands).

## Tasks

| ID | What | Model |
|---|---|---|
| BE_01 | Contract, ledger v12: board numbers (the edge translation, renumbering on read), `retire` (event, write item, refusal while owed), `flag`/`unflag` (person acts, agent-blind), modes `column`/`row`; OpenAPI; D-041 wording | Opus 5.5 |
| BE_02 | Actions and server: the translation at the API edge, retire in the fold and conditions (owed blocks it; retired cards leave counts and lists), flag hidden from every agent read, `row` layout in `packages/layout` | Opus 5.5 |
| FE_01 | Page: board numbers everywhere, the "N cards retired" marker opening the past version, the flag (a button on every card, a key, its own token, a toolbar chip that steps through flagged cards), the new mode names in the container toolbar | Opus 5.5 |
| T_01 | Skill: numbers start at 1 per board; retire and restructuring (field 15); `column` and `row`; the flag is invisible to agents | Opus 5.5 |
| VERIFY_01 | By hand with Claude and Kiro: draw, renumbered old board, retire a container, a refused retire while a comment is owed, flag cards and check no agent read shows them | Orchestrator |

## Also ruled (524)

- **Names in code:** the internal card identity is `id`; the board number is `n`; never mixed. The
  action layer and server are renamed mechanically (tests catch slips). D-041 records the design and
  supersedes the numbering part of D-017.

## Assumptions (accepted, 524)

- A. The flag: a small flag button on every card (beside Later), key F, a "N flagged" chip in the
  toolbar that steps through them; flagged cards keep their flag after a redraw.
- B. Retire refuses while a comment or More context is unanswered on the card, and also while a
  Later handover is still owed (nothing the person asked for goes missing).
- C. A retired card's number is never reused on that board.

## Out of scope

The layout work (batch 3); deleting whole boards and the person removing cards (N24).
