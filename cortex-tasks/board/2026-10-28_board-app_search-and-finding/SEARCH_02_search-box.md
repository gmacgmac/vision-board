# SEARCH_02_search-box: The search box on the board

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

`/` opens the bottom-right box, which now takes letters too: matching cards get a ring, the rest dim,
the box says "3 of 12" and which part matched, ↓/↑ step through the matches, Enter goes, Esc clears.
Digits still go to a card by number.

## Context

Tracker M7; rulings 317 and 322 in PLAN.md. Built on SEARCH_01 (`packages/search`, `boardSearchDocs`)
and FIND_01 (the finding go path: stepping and Enter never clear NEW or updated). The Go to card box
(`shell/GoToCard.svelte`, `board/find/go-to-card.ts`) grows into the search box; don't add a second
box. Behind a new flag `cardSearch` (default on); off: today's digits-only box.

## Inputs

- **Files to modify**: see TASK-STATUS.md File Ownership (SEARCH_02)
- **Files to reference**: SEARCH_01 and FIND_01 notes; `board/input/commands.ts` (`go-to-card`
  command), `keys.ts` `route`, `shell/KeyHelp.svelte`, the fresh-card ring tokens
  (`docs/specification/components.md` § New and updated cards), `docs/specification/performance.md`
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. **Failing tests first** (`tests/pages/search*.spec.ts`, 5400): `/` opens the box (and doesn't type
   a slash); typing "pric ann" rings the matching cards and dims the rest; the box says "1 of 3" and,
   for the current match, which part matched ("in a note"); ↓ steps to the next match and brings it
   into view, ↑ back, wrapping; Enter goes (selects and focuses the card) and closes the box; Esc
   clears rings and dim and closes; an empty box clears; digits only ("12") still go to card 12;
   "No matches" said when none; stepping keeps NEW and updated (FIND_01); a screen reader hears the
   count (polite status). Under a host, `/` acts only inside the board (M10's rule). See them fail.
2. **The box's state** (`go-to-card.ts`): widen `GoBox` with the query, the hits, the current index;
   digits-only text keeps today's go. Matching runs per keystroke over the index built once per state
   change (`searchIndex(boardSearchDocs(...))`).
3. **`/`**: a command in `commands.ts`, in KeyHelp's list.
4. **Ring and dim**: a stage attribute while a search shows, a card attribute on matches and on the
   current one; CSS from tokens only (a ring like the fresh ring, dim by opacity on the rest, links and
   containers too). Contrast: the current match's ring Lc 30 at least; dimmed text is decoration.
   Reduced motion: no animated pan while stepping (the board's existing rule).
5. **Words**: every sentence in the go-to-card words files ("1 of 3", "No matches", "in a note", the
   box's label and placeholder "Card number or words").
6. **Gallery**: the box empty, with a query and count, no matches; a board section with rings and dim;
   light and dark (new baselines only).
7. **Performance**: typing on the 200-card performance board stays inside `performance.md`'s budgets
   (`perf.spec.ts` alone, `--no-deps`; check `uptime` first).
8. **Docs**: components.md § Go to card becomes § Go to card and search, with symbols and tests.
9. **Checks**: unit, `check`, `verify`, `gen-api --check`; `search*`, `go-to-card*`, `key-help*`,
   `keys*`, `board-host` page specs, `perf.spec.ts` on 5400.

## Validation

- [x] Every behaviour in step 1, light and dark, gallery entries (with the controller wiring applied; see Requests)
- [x] One box; digits unchanged; flag off = today; budgets hold

## Implementation Notes

**Status**: Completed · **Completed**: 2026-10-28

### Changes Made
- `board/find/go-to-card.ts`: `GoSearch` (key, docs, reveal, world, card), `createMatches` (index built
  once per `key`, `#search` `search`, hits best first, the current one, marks written only where they
  changed), `GoBox.found` ("1 of 3", "Card 12, in the title and a note"), `GoTo.step`, `refresh`,
  `words`. `/` opens the box empty when `search` is given; digits alone still go by number; Enter on
  words goes to the current match by `arrive` (the finding path); Esc, `to` and focus leaving clear.
- `input/commands.ts`: `/` is the `go-to-card` command's other key (`shown` stays `0–9`); `keys.ts`
  header. `KeyHelp.svelte`: a "Find a card by its words · /" row after the go row (cardSearch flag).
- `shell/GoToCard.svelte`: `search` and `onstep` props; one input whose numeric attributes drop with
  search, placeholder "Card number or words"; ↑↓ hint; one polite status holding the count and part
  (`data-tone="found"`) or what a go found. `App.svelte` reads `board.go.words`, wires `onstep`.
- Words: `board/words/go-to-card.ts` (`noMatches`, `matchOf`, `PART`, `cardMatchedIn`),
  `shell/words/shell-go-to-card.ts` (`cardNumberOrWords`, `steps`, `step`, `findACardByItsWords`).
- Look: `styles/board.css` (world `data-search`: other cards, containers, connectors, markers to 0.35
  opacity; `data-found` amber ring `--vb-state-context`, current wider with a halo; widths divided by
  `--vb-zoom`), `styles/go-to-card.css` (wider box, reading font, amber found edge).
- Gallery: `gallery/search-section.ts` ("Search the board": empty, matches, stepped, no matches, a
  container with rings and dim), last in `main.ts` after `reviewList`.
- Tests: `apps/board/tests/go-to-card-search.test.ts` (new), `keys.test.ts` (`/` under a host),
  `tests/pages/search.spec.ts` (new, 14 tests, new baselines `search-{light,dark}`),
  `tests/pages/search-perf.spec.ts` (new), `go-to-card.spec.ts` (the digits-only test runs with the
  flag off). Docs: `components.md` § Go to card and search (item 7; heading renamed, two references).
- REVIEW_01-R1 handled: `App.svelte` `onreview={(n) => board?.proposals.review(n)}`.

### Verification
- Unit 1,827 pass; `check` 0 errors; `gen-api --check` current; `verify` fails only on `modules.md`
  (`npm run map`, the orchestrator's).
- Page specs on 5400, with the controller wiring applied: `search`, `search-perf`, `go-to-card`,
  `board-host`, `find-keeps-marks`, `open-list`, `fresh-cards`, `gallery` all pass; `key-bubble` fails
  only its four screenshots (the new row, looked at). `perf.spec.ts` alone (`--no-deps`, load 4.7):
  11 passed. Search keystrokes on 1,000 cards: median 4.8 ms, first (index built) 27.8 ms; nothing
  updated, measured, placed or laid out. Rings APCA Lc 56.6 light, 63.7 dark. Looked at the gallery
  section light and dark.

### Requests
- **Blocking** `apps/board/src/board/controller.ts` (no owner in wave 2; REVIEW_01 edits it too): the
  wiring below. Applied for verification, then reverted. Until applied, the box stays digits-only.

```diff
--- a/apps/board/src/board/controller.ts	2026-10-28 13:44:51
+++ b/apps/board/src/board/controller.ts	2026-10-28 13:44:51
@@ -13,7 +13,7 @@
 // Everything outside the board comes from its host (host.ts): calls, change events, settings,
 // notices and confirmations; what a host shows of the board goes out through its status (status.ts).
 import type { FlagName, LedgerEvent, View, ViewNode } from '#format';
-import { answeredIds, boardData, goTarget, placedView, retiredCounts } from '#actions';
+import { answeredIds, boardData, boardSearchDocs, goTarget, placedView, retiredCounts } from '#actions';
 import { ApiError } from './io.ts';
 import type { ConfirmList } from './host.ts';
 import { alignOf, flagOf } from './host.ts';
@@ -131,6 +131,7 @@
     renderCounts();
     notes.place();
     flow.place();
+    go.refresh(); // a search showing marks the cards as drawn now (SEARCH_02)
     status.set({ drawn: status.now.drawn + 1 }); // a host's chat refreshes what it attaches
     if (drew) toast(boardWords.theAgentDrewV(status.now.version));
   }
@@ -177,7 +178,10 @@
   /** Go to a card by its number (go-to-card.ts), the one path every finder takes: select and focus it, a pan only by `revealPan`'s rule (`vp.reveal`), the zoom kept.
    *  A find marks nothing seen (findKeepsMarks flag, ruling 322): the selection says `find`, update-flow.ts `saw` reads it. */
   const go = createGoTo({ show: (box) => status.set({ go: box }), past: showVersion, ...(on('goAfterPause') && { pause: GO_PAUSE }), find: (n) => goTarget(versions.state ?? live.state, S.id, n, (id) => !!drawing.layout?.nodes.has(id), versionView),
-    arrive: (id) => { selection.select([id], 'only', on('findKeepsMarks') ? 'find' : 'select'); drawing.cards.get(id)?.focus({ preventScroll: true }); const b = drawing.layout?.nodes.get(id); if (b) vp.reveal(b); } });
+    arrive: (id) => { selection.select([id], 'only', on('findKeepsMarks') ? 'find' : 'select'); drawing.cards.get(id)?.focus({ preventScroll: true }); const b = drawing.layout?.nodes.get(id); if (b) vp.reveal(b); },
+    // Words too (cardSearch flag, SEARCH_02): the cards drawn, indexed once per draw (`S.data`), marked on the world.
+    ...(on('cardSearch') && { search: { key: () => S.data, world, card: (id: string) => drawing.cards.get(id), reveal: (id: string) => { const b = drawing.layout?.nodes.get(id); if (b) vp.reveal(b); },
+      docs: () => (S.data ? boardSearchDocs((versions.state ?? live.state)!, S.id, view()).filter((doc) => drawing.layout?.nodes.has(doc.id)) : []) } }) });
   /** The lasso, the selection bar and the view commands (3_FE_02, selection-flow.ts). */
   const flow = createSelectionFlow({
     stage, vp, selection, notes, layout: () => drawing.layout, pill: on('selectionPill'), // the pill (stage5-follow-ups FE_02)
```
- Non-blocking: re-baseline `key-bubble.spec.ts` `key-bubble-open-{light,dark}` and
  `key-bubble-gallery-{light,dark}` (the "/" row); `npm run map`; a "Search, a keystroke" row in
  `docs/specification/performance.md` (`search-perf.spec.ts`), not my file.

### Caught Beyond the Brief
- The dim would fail axe's contrast on every dimmed card: the page tests read axe without the contrast
  of what a search dims (`search.spec.ts` `undimmedFindings`), by the brief's ruling that dimmed text is
  decoration. The gallery-wide axe tests pass with the section in.
- Outline widths in world pixels would vanish zoomed out: the rings divide by `--vb-zoom`, so they
  keep their width on screen ("where the matches are, at a glance").
- A redraw while a search shows may rebuild card elements: `refresh` writes every mark again.
- Cards not drawn (hidden with H) are left out of the docs in the wiring, so a match is always ringable.

### Deviations from Plan
- `node.css` untouched: ring and dim are the board's mode, scoped by the world in `board.css`.
- `/` is a second key of the `go-to-card` command, not a new command: a new id needs `key-help.ts`
  and `selection-flow.ts` (not mine). Its key-list row is added in `KeyHelp.svelte`.
- Typing does not pan; only ↓/↑ do (the person keeps their place). Refine with the maintainer.
- "Under a host" is held by the unit test of `route` (`keys.test.ts`); no host page test
  (`board-host.spec.ts` is not mine).

## On Completion

Notes; your row; one LOG line (`[board-app] SEARCH_02: …` → this file); Return Contract.

**Constraints**: deviation → stop and ask; no PII; no commits; never 4466; never `cortex/AUDITED.md`.
