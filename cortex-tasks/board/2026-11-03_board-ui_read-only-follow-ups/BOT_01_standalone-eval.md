# BOT_01_standalone-eval: Standalone bot eval

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

`npm run eval:bot` gains a standalone mode that runs the real SKILL.md with the real `vb-mcp` against a test board
server, scored by the same checks, with three standalone scenarios (tracker M53, PLAN decision 5).

## Context

The eval runs only the plugin's bot. SKILL_01 (previous set) checked standalone lines by hand: `claude -p` with SKILL.md
as the system prompt and `vb-mcp` on a test server (ports and recipe in its task notes; 4 runs, $0.30).

## Inputs

- **Files to modify**: `tests/evals/bot/**` (a standalone host beside `host.ts` / `mcp-bot.ts`, the mode flag in
  `run.ts`, new scenarios), `skills/vision-board/{scenarios.md,NOTES.md}`
- **Reuse**: `Stage`, checks, report, limits (`tests/evals/bot/`); never a copy of the plugin host's code — share it
- **Skills**: `cortex-architecture`

## Steps

1. The mode: `npm run eval:bot -- --standalone` (or the harness's own flag style), a test server under the OS temp
   folder with both flags on, `vb-mcp` started with `VB_PROJECT` there; the same report.
2. Scenarios: a picture lands in the open ledger's `images/`; the bot reads another ledger when the person names one
   (what it does next is the person's ask; score the read, the named ledger and that nothing is written there);
   after `join`, the bot checks `ledger`.
3. Dry run first; then real runs within $3 in all; existing scenarios in the plugin mode still pass.
4. A `package.json` script, if one is needed: under `REQUESTS` (the orchestrator's file).

## Validation

- [ ] Dry runs green in both modes; a real standalone run passes the three scenarios; plugin mode unchanged; spend reported

## Constraints

Deviation from a PLAN decision: stop and report (`DEVIATION`). No PII in examples. No git commits. Long writes in
chunks. Only your files (TASK-STATUS File Ownership); other needs under `REQUESTS`.

## Implementation Notes

_Re-run? Add a `### Run N` block; never overwrite an earlier run._

**Status**: Completed (2026-11-03, Opus 5.5; model under test `sonnet`, CLI 2.1.301; worktree `bot-01`, no commits)

### Changes Made
- **Mode**: `npm run eval:bot -- --standalone` (`run.ts`, the harness's own flag style). `standalone.ts`
  `startStandaloneHost`: a temp base under the OS temp folder holding `home/`, `projects/trip-plans` and a one-file
  `dist/` (the API harness's pattern); `#board/testing` `startTestBoard` with `ledgerFolders` and `readOnlyStart` on,
  `edit: true`, ledger `main` open, on `--port` (6010); the bot's MCP server is the real `vb-mcp` (`#mcp` `MCP_BIN`, with
  `VB_SERVER`, `VB_PROJECT`, `VB_AGENT_SECRET` empty); its instructions are `skills/vision-board/SKILL.md`, plus one
  line "Your working folder is <project>"; tools `Write,Read,Glob,Grep`; cwd the project. Setup's tools are an earlier
  chat's (`#mcp` `httpTools`, the code `vb-mcp` runs), joined once per ledger; the person marks and notes with the
  page's cookie (`personAct`); `Stage.ledger(name)` opens a ledger as the person does (`open_project`, `create` when new).
- **Shared, not copied**: `types.ts` `BotHost` is what the loop sees; `eval.ts` `pluginHost` wraps `host.ts` unchanged;
  `runOnce` and `botArgs` take a `BotHost` (the plugin's args are the same list as before). Calls without a door:
  `standalone.ts` `callsFrom` reads `mcp__vision-board__*` uses from the stream into the same `Call` rows, so every
  check reads them as before. Same report (`report.ts`: the mode, the skill path and what `vb-mcp` sends).
- **Scenarios** (`STANDALONE` in `scenarios/index.ts`): `ledger-picture` (37: `svgInImages` and `cardShowsIt`, now
  exported from `picture.ts`, plus new `checks.ts` `noFolderRead`, `doneOnly`); `other-ledger` (38: `read-named-ledger`,
  `only-named-ledger`, `scratch-unchanged` by `folderDigest`, `no-request-grant`, `card-added`, `drawn-on-main`,
  `done-only`); `join-ledger` (39, new: `saw-ledger`, `no-write`, `says-ledger`, `short-chat`). Each with good and bad
  fake scripts; `bot-eval.test.ts` runs both in standalone dry.
- **Docs**: `scenarios.md` (v3.28 line no longer says the eval can't run 37/38; 37 and 38 name their eval ids; 39
  new); `NOTES.md` § Skill v3.28 (the scored runs below).

### Runs (reports `tests/evals/bot/out/bot01-*`, gitignored)

| Run | What | Runs | Result | Spend |
|---|---|---|---|---|
| dry | standalone good / bad; `bot-eval.test.ts` (6 tests, plugin and standalone dry) | - | 18/18; bad fails every `badFails`; 6/6 | $0 |
| standalone-01 | 3 standalone scenarios | 3 | **18/18** | $0.3283 |
| standalone-02 | same, `--repeat 2` | 6 | 34/36: `other-ledger/done-only` failed twice | $0.5671 |
| plugin-01 | the 9 plugin scenarios, real, after the refactor | 9 | **48/48** (plugin mode unchanged) | $0.5731 |

18 real runs, **$1.4685** = 0.3283 + 0.5671 + 0.5731 (of $3). Pass rates over 3 runs: every standalone check 3/3 but
`other-ledger/done-only` 1/3 (the bot sums up the cards in the chat after drawing the summary). Also `tsc -p
tsconfig.json` clean, `npm run verify` ok.

### Caught Beyond the Brief
- **SKILL.md, reported not fixed**: (a) after `other-ledger` the chat summarises the cards in 2 of 3 runs (`done-only`):
  the own-chat line "name the board's title and id in the line saying what changed" likely invites it. (b) `join-ledger`
  passes 3/3, but every run offers `scratch` instead in three or four sentences near the 300-character cap; The
  conversation asks one line and no offer for what the bot can't do. The eval does not score offers (a regex for
  "an offer" would be fragile); a check could cap that line at one sentence if the maintainer wants it held.
- The standalone mode clamps no `wait` (no door): bounded only by the run's 180 s kill. None of the three scenarios
  waits.
- `--instructions none` is refused with `--standalone` (the real `vb-mcp` sends its own).

### Deviations from Plan
- None from a PLAN decision. The eval's 37 asks "a new board called Ship steps with just one card" (scenarios.md's
  wording, "on a card of its own", could read as a new board to suggest a structure for first). 38's "presents the
  noted question as decided" is not scored (it needs reading the card text); the run's chat and cards showed card 3
  kept open in 3 of 3.

## On Completion

Notes; your TASK-STATUS row; one LOG line, `[board-agent] BOT_01: … → Task: [[cortex-tasks/board/2026-11-03_board-ui_read-only-follow-ups/BOT_01_standalone-eval.md]]`, ending in a newline; the return block.
