# FIND_01_finding-keeps-marks: Finding never clears a card's marks

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

Going to a card to find it (Go to card, the open, new and updated lists, the container finder's
cards, and later search and the Review list) shows and selects it but never marks it seen. The
person's own click on the card, and every act, still do (ruling 322).

## Context

Today the go path (`board/find/go-to-card.ts` `to` → the controller's `arrive`) selects the card, and
`cards/update-flow.ts` marks every selected card seen (`seenOnSelect`, `packages/actions/src/answers/updates.ts`;
conditions `item.new` and `item.unseen` have `clearedBy: ['select', 'act']`, `packages/actions/src/conditions.ts`).
So a card found is a card "read". Behind a new flag `findKeepsMarks` (default on).

## Inputs

- **Files to modify**: see TASK-STATUS.md File Ownership (FIND_01)
- **Files to reference**: `apps/board/src/board/find/finder.ts` (`openRow`, the lists' go),
  `apps/board/src/board/controller.ts` `arrive`, `apps/board/src/board/cards/update-flow.ts`
  (`selected`), `docs/specification/components.md` (the fresh cards and Go to card sections)
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. **Failing tests first**: a page spec `tests/pages/find-keeps-marks.spec.ts`: a NEW card and an
   updated card; go to each by Go to card (digits, Enter), by the "N new" list and by the open list:
   each is selected and in view, and its NEW / "N updates" mark and the toolbar's count are unchanged,
   and no card seen line is written. Then a click on the card clears it, as today. A unit test for
   the rule. See them fail.
2. **One path**: every finder goes through one function, `go(n, { find: true })` (name it in the
   existing style), which selects and shows the card and tells the update flow not to mark it.
   Don't add a second selection path: carry the reason with the selection change.
3. **The conditions table** says it: `clearedBy` gains the distinction (for example `'select'` keeps
   meaning the person's own select, and a find is not one); `seenOnSelect` reads it. One table.
4. **The flag** `findKeepsMarks` is already in `flags.ts` (the orchestrator's); read it from there, and change only its description if what you built differs.
5. **Docs**: components.md § the fresh cards / Go to card: finding keeps marks, naming the symbol and test.
6. **Checks**: unit, `check`, `verify`, `gen-api --check`; page specs `find-keeps-marks`, `go-to-card*`,
   `open-list*`, `fresh*`, `select*` on `VB_TEST_PORT=5200`.

## Validation

- [x] Every finder keeps NEW and updated; a click or an act clears them (page spec)
- [x] One go path, carried reason; the conditions table states it; flag off = today

## Implementation Notes

**Status**: Completed · **Completed**: 2026-10-28

### Changes Made
- The reason travels with the selection: `selection.ts` `SelectBy` (`'select'` the person's own, `'find'`),
  `select(ids, mode, by?)`, `SelectionChange.by`. `update-flow.ts` `saw(ids, by)` passes it to `seenOnSelect`.
- The conditions table says it: `conditions.ts` `SelectedBy` and `clearsOn(kind, by)` (true only for the person's
  own select; `clearsOnSelect(kind)` stays, one argument, for `.filter(clearsOnSelect)`); `answers/updates.ts`
  `seenOnSelect(c, by = 'select')` reads it.
- The finding go path (shared with SEARCH_02, REVIEW_01): `go.to(n)` in `board/find/go-to-card.ts` (the box's
  Enter, the open list, the "N new" list and a chat chip's reveal all end there) -> the controller's `arrive`
  -> `selection.select([id], 'only', on('findKeepsMarks') ? 'find' : 'select')`. A new finder calls `go.to(n)`
  and needs nothing else; there is no second selection path.
- Tests: `tests/pages/find-keeps-marks.spec.ts` (new; 3 finders x new and updated card; click and act clear; a
  second find; flag off), `packages/actions/tests/updates.test.ts`, `apps/board/tests/selection.test.ts`;
  `tests/pages/fresh-cards.spec.ts` "N new" test rewritten (it asserted that choosing a card ended its NEW).
- Docs: `components.md` § Go to a card item 6 (Finding keeps marks), and the two lines in item 8 of the
  navigation section that said selecting from the list ends NEW.
- The flag `findKeepsMarks` description already matched; unchanged.

### Caught Beyond the Brief
- The first draft made `clearsOnSelect(kind, by)` two-argument; `rounds.test.ts` calls `CONDITION_KINDS.filter(clearsOnSelect)`,
  which passes the index as the second argument. Split into `clearsOn(kind, by)` and the unchanged one-argument `clearsOnSelect`.
- Card seen lines in the ledger carry `n` after `boardLines` (`tests/pages/board-lines.ts`), not on the raw events: the spec counts them through it.
- `#actions` does not export the type `SelectedBy` (index.ts is SEARCH_01's file this wave); `selection.ts` repeats the two-word union as `SelectBy`. See REQUESTS.

### Deviations from Plan
- None

## On Completion

Notes; your row; one LOG line (`[board-app] FIND_01: …` → this file); Return Contract.

**Constraints**: deviation → stop and ask; no PII; no commits; never 4466; never `cortex/AUDITED.md`.
