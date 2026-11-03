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

**Status**: Completed (Run 1)

### Changes Made
- `AccessRequests.svelte`: `readOnly` prop (BoardChrome passes `shown.readOnly`); Allow all / Allow / Refuse (and the note's Refuse) are aria-disabled, `data-paused`, title `READ_ONLY_PERSON`; a press does nothing.
- `BoardAgents.svelte`: Remove access likewise; `readOnly` prop, else the board's own state through `useChrome()`, so `ToolbarEnd` / `HeaderFields` (FE_02's) needed no change.
- Cards (`packages/ui`): `paused.ts` `explainPaused` gives every paused card control (answers, size, note pin, flag, Allow app, Stop app) the reason as its title and restores its own tip on Edit; `vb-node.ts` pauses Allow / Stop app (`APP`); `app-cards.ts` `press` toasts the reason and sends nothing (no confirm first).
- Looks: `button.css` `.vb-btn[data-paused]` quiet outline; `paused.css` quiet Allow in an app card's footer (the accent at half strength left its word unreadable).
- Gallery: new last section `read-only-controls-section.ts` (strip, Agents, app card Allow and Stop app); `access-section.ts` / `app-frame-section.ts` export the samples. Spec `tests/pages/read-only-controls.spec.ts` (7 tests; red first on `aria-disabled`); unit test `node-paused.test.ts`.
- `read-only.spec.ts`: its "section is last" check skips the new last section.
### Caught Beyond the Brief
- `ProposalsBar` Accept all (aria-disabled, title) has no `data-paused` and so no quiet look: REQUEST.
- At 600 px "Allow all" wraps onto two lines in the strip (`access.css`, not mine; also when editable).
- A locked board's card controls still say only "Check · a"; the reason is read-only's only (FE_01 scope).
### Deviations from Plan
- None. Appended the gallery section last (after Editing) so no screenshot above it moved; no screenshot files were taken.

## On Completion

Notes; your TASK-STATUS row; one LOG line, `[board-ui] FE_01: … → Task: [[cortex-tasks/board/2026-11-03_board-ui_read-only-follow-ups/FE_01_read-only-controls.md]]`, ending in a newline; the return block.
