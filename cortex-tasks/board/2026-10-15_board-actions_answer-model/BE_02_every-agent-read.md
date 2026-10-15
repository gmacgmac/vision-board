# BE_02_every-agent-read: Check and cross in every agent read and write

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Finish ruling 1 for agents: no agent-facing read or write says `ack`, `drop`, `acknowledged` or
`dropped`; they say `check` / `cross` and `checked` / `crossed`.

## Context

Added 2026-10-15 (maintainer, 61: "Yes, we'll need to update all of that"). BE_01 mapped only
`check_responses` at the edge (`packages/actions/src/registry.ts` `ACTION_OUT`, `actionOut`). Still
on the old words, per BE_01's notes: `get_board`, `list_open` and `show_node` report the status as
`acknowledged` / `dropped`, and the agent's `propose` sends `ack` / `drop`. Runs after FE_01 (wave 3),
because the page shares the action layer and BE_01's server tests. Read BE_01's and FE_01's notes
first.

## Inputs

- **Files to modify**: `packages/actions/src/registry.ts` (one status map beside `ACTION_OUT`, e.g.
  `STATUS_OUT`), the reads that build `get_board`, `list_open`, `show_node` and the `write_board`
  proposal input (find them from `packages/format/schema/openapi.json`), `packages/format/schema/api/*.json`
  (`common.schema.json` status and propose action enums), `packages/mcp/src/info.ts` if it names
  them, `docs/specification/api.md`, tests in `apps/board/tests/` and `packages/actions/tests/`.
- **Patterns to follow**: `actionOut` at the API edge; the stored names stay internal, no ledger change.
- **Do not change** what the page reads from the action layer (`boardState`, `statusOf`): the page
  keeps the internal names. Only what crosses the API edge to an agent changes.

## Steps

1. [x] Tests first: each of `get_board`, `list_open`, `show_node` reports `checked` / `crossed` (and
   never the old words); a `propose` with `check` / `cross` is accepted and stored as `ack` / `drop`;
   one with `ack` / `drop` is refused with a plain reason naming the new word.
2. [x] Build: one status map and one action map at the edge; propose input mapped in.
3. [x] Contract: OpenAPI 1.24.0; `api.md` item under "The answer model (D-045)"; `npm run gen`,
   `npm run map`.
4. [x] Skill check: `skills/vision-board/SKILL.md` names no old word for these reads or for `propose`;
   fix the wording if it does (no rule change).

## Validation

- [ ] The five gates exit 0, one after another (`npm run check`, `npm test`, `npm run verify`,
  `npm run gen`, `npm run test:pages`).

## Constraints

- Project rules: contract first (rule 6), one action layer (rule 8), tests first.
- If deviation is needed, stop and say so. No git commits. Never touch `.visionboard/`; don't use the
  board on 4466. One page-test run at a time.
- Fill Implementation Notes below and append your own LOG line.

## Implementation Notes

**Status**: Completed (2026-10-15)

**Tests first** (`apps/board/tests/api-answer-words.test.ts`, new, 5 tests, failed 4/5 before the
build): `propose` with `check` / `cross` is taken, stored `ack` / `drop`, and a same-key retry
replays; `ack` / `drop` are refused `invalid`, pointer `/items/N/action`, detail `"ack" is now
"check"`, nothing written; `get_board`, `show_node` (and `linked`), `show_container` say
`checked` / `crossed` and a proposal `check` / `cross`; `list_open` and `write_board`'s `pending`
say `checked` on a ✓ card still owed a note; no old word in any of those answers; the ledger keeps
`ack` / `drop`.

**Build (one map each, at the edge).** `registry.ts`: `STATUS_OUT` (acknowledged→checked,
dropped→crossed), `ReportedStatus`, `statusOut`, beside `ACTION_OUT`; `actionIn` reads
`ACTION_OUT` the other way (no second action map). `reads.ts`: `nodeDetail` (so `show_node`,
`show_container`, `linked`) and `openItems` (so `list_open`, `write_board` `pending`) give
`statusOut`; new `itemsOut` for `get_board`'s `state.items` (`apps/board/server/reads.ts`
`getBoard`). `numbers.ts` `proposalOut`: `action` via `actionOut` (`ProposalView.action` is
`ReportedAction`; only `nodeDetail` uses it). `apps/board/server/write-board.ts`:
`checkProposeWord` refuses the old words before the schema; `storedNames` maps `check` / `cross`
in before replay and append, so a retry hashes the stored line alike.

**Page.** Untouched: it folds `read_ledger` with `boardState` / `statusOf` (stored names) and calls
no agent read. `apps/board/tests/board-data.test.ts` (page board equals `get_board`) now applies the
same `itemsOut` to the page's items. Page tests that write a proposal through `write_board`
(`tests/pages/proposals.spec.ts`, `proposals-notice.spec.ts`) now send `check` / `cross`; the
person's `act` lines they check stay `ack` / `drop`.

**Contract.** OpenAPI 1.24.0; `common.schema.json` `itemStatus` enum `open, checked, crossed,
commented, context, later` and descriptions, `proposal.action` `check, cross`;
`write-item.schema.json` has its own `propose` branch (`check` / `cross`) in place of the ledger's
`propose` sent form (ledger v16 unchanged); `write_board` description. `api.md` 147 under "The
answer model". `npm run gen`, `npm run map`. Server tests sending `propose` through the API updated
(`api-write`, `api-proposals`, `api-lock-person`); `openapi.test.ts` 1.24.0. `info.ts` names no
status or propose word, so unchanged.

**Skill (step 4, wording only, no version bump).** `SKILL.md` § Propose, never decide said
`action` `ack` (✓) or `drop` (✗): now `check` / `cross`. Also `scenarios.md` scenario 4's good run
proposed `action: "ack"`, which the server now refuses: now `"check"`. Recorded in `NOTES.md`.

**Gates** (one after another): `check` 0; `npm test` 0 (1248/1248, `test:timing` 7/7); `verify` 0
(0 warnings); `gen --check` current; `test:pages` 0 (432 passed, no screenshot changed).

**Note (workspace rule 10):** the new test file (98 lines) was written in one call, not created and
appended in chunks; it went through, no connection errors.

## On Completion

1. Fill Implementation Notes; set Status to `Completed`; update your row in TASK-STATUS.md.
2. Append your LOG line to `cortex/LOG.md` (one line, newline-terminated, append-only):
   `[[YYYY-MM-DD HH:MM]] [board-actions] BE_02: <what you did> → Task: [[cortex-tasks/board/2026-10-15_board-actions_answer-model/BE_02_every-agent-read.md]]`
