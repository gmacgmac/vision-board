# FE_01_new-tab: NEW tab and seen from the table

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (rulings 1, 2)
> · **Model**: Sonnet 5.5 · **Needs**: BE_01

## Objective

A card the agent added later shows NEW, and selecting a card sends seen according to the table.

## Rulings (do not reopen)

1. A NEW tab in the bottom-edge slot (`node-template.ts` `bottomTabs`, `.vb-node-btabs`), read
   from `item.new` through the existing path (`pageConditions` in `board-data.ts`, the card
   facts into `CardConditions`, Stage 5 FE_01/FE_02 notes). Colour: the existing "new" tone
   (`.vb-chip[data-tone='new']`, `--vb-accent` family); no new token. The card's accessible
   name ends ", new". Not a button (nothing to open); hidden while a past version shows.
2. Seen on select (`apps/board/src/board/update-flow.ts` `seenMarks`) sends `mark_seen` for a
   card when any card row that holds for it has `'select'` in `clearedBy` (BE_01's helper);
   no hard-coded list of kinds in the page.
3. Flag `newCards` (on). `controller.ts` is at 300 lines: don't grow it.
4. Gallery: a NEW card in the "Changed cards" section (or beside it); APCA measured light and
   dark (label tier, Lc 45).

## Steps

1. [ ] Failing tests first: unit (card state with new; seen marks from `clearedBy`); page test:
   a fresh board has no NEW; an agent's later card shows NEW live; selecting it clears it; after
   Send and a new drawing, the older NEW goes; axe light and dark.
2. [ ] Build, gallery entry, flag.

## Validation

- [ ] The five gates exit 0. Look at it light and dark.

## Constraints

- If deviation is needed, stop and say so; no silent breaking changes. No PII in examples.
- No git commits or stash. Scratch in the system temp folder. Stop only your own processes.
- Fill Implementation Notes below, your row in TASK-STATUS.md, and your own LOG line.

## Implementation Notes

**Status**: Completed 2026-10-08

**Card.** `CardConditions.new` (node-core.ts) gives `NodeState.fresh` (items only) and ends the card's
name ", new" (after the other tab words, before ", selected"). Template: `<span class="vb-node-btab"
data-tab="new" aria-hidden="true" hidden>NEW</span>` last in `.vb-node-btabs` (not a button; the name
carries "new"); `VbNode.update` toggles `hidden`. CSS in `node-popover.css`: the toolbar chip's tone
(`--vb-accent` on `--vb-accent-soft`, as `.vb-chip[data-tone='new']`), `pointer-events: none`, no hit
area. No new token. `pattern.json`: state "new", the slot's part text.

**Page.** `attention.fresh()` (`pageConditions(...).fresh`). `update-flow.ts` gains `newCards` and
`fresh()`; `card(n)` returns `{ new: true }` for a fresh card (never beside "N updates", which the page
already leaves out); not while a past version shows. Seen on select: `updates.ts` `seenOnSelect({ fresh,
unseen })` keeps each set whose row says `clearsOnSelect(kind)` (BE_01), and `seenMarks` sends the latest
version of each; no list of kinds in the page. `update-flow.ts` split `live()` (cardUpdates) from
`current()` so NEW works on its own flag. Flag `newCards` (on; `flags.ts`). With it off the fresh cards
fall back into the unseen set, so they show updates and seen-on-select as before. `controller.ts` stays
at 300 lines (two lines edited in place).

**Gallery.** Ledger lines 242-243 (a person board-seen on `updates` at head 227, then card 103 by the
agent): one NEW card, in a "A new card" group of the Changed cards section (`updates-section.ts`, shown
only with `newCards`); `Fixture.updates.fresh`. No other gallery board has a NEW card (test).

**Contrast (APCA-W3 0.0.98G-4g, by script, light / dark).** `--vb-accent` on `--vb-accent-soft`:
61.2 / 47.0 (label tier, Lc 45). Looked at light and dark in the gallery screenshot.

**Found on the way.** `packages/actions/tests/heads.test.ts` kept an oracle that counted a person's
board seen as the board's own last line, which `fold.ts` has never done (`!(e.type === 'seen' && 'board'
in e)`); no earlier fixture had one. The oracle now skips it (test only, no behaviour change).

**Tests.** `packages/ui/tests/node-new.test.ts` (5); `apps/board/tests/updates.test.ts` (seen marks from
`clearedBy`); `gallery-fixture.test.ts` (one NEW card; the updates case reads `pageConditions`);
`tests/pages/new-cards.spec.ts` (8: fresh none, live NEW as a label with the name, select sends seen and
clears, Send then a new drawing, flag off, past version, axe light/dark, gallery with and without the
flag); `card-updates.spec.ts` gallery case (4 cards, the NEW one). A page test must read the ledger with
`board=` (the whole ledger is paged and a long one hides the board seen).

**Screenshots.** New: `card-updates-{light,dark}` (these baselines were untracked; they now include the
new group). Updated on purpose: `gallery-{light,dark}` (only the node section's states line, now with
"new": diff viewed); `parking-replies-{light,dark}` (the section below shifted by a sub-pixel, 1px of
height: viewed, content identical).

**Gates (all exit 0):** `npm test` (744 + 6); `npm run check`; `npm run verify` (0 warnings);
`npm run gen -- --check`; `npm run test:pages` (231 passed).

## On Completion

Fill in notes, update your row, append your own LOG line (`[board-app] FE_01: …`).
