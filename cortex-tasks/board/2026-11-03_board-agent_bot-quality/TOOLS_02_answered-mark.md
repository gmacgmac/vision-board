# TOOLS_02: A Note Says It Was Answered, Not Only That It Is Owed

**Skills**: cortex-architecture, cortex-docs · **Model**: strong · **Wave**: 3 · **Branch**: `feat/bot-answered`

## Objective

SKILL_01's request 1. Since TOOLS_01, an agent's read marks a note `owed: true` while it waits for this bot's
answer; an answered note just lacks the mark, so the bot must infer "answered" from an absence, and in the eval it
missed that once in two (answered-note / no-second-answer, 2/3). Make it positive: on an agent's read, an answered
note says so and points at its answer, so every note reads one of three ways (owed by you, answered, or not yours).

## Inputs

PLAN.md; TOOLS_01's notes (`caller-marks.ts`, `marksFor`, the `owed` rows from `#actions` `conditionsOf`) and
SKILL_01's notes (the answered-note runs); `docs/specification/api.md` point 171; the contract schemas under
`packages/format/schema/api/` (`common.schema.json` `note`).

## Steps

1. Design in your notes first: the field (for example `answered: { seq, kind }`, the reply or append that answered
   it; or the answer's text beside the note), from the same rule that ends `owed` (one source, never a second
   reckoning); only on an agent's read, as `owed` (a person's read and the page's fold stay unchanged).
2. Contract first (`openapi.json` / schemas, `gen-api`, `info.version` minor bump), behind `botToolRules`; failing
   test first; then the engine.
3. The instructions: if the new mark makes SKILL_01's "Answer a note once" bullet simpler, make it shorter in
   `skills/vision-board/SKILL.md` (shorter is better; say who reads it).
4. Prove it with the eval: `npm run eval:bot -- --only answered-note,two-turns,send-round --repeat 3` (port 6710),
   with `--max-runs 9 --max-usd 1.5`. Compare with SKILL_01's runs. Never more runs than that.
5. Docs: `api.md` 171, `plugin.md` if it lists the marks, `api-reference.md` generated. Seam: if `plugin.d.ts`
   changes, set `SEAM_TYPES` (an addition: `SEAM` stays 1) and say so.
6. Checks (`nice -n 15`, 3 workers): `npm test`, `verify`, `check`, `gen-api --check`, `test:plugin` on 6610.

## Notes

Constraints: worktree only, no commits, no LOG/AUDITED, don't edit TASK-STATUS.md, never 4466, never kill a process
you didn't start, no protected files. The eval's caps are the maintainer's no-loop condition: pass them every time.

## Implementation Notes

### Design (written before building; Opus 5.5, sub-agent)

**The fact the bot lacked.** In SKILL_01's failed answered-note runs, `get_board` showed card 1's note with `sent` and
`locked` and nothing else: no `owed`, and nowhere the bot's own reply (`get_board` carries no replies). "Answered" was
an absence. Now each note on an agent's read says one of: `owed` (yours to answer), `answered` (what answered it), or
neither (nothing of yours: a card you may not answer, or an earlier note on a card whose latest note carries the mark).

**The field**, on `common.schema.json` `note`, beside `owed`, only on an agent's read and only with `botToolRules` on:

- `answered: { kind: 'reply', seq, text }`: a reply naming it in `to` (its line and its words, so the bot sees what
  was said without a second read; `show_node` already gives every agent the replies, so nothing new is exposed);
- `answered: { kind: 'version', ver }`: a newer version of this card than the one the note was made on (an `append`;
  a version line has no `seq` of its own in the fold, so it is named by `ver`, as `show_node` names versions);
- `answered: { kind: 'check' | 'cross', seq }`: the person's ✓ or ✗ on the card after the note, while it stands
  (`notes.ts` `closedAfter` already calls this "answered by the person").

When more than one holds, the reply wins, then the version, then the mark: the bot's own answer is the one it must
not repeat.

**One source.** A new `#actions` `noteAnswer(s, ask, id?)` (`packages/actions/src/note-answer.ts`) is the rule that
ends owing: `conditions.ts` `owedNote` (`item.owed`) and the `container.owed` row now ask it ("owed" = the card's
latest ask with no `noteAnswer`), instead of their own three checks; `note-lock.ts` gains `replyTo` (the reply
`replied` finds), so `replied` and `noteAnswer` read the same reply. The marks file (`engine/caller-marks.ts`
`marksFor`) asks `noteAnswer` for each shown note that is not owed. A container note is answered by a reply alone,
as `container.owed` ends. A note on a group is answered per card for a version or a mark, by a reply on any of its
cards, as `owedNote` reckons it per card.

**Unchanged:** a person's read and the page's fold (no agent, no marks: `board-data.test.ts`), the flag off (no
`answered`), `owed` itself, `locked` (a different question: whether the person may still edit it).

**Contract:** `common.schema.json` `$defs/noteAnswer` + `note.answered`; `info.version` 1.39.0 → 1.40.0 (adds only);
`gen` regenerates `api-types.generated.ts` and `api-reference.md`. No `plugin.d.ts` change expected (the seam types
carry no note shape); checked after.

**Words:** the plugin instructions' edit "(a note the reads show without `owed` needs nothing more)" becomes a
positive one naming `answered`; SKILL.md's "Answer a note once" bullet loses its reasoning from absence.

### What was built (as designed, with these differences)

- `packages/actions/src/note-answer.ts` (new): `NoteAnswer`, `noteAnswer(s, ask, id?)`; exported from `#actions`.
  `note-lock.ts` gains `replyTo` (the first reply naming an ask), and `replied` is now `replyTo(...) !== undefined`.
  `conditions.ts` `owedNote` and the `container.owed` row ask `noteAnswer` (their own `closedAfter` / version /
  `replied` checks are gone). One behaviour edge dropped: the old `owedNote` had a fallback for a card whose latest ask
  was missing from `s.asks`, which the fold never produces (`restate` takes `marks.ask` from the same asks it stores).
  The whole unit suite held the rest equal.
- `apps/board/server/engine/caller-marks.ts`: `CallerMarks.answered(seq, n?)`; `markNotes` adds `answered` to each note
  not owed; `markRegionNotes` (new, shared by `get_board`'s `containerNotes` and `show_container`, which `reads.ts`
  used to mark by hand).
- Contract: `common.schema.json` `$defs/noteAnswer` (a `oneOf` of three closed shapes) and `note.answered`; `note.owed`'s
  description now points at `answered` instead of explaining the absence. `info.version` 1.40.0; `npm run gen`
  (api-types, tool tables, api-reference); `npm run map` (modules.md: the new `#actions` exports).
- Seam: `plugin.d.ts` unchanged (no note shape in it), so `SEAM_TYPES` and `SEAM` untouched.
- Words: `words/plugin-tools.ts` instruction edit, now "Answer every note a read marks `owed` with a `reply` or an
  `append` (one marked `answered` is answered already: never answer it again)" (plugin bot only). `SKILL.md` (every
  bot): "**Answer a note once**: only while a read marks it `owed` or `list_open` has its card in `pending`. One marked
  `answered` was answered, perhaps before this conversation: leave it, since a second answer clears the person's mark
  again." (3 lines, was 4; the list of reads and the reasoning from absence are gone; the reason SKILL_01's try 4 added
  is kept). Status v3.26.
- Docs: `api.md` point 172 (new), `plugin.md` § The bot "Reads say what is true for it" and its proof line.
- Tests: `bot-tool-rules.test.ts` "reads say what answered a note (TOOLS_02)" (failed first: the latest note on card
  1 had no `answered`): reply (with words), version, the person's ✓ after a second note, a container note, an earlier
  note and another bot's unanswered card unmarked, every marked read held to the spec (`openapi-ajv.ts` `checkAnswer`
  for `get_board`, `show_node`, `show_container`), a person's read unmarked; the flag-off test now also replies and
  checks no `answered`; the instructions test checks the positive wording.

### Eval (step 4)

`npm run eval:bot -- --only answered-note,two-turns,send-round --repeat 3 --max-runs 9 --max-usd 1.5 --port 6710
--out tests/evals/bot/out/tools02-answered` (gitignored report, run from this worktree). Model `claude-sonnet-5-5`
(stream `init`), CLI 2.1.295. Skill sha256 1e9b5238597c (366 lines, v3.26); server instructions sha256 56fbd8891edb
(the plugin's, with the new `owed` / `answered` wording; SKILL_01's were 74059a1f9702). Flags at their defaults
(`botToolRules` on). Not stopped early; no run killed or retried.

**50/51 checks in 9 runs.** In all three answered-note runs the bot's `get_board` showed card 1's note with
`"answered":{"kind":"reply","seq":10,"text":"From the office there is no drive; ..."}`, and it wrote only the new
card.

| Scenario / check | B1 (EVAL_01) | B2 (SKILL_01 baseline) | SKILL_01 final | SKILL_01 all runs with its wording | TOOLS_02 (3 runs) |
|---|---|---|---|---|---|
| answered-note / no-second-answer | fail | fail | fail | 2/3 | **3/3** |
| answered-note / card-added, no-key-conflict, done-only | pass | pass | pass | | 3/3 each |
| two-turns / note-answered-once | fail | pass | pass | 1/1 | 3/3 |
| two-turns / no-key-conflict, every-item-keyed, done-only-t1, -t2 | pass | pass | pass | | 3/3 each |
| send-round / no-re-read, note-answered-once, asks-again | pass | pass | pass | | 3/3 each |
| send-round / no-key-conflict | pass | fail | pass | 2/2 | 3/3 |
| send-round / done-only | pass | pass | pass | | **2/3** |
| bounded (each scenario) | pass | pass | pass | | 3/3 each |

The one failure, send-round rep 3 done-only: "Done. Card 1 is the office, so it has no drive. I think your question
was about the cabin (card 2), so I added the hour's drive back to that card. I also asked on card 1 whether you still
want the office ruled out." (over the check's 200 characters after "Done."). Not attributed to this change
[INFERENCE]: in send-round the note is owed, never `answered`, so the bot read no new mark; the reply and the ask
again were right (no-re-read, note-answered-once, asks-again all passed in that run); it is the narration after
"Done." that SKILL_01 left flaky in picture, here after an extra `append` to card 2. Earlier send-round done-only
figures are one run each (three runs in all, all passes), so 2/3 is the first repeated measure, not a regression
proven by a rate.

**Spend arithmetic** (the report's sum of each run's last `total_cost_usd`): 0.0686 + 0.0637 + 0.0844 + 0.0671 +
0.0637 + 0.0853 + 0.0741 + 0.0637 + 0.0898 = **$0.6604 for 9 runs** (caps: 9 runs, $1.5). No other model run in this
task.

After the eval, the `noteAnswer` schema's three `kind` fields gained descriptions (`gen-api.test.mjs` "every field ...
has a description" failed in the unit suite). The bot read the build from before that edit; the difference is three
description strings in the response schema, no shape and no instruction.

### Verification (all `nice -n 15`, at most 3 workers, from this worktree)

- Failing first: `bot-tool-rules.test.ts` "reads say what answered a note (TOOLS_02)" failed on card 1's latest note
  (`answered` undefined); now 10/10 in that file.
- Unit suite (`npm test`'s globs, `--test-concurrency=3`): 2232/2232; `test:timing` 14/14. The first full run found
  one failure, `gen-api.test.mjs` "every field of every answer has a description" (the `noteAnswer` `kind`s), fixed.
- `npm run verify`: ok (warnings only, none for the changed files). `npm run check`: svelte-check 0 errors, `tsc`
  clean. `gen-api --check`: current. `test:plugin` on 6610 (`VB_TEST_PORT=6610 VB_TEST_WORKERS=3`): 79/79.
- Nothing left running; 6610 and 6710 free. The main checkout and `tidy` show no changes.

### Notes

- **Who reads each change.** The `answered` mark: every agent's read (standalone `vb-mcp` agents and Kiro/Claude Code
  in the chat panel get it too, as they got `owed`; additive). The instruction edit: the plugin bot only. The SKILL.md
  bullet: every bot; with the flag off there are no marks, and `list_open`'s `pending` still answers which notes are
  owed, so the bullet stays true.
- **A stray file, removed.** The eval's console log was first sent to a file at the worktree root; removed after
  reading (nothing else written outside the gitignored `tests/evals/bot/out/`).
- **For the decision draft (D-083, TOOLS_01's notes) [INFERENCE]:** its point 4 could read "...`owed` on each note it
  owes, and `answered` (what answered it) on each note already answered, from one rule (`noteAnswer`)". Not edited here:
  the draft is the orchestrator's.

### Return Contract

```
TASK_ID: TOOLS_02
STATUS: completed
FILES: packages/actions/src/note-answer.ts (new), note-lock.ts (replyTo), conditions.ts (owedNote, container.owed ask
  noteAnswer), index.ts; apps/board/server/engine/caller-marks.ts (answered, markRegionNotes), reads.ts;
  apps/board/server/words/plugin-tools.ts (instruction edit); packages/format/schema/api/common.schema.json
  (noteAnswer, note.answered), openapi.json (1.40.0); generated: packages/format/src/{api-types.generated.ts,
  tools.generated.json}, packages/mcp/src/tools.generated.json, docs/specification/api-reference.md, modules.md;
  docs/specification/api.md (172), plugin.md; skills/vision-board/SKILL.md (bullet shorter, v3.26);
  apps/board/tests/bot-tool-rules.test.ts, openapi.test.ts; this task file
VERIFICATION: eval 50/51 in 9 runs, $0.6604 (caps 9 / $1.5): answered-note no-second-answer 3/3 (SKILL_01 2/3, both
  baselines fail); the one fail is send-round done-only rep 3 (narration after "Done.", no `answered` in that scenario);
  unit 2232/2232, timing 14/14, verify ok, check 0 errors, gen-api --check current, test:plugin 79/79 on 6610
REQUESTS: (1) orchestrator: D-083 draft point 4 may name `answered` (wording in Notes); (2) orchestrator: send-round
  done-only 2/3 joins picture's narration as a flaky "Done." line (SKILL_01 recommendation 4), not this task's
NOTES: one rule: noteAnswer ends owing and names the answer (reply with its words, newer version by ver, or the
  person's check/cross), reply first. Agent reads only, flag botToolRules, person's read unchanged. plugin.d.ts
  unchanged, SEAM_TYPES and SEAM untouched. Eval built before the kind descriptions were added (descriptions only).
```
