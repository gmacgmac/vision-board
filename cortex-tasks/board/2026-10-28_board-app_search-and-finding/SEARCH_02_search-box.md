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

- [ ] Every behaviour in step 1, light and dark, gallery entries
- [ ] One box; digits unchanged; flag off = today; budgets hold

## Implementation Notes

**Status**: Pending · **Completed**:

### Changes Made
-

### Caught Beyond the Brief
- None

### Deviations from Plan
- None

## On Completion

Notes; your row; one LOG line (`[board-app] SEARCH_02: …` → this file); Return Contract.

**Constraints**: deviation → stop and ask; no PII; no commits; never 4466; never `cortex/AUDITED.md`.
