# T_03_page-weight-headroom: The board page back under its budget

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The board page is back under 200 KB gzip (`docs/specification/performance.md`, `scripts/verify.mjs` `PAGE`) with real
headroom (aim: 195 KB or under), without raising the budget and with no change a person sees.

## Context

`npm run verify` fails: 200.6 KB after wave 2 (200.0 at its base; `ledgers/done` and `ro-follow-ups/wave-1` passed).
The ledgers, read-only and follow-up work all added page code and flag descriptions (`packages/format/src/flags.ts`
ships in the page). D-049 keeps code reached only by `import()` out of the count (the chat panel's drawing,
`shell/chat-view.ts`, is the model).

## Inputs

- **Files to modify**: what the measurement points to, within your ownership (TASK-STATUS File Ownership, wave 3);
  `packages/format/src/flags.ts` is granted to you this wave (descriptions may leave the page if only the gallery and
  docs read them: check every reader); `docs/specification/performance.md` (what moved, the new figure)
- **Reuse**: the `import()` split of `shell/chat-view.ts`; the build's own output for what weighs what
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. Measure what the start bundle holds, biggest first (the build's chunk report, a byte count per module); name the
   candidates and their gzip weight.
2. Move what the page does not need at start behind `import()` (dialogs opened on a press, gallery-only text,
   read-only or ledger menus), or out of the page when no page code reads it. No behaviour or look change.
3. The page specs of whatever moved (a dialog loaded late still opens on the first press, focus and all), and the
   `verify` figure before and after.

## Validation

- [ ] `npm run verify` passes, figure noted; specs of moved parts green; `check`; unit tests of what changed

## Constraints

Deviation from a PLAN decision: stop and report (`DEVIATION`). No PII in examples. No git commits. Long writes in
chunks. Only your files; other needs under `REQUESTS`. The budget itself is not changed.

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

Notes; your TASK-STATUS row; one LOG line, `[project-tooling] T_03: … → Task: [[cortex-tasks/board/2026-11-03_board-ui_read-only-follow-ups/T_03_page-weight-headroom.md]]`,
ending in a newline; the return block.
