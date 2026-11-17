# T_03_agent-skill: The Agent Skill

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Teach the agent what the new board offers (icons from the built-in set and the project's library, tones, a skin,
a flow's direction) and the layout guidance (a flow in one container, few tidy links between containers), and prove
it on scenarios.

---

## Context

PLAN.md § Decisions 12, 15, 17, 19, 24, 25 and the kickoff answers on icons and tone (points 242, 246). The
icon and tone bullets are the ledger review's row R28 and its § 4 O4 draft; the tone bullets are the maintainer's
own words at point 246. The skill is `skills/vision-board/SKILL.md` (`CODE-MAP.md` § 14); a change to
it merges only after `npm run eval:bot` passes (project rule). The guidance is headline guidance, not hard rules.
The agent never sees bookmarks. The live eval costs money; the maintainer gave his go at kickoff and it runs on Haiku 5.5.

**Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: `skills/vision-board/SKILL.md`, `skills/vision-board/NOTES.md`, `skills/vision-board/scenarios.md`,
  `apps/board/plugin/words/skill-edits.ts` and `apps/board/plugin/skill.ts` (only if the plugin's skill must
  differ), `apps/board/tests/plugin-skill.test.ts`, `tests/evals/bot/scenarios/`, `tests/evals/bot/` checks,
  `packages/format/schema/` descriptions and `packages/mcp/src/words/` (only to fix a tool description that
  contradicts the skill; then `npm run gen`)
- **Files to reference**: the skill's `## Layout: fit the task and the screen`, `## Writing cards`, `## Starting a
  board`, `## Kinds`; `tests/evals/bot/scenarios/draw.ts` (a scenario's shape); the design decisions' DL-01 to DL-03;
  T_01's notes (the icon names, the tones, how a skin and a direction are set); BE_04's notes (`list_icons`,
  `add_icon`, the name rule, what a drawing may hold); BE_01's notes (what `row` and `flow` now draw); the review
  § 4 O4 "The agent's spec, as a few bullets"
- **Skills**: `cortex-architecture`, `vision-board`

> Modify only the files this task owns. Need a change elsewhere? List it under `REQUESTS`.

---

## Steps

1. [ ] **Layout guidance**, short, at the head of the layout section: draw a flow inside one container; link
       across containers rarely, and then with one tidy link; prefer `flow` when cards are linked; let the board
       place and route.
2. [ ] **Icons** (R28), a few bullets: when a node stands for a component (architecture, a pipeline), give it an
       icon; call `list_icons` first and reuse one that fits; only then add one, named for what it shows, not where
       it is used (`x-` then a singular noun, a qualifier after it if needed: `x-encoder`, `x-encoder-audio`; no
       board names, numbers or colours), drawn as the set is (the same box, paths only, one colour, no text); add
       it with `add_icon`, never by writing a file into `.visionboard/icons/`; a name is taken for good, so if
       yours is refused, reuse that icon or pick a more specific name. An icon never replaces the kind. Do not copy
       the list of names into the skill.
2a. [ ] **Tone** (R28, point 246), a few bullets: the kind's own colour is the default; when the kind already says
       it, leave the tone off. Use a tone to set apart the parts of a flow and to show which nodes belong together
       (the same tone means related), for example a flow of many topic nodes. Normally a palette name; a hue only
       when the content has its own colour. A tone never replaces the kind.
2b. [ ] **Direction**: a `flow` container may say `across` or `down`; choose the one that fits the content; the
       person may change it.
3. [ ] **Skin**: set a board's skin when making it, `command-lens` for operational boards with many answers,
       `default` otherwise; the person may change it.
4. [ ] Remove or reword anything the overhaul made untrue (the footer's buttons, flag). Keep the skill within its
       size limit; cut before you add.
5. [ ] **Scenarios**: add two, a linked pipeline (pass: one container, linked cards, at most one link between
       containers) and an architecture board (pass: `list_icons` called before any `add_icon`; built-in names reused
       where one fits; any added name follows the rule; no file written into `.visionboard/`; valid tones, used to
       group, not on every node; kinds still chosen by meaning). Run `npm run eval:bot -- --dry`.
6. [ ] **Live run** (the maintainer gave his go at kickoff, point 219B): `npm run eval:bot -- --model haiku --port
       7310` (default cap 3 US dollars). Haiku 5.5 is the reference model on purpose: a skill that works on the
       smallest model works more deterministically on the stronger ones. Run it once; if a scenario that passed before now fails, fix the skill, not the scenario.
7. [ ] Bump the skill's version in its front matter, add the version's section to `NOTES.md` and the versioned
       test to `plugin-skill.test.ts`.

---

## Validation

- [ ] `npm run verify`, `npm test` pass (the skill's size and version tests among them)
- [ ] `npm run eval:bot -- --dry` passes; the live run's report is in your notes with its cost
- [ ] No sentence in the skill tells the agent to tick, cross, bookmark or choose for the person
- [ ] No sentence in the skill tells the agent to write a file into `.visionboard/`; the icon and tone bullets are
      a few lines each

---

## Constraints

- If you need to deviate, stop and tell the maintainer; no breaking change is made silently.
- No PII in examples. Interim files in `temp/`. Writes over 50 lines in chunks.
- No git command that changes state; the orchestrator commits.
- Every flag this set adds stays off by default; existing tests and screenshots pass with them off.
- A problem outside this task is reported (`REQUESTS`, `NOTES`), never fixed here.

---

## Implementation Notes

_To be completed by agent after task completion._
_Re-run? Add a `### Run N` block below the last one; never overwrite an earlier run._

**Status**: Blocked (the live eval only; everything else done)  
**Completed**: 2026-11-17 21:10  

### Changes Made
- `skills/vision-board/SKILL.md` v3.34: § Layout opens with "A flow lives in one container" (DL-01 to DL-03: links
  between containers rare, card to card; the board places and routes); the table sends any linked cards to `flow`; a
  `flow` runs `across` or `down` (`direction`), the person's `direction` wins. § Starting a board: `skin`
  (`command-lens` for operational boards with many answers, else left out). § Kinds gains "### Icons and tone" (R28,
  point 246): `list_icons` first, reuse, `add_icon` only when none fits, the `x-` name rule, drawn as the set is, never a
  file into `.visionboard/icons/`, a refused name means reuse or a more specific name; the kind's colour by default, a
  tone to set a flow's parts apart and group related cards, a palette name normally, a hue when the content has its own
  colour; neither replaces the kind. The flag is "A bookmark". Message block 4 and "Other acts" name Ask now (`ask`).
  § Saved for later: the handover's parts show in the card as Markdown, any form that reads best. "flag plan" example
  reworded. No built-in icon name copied in.
- Cut before adding: the `status` history v3.1 to v3.27 moved word for word to `NOTES.md`; the skill is 44,614 bytes
  (was 46,953).
- `skills/vision-board/NOTES.md`: the moved history and a v3.34 section. `skills/vision-board/scenarios.md`: 44 and 45.
- `tests/evals/bot/scenarios/linked-pipeline.ts` (plugin; checks `linked-in-one-flow`, `few-cross-links`, exported for
  reuse), `architecture-icons.ts` (standalone; `lists-icons-first`, `built-ins-reused`, `library-reused`, `added-names`,
  `no-visionboard-write`, `tones-group`, `kinds-by-meaning`, `skin-fits`, plus the two above), `index.ts`.
- `apps/board/tests/plugin-skill.test.ts`: the v3.34 test (the standalone wording, no "flag", no copied icon names, the
  plugin skill names neither icon tool).
- Plugin skill unchanged, byte for byte (8,174 of 8,192): `skill-edits.ts`, `skill.ts`, schema and MCP words untouched.

### Issues & Resolutions
- Live eval (`npm run eval:bot -- --model haiku --port 7310`, run once): no model ran. Every run ended in about a second
  with the CLI's "Failed to authenticate: OAuth session expired and could not be refreshed"; $0.0000 spent; 16 runs (the
  default cap) used by crash retries, so it stopped at `two-turns`/`read-only` with 43 of 82 checks "passed" (the ones a
  silent bot passes). Report: `tests/evals/bot/out/2026-11-17T20-04-24-571Z/report.md` (git-ignored). Not retried: it
  needs a sign-in (`claude` then `/login`) by the maintainer, then the same command again.
- Dry: `npm run eval:bot -- --dry` 88/88 checks in 15 runs; `--dry --standalone` 33/33 in 4 runs; each new bad script
  fails exactly the checks it breaks.
- Checks: `npm run verify` ok (45 warnings, none in these files), `npm run check` 0 errors, `npm test` 2,631 + 14 pass,
  `npm run gen -- --check` current.

### Caught Beyond the Brief
- The approved command runs the plugin's bot, whose skill is built from this one by replacing every section, so it reads
  none of the new text; and `list_icons`/`add_icon` are standalone-only, so scenario 45 needs `--standalone`. Proving the
  skill live takes `npm run eval:bot -- --standalone --model haiku --port 7310` too (4 runs, under $2 at the per-run cap).
- The plugin bot's `write_board` schema says for `node.icon` "Call list_icons first; reuse before you add one with
  add_icon", tools that bot does not have (an input description, which plugin-skill.test.ts does not check).
- The eval's default run cap (16) is one more than the plugin scenarios (15): one crash retry stops the run early.
- Validation "no sentence tells the agent to write a file into `.visionboard/`": the icon text holds it; § Images and §
  Apps still send pictures and apps to `.visionboard/<ledger>/images|apps/`, by design (D-048), untouched.
- App card words (Allow, Check again, Restart) are left to FE_08 and T_04.

### Deviations from Plan
- None in what was built. Step 6 is blocked by the CLI's sign-in, not by the skill.

### Run 2

**Status**: Completed (diagnosis; no code or words changed)  
**Completed**: 2026-11-17 22:40  

The orchestrator ran the approved live eval after the sign-in (`--model haiku --port 7310`): 79 of 88 checks in 15 runs,
$1.53, report `tests/evals/bot/out/2026-11-17T21-52-08-156Z/report.md`. Every failed check is in the three killed runs
(`refusals` 2, `answered-note` 3, `insert-step` 4). `linked-pipeline` passed all of its checks.

### Changes Made
- None. Notes only (this block, the TASK-STATUS row, a LOG line).

### Issues & Resolutions
- **What the transcripts show** (`stream.jsonl` in each run folder): the CLI stopped writing 2 to 3 seconds after it
  started and wrote nothing more until the kill at 180 s. The files last changed at 21:52:48, 21:55:55 and 22:00:04;
  the runs started at 21:52:46, 21:55:53 and 22:00:01. `stderr.txt` is empty in all three.
  - `refusals`: `init`, one `thinking_tokens` event, then nothing. No tool call, no text.
  - `answered-note` and `insert-step`: `init`, thinking, one `list_boards` answered straight away (`team-offsite` and
    `release-steps`, each `held`), then nothing.
  - The 12 passing runs took 6 to 18 s, with the same event types. The `rate_limit_event` lines say `allowed`.
- **Cause**: the bot's next request to the model hung with no output. [INFERENCE: an API or CLI streaming stall; the
  stream cannot say which.] It was not Haiku looping: there are no repeated calls and at most one tool call, answered
  at once. It was not this set's code or words:
  - `refusals` hung on its first request, before any tool ran.
  - That request differs from the 12 passing runs only by the person's words: the same skill, server instructions and
    tool list.
  - The other two hung after a well-formed `list_boards` answer, a tool this set did not change.
  So format 20, the bookmark rename, an `ask` waking `check_responses`, the tool descriptions and the plugin bot's
  `node.icon` input text are all ruled out.
- **Harness**: it worked as designed. The door answered, and the 180 s kill ended each run. A killed run is not counted
  as a crash (`model.ts` `runTurns`: `crashed: !killed && ...`), so a stall is not retried and shows as failed checks.
- **Before this set**: none of the three had run on Haiku. The only older Haiku report (`probe-haiku`, 2026-11-03) ran
  `two-turns` alone. On Sonnet, `refusals` and `answered-note` passed every time, in 7 to 14 s (the main checkout's
  `tests/evals/bot/out/`: `2026-11-03-baseline`, `skill-00` to `skill-04`, `final-overnight`, `tools02-answered`).
  `insert-step` passed on Sonnet under v3.30 (NOTES.md § Skill v3.30).
- The CLI is now 2.1.301; every earlier report ran 2.1.295. [INFERENCE: a possible factor, not shown.]

### Caught Beyond the Brief
- A stall watchdog in the harness would end a stalled run in seconds instead of 180 s, and stop it costing $0.50 of the
  spend cap: kill the run after about 60 s with no stream line, and count it as a crash (retried once). That is a change
  to `tests/evals/bot/model.ts` and its test, not made here.

### Deviations from Plan
- None.

---

## On Completion

1. Fill in Implementation Notes above; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append **your own** LOG entry to `cortex/LOG.md` — one line, terminated with a newline, append-only:

   ```
   [[YYYY-MM-DD HH:MM]] [board-agent] T_03: [what you did] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/T_03_agent-skill.md]]
   ```

   Cite files by path + symbol, never by line number. Never write the set's entry or to `AUDITED.md`.
