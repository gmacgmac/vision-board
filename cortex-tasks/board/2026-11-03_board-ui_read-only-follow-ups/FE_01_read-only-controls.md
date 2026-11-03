# FE_01_read-only-controls: Write controls while read-only

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

Every write control a person can press on a read-only ledger is disabled and says why (tracker N44, PLAN decision 1).

## Context

The previous set's VERIFY_01 F10 (`cortex-tasks/board/2026-11-03_board-app_ledgers-and-read-only/VERIFY_01_findings.md`)
lists them; the server already refuses each. READONLY_UI_01 disabled Send, New/Rename board, Lock/Archive, Accept all
and Restore the same way: follow that.

## Inputs

- **Files to modify**: `apps/board/src/board/chrome/AccessRequests.svelte` (Allow all / Allow / Refuse),
  `chrome/BoardAgents.svelte` (remove), `#ui`'s app card Allow app (`packages/ui/src/node/`), the card toolbar
  tooltips F10 names; `board/words/chrome-access.ts`; the gallery; a new `tests/pages/read-only-controls.spec.ts`
- **Reuse**: `BoardState.readOnly`, `blockedReason(…, readOnly)` (`shell/chat-rules.ts`), `READ_ONLY_PERSON`
  (`packages/actions/src/read-only.ts`), `#ui` paused/disabled (`packages/ui/src/paused/paused.ts`)
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. A failing page spec: on a read-only ledger (a test server with `edit: false`), each control is enabled today.
2. Disable each with the read-only reason (tooltip and accessible name), reusing the patterns above; no new sentence
   unless the reason needs one (then in its words file).
3. Every state of each control in the gallery (enabled, disabled read-only); axe and APCA light and dark.
4. A look at 1400, 900, 600 px, light and dark, on your own test server.
5. Doc lines for `docs/specification/components.md` (T_01 owns it next wave): list them under `REQUESTS`.

## Validation

- [ ] The new spec fails first, then passes; access, agents and app specs green; `verify`, `check`, unit tests of what changed

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

Notes; your TASK-STATUS row; one LOG line, `[board-ui] FE_01: … → Task: [[cortex-tasks/board/2026-11-03_board-ui_read-only-follow-ups/FE_01_read-only-controls.md]]`, ending in a newline; the return block.
