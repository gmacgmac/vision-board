# Performance

> Rule 15 (`.kiro/steering/vision-board-proj.md`). The numbers here are the budgets the test
> suite enforces; the approach is how the board stays inside them as boards and ledgers grow.

## Budgets

| What | Budget | Measured on | Checked by |
|---|---|---|---|
| Layout, whole board | under 100 ms | 1,000 cards, 3 pins per container; and 1,000 cards with about 1,200 links in flow and lanes containers, routed round the cards | `packages/layout/tests/layout.timing.ts` |
| First draw of a board | under 1 s | 1,000 cards, page test machine | `tests/pages/perf.spec.ts` |
| One change shown | under 50 ms | one act on a 1,000-card board (median of five) | `tests/pages/perf.spec.ts` |
| A search keystroke | under 50 ms (median of the keystrokes), the first, which builds the index, under 100 ms; no card updated, measured or placed, no container laid out, no fetch | typing "the sta" in the box on the 1,000-card board | `tests/pages/search-perf.spec.ts`; the engine alone in `packages/search/tests/search.timing.ts` (index of 1,000 under 100 ms, a 3-word query under 5 ms) |
| Only what changed is redrawn | exactly 50 cards updated, measured and redrawn; only their containers laid out; no whole-board fetch | 50 cards changed in one batch on a 1,000-card board, and 1 card in a second case | `tests/pages/perf.spec.ts`, counting the work, not only timing it |
| Selecting is view state | selecting 50 cards updates exactly those 50; nothing measured, placed or laid out; no fetch (clearing the same) | 50 cards of one container on the 1,000-card board (3_FE_01) | `tests/pages/perf.spec.ts` |
| App panels kept loaded | a zoom step under 50 ms with panels loaded and frozen; no more than `LIVE_PANELS` loaded while no more are on screen (D-050) | 12 app cards, each zoomed to in turn | `tests/pages/app-alive.spec.ts`, `apps/board/tests/app-live-cap.test.ts` |
| Same picture | the page after each change equals a page opened afresh | seeded random changes (acts, agent drawing) | `tests/pages/same-picture.spec.ts`, `apps/board/tests/layout-cache.test.ts` |
| Markdown, one card | under 50 ms | a very large hostile input | `packages/ui/tests/markdown.timing.ts` |
| Board page weight | under 200 KB gzip (JS + CSS) loaded at start, a chunk reached only by `import()` (the chat panel's drawing, `shell/chat-view.ts`) not counted (D-049) | `npm run build` output | `npm run verify` (`scripts/verify.mjs` `PAGE`) |
| Server start | under 1 s | a 100,000-event ledger | `apps/board/tests/server-start.timing.ts` |

Today (2026-10-05, tracker N12, on the page-test machine: macOS, Chromium): layout of 1,000 cards takes about 3 ms (6 ms with 3 pins on a card in each of the 20
containers; 2026-10-11, field-report batch 3 BE_02: still 3 to 4 ms with connectors routed round the
cards, and about 32 ms for 1,000 cards with 1,179 links); the first draw of 1,000 cards ends 310 to 340 ms after navigation starts; one act is
shown in 25 to 30 ms (median of five, the round trip to the server included); a batch of 50 changed
cards updates and measures 50 cards and lays out their 2 containers, and 1 changed card in the last
container updates 1 card, lays out 1 container and redraws 2 connectors, with no full fetch in
either; the server starts on a 100,000-event ledger in about 330 ms, so it keeps no checkpoint yet
(approach 7 waits until it is needed).
A budget changes only with a reason in the PLAN of the task that changes it.

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
   the page at all), without changing their place in layout or their keyboard order. An app
   card's panel, once loaded, stays loaded but frozen there (inert, its frame not painted), and
   only `LIVE_PANELS` stay loaded at once (`apps/board/src/board/apps/app-cards.ts` `overCap`).
5. **Batch to the frame.** Several events that land together are applied in one frame
   (`requestAnimationFrame`), never one reflow each. Reads of sizes happen before writes of
   positions, never interleaved.
6. **History is loaded on demand.** The board holds the current state of each node. A node's
   earlier versions are read only when the person steps through them, and only for that node. A
   card's history box reads no ledger: the fold keeps, per card, only when its few kinds of line
   happened (`packages/actions/src/card-times.ts` `foldCardTimes`: `seq`, time, kind, no words), and
   the box is built from those when it opens (`apps/board/src/board/cards/history-flow.ts`).
7. **The ledger starts fast.** The server keeps a checkpoint of the folded state with the
   sequence number it covers, so startup folds only the events after it. The ledger itself stays
   the one source (D-017): a checkpoint can always be thrown away and rebuilt.

## Counting the work

The page counts what each change costs it (`apps/board/src/board/work.ts`), so the page tests prove
an event touched only what it should. The counters exist on every page and cost a few additions;
they are readable from outside only as **`window.__vbWork`**, which the page defines only when its
address carries **`?vbwork`** (the page tests open `/?vbwork#<board>`). `__vbWork.work` holds:

| Counter | Counts |
|---|---|
| `cardsUpdated` | cards rendered or updated (`render` or `update` on a `<vb-node>`) |
| `cardsMeasured` | cards whose size was read from the browser |
| `cardsPlaced` | cards whose place (transform, hidden) was written |
| `containersLaidOut` | containers laid out again (their layout mode ran); `containers` lists them |
| `linksRedrawn` | connectors whose path or look was written |
| `fullFetches` | reads of the whole ledger |
| `framesUpdated` | container frames updated (`update` on a `<vb-region>`) |
| `firstDrawMs` | milliseconds from navigation start to the end of the first draw |

`__vbWork.reset()` zeroes the counters (not `firstDrawMs`), `__vbWork.idle()` resolves once the page
has read every line the server holds and drawn it, and `__vbWork.rebuild()` throws away the held
state and everything drawn and draws again from a fresh read.

## How the budget tests run

- Unit timing tests are `*.timing.ts` files, not `*.test.ts`: `npm test` runs every unit test in
  parallel first, then `npm run test:timing` runs the timing tests alone, one file at a time
  (`--test-concurrency=1`), so a busy machine cannot fail them by running other tests beside them.
- The page budgets run on the worker's own performance board (`tests/pages/playwright.config.ts`,
  `ports.ts`; D-062) over a ledger `perfLedger` (`#format/testing`, `packages/format/tests/perf-ledger.ts`)
  generates from the roadmap fixture's shapes:
  `big`, 1,000 cards in 20 containers (the roadmap's grid, flow, radial and lanes containers, five
  times each, 50 cards each, with their kinds of links), and `mixed`, a copy of the roadmap board for
  the same-picture test. `perf.spec.ts` runs last and alone, one worker, in the `budgets` project that
  waits for the `chromium` project (the other page specs run on 5 workers, `VB_TEST_WORKERS`). To run it by
  itself: `npm run test:pages -- --no-deps perf.spec.ts`; `--shard` needs `--project=chromium`.

## Where this lands

- Points 1, 3 and 5 belong to the page (`apps/board/src/board`: `live.ts` holds the ledger state and
  applies new lines, `boardData` (`packages/actions/src/answers/board-data.ts`, held by
  `apps/board/tests/board-data.test.ts`) works a board out of it, `draw.ts`, `cards.ts`, `render.ts`
  and `wires.ts` draw what changed) and the shared client (`packages/client`, the live stream);
  point 2 to `packages/layout` (`layoutRegion`, `packRegions`) and the page's `layout-cache.ts`;
  point 4 to `offscreen.ts` and `viewport.ts`; point 6 to the reads in the API (`show_node`);
  point 7 to `apps/board/server/ledger.ts`.
- The work is tracker N12. Its page test runs before Stage 3, because Stage 3's selection and
  dragging code is the next thing it measures.
