---
task_name: The Answer Model - Check and Cross, and a Note Never Answers
created: 2026-10-15
completed: 2026-10-15
status: completed
categories: [board-actions, board-ui, board-agent]
tracker:
---

# The Answer Model - Task Status

> **Plan**: [PLAN.md](./PLAN.md)
> **Created**: 2026-10-15 · **Go to build**: given 2026-10-15 ("just start building")

---

## Instructions for Agents

1. **Read PLAN.md first**; its Rulings are the maintainer's and are not reopened.
2. **Read notes from completed tasks** before starting yours.
3. **Respect the Wave column.**
4. **Reuse Shared Foundations**; import, never re-create.
5. **If you need to deviate, STOP and inform the maintainer.**
6. **Update frontmatter `status`**: `planned` → `in-progress` → `completed`.
7. **Update your row** below when you finish, and add notes to your task file and here.
8. **No git commits or stash.** Never touch `.visionboard/`; don't use the board on 4466. Only one
   page-test run at a time. Scratch in the system temp folder; stop only your own processes.

---

## Task List

| # | ID | Wave | Task | Model | Status | Notes |
|---|-----|------|------|-------|--------|-------|
| 1 | BE_01 | 1 | [Action layer and contract](./BE_01_action-layer-contract.md) | Opus 5.5 | COMPLETED | API 1.23.0; derived state `unseenAnswer`; FE_01's test failures named in BE_01 notes |
| 2 | FE_01 | 2 | [Page](./FE_01_page.md) | Opus 5.5 | COMPLETED | Gates green but `test:timing`: server start 1.9 s (fold 143 ms at HEAD → 1,470 ms with BE_01's action layer) |
| 3 | T_01 | 2 | [Skill](./T_01_skill.md) | Opus 5.5 | COMPLETED | Skill v3.4; scenarios 22, 23 new and passed (kiro-cli; claude login expired) |
| 4 | BE_02 | 3 | [Check and cross in every agent read](./BE_02_every-agent-read.md) | Opus 5.5 | COMPLETED | API 1.24.0; `STATUS_OUT`/`statusOut`, `actionIn`; propose `ack`/`drop` refused by name; gates green |
| 5 | VERIFY_01 | 4 | [By hand](./VERIFY_01_by-hand.md) | Orchestrator | COMPLETED | Claude Code (Opus 5.5) passes 4, 5, scenarios 22, 23; Kiro (Opus 5.5) fails "asks again" once and proposes in chat once; 2 tracker rows proposed |

**Status Values**: `Pending` | `In Progress` | `COMPLETED` | `Blocked` | `Deferred`

---

## Shared Foundations

| Artifact | Created by | Consumed by |
|----------|-----------|-------------|
| `packages/format/src/node-types.ts` (`ANSWER_ACTIONS`, `NOTE_ACTIONS` without `context`) | BE_01 | FE_01, T_01 |
| `packages/actions/src/registry.ts` (`DECIDED` = `CLOSED` = acknowledged, dropped) | BE_01 | FE_01 |
| `MEANINGS` removed; `check` / `cross` at the API edge | BE_01 | FE_01, T_01 |
| `packages/actions/src/board-state.ts` (`counts` → `answered`) | BE_01 | FE_01 |
| The fold's "the agent's answer cleared it, not yet seen" state on a card: **`unseenAnswer`** (`ItemState.unseenAnswer?: true` from `boardState`; `unseenAnswer(s, id)` in `packages/actions/src/clears.ts`; also holds `item.unseen`) | BE_01 | FE_01 |
| `check_responses` folded per card (ruling 9), the OpenAPI bump | BE_01 | T_01 |

---

## Implementation Notes

### BE_01: Action layer and contract
_Status:_ COMPLETED (2026-10-15)
_Notes:_ Full notes in the task file. For FE_01: the derived state is **`unseenAnswer`**
(`ItemState.unseenAnswer`, `unseenAnswer(s, id)` in `clears.ts`); it also makes `item.unseen` hold,
so select already sends the `seen` that ends it, but the "N updates" count is 0 after a `reply`
alone. `counts()` returns `answered`; registry labels are "Check"/"Cross" (reply words ✓/✗);
`context` has no key and no status (an old one reads as `commented`); `ItemStatus` still lists
`context` for compilation. Minimal page edits to own: `node-template.ts`, `key-help.ts`,
`toolbar-counts.ts` (`decided: c.answered`), gallery `node-section.ts` (`matrix` skips a status with
no card), `node-template.test.ts`. Expected FE_01 failures: 15 unit (packages/ui node-core,
node-flag, node-proposal, region-core; apps/board every-node-page, gallery-fixture, key-help,
proposals) and 63 page tests (screenshots, labels, M key, "decided", Hide decided, chat words, a
Later click under the toolbar). For T_01: `check_responses` reads `action: "check" | "cross"`, no
`means`, each card's marks folded to its latest after the cursor; a note never answers and is
owed even after an earlier ✓; the agent's answer (a `reply` naming the latest note, or a newer
version) clears earlier ✓, ✗ and Later; MCP instructions rewritten (`info.ts`). D-045 appended.
_Follow-up: fold time._ `test:timing` was over budget (server start 1.7-1.9 s on 100,000 events).
A profile put the time in `unsent.ts` `foldMark`, which scanned every unsent line on each ✓, ✗,
Later or clear. Now each card's unsent mark is kept in `LedgerState.unsentMarks`, with no change in
behaviour: `foldLedger` takes about 150 ms (HEAD 143 ms) and server start 561 ms. `retire.ts` now
words an old `context` note as a comment ("still has an unanswered comment"). `test:pages`: 430
pass; 2 fail, the gallery Remove screenshots (light, dark), whose only change is that wording on card
35. They need `--update-snapshots` on `tests/pages/person-remove.spec.ts` (not touched by BE_01).

---

### FE_01: Page
_Status:_ COMPLETED (2026-10-15)
_Notes:_ Full notes in the task file. ✓ and ✗ are Check and Cross, lit with no word, named
"checked"/"crossed"; ✗ no longer fades or strikes; cards that only inform show no status
(`asksAnswer`); More context and M gone; lit button clears ("12 cleared"), ✗ over ✓ switches, 400 ms
same-button guard (`REPEAT_MS`); "answered" everywhere (`answeredIds`, Hide answered, chip, container
count). Ruling 7: the agent's reply that cleared a card is one step of the "N updates" stepper
(`CardStep.reply`, `updates.ts` `unseenCount`/`unseenSteps`/`seenDue`). Gallery rows ✓ Checked, ✗
Crossed, Answered by the agent. 48 screenshot baselines updated, every diff viewed. Gates: check,
verify, gen, test:pages (432) pass; `npm test` fails only `test:timing` server start (1.9 s vs 1 s):
`foldLedger` 143 ms at HEAD, 1,470 ms now, in `packages/actions` (BE_01's), not page code. Also for
the action layer: `retire.ts` still says "the more context you asked for". Open questions in the
task file: "Awaiting" kept on informing cards in Later; a reply that cleared nothing still shows "1 update".

---

### T_01: Skill
_Status:_ COMPLETED (2026-10-15)
_Notes:_ Full notes in the task file. Skill v3.4 (`skills/vision-board/SKILL.md`): ✓/✗ read from
the card, `check` / `cross`; a note never answers; the agent's answer clears the card, so it asks
again; one ask per card; say where it applies; propose consolidating a container with one decision
card, act only on its ✓. Scenarios 2, 10, 13, 15, 16, 19 updated; 22 and 23 new. Runs with
`kiro-cli` 2.24.0 (the `claude` CLI's login had expired): 22, 23 and 10 passed; runs in NOTES.md.
For VERIFY_01: run 22 and 23 with Claude Code once `claude` is signed in again, and see a cleared
card on the page. Gates: verify 0, check 0; npm test and test:pages left to FE_01.

---

### BE_02: Check and cross in every agent read
_Status:_ COMPLETED (2026-10-15)
_Notes:_ Full notes in the task file. `registry.ts` `STATUS_OUT` / `statusOut` (acknowledged→checked,
dropped→crossed) beside `ACTION_OUT`; `actionIn` reads `ACTION_OUT` the other way. Applied in
`reads.ts` (`nodeDetail`, `openItems`, new `itemsOut` for `get_board`) and `numbers.ts`
`proposalOut` (`check` / `cross`), so `get_board`, `show_node`, `show_container`, `list_open` and
`write_board` `pending` carry the new words. `write_board`: `propose` takes `check` / `cross` (own
branch in `write-item.schema.json`, stored `ack` / `drop`); `ack` / `drop` refused `invalid` naming
the new word. Page untouched (it folds `read_ledger`); `board-data.test.ts` compares with `itemsOut`
applied; page specs that propose through the API send `check` / `cross`. OpenAPI 1.24.0, api.md 147.
Skill wording: SKILL.md propose line and scenario 4 (`"ack"` → `"check"`), noted in NOTES.md.
Gates: check 0; npm test 1248/1248 + timing 7/7; verify 0; gen current; test:pages 432 passed.

---

### VERIFY_01: By hand
_Status:_ COMPLETED (2026-10-15)
_Notes:_ Full notes and seven numbered problems in the task file. T_01's harness: servers on
4491/4492 (`HOME`, `VB_PROJECT` in `$TMPDIR/vb-verify01`, `VB_KIRO_AGENT=0`, stopped after);
`claude -p` 2.1.301 with the panel's flags and only `vb` (ran **Opus 5.5**); `kiro-cli` 2.24.0
workspace agent with the skill as prompt and only `@vb` (ran **Opus 5.5**); every person act through
the page with Playwright, messages from `promptFor` / `roundOf`. Product side, both boards: the ✓
then cleared card sent nothing; one `ack` for a double click; `check_responses` reads `check` /
`cross`; the reply cleared the ✓ on the action (open, unmarked, "1 update" until selected); the
finding showed no status; the header counts matched ("1 open · 3 answered", then "2 open · 2
answered"). **Claude Code**: steps 4 and 5 pass (asked again; proposal card, retires only after ✓);
scenarios 22 and 23 pass. **Kiro**: fail once on "asks again" (its reply said "Your ✓ still
stands") and once on "proposes first" (offered in the chat); its reruns of 22 and 23 pass. Both
agents read ✗ on a question that gave ✗ no meaning as "no release post" (problem 2, for the
maintainer). Proposed tracker rows (page, outside this task): a narrow container's header breaks
its title mid-word and cuts the retired marker to "6…"; the retired marker's version shows the
answers as they were then, so "0 of 4 answered" on cards all answered before the retire. Not
covered: the panel's own chat adapters.

---

## Completion Checklist

- [x] All implementation tasks complete
- [x] Verification task complete
- [x] D-045 appended (approved, 53)
- [x] LOG entry created

---

## On Completion

1. Frontmatter: `status: completed`, `completed: YYYY-MM-DD`.
2. Append the set's LOG line (one line, newline-terminated, append-only):
   `[[YYYY-MM-DD HH:MM]] [board-actions] Completed set: The answer model → Task: [[cortex-tasks/board/2026-10-15_board-actions_answer-model/TASK-STATUS.md]]`
3. Nothing here writes to `AUDITED.md`.
