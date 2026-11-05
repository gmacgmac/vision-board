# BOT_01_skill-and-reads: Bot instructions and check_responses

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The bot's instructions and `check_responses`'s description carry PLAN Decisions 1, 4, 5, 6 and the new Markdown
(7-9), and `eval:bot` passes in both modes (project rule: bot instructions change only with the eval green).

## Context

From an agent's handover after a real session: it read every card with `get_board` to find the 5 it owed, when
`list_open` gives number, kind, title, status and `pending`; it guessed a new card's number in the same call; it
took three items to put a card into a flow. SKILL.md is v3.29; "`###` small labels" is its Markdown line (§ Writing
cards, Body).

## Inputs

- `skills/vision-board/SKILL.md` (+ its status line, `NOTES.md`, `scenarios.md`); the plugin's edits
  `apps/board/plugin/words/skill-edits.ts` and `apps/board/tests/plugin-skill.test.ts`
- `packages/format/schema/openapi.json` `check_responses` description, then `npm run gen`
- ACT_01's `insert` (merged at wave 1), MD_01's Markdown (merged)
- `tests/evals/bot/**` (`npm run eval:bot`, `npm run eval:bot -- --standalone`)
- **Skills**: `cortex-architecture`

## Steps

1. Scenarios first (`scenarios.md`, eval stages): after a round of answers the bot finds what it owes with
   `list_open`, not `get_board`; it names a new card in a reply only with the `n` the board gave it; it puts a
   card into a flow with one `insert`; a consolidated card uses `#`/`##` and a table of at most 4 columns.
2. SKILL.md v3.30, each line earning its place: `list_open` as the way to see where cards stand (and after a
   compaction); draw first, then reply with the given number; `insert`; save `agent` and `secret` to the
   session's scratchpad or notes file, and `not-authenticated` means join again; "reply, then ask again: ✓ if
   that settles it"; headings in three sizes, tables (4 columns at most), `---`. Keep it short: fold into the
   existing lines where they live.
3. `check_responses` description: one clause pointing to `list_open` for where each card stands. `gen`.
4. Plugin edits follow; `eval:bot` both modes (budget about $3 a mode; time limit 20 min); fix wording on a fail,
   never the checks to pass.

## Validation

- [ ] `eval:bot` and `eval:bot -- --standalone` pass (figures and cost in notes); `apps/board/tests/plugin-skill.test.ts`;
      `gen -- --check`; `check`; `npm test`; `test:plugin`

## Constraints

Deviation from a PLAN decision: stop and report (`DEVIATION`). No PII in examples. No git commits. Long writes in
chunks. Only your files; other needs under `REQUESTS`.

## Implementation Notes

_Re-run? Add a `### Run N` block; never overwrite an earlier run._

### Run 1 (2026-11-05, Opus 5.5, worktree `.claude/worktrees/bot-01`, branch `feat/bot-01`)

**Changes Made**
- Scenarios first: `skills/vision-board/scenarios.md` v3.30, 40 (where cards stand, `list_open`), 41 (a new card named
  in a reply), 42 (a step put into a flow), 43 (a summary card with headings and a table); 36 reworded for the toggle.
  Eval: new `tests/evals/bot/scenarios/{where-cards-stand,new-card-number,insert-step,summary-card}.ts` (each with good
  and bad fake scripts), registered in `scenarios/index.ts` (plugin list); `limits.ts` `MAX_RUNS` 12 → 16 (13 plugin
  scenarios now; ceiling unchanged at 30), `run.ts` comment.
- `skills/vision-board/SKILL.md` v3.30: `list_open` is where cards stand (number, kind, title, status, `pending`), read
  first when no message lists the answers, never every card with `get_board`, chat still "Done."; a new card's `n`
  comes in the answer to the call that draws it, so a reply naming it goes in the next call; `insert: { after, before }`
  beside `node` puts a card into a flow (§ Layout); Body: `#`/`##` headings, tables of 4 columns at most, `---`; "A
  summary card" bullet (a `##` per part, a table with a row per card replaced); the agent id and secret go in the
  session's scratchpad or notes file, never a file the repository tracks; read-only: "switch it to Editing". Wording
  fixes the eval earned: quiet while you work names plans and reasoning; what you can't do is one short sentence
  however many things; consolidation example ("sum these up"); Images names `"ledger": "main"` →
  `.visionboard/main/images/`. "Reply, then ask again: ✓ if that settles it" was already there word for word (§ What the
  person's answers mean): kept, not repeated. `NOTES.md` § Skill v3.30: the evidence.
- `packages/format/schema/openapi.json`: `check_responses` "; `list_open` says where each card stands."; `write_board`
  "A `node` item's `insert: { after, before }` puts it between two linked cards of a `flow` or `lanes`." (ACT_01-R2);
  three read-only descriptions and the `readOnly` example "switch(es) to Editing". `npm run gen`. Tool list 31,992 of
  `LIST_CAP` 32,000 (8 left; cap not raised).
- FE_02-R2: `packages/actions/src/words/actions-refusals.ts` `readOnlyPressEditTo` = "Read-only: switch to Editing to
  change it" (key name kept: renaming it reaches `read-only.ts`, not owned); `apps/board/server/words/server-folders.ts`:
  `editRefused` "Try again once it stops editing.", `openedReadOnly` "until you switch the board to Editing", the move
  message "(or switch to Editing)". True both ways: the chip says Read-only and then Editing with the toggle, and
  with the menu (Edit).
- Plugin: `apps/board/plugin/words/skill-edits.ts` read-only edit follows the new line; `apps/board/tests/plugin-skill.test.ts`
  holds no "press Edit" past the history, no Edit/Editing under a host, and the v3.30 lines in both skills (the
  scratchpad line standalone only).

**Verification** (tier: normal; model `sonnet`)
- `eval:bot` plugin: last full run 73/74 (13 runs, $0.81; the one fail `summary-card/done-only`, narration) on the final
  text less the consolidation example ("sum these up"), which came after; `summary-card` on the exact final text 3 runs:
  `done-only` 2 of 3, every other check 3 of 3. Narration rates over the iterations: `new-card-number` 0 of 6 as an
  imperative, 2 of 3 as a fact, 5 of 6 with the quiet rule naming plans; `where-cards-stand` 3 of 4 after "the chat is
  still Done."; `refusals` `short-chat` 4 of 5 after the can't-do rewording (3 of 3 on "two or three things in one
  sentence", then 0 of 1, then 1 of 1 on "one short sentence"). Baseline v3.29 on the four new: 21/26. A third full run was not
  made (budget).
- `eval:bot -- --standalone`, final text: 37/38 over 2 reps (one `ledger-picture/done-only` narration, "Write the SVG
  first."); `ledger-picture` 4 of 4 after the Images line (2 of 5 before it; v3.29 4 of 4).
- Spend: plugin $4.93 (13 invocations), standalone $2.28 (5): $7.21 in all, over the "about $3 a mode" for the plugin
  mode, spent chasing narration (see NOTES.md). Reports: `tests/evals/bot/out/bot01-*/report.md` (worktree, ignored).
- `gen -- --check` current; `check` 0 errors; `plugin-skill.test.ts` 8/8; `bot-eval.test.ts` (dry, good and bad,
  both modes) 6/6; `test:plugin` 83/83; `npm test` 2398/2400, the 2 fails are the reworded server sentences held
  verbatim by tests not owned (REQUESTS). Page specs `read-only{,-writes,-controls,-toggle}`: 4 fail on the new reason
  text / the gallery screenshot that quotes it (REQUESTS).

**Caught Beyond the Brief**
- Sonnet narrates its reasoning as chat text before a tool call when a rule invites weighing ("The person asked
  directly, so I'll…"); imperative two-step rules get echoed as plans. Rules stated as facts echo less. Residual about
  1 in 3 on `summary-card`, present on v3.29 too.
- The secret in a notes file: a file in the repository can be committed, so the line says never a file the repository
  tracks.
- `common.schema.json` `readOnly` description (agent-facing, in reads) still says "until the person presses Edit"; also
  `server-chat.ts` "Press Edit first.", `shell/words/chat.ts`, `shell/words/editing.ts` `readOnlyPressEdit` and
  `editRefused`, the gallery `read-only-controls-section.ts` text, and `docs/specification/{api,plugin,components}.md`.
- In one plugin run the bot first called a bare `write_board` with `items` as a string, then the right tool.

**Deviations**: none from PLAN decisions. Validation not fully met: `eval:bot` is not green on every run; the residual
is chat narration (`done-only`), mostly `summary-card` (about 1 run in 3, as on v3.29). No check was loosened.

## On Completion

Notes here (Changes Made, Verification, Caught Beyond the Brief, Deviations); your TASK-STATUS row; one LOG line,
`[board-agent] BOT_01: … → Task: [[cortex-tasks/board/2026-11-05_board-ui_insert-markdown-signals/BOT_01_skill-and-reads.md]]`, ending in a
newline; the return block.
