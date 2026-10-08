---
task_name: Proposals, Seen, Parking, Append and Replies on the Board
created: 2026-10-08
status: completed
completed: 2026-10-08
categories: [board-app, board-actions, board-format, board-ui]
tracker: cortex-tasks/tracker.md#U1,U3
---

# Proposals, Seen, Parking - Task Status

> **Plan**: [PLAN.md](./PLAN.md) (rulings 1-11 are the maintainer's; do not reopen)

| # | ID | Wave | Task | Model | Status | Notes |
|---|-----|------|------|-------|--------|-------|
| 1 | BE_01 | 1 | [Contract and rules](./BE_01_contract-and-rules.md) | Opus 5.5 | Completed | ledger v10, OpenAPI 1.9.0, api.md 93-96 |
| 2 | FE_01 | 2 | [Proposals on cards and the bar](./FE_01_proposals.md) | Opus 5.5 | Completed | card popover, bottom tabs, bar, flag proposals |
| 3 | FE_02 | 3 | [Changed cards and seen](./FE_02_changed-cards.md) | Opus 5.5 | Completed | updates tab, stepper, seen on select, versionChanges |
| 4 | FE_03 | 4 | [Parking and replies](./FE_03_parking-and-replies.md) | Sonnet 5.5 | Completed | Awaiting word, handover tab and box, replies under notes, flags handover and cardReplies |
| 5 | VERIFY_01 | 5 | [End-to-end check](./VERIFY_01_end-to-end.md) | Orchestrator | Completed | 1 bug fixed (raw Markdown in the stepper); N27 for the selection bar over a box |

Gates after every task, run by the orchestrator: `npm test`, `npm run check`, `npm run verify`,
`npm run test:pages`, `npm run gen -- --check`. No git commits or stash by sub-agents. Each task
appends its own LOG line and fills its Implementation Notes and its row here.

For sub-agents: scratch projects, logs and screenshots in the system temp folder, never the repo's
`temp/` (Dropbox churn); stop only your own processes by PID or port, never `pkill -f`. Tell the
orchestrator if anything writes many files inside the repo.

## Shared Foundations

| What | Path + symbol | Owner | Consumers |
|---|---|---|---|
| Proposal rules, `reject` act, implicit seen, `append` | `packages/actions/src/act.ts` `proposalProblems`; `fold.ts`; server write path | BE_01 | FE_01, FE_02, FE_03 |
| Conditions rows `proposal.open`, `proposal.stale`, `item.awaiting`; `item.unseen` on the card | `packages/actions/src/conditions.ts` `CONDITIONS` | BE_01 | FE_01, FE_02, FE_03 |
| Card popover (box beside a card: hover/focus preview, click/Enter opens, Esc closes) | `packages/ui/src/node/node-popover.ts` `bindCardPopover` | FE_01 | FE_03 (Handover box) |
| Bottom-edge card tabs (PROPOSAL, N UPDATES, HANDOVER) | `packages/ui/src/node/node-template.ts` (bottom tab slot) | FE_01 | FE_02, FE_03 |
| Card state for the new parts | `packages/ui/src/node/node-core.ts` `NodeState` (`proposal`, `updates`, `awaiting`, `handover`, `replies`) | each task adds its own field | — |
| Version change chips | `packages/actions/src/changes.ts` `versionChanges` | FE_02 | VERIFY_01 |

## Implementation Notes

### BE_01: Contract and rules
_Status:_ Completed 2026-10-08. Ledger v10 `reject { n, proposal }`; `validateAct` proposal rules
(plain words; the server runs act rules before the context check); fold `outcome` (accepted, rejected,
closed) and seen-by-acting; `append` write item stored as a `node` line; rows `proposal.open`,
`proposal.stale`, `item.awaiting`, `item.unseen` on the card. For FE tasks: `standing(s, p)` in
`packages/actions/src/proposals.ts` is internal, read the rows instead; a `Proposal` now carries
`outcome`. Details in the task file.

### FE_01: Proposals on cards and the bar
_Status:_ Completed 2026-10-08. For FE_02/FE_03: `nodeState(n, s, tier, selected, c)` takes
`CardConditions` (add `updates`, `awaiting`, `handover`, `replies` there; the page fills it in
`proposal-flow.ts` `card` via draw.ts `facts`, so FE_02/FE_03 extend that function or compose one).
Bottom tabs: `.vb-node-btabs` in `node-template.ts` `bottomTabs`; a popover tab is a name in
`POPOVERS` plus `bindCardPopover(this, name)` in `vb-node.ts` `render` (see `proposalPop`). Opened boxes
are panned into view (`POPOVER_OPEN`, focus.ts). Details in the task file.

### FE_02: Changed cards and seen
_Status:_ Completed 2026-10-08. For FE_03: `CardConditions` now also holds `updates`; the page merges
facts in `controller.ts` (`facts: (n) => ({ ...proposals.card(n), ...updates.card(n) })`), so add
yours the same way. The bottom slot's updates tab follows the popover tabs (`bottomTabs`); with two
tabs or more the footer buttons rise and the row drops 2px (`node-popover.css`, WCAG 2.5.8), which a
third tab (HANDOVER) inherits. Card seen lines go through `sender.seen`. Selecting a card marks any
`item.unseen` card seen, version 1 included (to confirm). `controller.ts` is at 300 lines. Details in
the task file.

### FE_03: Parking and replies
_Status:_ Completed 2026-10-08. `parking.ts` (`createParking`) gives the card facts (`awaiting` from `item.awaiting`, `handover`, `replies`) merged in `controller.ts` `facts`; `NodeState` gains `awaiting`, `handover` and replies inside `NotesView` (`pin` now optional); "Awaiting" replaces "Saved for later" in the footer; the HANDOVER tab is a second popover (`POPOVERS`); container note replies show in the note block, cut by its "Show all" (no per-reply tip). A re-parked card (Later again, no new park) shows no old handover. controller.ts is 300 lines. Details in the task file.

### VERIFY_01: End-to-end check
_Status:_ Completed. Every step passed by hand over real MCP and the page; fixed the stepper showing raw Markdown (`stepMarkup` renders each line); tracker N26 (other proposals) and N27 (selection bar covers an open card box) added. All five gates 0.
