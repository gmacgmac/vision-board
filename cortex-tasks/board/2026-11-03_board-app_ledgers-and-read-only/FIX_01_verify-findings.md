# FIX_01_verify-findings: Fix what VERIFY_01 found

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

Every blocking finding in `VERIFY_01_findings.md` is fixed, each starting from a failing test; every non-blocking one
is fixed or left with a written reason.

## Context

Read `VERIFY_01_findings.md` and the notes of the task that built each finding's code. The PLAN's Decisions still bind:
a fix that would change one stops and is reported (`DEVIATION`).

## Inputs

- **Files to modify**: whatever the findings name (TASK-STATUS File Ownership, wave 8), never protected or orchestrator files
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. For each finding, blocking first: a failing test that reproduces it (unit, API or page spec), then the fix, then the
   test green. Note `F<n>: test <file> "<name>", fix <file> <symbol>`.
2. A finding in the bot's behaviour: change the instructions only with `npm run eval:bot` passing after (port 7200
   beside it; never two evals at once).
3. A finding left: its reason (out of scope, a decision needed, not reproducible) and, if it needs the maintainer, a
   `[needs-human-input]` line in your notes for the orchestrator to log.
4. Run the specs of everything you touched; `npm run verify`, `check`, `npm test`; `npm run test:plugin` if the plugin moved.

## Validation

- [ ] Every blocking finding has its test and fix; every other finding fixed or reasoned
- [ ] The checks in step 4 green

## Implementation Notes

_To be completed by the agent. Re-run? Add a `### Run N` block; never overwrite an earlier run._

**Status**: Pending

### Fixed
-
### Left, with reasons
-

## On Completion

Notes; your row; one LOG line (`[board-app] FIX_01: …` → this file, one line ending in a newline); the return block with
`REQUESTS`. No commit.
