# BOT_01_standalone-eval: Standalone bot eval

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

`npm run eval:bot` gains a standalone mode that runs the real SKILL.md with the real `vb-mcp` against a test board
server, scored by the same checks, with three standalone scenarios (tracker M53, PLAN decision 5).

## Context

The eval runs only the plugin's bot. SKILL_01 (previous set) checked standalone lines by hand: `claude -p` with SKILL.md
as the system prompt and `vb-mcp` on a test server (ports and recipe in its task notes; 4 runs, $0.30).

## Inputs

- **Files to modify**: `tests/evals/bot/**` (a standalone host beside `host.ts` / `mcp-bot.ts`, the mode flag in
  `run.ts`, new scenarios), `skills/vision-board/{scenarios.md,NOTES.md}`
- **Reuse**: `Stage`, checks, report, limits (`tests/evals/bot/`); never a copy of the plugin host's code — share it
- **Skills**: `cortex-architecture`

## Steps

1. The mode: `npm run eval:bot -- --standalone` (or the harness's own flag style), a test server under the OS temp
   folder with both flags on, `vb-mcp` started with `VB_PROJECT` there; the same report.
2. Scenarios: a picture lands in the open ledger's `images/`; the bot reads another ledger when the person names one
   (what it does next is the person's ask; score the read, the named ledger and that nothing is written there);
   after `join`, the bot checks `ledger`.
3. Dry run first; then real runs within $3 in all; existing scenarios in the plugin mode still pass.
4. A `package.json` script, if one is needed: under `REQUESTS` (the orchestrator's file).

## Validation

- [ ] Dry runs green in both modes; a real standalone run passes the three scenarios; plugin mode unchanged; spend reported

## Constraints

Deviation from a PLAN decision: stop and report (`DEVIATION`). No PII in examples. No git commits. Long writes in
chunks. Only your files (TASK-STATUS File Ownership); other needs under `REQUESTS`.

## Implementation Notes

_Re-run? Add a `### Run N` block; never overwrite an earlier run._

**Status**: Pending

### Changes Made
-
### Caught Beyond the Brief
-
### Deviations from Plan
-

## On Completion

Notes; your TASK-STATUS row; one LOG line, `[board-agent] BOT_01: … → Task: [[cortex-tasks/board/2026-11-03_board-ui_read-only-follow-ups/BOT_01_standalone-eval.md]]`, ending in a newline; the return block.
