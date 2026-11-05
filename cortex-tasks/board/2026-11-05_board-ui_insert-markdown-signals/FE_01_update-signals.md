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

### Run 1 (2026-11-05, Opus 5.5, worktree `fe-01`)

**Changes Made**
- Token (step 1): `--vb-state-updated: light-dark(#a66800, #ffc21a)` and `--vb-state-updated-soft` (12% toward the card,
  like its siblings) in `packages/tokens/src/tokens.css`, figures in its comment; `packages/tokens/README.md` § Signals.
  APCA-W3 0.0.98G-4g as words: card Lc 71.3 light / 74.2 dark, sunken 61.9 / 73.1, deep 55.5 / 71.3, canvas 65.4 / 75.0,
  on its -soft 61.0 / 70.7, on the pill's teal -soft 61.6 / 71.2. Dark sits 10.6 Lc above `--vb-kind-action` (63.6) and
  11.3 above `--vb-state-context` (62.9) on the card, saturation 100% vs 77%.
- Tab (step 2): `node-steps.css`: `[data-fresh-cards][data-update-signals]` outline and words in the amber at rest;
  hover/open as before; freshCards off stays grey, updateSignals off stays pink.
- Pill (step 3): `region-fresh.ts` `RegionFresh` gains `added` / `updated`; `fillFreshPill` writes each count in its own
  span (text unchanged); `vb-region.ts` `applyFresh` calls it (granted line); `region-fresh.css` colours
  `.vb-region-fresh-updated`; the border stays teal (432).
- Reply edge (step 4): `CardReply.unseen` / `ReplyEntry.unseen` (`node-notes.ts`, `replyEntry`); `parking.ts`
  `repliesOn` marks a reply written after the person last looked at that card (`LedgerState.looked`, per card, so a
  group-note reply is judged per card; none on a past version); `node-notes.ts` `litReplies` + `nodeState` keep it only
  while the card itself is unseen (NEW or an "N updates" tab not stepped through), which also covers read-only (kept
  in memory) and flags off. Templates add `data-unseen` (`node-template.ts` `replyMarkup`, `note-bubble-template.ts`
  `replyItem`). CSS: `node-parking.css` and `note-bubble.css`: bright `--vb-state-updated`, seen
  `color-mix(updated 50%, --vb-line-strong)` (Lc on sunken 42.3 light / 33.4 dark; card 51.7 / 34.5). The bubble lives
  in the stage beside the world, so its rule reads `[data-update-signals] ~ vb-note-bubble` (board) or an ancestor
  (gallery). The person's note edges are unchanged.
- Flag wiring (granted): `controller.ts` world toggle `data-update-signals`; `gallery/main.ts` the same on `main`.
- Gallery: a new last section, `apps/board/src/gallery/update-signals-section.ts` ("The agent's reply, unseen and
  seen", granted with its one line in `main.ts`), so no section moves; the fresh and updates sections' words say amber
  or pink by the flag, at the old length. (A first try inside the node section moved every later section by a
  fraction of a pixel and broke ~55 gallery screenshots; reverted.)
- Tests: `tests/pages/update-signals.spec.ts` (new: card edge bright → muted on select, bubble bright → muted, APCA both
  themes incl. "brighter than the action amber" in dark, flag off, gallery light/dark + screenshots, gallery flag off);
  `fresh-cards.spec.ts` (amber tab, two-colour pill, teal border with only updated); unit: `parking.test.ts`,
  `region-fresh.test.ts`, `node-core.test.ts` (`litReplies` through `nodeState`), `node-template.test.ts`
  (`data-unseen`). Screenshots re-taken: fresh-cards and card-updates gallery (light, dark); new update-signals ones.

**Caught Beyond the Brief**
- Opening the note bubble from a reply is not engagement (D-054): the reply stays bright in the card and the bubble
  until the card is selected. Consistent with the rule; noted for VERIFY_01.
- Container note replies on the frame (`region-note.css` `.vb-nblock-reply`) stay grey (not FE_01's file); in the
  bubble they are the muted amber. A request.
- The toolbar's "N new" chip (new and updated together) is still pink: a third colour for the same news. Not FE_01's.
- Hover/open on the amber tab drops to the duller changed amber (`--vb-state-context`), per "as today"; it reads as a
  step down on hover. For the maintainer's eye.
- In light, "bright" is a deep amber (`#a66800`) so the words reach Lc 45+; it reads brown-gold rather than glowing.

**Deviations**: none from the PLAN. Files outside the original ownership, each granted by the orchestrator in chat
(controller.ts, gallery/main.ts two lines, vb-region.ts, the new update-signals-section.ts); unit tests of owned files edited (`parking.test.ts`,
`region-fresh.test.ts`, `node-core.test.ts`, `node-template.test.ts`).

**Verification** (tier: wide)
- `npm run check` 0 errors; `npm test` 2370/2370; `npm run build`; `node scripts/verify.mjs` ok (no warning on a
  touched file).
- Owned page specs (update-signals, fresh-cards, card-updates, notes, note-polish, group-note): all pass; screenshots
  re-taken for fresh-cards, card-updates and the new update-signals ones (light, dark).
- Full page suite once (3 workers, port 7300) before the gallery fix: 61 failed, all gallery screenshots/positions.
  After moving the sample to a last section, the 31 failing files re-run: 7 left, all expected and not FE_01's:
  `gallery.spec.ts` "screenshot of each section" (light, dark) and `parking-replies.spec.ts` gallery screenshot
  (light, dark): the replies' amber edges, re-take; `header-tiers.spec.ts`, `ledgers.spec.ts`, `read-only.spec.ts`
  "the section is last": a section now follows theirs, so each selector needs `:not([data-feature="updateSignals"])`
  (as read-only.spec.ts already does for readOnlyControls).
- Browser: a busy dark board of my own (scratch project, port 7350, HOME in the scratchpad) at 1400, 900, 600 px,
  light and dark: amber tabs, two-colour pills, a bright reply on an unseen card beside a muted one on a seen card;
  the gallery section in dark.

## On Completion

Notes here (Changes Made, Verification, Caught Beyond the Brief, Deviations); your TASK-STATUS row; one LOG line,
`[board-ui] FE_01: … → Task: [[cortex-tasks/board/2026-11-05_board-ui_insert-markdown-signals/FE_01_update-signals.md]]`, ending in a
newline; the return block.
