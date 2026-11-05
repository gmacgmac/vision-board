# FE_01_update-signals: Updated in amber; the agent's reply edge

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) · **Flag**: `updateSignals`

## Objective

On a busy dark board the person spots what changed: "updated" is a bright amber (new stays teal), and the agent's
replies carry that amber on their left edge, bright until the card is seen, muted after (PLAN Decision 10).

## Context

- The card's "N updates" tab is the accent pink at rest (`packages/ui/src/node/node-steps.css`,
  `[data-fresh-cards] … [data-tab='updates']`); hovered, it takes the changed family's amber
  (`--vb-state-context`). The maintainer finds the pink too faint in dark and dislikes it there.
- A container's border and "3 new · 1 updated" pill are teal (`--vb-state-fresh`, `region-fresh.{ts,css}`).
- The person's note has a pink left edge; once the agent answers, the note and the reply are both grey
  (`note-bubble.css` `border-left: 3px solid var(--vb-line-strong)`; `node-notes.ts` `replyEntry`).
- Seen: D-054, new and updated cards stay marked until engaged; the page already tracks it per card.

## Inputs

- `packages/tokens/src/tokens.css`: add `--vb-state-updated` (light-dark) and `--vb-state-updated-soft` beside
  `--vb-state-fresh`. Dark: clearly brighter and more saturated than `--vb-kind-action` `#e8b04a` and
  `--vb-state-context` `#e6af45` (it must not read as the action colour). Light: the same hue family, reaching
  Lc 45 as label text on the card. Measure with the project's APCA (APCA-W3 0.0.98G-4g): words Lc 45, edges and
  outlines Lc 30, on the card, sunken and deep surfaces; figures in the token's comment.
- `packages/ui/src/node/node-steps.css`, `region-fresh.{ts,css}`, `packages/ui/src/note-bubble/**`,
  `node-notes.ts` (a reply knows whether its card is unseen), the card wiring in `apps/board/src/board/cards/**`
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. The token, measured; report the two values and their Lc figures in your notes (the orchestrator relays them).
2. The "N updates" tab at rest: the amber outline and words (pink no longer). Hover/open as today.
3. The container pill: the "updated" count in amber, "new" teal; the border stays teal, also when only updated
   cards are inside (432).
4. The agent's reply: a left edge in `--vb-state-updated` while its card is unseen; after, a muted amber (the
   `-soft` or a mix toward the line; Lc 30 kept) so replies always read apart from the person's grey notes. In the
   card's thread and in the note bubble alike. The person's own note edge unchanged.
5. Failing page tests first for each state; `tests/pages/fresh-cards.spec.ts` APCA checks extended; gallery
   sections show unseen and seen replies, the tab, and the pill with both counts, light and dark.

## Validation

- [ ] Specs you own + your new one, light and dark, axe and APCA; a look at 1400, 900, 600 px on a dark busy board;
      `check`; `npm test`; flag off = as before (pink tab, grey replies)

## Constraints

Deviation from a PLAN decision: stop and report (`DEVIATION`). No PII in examples. No git commits. Long writes in
chunks. Only your files; other needs under `REQUESTS`. Behind your flag (PLAN Decision 12), on by default; off is
exactly the old behaviour.

## Implementation Notes

_Re-run? Add a `### Run N` block; never overwrite an earlier run._

## On Completion

Notes here (Changes Made, Verification, Caught Beyond the Brief, Deviations); your TASK-STATUS row; one LOG line,
`[board-ui] FE_01: … → Task: [[cortex-tasks/board/2026-11-05_board-ui_insert-markdown-signals/FE_01_update-signals.md]]`, ending in a
newline; the return block.
