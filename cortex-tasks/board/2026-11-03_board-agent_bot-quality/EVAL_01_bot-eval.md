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
