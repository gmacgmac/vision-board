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

## Implementation Notes (2026-11-20, executor, Opus 5.5)

**Done**
- Contract: `common.schema.json` `$defs` `you` (`{ agent, label }`) and `joined` (`const false`), on the responses of
  `list_boards`, `get_board`, `show_node`, `show_container`, `list_open`. `openapi.json` 1.48.0; `npm run gen`.
- `caller-marks.ts`: `heldBy` (the one test: a board by its holders, a container by `mayAnswerIn`), used by `holds`,
  `marksFor` `heldIn` and `writes.ts` `requestGrant`; `callerMark` gives `you`, `joined: false` or nothing. `reads.ts`
  adds it to the five reads. Flag off, the person, and a read-only read (incl. another ledger, whose caller engine.ts
  `run` drops) get neither.
- How the engine tells "no identity" apart: by caller alone (`OpCtx.caller === undefined`); the standalone server makes
  that of a read with no Bearer secret (`callers.ts` `callerOf`, `optional-agent`).
- `requestGrant`: failing test first ("request_grant agrees with the read…"): with the old `holders` test it answered
  `{ held: true }` for a container whose board grant was revoked; now a new request.
- Words: `info.ts` `toDrawOnABoard` (the tier line, `you`), `callJoinOnceAndSave` (`joined: false`); plugin-tools.ts
  `ruleEdits` (get_board, request_grant) and the instruction edits reshaped to the new line. Skill v3.40 § Access
  (standalone): tier line + Decision 6; NOTES.md; `npm run build:skill`.
- Eval: `other-container` (standalone only; the plugin's host has no second agent to set up, and its bot under
  `singleAgent` holds every tier), with good and bad fake scripts.
- Docs: api.md 41, 212 (renamed test), 213, 214; per the orchestrator, 106 and 122 and the `start_chat` /
  `start_folder_chat` descriptions now say every chat in a folder's ledger is its one chat agent (D-114).

**Caught Beyond the Brief**
- The standalone reads never carried any caller mark: `list_boards`, `get_board`, `show_node` and `show_container` had
  `security: []` (auth `none`), so `vb-mcp` never sent the secret, not even the chat panel's `VB_AGENT_SECRET`. The
  `held` marks of f47f23b4 (and `owed`, `answered`) reached only a plugin host's bot. Decision 1 cannot hold for any
  standalone agent without them taking the secret, so they are now `optional-agent` (as `list_open`), with 401
  declared. Consequences: a read with a secret the server does not know is refused `not-authenticated` (was: read as
  no one), the four tools gain a `secret` argument (tool list 39,418 characters, over its 38,600 budget), and five
  tests outside this task's files need updating (REQUESTS).
- `other-container` live run waited in `check_responses` twice (135 s of the 180 s kill) though the person said they'd
  look later; a third wait would be killed.

**Verification**
- Owned tests: bot-tool-rules, openapi, api-schemas, plugin-skill: 61/61. `npm run verify`: ok (warning:
  bot-tool-rules.test.ts 459 lines). Node suites (no evals): 2795/2805 before the last fixes; the failures are listed
  in the return block (five files outside T_01, a stale skill build since fixed, and two that need a built `dist/`).
- Evals: dry 150/150 plugin, 141/141 standalone; bot-eval.test 7/7. Live Haiku: plugin 146/159 (146/154 without the
  stalled attempt; only known misses), standalone 129/141 (`other-container` 5/5); comparison with main in NOTES.md
  v3.40.

## Implementation Notes, round 2 (2026-11-20, maintainer points 713 to 716)

- 713: a read is never refused for its secret. `callers.ts` `knownAgent` (for every `optional-agent` operation: the
  four reads, `list_open`, `check_responses`): a known secret names the agent, one another ledger or folder knows is
  still `wrong-folder` / "join again" (FIX_01 F12), one nobody knows reads as no one. The engine says `joined: false`;
  the standalone server adds `joinedReason` (`handlers.ts` `withReason`, words `http.ts` `secretNotRecognised`), so the
  plugin seam (`EngineContext`) is unchanged: a first try put it there and moved the seam hash. `check_responses` now
  carries `you` / `joined` too, so an unscoped read is never silent. Writes refuse as before.
- 714: `x-secret-argument: false` on list_boards, get_board, show_node, show_container and list_open
  (`scripts/gen-tools.mjs` `asksSecret`; routes carry `secret` = sent, `secretArgument` = asked for). `vb-mcp`
  (`call-tool.ts` `httpTools`) sends a read VB_AGENT_SECRET, else its own `join`'s secret, else the last one passed; a
  `secret` passed to a read anyway is taken, never refused. Tool list 38,355 characters (main 38,543, cap 38,600):
  list_open 833 (was 1,041: 208 saved), list_boards 713, get_board 1,413, show_node 1,119, show_container 1,044, join
  1,550; no cap raised. `check_responses` keeps its argument (scoped and held open; not asked).
- 715: the eval person grants each request as it arrives (`Person.grants`, standalone.ts and host.ts);
  `other-container` now also wants the card drawn and "Done.". Live: 16.5 s.
- 716: route-table, board-data, api-archive (label "Archive chat"), api-folder-mismatch-ledgers, flags.ts; also
  api-identity, api-errors and api.test (check_responses now says `joined: false`), gen-tools/gen-mcp tests, mcp
  tools.test and a new session.test case.
- Verification: full node suites 2811/2815 then api.test fixed: the 2 left need a built `dist/` (page cookie, board.css
  gzip budget) and touch nothing here. verify ok. Dry 150/150 plugin, 142/142 standalone. Live Haiku: plugin own-board,
  person-board, read-only 20/20 ($0.0063); standalone other-container, join-ledger, other-ledger, ledger-picture 28/28
  ($0.0182).
