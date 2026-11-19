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
   line (beside it when it runs down), a second timeline is a second container; no `timeline` mode (the container keeps its layout); a rewrite (a
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

**Status**: Run 1 blocked at step 4 (the plugin skill 109 bytes over `SKILL_BYTES`); completed in Run 2 below  
**Completed**: — (run 1 stopped 2026-11-18)  

### Changes Made
- **Core** (`source/core.md` § Layout): one bullet, the maintainer's sentence word for word, then "Before you date
  cards, read `references/timeline.md`." Nothing else about dates in the core.
- **Reference** (`source/references/timeline.md`, 2,823 bytes, new): when (events with dates; a date in passing gets no
  key); the four forms as a table, the precision you know, no invented day; a quarter or week by its first month or
  day, named in the body; a time as said, no zone; a year said once holds; the refusal names the four forms; the date
  is the header (title and body never start with it); any order; several events as `###` or bold leads (entries), never
  `##` or plain bullets; kinds hold; one container per timeline, no `timeline` mode, undated cards below (beside when
  down); a rewrite carries `timeline` again, `append` keeps it; `show_layout` lists the line. One worked call (a
  different subject from every scenario, so a scenario can't copy its answers). Built into both builds by
  `npm run build:skill` (standalone `SKILL.md` + `references/timeline.md` on disk) and `buildSkill('plugin')`.
- **Scenarios** (`tests/evals/bot/scenarios/`), registered in `SCENARIOS` and `STANDALONE`:
  - `timeline-plan`: launch plan "as a timeline", year said once; month, day, day+time, a week (one card, three events),
    a year. Checks: `dates-as-said` (2027-09, 2027-10-22, 2027-11-03T09:45, 2027-11-15, 2028), `events-as-entries`,
    `no-date-lead`, `one-timeline-container`, `no-timeline-mode`, `one-write`, keys, no coordinates, done-only; reads
    timeline only.
  - `timeline-unprompted`: an incident's five moments with times, out of order, no "timeline", "date" or "key".
    Checks: each moment `2027-03-04THH:mm`, no date lead, one container, no timeline mode; reads timeline.
  - `timeline-not-for-prose`: four findings in a row, one naming an audit deadline. Checks: `no-timeline-key`; reads
    nothing.
  - `timeline-checks.ts`: the checks above, judging a sent `timeline` by `#format` `normaliseTimeline` (what the server
    stores); `entriesOf` follows call 9 (a `###` entry to the next heading, rule or lead; a bold lead to its blank
    line); `secretArg` lets one fake script play both hosts (`FakeBot.tools`, new in `types.ts`/`fake-bot.ts`).
    `Reference` gains `timeline`. Existing scenarios' `reads` unchanged, so none may read `timeline.md`.
- **Tests**: `plugin-skill.test.ts` v3.35 reads list gains `timeline`; new v3.36 test: the sentence in both builds, the
  reference identical in both, its table's forms are the four precisions (`isTimeline`, `timelinePrecision`), no
  timeline mode taught, the worked call fits `write_board`'s body schema with three stored dates and `###` entries.

### Verification (so far)
- `build.test.mjs` pass; `plugin-skill.test.ts` 18 pass, **1 fail: "fits the host's budget": skill.md 8,301 of 8,192**.
- Dry plugin 129/129 (18 runs); dry standalone 115/115 (14 runs); `--fake bad` fails exactly each timeline scenario's
  `badFails` in both hosts; `bot-eval.test.ts` 7 pass; `tsc -p tsconfig.json` clean; `npm run verify` ok (one old
  warning); `build:skill -- --check` current.
- Live Haiku: **not run** (held at the stop; $0 spent).

### Issues & Resolutions
- **Step 4 stop: the plugin skill is 8,301 bytes, 109 over `SKILL_BYTES` (8,192)**; before the sentence it was 8,117 (75
  headroom); the bullet is 184 bytes. Not fixed: options for the maintainer, with bytes measured on the build:
  - **A. Raise `SKILL_BYTES`** (`tests/plugin/contract/nclite/shared/plugin-host.ts`, the host contract) to at least
    8,301 (8,448 leaves room). No word changes; needs nclite's yes.
  - **B. No word changed, plus one clause reworded**: write each list item of `core.md` on one line (its 43 indented
    continuation lines cost 2 bytes each in the plugin build: −86) and the reading clause as "… share their container's
    timeline (read `references/timeline.md` first)." (−16): 8,199, **still 7 over**. Only works with one more small cut.
  - **C. B's unwrapping plus one restated sentence cut**: Answering's "Answer on the board, and the chat is still
    "Done."" (−53; the Conversation section already says "When you changed the board, the chat says "Done."") with the
    unwrap: 8,162, 30 under. Cuts a rule's restatement, so it needs the maintainer's yes and a live re-run.
  - Recommend A if nclite agrees; else C.
- **Live plugin run vs the run cap**: `SCENARIOS` is now 18; the default cap is 16 runs and is never raised, so a plain
  plugin run stops with two scenarios unrun. Proposal: the plugin live run with `--only timeline-plan,
  timeline-unprompted,timeline-not-for-prose,linked-pipeline,insert-step` (the timeline three and the two that read
  the Layout section the bullet joins); the standalone run (14 scenarios) runs whole.

### Caught Beyond the Brief
- The task's reference wording and the obvious scenario values overlapped (the same "week of" day, "Beta opens"): a
  scenario whose answers sit in the reference's examples proves copying, not the reflex. The scenarios use other dates,
  products and events from the reference's examples and worked call.
- The reference may never say "app card" (the plugin test forbids the phrase in any plugin file), so the app-card
  refusal is left to the schema's words, which the plugin bot never needs.
- The first `Write` of `timeline.md` was 55 lines in one call (rule 10); it succeeded; later writes were chunked.

### Deviations from Plan
- Stopped at step 4 as the task says; steps 4 (test/plugin.md), 6 (live), 7 (version v3.36, NOTES.md, scenarios.md)
  wait for the byte ruling, since every option except A changes the text the live runs would prove.

---

## On Completion

1. Fill in Implementation Notes (cost and results of the live runs); set **Status** to `Completed`.
2. Update your row and notes block in [TASK-STATUS.md](./TASK-STATUS.md) (in `.claude/worktrees/app-window`).
3. Append your own LOG entry to `cortex/LOG.md` (in `.claude/worktrees/app-window`), one line, append-only:
   ```
   [[YYYY-MM-DD HH:MM]] [board-agent] T_02: [what changed] → Task: [[cortex-tasks/board/2026-11-18_board-layout_timeline/T_02_skill-and-evals.md]]
   ```
4. Return block: `TASK_ID`, `STATUS`, `FILES`, `VERIFICATION` (bytes, eval results, cost), `REQUESTS`, `NOTES`.

### Run 2

**Status**: Completed  
**Completed**: 2026-11-18 23:20  

**The orchestrator's ruling** (the maintainer gave it autonomy for this set): option C. Every `core.md` list item on
one line (no word changed), the reading clause shortened to "(read `references/timeline.md` first)", and Answering's
"Answer on the board, and the chat is still "Done."" dropped, since The conversation already says it (one home per
fact). `SKILL_BYTES` stays 8,192. Live runs: plugin `--only` the timeline three, linked-pipeline, insert-step and the
scenarios on Answering and "Done."; standalone in full; a failure on changed wording is reported, not patched with
words.

### Changes Made
- `source/core.md`: option C as ruled. A word diff against HEAD shows only the added bullet and the dropped sentence.
  Sizes: plugin `skill.md` **8,148 of 8,192**; standalone `SKILL.md` 19,079.
- `plugin-skill.test.ts` v3.36: the sentence with "(read ... first)"; "Done." has one home (the dropped line is gone, The
  conversation's bold rule stays).
- Step 4: `docs/specification/plugin.md` § The folder lists `timeline.md`; "Proven by" cites the v3.36 test; `updated`.
- Step 7: v3.35 → **v3.36** in `differences.md`'s standalone front matter (v3.35 stays in NOTES.md); `NOTES.md`
  § Skill v3.36 (the change, the ruling, sizes, both live results); `scenarios.md` v3.36 and scenarios 53-55.

### Verification
- `build.test.mjs` + `plugin-skill.test.ts` 19 pass; `write-examples.test.ts` passes; `build:skill -- --check` current.
- Dry: plugin 129/129 (18 runs), standalone 115/115 (14 runs); bad scripts fail exactly their `badFails`;
  `bot-eval.test.ts` 7 pass.
- **Live, Haiku 5.5, once each, default caps**:
  - Plugin (11 runs, `--only` timeline-plan, timeline-unprompted, timeline-not-for-prose, linked-pipeline, insert-step,
    where-cards-stand, send-round, answered-note, two-turns, new-card-number, draw): **85/86, $0.0302**. Timeline
    11/11, 9/9, 6/6; every other at full but insert-step 6/7.
  - Standalone (all 14): **113/115, $0.0749**, no stall. Timeline 11/11, 9/9, 6/6; misses: architecture-icons 14/15,
    radial-ideas 6/7.
  - **Total eval spend: $0.1051.** Reports: `tests/evals/bot/out/2026-11-18T22-46-38-007Z/`,
    `2026-11-18T22-50-19-042Z/` (git-ignored); logs in `temp/`.
- `npm run verify` ok (one old warning), `gen -- --check` current; `check` and `npm test`: see the TASK-STATUS notes.

### Issues & Resolutions
- **insert-step** (plugin) inserted the card correctly but did not read `references/layouts.md`. The layouts bullet's
  words are unchanged (only put on one line). The same read was missed in node-overhaul T_05 run 1, read in run 3.
  Reported, not chased.
- **architecture-icons `done-only`** (standalone): "Done." with the board's title and id, then a recap sentence. The
  words that govern it are unchanged. [INFERENCE] The dropped Answering line was one more place the core said
  "Done.", so the cut may weaken the reflex. The ruling says report rather than add words back. One run can't tell
  the cut from noise: a repeat of architecture-icons and two-turns would.
- **radial-ideas `no-links`** (standalone): linked its ideas. That rule is in `layouts.md` (unchanged); T_05 run 1 saw
  the same miss.
- The plugin run's log went to the worktree root first; moved to `temp/` (rule 8).
