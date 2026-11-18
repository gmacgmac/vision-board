# T_02_skill-and-evals: The Skill and Its Evals

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Teach the agent the timeline with one core sentence and a `references/timeline.md` built from the skill's one source,
and prove the reflex on Haiku 5.5: dated events get a `timeline` key in one of the four forms without being told the
key, and a card holding several events writes them as `###` headings or bold leads.

---

## Context

PLAN.md decisions 1-5, 7, 19, 22-23 are this task's rulings. The skill is code (`cortex-architecture` rule 12;
project rule: `npm run eval:bot` passes before a skill change merges). Since node-overhaul T_05 the skill has one source
(`skills/vision-board/source/`: `core.md`, `differences.md`, `references/`), built into the standalone skill and the
plugin's; a build ships only the references its text names; the plugin's skill rides every turn within `SKILL_BYTES`
(8 KiB). T_01's contract is in place: the key, its words, the normaliser, `show_layout`'s `timeline`.

**Read previous task notes in TASK-STATUS.md before starting** (T_01's, and node-overhaul T_05's notes in
`cortex-tasks/board/2026-11-16_board-ui_node-overhaul/T_05_skill-core-and-references.md`). Wave 2, own worktree
`.claude/worktrees/timeline-t-02` (branch `feat/timeline-t-02`; check `git branch --show-current` first),
`VB_TEST_PORT=8010` (the eval's `--port`).

---

## Inputs

- **Files to modify**: `skills/vision-board/source/core.md`, `source/references/timeline.md` (new),
  `source/differences.md` (only if a build needs a difference), the built `skills/vision-board/SKILL.md` and
  `skills/vision-board/references/` (by `npm run build:skill`, never by hand), `skills/vision-board/NOTES.md`,
  `skills/vision-board/scenarios.md`, `tests/evals/bot/` (`scenarios/timeline-*.ts` new, `scenarios/index.ts`,
  `checks.ts` if a helper is missing), `apps/board/tests/plugin-skill.test.ts`, `docs/specification/plugin.md`.
- **Files to reference**: `source/build.mjs` (`buildSkill`, `stale`, `unused`), `source/build.test.mjs`,
  `source/references/layouts.md` (a reference's tone and size), `tests/evals/bot/scenarios/architecture-icons.ts` (a
  scenario's shape: `turns`, `checks`, `reads`, `fake.good`, `fake.bad`, `badFails`), `checks.ts`, `run.ts`,
  `limits.ts`; `packages/format/src/timeline.ts` and the `timeline` description in `openapi.json` (T_01); PLAN.md
  § Decisions.
- **Shared artifacts to reuse**: `#format` `normaliseTimeline`, `isTimeline`, `TIMELINE_FORMS` (T_01) in the checks, so
  a check accepts exactly what the server stores; the existing check helpers.
- **Skills**: `cortex-architecture` (prompts are code), `cortex-docs` (plugin.md, NOTES.md).

> Modify only the files this task owns. Need a change elsewhere? List it under `REQUESTS`.

---

## Steps

1. [ ] **Scenarios first** (dry, with good and bad fake scripts), registered in `SCENARIOS` and `STANDALONE`:
   - `timeline-plan`: the person asks for a launch plan "as a timeline", with six events at every precision (a month,
     a day, a week with three events on its days, a day and a time, a year). Checks: reads `references/timeline.md`
     and no other reference; every dated event's card carries `timeline` whose stored value matches the date said, at
     the precision said (a week is its first day; the year given once applies); the week's card writes its three events
     as `###` headings or bold leads, never `##` or plain bullets; no title or body starts with the date; one container
     holds the dated cards; no `mode` named `timeline`; one `write_board` call.
   - `timeline-unprompted`: the person asks to draw how an incident unfolded on one day, with times (no word
     "timeline", "date" or "key"). Checks: the times as `timeline` in the minute form; ordered by the board, so the
     agent need not write them in order; reads the reference.
   - `timeline-not-for-prose`: review findings, one mentioning a deadline in passing. Checks: no `timeline` key;
     `references/timeline.md` not read.
   - every existing scenario's `reads` stays as it is, so none of them may read `references/timeline.md`.
   Bad scripts fail exactly their `badFails` (a date in the title and no key; `2026-Q4`; `##` entries).
2. [ ] **The core** (`source/core.md`, § Layout): one bullet, the maintainer's sentence word for word, and when to read
   the reference: "To put an event on a timeline, give its node a `timeline` key with its date; nodes with one share
   their container's timeline. Before you date cards, read `references/timeline.md`." Nothing else about dates in the
   core.
3. [ ] **The reference** (`source/references/timeline.md`, short, in the voice of `layouts.md`): when to use it (plans,
   roadmaps, histories, schedules: events with dates); the four forms, and the precision you know (never invent a day
   for a month); a quarter or a week has no form: give its first month or day and name the quarter or the week in the body; a
   time as the person said it, no zone; the board orders, spaces and alternates the cards, so write them in any order;
   the date is the card's header, so the title never repeats it; several events in one card as `###` headings or bold
   leads (each draws as an entry); dated cards of one timeline in one container, undated cards in it draw below the
   line, a second timeline is a second container; no `timeline` mode (the container keeps its layout); a rewrite (a
   `node` item with `n` and `base`) carries `timeline` again or the card leaves the line, `append` keeps it; a decision
   on the line is still a `decision`; `show_layout` lists the line in order. One worked `write_board` call (three dated
   cards, one with entries) as the other references show one.
4. [ ] **Build** (`npm run build:skill`; `npm run build:plugin` for the plugin's): both builds name and ship
   `references/timeline.md`. Measure the plugin skill's bytes against `SKILL_BYTES`; if the sentence pushes it over,
   stop and report the bytes with a proposal; never cut another rule unasked. Update `plugin-skill.test.ts` (what each
   build may say) and `docs/specification/plugin.md` (the files the plugin's skill brings).
5. [ ] **Dry**: `npm run eval:bot -- --dry` and `npm run eval:bot -- --dry --standalone` green, and `--fake bad` fails
   exactly the listed checks.
6. [ ] **Live**, only with the maintainer's go recorded in PLAN.md § Kickoff answers (TASK-STATUS.md request 4):
   `npm run eval:bot -- --model haiku --port 8010` and `npm run eval:bot -- --standalone --model haiku --port 8010`,
   each once, within the default caps (`limits.ts`); never raise a cap. A run that stalls is the harness's (the stall
   watchdog in `model.ts`); count it as a crash and retry once. Report cost and per-scenario results; a failing timeline
   scenario is fixed in the words of the skill, then run once more; a second failure is reported, not chased.
7. [ ] **Version and notes**: the skill version up one (v3.35 → v3.36) in `differences.md`'s front matter as T_05 did;
   `NOTES.md` (what changed and the live results); `scenarios.md` (the three scenarios).
8. [ ] Project checks (PLAN.md § Tests). No page spec.

---

## Validation

- [ ] `build.test.mjs` and `plugin-skill.test.ts` pass; the built files equal the build (`stale()` empty)
- [ ] Dry evals green both ways; the bad scripts fail exactly their `badFails`
- [ ] Live Haiku runs pass the timeline scenarios (or the go was not given, and that is reported)
- [ ] `npm run verify`, `check`, `test`, `gen -- --check` pass

---

## Constraints

- The skill's words live in its source; never in code. Never hand-edit a built file.
- No PII in scenarios (made-up products and people). No git commands that change state. Interim files in `temp/`;
  writes over 50 lines in chunks. Never use port 4466.

---

## Implementation Notes

_To be completed by agent after task completion._

**Status**: Pending  
**Completed**: YYYY-MM-DD HH:MM  

### Changes Made
- 

### Issues & Resolutions
- 

### Caught Beyond the Brief
- None

### Deviations from Plan
- None

---

## On Completion

1. Fill in Implementation Notes (cost and results of the live runs); set **Status** to `Completed`.
2. Update your row and notes block in [TASK-STATUS.md](./TASK-STATUS.md) (in `.claude/worktrees/app-window`).
3. Append your own LOG entry to `cortex/LOG.md` (in `.claude/worktrees/app-window`), one line, append-only:
   ```
   [[YYYY-MM-DD HH:MM]] [board-agent] T_02: [what changed] → Task: [[cortex-tasks/board/2026-11-18_board-layout_timeline/T_02_skill-and-evals.md]]
   ```
4. Return block: `TASK_ID`, `STATUS`, `FILES`, `VERIFICATION` (bytes, eval results, cost), `REQUESTS`, `NOTES`.
