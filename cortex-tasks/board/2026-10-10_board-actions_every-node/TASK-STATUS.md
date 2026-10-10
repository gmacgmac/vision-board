---
task_name: Every node is part of the conversation
created: 2026-10-10
status: completed
completed: 2026-10-10
categories: [board-actions, board-format, board-ui, board-agent]
tracker: cortex-tasks/tracker.md#U13
---

# Every node is part of the conversation - Task Status

> **Plan**: [PLAN.md](./PLAN.md) (rulings 1-8 are the maintainer's; do not reopen).

| # | ID | Wave | Task | Model | Status | Notes |
|---|-----|------|------|-------|--------|-------|
| 1 | BE_01 | 1 | [Contract: the kind decides, numbers on every node](./BE_01_contract.md) | Opus 5.5 | Completed with BE_02/FE_01 (gates at FE_01) | Contract stands; ruling A: gates checked at the end of FE_01 |
| 2 | BE_02 | 2 | [Action layer and server](./BE_02_actions-server.md) | Opus 5.5 | Completed (gates at FE_01) | check, verify, gen-check green; unit red only gallery-fixture (3, FE_01) |
| 3 | FE_01 | 3 | [The page: every card numbered and answerable](./FE_01_page.md) | Opus 5.5 | Completed | All five gates exit 0 (BE_01, BE_02, FE_01 together); 32 screenshots updated after review |
| 4 | T_01 | 4 | [The skill](./T_01_skill.md) | Opus 5.5 | Completed | Skill v2, scenarios 10-11, 4-turn real run (Sonnet 5.5); five gates exit 0 |
| 5 | VERIFY_01 | 5 | [By hand with real agents](./VERIFY_01_by-hand.md) | Orchestrator | Completed | Claude and Kiro rounds passed; 4 findings for the maintainer |

Gates after every task, run by the orchestrator: `npm test`, `npm run check`, `npm run verify`,
`npm run gen -- --check`, `npm run test:pages`. No git commits or stash by sub-agents. Each task
appends its own LOG line (real time from `date`), fills its Implementation Notes and its row.
Scratch in the system temp folder; stop only your own processes; never touch `.visionboard/` or
real home-folder files. Page tests share ports: one page-testing agent at a time.

## Shared Foundations

| What | Path + symbol | Owner | Consumers |
|---|---|---|---|
| Kinds that need an answer, action lists | `packages/format/src/node-types.ts` (`NODE_TYPES[kind].answer`, `ANSWER_ACTIONS`, `NOTE_ACTIONS`) | BE_01 | all |
| Ledger v11 node event (no `item`) | `packages/format/schema/events/node.schema.json` | BE_01 | BE_02, T_01 |
| View `n` on every node | `packages/format/src/board-view.ts` | BE_01 | FE_01 |
| Decided statuses | `packages/actions/src/registry.ts` `DECIDED`, `CLOSED`, `isDecided` | BE_01, BE_02 | FE_01 |
| Response order | `packages/actions/src/response-order.ts` `inCardOrder`, `responsesPage` | BE_02 | T_01 |

## Implementation Notes

### BE_01
Contract done (ledger v11, `NODE_TYPES.answer`, `ANSWER_ACTIONS`/`NOTE_ACTIONS`, `n` on every
node, OpenAPI 1.13.0, gen, api.md 118-119). Forced: `act.ts` kind decides (BE_02 step 1);
interim readers by `NODE_TYPES[kind].answer`. `DECIDED` + `commented` deferred to BE_02 (it
broke owed and `list_open`). Gates: check, verify, gen-check green; `npm test` 4 red (gallery
fixture); `test:pages` 100 red (gallery page throws on the Changed cards section, counts, risk-based
specs, screenshots). Options A/B/C and D-040 wording in the task file.
### BE_02
Built on BE_01's tree (ruling A). `DECIDED` + `commented`, new `CLOSED` (✓/✗) and `isDecided`;
conditions on every card (a comment decides an answer card and stays owed); `list_open` = answer
cards not decided + any card owed; `show_node` `status` on every card (required); `propose` on a
non-answer card refused at write (`proposeProblem`); `response-order.ts` (`inCardOrder`,
`responsesPage`: cut in ledger order, then sorted; next page `after` the highest `seq`); MCP
instructions; api.md 120; `decidedIds` and region decided count use `isDecided`. Gates: check,
verify, gen-check, timing 0; unit 938 pass, 3 fail (gallery-fixture, FE_01). `test:pages` 38 red
(was 100): gallery data, counts, kinds, screenshots; list in BE_02's notes for FE_01.
### FE_01
Tooltips from `action-words.ts` (Yes/No on a question, Done on an action; key help too); region
count answer kinds only; Hide decided keeps an owed card (`owedCards`, `decidedIds(d, owed)`); flag
`everyNode` (`numberedView`); gallery ledger rebuilt by kind class, node gallery split into cards that
ask / tell; `every-node.spec.ts` + unit tests. Expectations moved by rulings: board counts, Later
count, a proposal fixture, gallery kinds. 32 baselines updated after viewing each. Gates: test, check,
verify, gen-check, test:pages (314) all 0. Steering terminology wording proposed in FE_01's notes.
### T_01
`SKILL.md` v2: no `item`; "Kinds: the kind decides" (ask with question/decision/action, explain with
the rest); "What the person's buttons mean" (one meaning on every card); grid by default, links only
for real flows, write in reading order; answers in card order; owe reply/append per note, park per
Later; one reply per group note; propose only on cards that ask; chat words a line or two, never the
cards' content. `scenarios.md` v2 (1, 2, 5, 7 updated; 10 three mixed cards, 11 agenda). Run:
`claude` 2.1.295 (Sonnet 5.5), test server on 4482, 4 turns: layout, kinds, group reply, appends,
park all good; chat words too long (rule added, better after, still over a line); a panel turn
skipped `list_open`. `NOTES.md` has the evidence. Gates: test 948+6, check, verify, gen-check,
test:pages 314, all 0.
### VERIFY_01
_Status:_ Completed. Claude and Kiro through the chat panel: every card numbered, plain cards three actions, a three-card comment, Later on a finding, answers in card order, nothing left owed. Findings in the task file (Send does not start a panel turn; no first board from the panel; Kiro narrates; ✗ read as "dropped" not "No").
