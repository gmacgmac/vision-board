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

- [ ] Every PLAN.md criterion ticked with evidence, or open with a proposed row

## Implementation Notes

**Status**: Pending · **Completed**:

### Changes Made
-

## On Completion

Notes; your row; one LOG line (`[board-app] VERIFY_01: …` → this file); Return Contract with every
open finding in `REQUESTS`.

**Constraints**: no code changes; no PII; no commits; never 4466; never `cortex/AUDITED.md`.
