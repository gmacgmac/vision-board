# ANSWER_01: `answered` names what answered a note, not its words

**Skills**: cortex-architecture · **Model**: standard · **Point**: 402 · **Decision**: D-083 point 4

## Objective

An agent's read marks an answered note with what answered it and where, never the reply's words (they are on the
board). When unsure what a note said or what answered it, the bot reads the card.

## Steps

1. Failing test first: a reply-answered note reads `answered: { kind: 'reply', seq }`, no `text`
   (`apps/board/tests/bot-tool-rules.test.ts` or the `noteAnswer` tests in `packages/actions`).
2. `packages/actions/src/note-answer.ts` `NoteAnswer` / `noteAnswer`: drop `text`. Callers (`caller-marks.ts`) follow.
3. Contract: `$defs/noteAnswer` in the format schema; `openapi.json` version up (1.40.0 → 1.41.0), regenerate
   (`npm run gen-api`); `docs/specification/api.md` point 172 updated (no new point).
4. `skills/vision-board/SKILL.md`: one line where `answered` is taught: unsure what a note said or what answered it,
   read its card with `show_node`. Version line v3.27 (2026-11-03). Check the plugin's instruction edit in
   `apps/board/plugin/words/` still matches (the build stops if an edit doesn't match once).
5. Eval: `npm run eval:bot` for the scenarios that cover notes (`answered-note`, `two-turns`), each twice, `--max-usd 1.5`,
   `--port 7050`. Read `tests/evals/bot/run.ts` for the exact options. Every check must pass; report runs and spend.

## Validation

`npm run verify`, `npm run gen-api` (current), `npm run check`, unit tests, `npm run test:plugin`; all `nice -n 15`.

## Constraints

No commits, no LOG, no PII. Your worktree only. Anything outside File Ownership goes in `REQUESTS`.

## Implementation Notes

- `NoteAnswer` reply kind is `{ kind: 'reply', seq }` (`packages/actions/src/note-answer.ts`); `caller-marks.ts` needed no change (it passes the value through).
- Contract: `$defs/noteAnswer` reply branch has no `text`; `info.version` 1.40.0 to 1.41.0 (`openapi.json`, `openapi.test.ts`); `npm run gen` run, `--check` current. `api.md` point 172 updated (no new point).
- `SKILL.md` v3.27: one line under "Answer a note once": `answered` says what and where, never the words; unsure, read the card with `show_node`. The plugin's skill edits in `apps/board/plugin/words/` did not touch that text; `build-plugin.ts` ran without error (eval build, `test:plugin`).
- Test (`bot-tool-rules.test.ts`, TOOLS_02 test): expectations now `{ kind: 'reply', seq }`. The test was edited first, so it failed against the old output by `deepEqual`; not run red before the code change.
- Verification: `npm run verify` ok (warnings only, none new); `npm run check` 0 errors; unit tests 2200 pass; `test:plugin` 79 pass; `eval:bot --only answered-note,two-turns --repeat 2 --max-usd 1.5 --port 7050`: 4 runs, 22/22 checks, $0.3302 (report `tests/evals/bot/out/2026-11-03T08-56-49-015Z/report.md`). Dry run before it: 11/11.
- Not run: `test:pages` (nothing the page draws changed; the person's read is unmarked).

