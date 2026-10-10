---
category: board-actions
status: planned
created: 2026-10-10
---

# BE_02 Action layer and server

> Plan: [PLAN.md](./PLAN.md) rulings 2-7 · Model: Opus 5.5 · After BE_01

## Steps

1. [ ] `act.ts`: an act on a card is checked against its kind's list, never `item`; group notes
   (`nodes`) accept any cards and any kinds (comment and context are on every list).
2. [ ] Status and counts: ✓, ✗ or a comment decides an answer card; More context keeps it open;
   counts (`fold.ts`) and `list_open` (`reads.ts`) over answer cards, plus any card owing an
   answer or a handover.
3. [ ] Conditions (`conditions.ts`): `item.owed` (a comment or context on any card; Later on any
   card until its park), `item.new`, `item.unseen`, `item.awaiting` over every card (PLAN
   assumption A); proposals only on answer cards.
4. [ ] `check_responses` (`pending.ts` `responsesAfter`): each answer sorted by card number; a
   group note at its lowest card, a container note at the container's lowest card (or first if
   empty); acts on one card in ledger order. Say how paging (`more`) interacts and test it.
5. [ ] `api.md`; MCP instructions where they name items.

## Validation

- [ ] Failing tests first for each step; the five gates exit 0.

## Constraints

- If deviation is needed, stop and say so. No PII in examples. No git commits or stash.
- Protected files (steering, `docs/decisions.md`, `tokens.css`): propose wording, never edit.
- Scratch in the system temp folder; stop only your own processes; never touch `.visionboard/`.
- One job per file, under 300 lines; tests first; fill Implementation Notes below and in
  TASK-STATUS, and append your own LOG line.

## Implementation Notes

**Status**: Not started
