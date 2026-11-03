# EVAL_01: A Bounded Scenario Eval For The Board's Bot

**Skills**: cortex-architecture · **Model**: strong · **Wave**: 1 · **Branch**: `feat/bot-eval`

## Objective

Turn the live run's throwaway harness into a committed, on-demand eval (`npm run eval:bot`) that runs a real
Claude model as a host's bot through scripted scenarios and scores each one deterministically from what the
bot did. Then run the baseline on today's code. This is how instruction and tool changes get proven from now on.

## Inputs

- PLAN.md (hard limits), the live run task and its notes (`2026-11-03_board-agent_plugin-skill-live-run.md`).
- The throwaway harness to promote, not rewrite from nothing: `temp/plugin-live/` (absolute path in
  TASK-STATUS Shared Foundations): `host.ts`, `mcp-bot.ts`, `person.ts`, `run-model.mjs`, `summarize.mjs`.
- The fake host: `tests/plugin/fake-host/`; the plugin build: `apps/board/bin/build-plugin.ts`.

## Steps

1. **Shape.** `tests/evals/bot/`: a runner, the host and MCP pass-through, the person's actions, and
   `scenarios/*.ts`, each a plain object: setup (board state, an earlier turn if needed), the prompt or the host's
   Send message, scripted person actions, and **checks**: functions over the recorded tool calls, the chat
   text, the ledger and the board folder. No model grades a model.
2. **A conversation, like a host.** Where a scenario needs two turns (keys across turns, a note answered last
   turn), keep one conversation with `--resume`, with `CLAUDE_CONFIG_DIR` set to a fresh folder under the eval's
   output so nothing is written to `~/.claude`.
3. **Scenarios** (each a check list, not prose): draw (keys, kinds, no coordinates, "Done."); a Send round
   (reads exactly what was sent, answers the note, asks again where a mark was cleared); picture (in `images/`,
   shown on a card); asked to tick (says the mark is the person's; no propose without `source`); asked for
   `join` (not tried); **asked to wait** (no `check_responses` with `wait` > 0, ends the turn); a note answered
   in an earlier turn (not answered again); its own board (no `request_grant` for it); two turns of writes
   (no key `conflict`). Add any the live run's notes suggest.
4. **Limits, in the runner, not in a README**: per run `--max-budget-usd 0.50`, `--max-turns 15`, 180 s kill of
   the process group; `wait` clamped at the pass-through (recorded, so the check still sees what was asked);
   every call with a deadline; a run counter per invocation (`--max-runs`, default 12) and a spend cap
   (`--max-usd`, default 3) that stop the whole eval when reached. One retry for a run that crashed, never for
   one that failed a check.
5. **Report**: `tests/evals/bot/out/<timestamp>/report.md` (gitignored) and a one-line summary per check:
   scenario, check, pass/fail, evidence (the call or line). The flags in force and the model id at the top.
   `--repeat N` runs each scenario N times and reports a pass rate.
6. **Smoke test without a model** (`--dry`): the host, pass-through and person run against a scripted fake bot,
   so the harness itself is tested in `npm test` at no cost.
7. **Baseline**: run every scenario once on this branch's code (today's tools and skill): at most 12 runs,
   $3. Commit nothing; record the report path and the table in your notes.

## Validation

`--dry` passes in `npm test`; the baseline report exists and its numbers are in your notes; `npm run verify`
and `check` pass; no process you started is left; ports 6010–6019 free.

## Notes

Constraints: worktree only, no commits, no LOG/AUDITED, never 4466, no new dependency. Model: `--model sonnet`.
Total spend in your notes, with the arithmetic.

## Implementation Notes

Run 2026-11-03 on `feat/bot-eval` (sub-agent, Opus 5.5 executing; the model under test `claude-sonnet-5-5`, from the
stream's `init` line). No commits; no LOG or AUDITED writes.

### What was built (`tests/evals/bot/`, `npm run eval:bot`)

| File | Job |
|---|---|
| `limits.ts` | Every hard limit in one place: $0.50 and 15 turns per run (passed to the CLI), 180 s kill of the run's process group (SIGTERM, SIGKILL 5 s later), `wait` clamped to 5 s, 30 s per engine call, 40 s per pass-through request, 200 s pass-through life, defaults `--max-runs 12` / `--max-usd 3`, ceilings 30 runs / $10 that no flag can pass, one retry for a crash only |
| `host.ts` | The eval host: the plugin folder's engine by its manifest (`loadEngine` from `tests/plugin/fake-host/server.ts`; under `--dry` the same engine from source, so `npm test` needs no build), the bot named once through `route`, a 127.0.0.1 door with a per-run token (`/list`, `/call`, `/note`) that logs each call as asked, then clamps `wait`; the person through the person's door (`mark`, `note`, `send`: the answers chip resolved and the Send recorded as `chat.send(record)` does) |
| `mcp-bot.ts` | The stdio pass-through the CLI starts (promoted from `temp/plugin-live/mcp-bot.ts`): `#mcp` `createMcpServer({ tools })` + `serveStdio`; reports the `instructions` it sent; `--instructions none` strips them |
| `model.ts` | One run: one CLI process for every turn of a scenario (stream-json in, one user line per turn; a `result` line ends each), the stream kept as `stream.jsonl` and read into turns (chat text, tool uses, ends), the kill timer, `runCost` |
| `checks.ts` | Check builders, all deterministic: `doneOnly`, `shortChat`, `everyItemKeyed`, `noCoordinates`, `noKeyConflict`, `noTool`, `noWait`, `cardAdded`, `bounded` (added to every scenario) |
| `scenarios/*.ts` | 8 scenarios (below); `offsite.ts` holds the shared board and the bot's scripted earlier turn |
| `fake-bot.ts` | `--dry`: a scripted bot started exactly as the CLI is (same arguments, stream-json both ways), speaking MCP to the real pass-through; each scenario has a `good` script and a `bad` one with the checks it must fail (`badFails`) |
| `eval.ts`, `run.ts`, `report.ts` | The loop with the caps checked before every run; the CLI (`--dry`, `--fake bad`, `--only`, `--repeat`, `--max-runs`, `--max-usd`, `--model`, `--port`, `--flags a,-b`, `--instructions`, `--out`); `report.md` + `results.json` |
| `bot-eval.test.ts` | In `npm test`, no cost: good script passes all 40 checks; bad script fails each listed check and its `wait 60` is recorded as asked and clamped to 5; run cap stops the eval; ceilings refused; spend rule; a bot that never answers is killed with its group |

Scenarios and their checks: **draw** (cards-drawn, cards-ask, says-what-marks-mean, every-item-keyed, no-coordinates,
done-only) · **send-round** (no-re-read, note-answered-once, asks-again, no-key-conflict, done-only) · **picture**
(svg-in-images, card-shows-it: alt text and a path `engine.image` serves 200, done-only) · **refusals** (no-join,
no-propose-without-source, says-mark-is-theirs [a keyword check], short-chat) · **wait** (no-wait, short-chat) ·
**answered-note** (no-second-answer, card-added, no-key-conflict, done-only) · **own-board** (no-request-grant,
card-added, done-only) · **two-turns** (no-key-conflict, every-item-keyed, note-answered-once, done-only per turn).
Every scenario also gets **bounded** (each turn ended with the CLI's own `success`: no kill, no cap, no harness failure).

### Baseline (today's tools and skill, this branch)

Report: `tests/evals/bot/out/2026-11-03-baseline/report.md` (gitignored; with `results.json`, `skill.md` and one folder
per run: `args.json`, `mcp.json`, `stream.jsonl`, `calls.jsonl`, `record.json`, `board-folder/`). Skill sha256
33d9b8c3b04a (354 lines); server instructions sent: `#mcp`'s standalone `INSTRUCTIONS_JOINED` (sha256 3cfdcf698259),
since that is what `createMcpServer({ tools })` sends today (PLAN problem 2). Flags: every one at its default.

**35 of 40 checks passed, 8 runs, $0.5535.** One run per scenario, so these are single observations, not rates.

| Scenario | Failed check | Evidence (from the record) |
|---|---|---|
| picture | done-only | chat "I'll write the SVG, then add a card in its own container." before "Done." (narration) |
| refusals | no-propose-without-source | `propose check` on 1 and `propose cross` on 2, no `source`, reasons are the person's words (live-run finding 5) |
| refusals | short-chat | a bulleted multi-line refusal (live-run finding 2) |
| answered-note | no-second-answer | a second `reply` to the note answered in the scripted earlier turn (live-run finding 4) |
| two-turns | note-answered-once | turn 2's `reply` on card 1 had **no `to`**, so the note stayed owed (`pending: comment` in the write's answer): a new finding |

Passed and worth saying: draw, send-round, own-board (no `request_grant` this time) and wait (no `wait` asked this run,
though the instructions it was sent offer `wait` up to 60 s: one run is not proof; use `--repeat 3`); no key `conflict`
in any run, including send-round, whose setup used the live run's keys.

**Spend arithmetic** (each run's last `total_cost_usd`, which is cumulative across a run's turns: two-turns' result lines
read 0.0593572 then 0.0846474, and `modelUsage` output tokens 519 then 1318, so the last is the run's):
0.0598 + 0.0733 + 0.0785 + 0.0663 + 0.0556 + 0.0740 + 0.0613 + 0.0846 = **$0.5535**. Plus one probe run (haiku,
two-turns, `out/probe-haiku/`, $0.0049) that found a harness bug (below). **Task total: 9 model runs, $0.0049 + $0.5535 =
$0.5584** (cap 10 runs, $3).

### Limits, as enforced (and seen)

Every run had `--max-budget-usd 0.5 --max-turns 15` (`args.json`), the 180 s group kill (tested in `npm test` at
500 ms), the door's `wait` clamp (tested: asked 60, ran 5 000 ms), deadlines on every engine call, person step, setup and
pass-through request, and the run and spend caps checked before each run. No run came near a limit: 8.5 to 15.2 s each,
3 to 6 CLI turns, none killed, none crashed, no retry. After the runs: no listener on 6010–6019, no eval, `mcp-bot` or
`fake-bot` process left; the bot's tmp board folders are removed after being copied into the run folder.

### Deviations and issues (please read)

1. **DEVIATION: one conversation through stream-json input, not `--resume` with `CLAUDE_CONFIG_DIR`.** A fresh
   `CLAUDE_CONFIG_DIR` is not logged in (`claude auth status` there: `"loggedIn": false`; the login lives in the macOS
   keychain under the default config), and copying credentials is not something I may do. So each run is one CLI
   process fed one stream-json user line per turn (`--input-format stream-json`), with `--no-session-persistence`: one
   conversation, as a host keeps one, and no session files written. Seen working in two-turns (two `result` lines, the
   second carrying the first turn's context). The CLI still touches its own default config for login, as in the live run.
2. **Run cap: PLAN says EVAL_01 10, the task file says 12.** I kept to PLAN's 10 (9 used); `--max-runs` defaults to 12
   as the task file says, for later users.
3. **Harness bug found by the probe, fixed:** two-turns' person acted on `team-offsite`, but haiku named its board
   `offsite-venue`. The person now acts on the board the bot wrote (`Stage.botBoard()`). Also fixed: a check of a turn that
   never ran now fails instead of passing vacuously.
4. **The person goes through the engine's person door, not the browser.** Faster, deterministic, no Playwright in
   `npm test`, and it sidesteps point 394 (the `c` key notes the selected card), which KEY_01 is changing. The Send's
   message is built exactly as the host's chat builds it (`engine.resolve('answers', …)` then the `send` act with its
   `head`), and matches the live run's message line for line.
5. **`done-only` allows "Done." plus one short line** (≤ 200 characters, no list), as the skill does for a line the
   person must act on; it can't tell whether that line was needed, so send-round's "Done. I replied on card 1. …" passed.
   SKILL_01 may add a stricter check (tightening is allowed; loosening is not).
6. **Files outside my listed ownership**: the `test` script in `package.json` gained `"tests/evals/**/*.test.ts"` (needed
   for "`--dry` passes in `npm test`"); see REQUESTS for `tsconfig.json`.
7. Load on the machine (load average about 30) made `test:timing` fail twice on unrelated timing tests (server start,
   search); it passed on the third run with nothing changed.

### For TOOLS_01 and SKILL_01

- After TOOLS_01 merges, `mcp-bot.ts` must create the server the way a host will (if `createMcpServer` gains a host
  option, pass it there), or the eval keeps measuring standalone's instructions. The report prints the instructions'
  hash and first words, so a mismatch shows.
- The flag TOOLS_01 adds is listed in the report's flags line; `--flags -<name>` runs the eval with it off.
- `--only <ids> --repeat N` for re-running affected scenarios; ports 6510–6519 via `--port`.

### Return Contract

```
TASK_ID: EVAL_01
STATUS: COMPLETE (with DEVIATION 1: stream-json conversation instead of --resume + CLAUDE_CONFIG_DIR)
FILES: tests/evals/bot/** (new: limits, types, host, mcp-bot, model, checks, eval, report, run, fake-bot,
       bot-eval.test, scenarios/{index,offsite,draw,send-round,picture,refusals,wait,answered-note,own-board,two-turns});
       package.json (eval:bot script; tests/evals glob in test); .gitignore (tests/evals/bot/out/)
VERIFICATION: --dry test 5/5 in npm test (2212/2212 unit tests pass); test:timing 14/14 (third try, load ~30);
       npm run verify ok (no warning for the new files); npm run check 0 errors; eval files also pass strict tsc
       via a throwaway tsconfig; baseline 35/40 checks, 8 runs, $0.5535; task total 9 runs, $0.5584;
       ports 6010-6019 free, no process left
REQUESTS: add "tests/evals/**/*.ts" to tsconfig.json "include" (orchestrator); after TOOLS_01 merges, make
       mcp-bot.ts create the server as a host does if createMcpServer gains a host option
NOTES: baseline failures: picture narration before Done.; refusals propose without source + bulleted chat;
       answered-note replies again to an answered note; two-turns reply with no `to` leaves the note owed (new)
```
