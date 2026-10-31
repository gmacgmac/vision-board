# FIX_01_verify-findings: What VERIFY_01 found

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) · **Findings**: [VERIFY_01_findings.md](./VERIFY_01_findings.md)

## Objective

Fix VERIFY_01's findings so a host gets what the spec promises. F1 and F2 block the set. The rest are fixed where the fix is small and safe; any left is stated in the spec or listed with its reason. Standalone doesn't change for a person.

## Steps

1. Each fix starts with a failing test, in `tests/plugin/` where a host sees it.
2. F1 and F2. Then F12 (a security line), F4, F5, F3, F6, F7, F10, F11, F13, F15. Then F8 and F9: fix by scoping if it moves no screenshot; otherwise narrow the spec's sentence to what is true.
3. F14: `:root`'s `color-scheme` is a rule reaching outside the root. If the plugin's sheet needn't carry it, move it to the standalone page's. `docs/principles.md` is protected: anything there is a proposal.

## Validation

- [ ] `npm run test:plugin` and `npm test` pass; no screenshot changes; each finding has an outcome in the notes: fixed, stated in the spec, or left, with why

## Implementation Notes

_To be completed by agent after task completion._

**Status**: Pending · **Completed**:

## On Completion

Notes; your row; one LOG line (`[board-app] FIX_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS`.
