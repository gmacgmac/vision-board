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

