# SKILL_01_bot-instructions: Bot instructions for ledgers and read-only

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The bot's instructions are true for ledger folders and read-only ledgers, in as few lines as the eval shows are
needed, and `npm run eval:bot` passes with new scenarios for both, before the merge (project rule 399).

## Context

PLAN decisions 3, 9, 14. The tools already carry most facts (D-083: a rule is held by its tool, the reads give the
facts): `ledger` and `readOnly` on reads, `read-only` and `wrong-folder` refusals with their own words, a read tool's
`ledger` input. Instructions carry only judgement. What names the old layout today (research): `skills/vision-board/SKILL.md`
§ Where you are running (the Allow line: "the board's own files in `.visionboard/`"), § Images in cards ("Keep it in
the project's `.visionboard/images/`"), § Apps on the board (`.visionboard/apps/<id>/`), and "Keys are yours across the
project" (§ Writing cards); `scenarios.md` and `NOTES.md`; the plugin's variant and its words (`apps/board/plugin/skill.ts`,
`apps/board/plugin/words/`); the MCP instructions (`packages/mcp/src/words/info.ts`, e.g. `aBoardMarkedLockedList`);
`apps/board/tests/plugin-skill.test.ts` asserts the images sentence. The eval: `tests/evals/bot/run.ts`, scenarios in
`tests/evals/bot/scenarios/*.ts` (index lists answered-note, draw, offsite, own-board, picture, refusals, send-round,
two-turns, wait), limits in `limits.ts` (180 s per run, 12 runs, $3, door port 6010); written scenarios in
`skills/vision-board/scenarios.md` (#21 is the locked board). EVAL_01 and SKILL_01 of the bot-quality set
(`cortex-tasks/board/2026-11-03_board-agent_bot-quality/`) show how a wording change was run and recorded.

## Inputs

- **Files to modify**: TASK-STATUS.md File Ownership (SKILL_01, wave 6)
- **Shared artifacts to reuse**: every agent-facing fact from LEDGERS_01, LEDGERS_02, READONLY_01, CONSOLIDATE_01; the eval as it stands
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. **Baseline**: run `npm run eval:bot` on `feat/ledgers` as it stands (both flags on in the eval's engine) and record
   the score per check in your notes.
2. **Scenarios first** (`tests/evals/bot/scenarios/`): a read-only ledger (the bot reads, answers in one line that the
   board is read-only and the person can press Edit, writes nothing, does not loop); a picture in a ledger folder (the
   bot puts it in the open ledger's `images/` as the read tells it); bringing a scratch ledger into main (reads
   `scratch` with `ledger`, draws a summary on the open ledger, writes nothing to `scratch`). Add each to `scenarios.md`.
3. **The words**: change only what is now untrue (the paths, "across the project" → "across the ledger") and what the
   new scenarios fail on, one line at a time, re-running the affected scenarios after each. The images and apps paths
   say "the open ledger's folder, which `join` and `list_boards` name" rather than a fixed path. Same edits in the
   plugin's variant. Bump the version line (`status:`) with a one-line summary, as v3.27 does.
4. **Gate**: the full eval passes: no check that passed at the baseline fails, and the new scenarios pass; at most
   12 runs and $3 per eval run (the eval's own limits); record runs and cost.
5. **Docs** (`cortex-docs`): `scenarios.md` and `NOTES.md` as the skill's own record.

## Validation

- [x] `npm run eval:bot` (port 7000 for anything you start beside it; never two evals at once) passes as in step 4
- [x] `apps/board/tests/plugin-skill.test.ts` and `npm test` green; `verify` green

## Implementation Notes

_To be completed by the agent. Re-run? Add a `### Run N` block; never overwrite an earlier run._

**Status**: Completed (2026-11-03, Opus 5.5; model under test `sonnet`, CLI 2.1.301; worktree `skill-01`, no commits)

### Changes Made
- **Eval scenario first**: `tests/evals/bot/scenarios/read-only.ts` (id `read-only`, in `index.ts`): the ledger opened
  read-only after setup; asked to add a card, then asked again once editable. Checks: `one-write-attempt`,
  `says-read-only` (not "Done."), `no-request-grant`, `drawn-once-editable`, `card-added`, `done-only-t2`,
  `short-chat`, `bounded`; good and bad fake scripts (dry test green). Needed a 3-file harness change (below).
- **`SKILL.md` v3.28** (status line added): join's answer names `project` and `ledger`, check both (LEDGERS_02-R3);
  `wrong-folder` "or another ledger"; closed-files line "the open ledger's `images/` and `apps/`"; Access: a write
  refused `read-only` (or `readOnly: true`): one line, press Edit, stop (READONLY_01-R2); new `## Another ledger`
  (CONSOLIDATE_01-R1: only a ledger the person names; `ledger: "<name>"` on the three reads; always read-only,
  Edit or not; nothing `owed`/`held`; summary on the open ledger with `write_board`, no `ledger`; `not-found` lists
  the ledgers); keys "across the ledger" (decision 3); images and apps in the open ledger's folder,
  `.visionboard/<ledger>/images/` named from `join` / `list_boards`. 491 → 509 lines.
- **Plugin skill** (`plugin/words/skill-edits.ts`): two edits: "press Edit to change it" → "read-only until they make
  it editable"; `## Another ledger` cut (the input is not offered under a host). `plugin/skill.ts` header comment.
- **Tool words** (`openapi.json`, then `npm run gen`): `list_boards` and `get_board` explain `readOnly: true`; `join`
  returns `ledger`, check both, `wrong-folder` "folder or ledger"; `request_grant`: no request on a read-only ledger;
  `wrongFolder` / `agentConflict` responses name the ledger. LEDGERS_01-R4: `list_apps`, the app id, the two app-state
  routes, `common.schema.json` app id, `list-apps-response`, `manifest`, `panel-state` say the open ledger's `apps/` /
  `app-state/`; mirror `plugin-tools.ts` `inputEdits`.
- **MCP instructions** (`mcp/src/words/info.ts`): `joinAndListBoardsName` names `ledger` and "folder or ledger";
  `aBoardMarkedLockedList` no longer calls a locked board "read-only" and adds one sentence on `readOnly`. Plugin
  mirror `instructionEdits` updated.
- **Bot's refusal** (`actions-refusals.ts` `thisLedgerIsOpenRead`, PLUGIN_RO_01-R1): "…tell the person in one line
  that it is read-only until they make it editable, and wait for them." Host-neutral; standalone's "press Edit" now
  lives in the skill. `readOnlyPressEditTo` (the person's) untouched. Its `openapi.json` example updated.
- **Tests**: `plugin-skill.test.ts` (images line; new test: standalone reads another ledger and says Edit, the
  plugin skill neither); `mcp/tests/tools.test.ts` (locked/readOnly instruction regexes; `readOnly: true` in both
  reads; **size caps raised on purpose**: `list_boards` 700 → 760 (729 now), `get_board` 1100 → 1150 (1116);
  `LIST_CAP` unchanged, 30,748 of 30,800).
- **Docs**: `scenarios.md` v3.28 (36 read-only, 37 picture in a ledger folder, 38 bring scratch into main; 9 covers a
  ledger mismatch); `NOTES.md` § Skill v3.28.

### Eval runs (`npm run eval:bot -- --flags ledgerFolders,readOnlyStart`; reports `tests/evals/bot/out/ledgers-*`)

| Run | What | Runs | Result | Spend |
|---|---|---|---|---|
| 00 baseline | `feat/ledgers` as it stands, 8 scenarios | 8 | 39/40: only `picture/done-only` failed (narration before "Done.", the known one) | $0.5165 |
| 01 | `read-only` only, words unchanged | 1 | 8/8; but it read `readOnly: true` twice and still wrote once (refused), and said "Press Edit" | $0.0641 |
| 02 | `read-only` ×2 after the words | 2 | 16/16; no write at all in both; "Make it editable" | $0.1602 |
| 03 final | all 9 scenarios | 9 | **48/48** (every baseline pass still passes; `picture/done-only` passed this once) | $0.5320 |

20 eval runs, $1.2728 (each run under the 12-run, $3 cap). One earlier start failed at the plugin build before any
run (gen not yet run after the schema edit): no spend.

Standalone, by hand (the eval runs only a host's bot): `claude -p --model sonnet` with `SKILL.md` as the system
prompt and `vb-mcp` to a test server (`ledgerFolders`, `readOnlyStart`, temp HOME, ports 7000/7001), folder with
`main` and `scratch`: (A) bring scratch in: `join` (ledger main), `list_boards`/`get_board` with
`ledger: "scratch"`, a summary board on main, scratch byte-for-byte unchanged, $0.1466; (B) picture: right folder
`.visionboard/main/images/` but narrated a doubt and reached for `ls`, $0.0380; images line reworded; (C) same ask:
straight to `.visionboard/main/images/`, served 200, $0.0990; (D) read-only server: `join` refused, one line "Press
Edit to make it editable", $0.0149. 4 runs, $0.2985. Single runs, not rates. Temp files removed.

### Issues & Resolutions
- The eval runs only the plugin's bot (`eval.ts` `botArgs`: the built `skill.md`, the host's tools). Scenarios 37 and
  38 are standalone-only (a host has one board folder and refuses `ledger`), so they are written scenarios plus the
  manual runs above, not `eval:bot` scenarios. A standalone mode for the eval is a tracker item (REQUESTS).
- macOS ControlCenter listens on `*:7000` (AirPlay); the test server bound 127.0.0.1:7000 fine, the second one used
  7001 to stay clear.
- `timeout` is not on this machine: every run was capped with `perl -e 'alarm N; exec …'`.

### Caught Beyond the Brief
- The MCP instruction for `locked` called a locked board "read-only", the new state's own word (D-085 4): reworded
  ("can't be changed until the person unlocks it").
- `write_board`'s description was left as is (READONLY_01-R2 listed it): its `read-only` refusal already says
  "nothing was written", and the eval showed no need; the cap is kept for what earns it.

### Deviations from Plan
- Small, outside the listed files: `tests/evals/bot/{types,host,eval}.ts` (+8/-4 lines): `Stage.readOnly(on)`, the
  host passes `readOnly: () => flag` to the engine as a host does. Without it no scenario can open a read-only
  ledger (the host joins its bot at start, which read-only refuses, so it must flip after setup).
- Step 2's picture and scratch scenarios are written, not eval scenarios (above).

## On Completion

Notes; your row; one LOG line (`[board-agent] SKILL_01: …` → this file, one line ending in a newline); the return block
with `REQUESTS`. No commit.
