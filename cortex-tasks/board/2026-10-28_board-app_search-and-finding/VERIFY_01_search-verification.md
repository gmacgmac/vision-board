# VERIFY_01_search-verification: Verification

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

Show, with evidence, that PLAN.md's success criteria hold, as a first-time person would meet them;
list exactly what doesn't.

## Context

You change no code. Read every task's notes first. A criterion holds when code and a test show it.
Findings go in `VERIFY_01_findings.md`, each with a proposed tracker row or request.

## Steps

1. **Search as a person**: a 60-card board (the roadmap fixture or the perf board, `VB_TEST_PORT=5600`):
   find a card by half a word, by two words in either order, by an accented word typed plain, by a
   word only in a note, only in a reply, only in its container's title. Is the best match first? Can
   you tell why each matched? Step with ↓/↑ at three zooms; Esc; digits still go.
2. **Marks kept**: NEW and updated cards found by search, Go to card, each list and the Review list keep
   their marks and the toolbar's counts; a click or an act clears them.
3. **Review list**: three proposals, one off screen, zoomed out: each reached and readable.
4. **Access by bot**: two bots, one asking for nine containers: two groups, the heading counts bots,
   Allow all grants only that bot's; labels are folder names (side panel, and the skill's `join` line).
5. **States and looks**: gallery entries, light and dark, axe on the new parts, contrast of the ring
   and the dim; keyboard only; a screen reader hears the count.
6. **Under a host**: `/` and the box stay inside the board's root (`board-host` fixture).
7. **Gates**: `npm test`, `npm run check`, `npm run verify`, `gen-api --check`. The full suite is the orchestrator's.
8. **Doc audit** (`cortex-docs`): components.md, the search package's README, the skill's `join` line, flags' descriptions.

## Validation

- [x] Every PLAN.md criterion ticked with evidence, or open with a proposed row (`VERIFY_01_findings.md` § Success criteria)

## Implementation Notes

**Status**: Completed · **Completed**: 2026-10-28

### Changes Made
- `VERIFY_01_findings.md` (new): evidence table, findings F1 to F13 each with a fix or a tracker row,
  the PLAN's success criteria with evidence. No product, test or doc code changed.
- Scratch in `temp/verify01/` (a 60-card probe board on 5600 with notes, a reply, accents, a
  container-only word, then a NEW and an updated card, three proposals, two bots; Playwright probes;
  a fake-host probe): deleted at the end, the probe server stopped.

### Verification
- Gates: `npm test` 1,827 + 14 timing pass; `check` 0 errors; `verify` ok (15 warnings; F11);
  `gen-api --check` current.
- Page specs on 5600: `search`, `search-perf`, `find-keeps-marks`, `proposals`, `access-by-bot`,
  `go-to-card`, `board-host`, `fresh-cards`, `open-list`, `gallery`: 120 passed.
- As a person on 60 cards: every search case in step 1 found the right card first with its part;
  stepping at 21 %, 37 %, 64 %; every finder kept NEW, "1 update", "2 new" and wrote no seen line;
  a click cleared and stayed cleared through a reload; Review's three rows; Allow all for one of two
  bots; light and dark looked at, gallery sections too.

### Findings (detail and fixes in VERIFY_01_findings.md)
- High: F6 under a host `/` opens an undrawn box and letters fire shortcuts.
- Medium: F1 "Go to card" label, F2 count and part run together, F3 current match indistinct, F4
  typing never shows the best match (maintainer), F5 container names ring every card, F7 the `join`
  tool's "Pricing chat" example.
- Low: F8 search README, F9 components.md host story, F10 performance.md row (SEARCH_02-R4),
  F11 proposals.spec.ts length, F12 strip fold, F13 reviewList description.

### Deviations from Plan
- None. Step 6 was run on a temp copy of the host fixture's setup (no `/` test exists in
  `board-host.spec.ts`).

## On Completion

Notes; your row; one LOG line (`[board-app] VERIFY_01: …` → this file); Return Contract with every
open finding in `REQUESTS`.

**Constraints**: no code changes; no PII; no commits; never 4466; never `cortex/AUDITED.md`.
