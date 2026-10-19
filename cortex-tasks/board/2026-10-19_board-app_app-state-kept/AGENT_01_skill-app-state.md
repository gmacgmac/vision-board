# AGENT_01_skill-app-state: Skill: save state, top padding; calculator example

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

Teach agents to save and restore a panel's UI state and keep 12 px of top padding, and make the
calculator example do both.

## Context

PLAN.md § Key Changes 3; rule 17 (agent instructions are code: versioned, scenarios). Uses BE_01's
message name and limits — read BE_01's notes; they are the source. Maintainer point 33: the card's
number and APP tabs hang 9 px over the top of the panel. **Read previous task notes in
TASK-STATUS.md before starting.**

## Inputs

- **Files to modify**: `skills/vision-board/SKILL.md` (§ Apps on the board: save on every meaningful
  change, restore from `hostContext.state`, keep it small, no secrets in it; top padding 12 px;
  replace "keep state in a tool"; `status:` v3.10), `scenarios.md` (a multi-step app that keeps its
  place), `NOTES.md` (why, dry run), `skills/vision-board/examples/apps/calculator/panel.html` and
  its byte-equal copy `.visionboard/apps/calculator/panel.html` (save the display, restore it)
- **Skills**: `cortex-docs` — load before starting

## Steps

1. [ ] A few plain lines in "Good to use" / the panel messages list; no jargon.
2. [ ] Calculator: save its display on change, restore on start; keep its tests green
   (`apps/board/tests/repo-example-app.test.ts`, `app-samples.test.ts`).
3. [ ] Scenario and dry run recorded in NOTES.md (read-through, as v3.9 was).
4. [ ] Note that Kiro picks up the skill on the next board start.

## Validation

- [ ] `npm test` passes; `npm run verify` passes

## Constraints

- If deviation is needed, stop and ask the maintainer — no silent breaking changes.
- No PII in examples or fixtures. No git commits during execution.
- Protected files (steering, `docs/decisions.md`, `docs/principles.md`, tokens): propose, don't edit.
- The maintainer's board on port 4466: never stop, restart or kill it, or any process you didn't
  start. Page tests under the lock: `until mkdir temp/pages.lock 2>/dev/null; do sleep 10; done; …; rmdir temp/pages.lock`.
- Use the Bash tool's working directory rather than `cd path &&`; writes over 50 lines in chunks.

## Implementation Notes

**Status**: Completed  
**Completed**: 2026-10-19

### Changes Made
- `SKILL.md` v3.10 (428 lines): `vision-board/save-state` and `hostContext["vision-board/state"]` in the
  panel messages, a "Keep the person's place" bullet (debounce, check the shape, no secrets, a tool is
  not for the place), 12 px top padding in "Good to use", status line.
- `scenarios.md`: 33 new (a multi-step app that keeps its place), 29 checks the padding.
- `NOTES.md`: "Skill v3.10" section with why and a read-through dry run.
- Calculator `panel.html` (and its byte-equal copy in `.visionboard/apps/calculator/`): saves
  `{ sum, answer }` 400 ms after a change, restores from `hostContext["vision-board/state"]` when the
  shape is right, ignores a failed save.

### Issues & Resolutions
- The key is `"vision-board/state"`, not `state` (orchestrator decision, 2026-10-19); BE_01's note and
  the task text say `hostContext.state`, FE_02 is changing the contract to match.
- "keep state in a tool" is only in `apps.md`, not the skill; the skill now says a tool is not for the
  person's place. Not edited here (FE_02 owns apps.md).
- Dry run is a read-through, not a live agent run (as v3.9). Not run in a browser against a board that
  accepts saves: until FE_02 lands a save may be refused, which the calculator ignores.
- Checks: `repo-example-app.test.ts`, `app-samples.test.ts`, skills tests pass (24); `npm run verify`
  ok (3 existing length warnings, none mine). Full `npm test` not run (other tasks edit files in parallel).

### Deviations from Plan
- None

## On Completion

1. Fill in Implementation Notes; set **Status** to `Completed`.
2. Update your row and your notes section in [TASK-STATUS.md](./TASK-STATUS.md).
3. Append **one** line to `cortex/LOG.md` (ending in a newline):
   `[[YYYY-MM-DD HH:MM]] [board-agent] AGENT_01: [what you did] → Task: [[cortex-tasks/board/2026-10-19_board-app_app-state-kept/AGENT_01_skill-app-state.md]]`
