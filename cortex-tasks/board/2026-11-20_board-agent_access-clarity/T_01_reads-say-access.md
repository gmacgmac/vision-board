# T_01: Reads say what you may write

**Objective**: An agent knows from any read, before it writes, who it is and what it may write, at every tier; the grant
answer agrees. PLAN.md Decisions 1-4 and 6.
**Skills**: cortex-architecture, cortex-docs · **Port**: `VB_TEST_PORT=6100`

## Steps
1. Contract first: optional `you: { agent, label }` and `joined: false` on the agent reads (PLAN Decision 1), in the
   API schemas; `npm run gen`; bump `openapi.json` `info.version` minor (and `apps/board/tests/openapi.test.ts`).
2. `caller-marks.ts`: add the marks beside `held` and `owed`, from the same `Reader`; no agent caller and flag off as
   today. A client with no identity is the `joined: false` case: find how the engine tells it apart and cite it.
3. `writes.ts` `requestGrant`: answer `held` only by the read's rule (`holds` for a board, `mayAnswerIn` for a
   container). Failing test first: a container grant whose board grant was revoked must not answer `held`.
4. Words: the three-tier line (Decision 3) in `info.ts` and the `get_board` / `request_grant` descriptions
   (`plugin-tools.ts` `ruleEdits`); the skill (`skills/vision-board/source/`, never the built file) § Access gets the
   tier line and Decision 6's rule; bump the skill version and NOTES.md; `npm run build:skill`.
5. Eval scenario (Decision 4) in `tests/evals/bot/scenarios/`, registered in its index, with good and bad fake scripts
   so `--dry` holds it.
6. Tests: `bot-tool-rules.test.ts` holds each mark against a real write and grant for: the creator, a granted agent,
   an agent with nothing, the one agent, the person, flag off. `docs/specification/api.md` states the marks.
7. Checks: changed tests, `npm run verify`, `npm run eval:bot -- --dry`, then `npm run eval:bot -- --model haiku`
   (plugin) and `--standalone`; report scores. A miss outside access: rerun those scenarios on main to compare.

## On completion
Notes here and your row; one LOG line `[board-agent] Completed: T_01 …`; the return block.
