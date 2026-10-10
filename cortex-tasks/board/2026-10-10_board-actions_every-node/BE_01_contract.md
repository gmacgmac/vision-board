---
category: board-format
status: planned
created: 2026-10-10
---

# BE_01 Contract: the kind decides, numbers on every node

> Plan: [PLAN.md](./PLAN.md) rulings 1-3, 8 · Model: Opus 5.5

## Steps

1. [ ] `NODE_TYPES`: `answer` true for question, decision, action; `ANSWER_ACTIONS` (ack, drop,
   comment, context, later) and `NOTE_ACTIONS` (comment, context, later); every kind takes one.
2. [ ] Ledger v11: the node event drops `item`; a v11 write naming it fails with a message saying
   the kind now decides (question, decision or action to ask for an answer). v10 and older lines
   still read; `item` ignored by every reader. Schema `$id`s, fixtures and the version tests.
3. [ ] View: `n` on every node (`board-view.ts`); OpenAPI 1.13.0 examples without `item`;
   `DECIDED` gains `commented` (it decides only on answer cards: BE_02 enforces where it counts).
4. [ ] `npm run gen`; `api.md` lines; D-040 wording proposed in the notes (the kind decides;
   supersedes the `item` part of D-017).

## Validation

- [ ] Failing tests first (schema, version, view, node types); the five gates exit 0.

## Constraints

- If deviation is needed, stop and say so. No PII in examples. No git commits or stash.
- Protected files (steering, `docs/decisions.md`, `tokens.css`): propose wording, never edit.
- Scratch in the system temp folder; stop only your own processes; never touch `.visionboard/`.
- One job per file, under 300 lines; tests first; fill Implementation Notes below and in
  TASK-STATUS, and append your own LOG line.

## Implementation Notes

**Status**: Not started
