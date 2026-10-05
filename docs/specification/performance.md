# Performance

> Rule 15 (`.kiro/steering/vision-board-proj.md`). The numbers here are the budgets the test
> suite enforces; the approach is how the board stays inside them as boards and ledgers grow.

## Budgets

| What | Budget | Measured on | Checked by |
|---|---|---|---|
| Layout, whole board | under 100 ms | 1,000 cards, 3 pins per container | `packages/layout/tests` |
| First draw of a board | under 1 s | 1,000 cards, page test machine | page test (tracker N12) |
| One change shown | under 50 ms | one act on a 1,000-card board | page test (tracker N12) |
| Only what changed is redrawn | exactly 50 cards updated, measured and redrawn; only their containers laid out; no whole-board fetch | 50 cards changed in one batch on a 1,000-card board, and 1 card in a second case | page test counting the work, not only timing it (tracker N12) |
| Markdown, one card | under 50 ms | a very large hostile input | `packages/ui/tests/markdown-safety.test.ts` |
| Board page weight | under 150 KB gzip (JS + CSS) | `npm run build` output | `npm run verify` (tracker N12) |
| Server start | under 1 s | a 100,000-event ledger | server test (tracker N12) |

Today (2026-10-05) the board page is about 52 KB gzip, and layout of about 350 cards takes about
5 ms. A budget changes only with a reason in the PLAN of the task that changes it.

## Approach

1. **Work in proportion to what changed.** An event updates only the cards it touches. Nothing
   rebuilds the whole board after a change, and the page never re-fetches the whole board to show
   one event: it applies the event to the state it already holds.
2. **Recalculate only what a change affects.** Layout stays a pure function, but it runs per
   container: a change to one card re-runs that card's container, then the cheap packing of
   containers, then only the links that touch a moved box. Containers nothing touched keep their
   result. A test proves the incremental result equals a full layout of the same input (same
   input, same picture, rule 9).
3. **Measure only what changed.** Reading a card's size from the browser is the expensive step.
   Only cards whose content, size tier or state changed are re-measured; the rest keep their
   last size.
4. **Draw only what is on screen.** Cards and links outside the visible area, or below the
   far-zoom level, are skipped or drawn as cheap placeholders (`content-visibility`, or not in
   the page at all), without changing their place in layout or their keyboard order.
5. **Batch to the frame.** Several events that land together are applied in one frame
   (`requestAnimationFrame`), never one reflow each. Reads of sizes happen before writes of
   positions, never interleaved.
6. **History is loaded on demand.** The board holds the current state of each node. A node's
   earlier versions are read only when the person steps through them, and only for that node.
7. **The ledger starts fast.** The server keeps a checkpoint of the folded state with the
   sequence number it covers, so startup folds only the events after it. The ledger itself stays
   the one source (D-017): a checkpoint can always be thrown away and rebuilt.

## Where this lands

- Points 1, 3 and 5 belong to the page's controller and the shared client (`apps/board/src/board`,
  `packages/client`); point 2 to `packages/layout`; point 4 to `render.ts` and `viewport.ts`;
  point 6 to the reads in the API (`show_node`); point 7 to `apps/board/server/ledger.ts`.
- The work is tracker N12. Its page test runs before Stage 3, because Stage 3's selection and
  dragging code is the next thing it measures.
