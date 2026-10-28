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

- [ ] Every finder keeps NEW and updated; a click or an act clears them (page spec)
- [ ] One go path, carried reason; the conditions table states it; flag off = today

## Implementation Notes

**Status**: Pending · **Completed**:

### Changes Made
-

### Caught Beyond the Brief
- None

### Deviations from Plan
- None

## On Completion

Notes; your row; one LOG line (`[board-app] FIND_01: …` → this file); Return Contract.

**Constraints**: deviation → stop and ask; no PII; no commits; never 4466; never `cortex/AUDITED.md`.
