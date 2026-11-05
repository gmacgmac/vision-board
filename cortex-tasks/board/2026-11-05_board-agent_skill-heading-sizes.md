---
model: strong
skills: [cortex-architecture]
persona: Prompt engineer who treats instructions as code — every line earns its place by a scenario.
---

# Bot instructions: heading sizes under big titles (point 443)

> **Created**: 2026-11-05 · **From**: maintainer, point 443

## Problem

`skills/vision-board/SKILL.md` § Writing cards, Body: "A longer card may use `#` and `##` headings (large, medium)".
Since D-090 (`bigTitles`), a card whose body has a `#`/`##` heading or a table shows its title large and bold, and
body `#`/`##` draw medium: the title is the card's headline. A test (8 runs, Sonnet and Opus, v3.30) showed bots
already treat the title as the heading and start at `##`; the line should say what the board does, so no bot writes
a `#` that repeats the title.

## Steps

1. The Body line (and the summary-card line if it needs it) say: the title is the card's headline and shows large
   on a structured card; parts take `##`; `###` is a small label. Keep it short. SKILL v3.31, status line, NOTES.md.
2. Plugin edits follow (`apps/board/plugin/words/skill-edits.ts`, `apps/board/tests/plugin-skill.test.ts`).
3. `npm run eval:bot` and `npm run eval:bot -- --standalone` (Sonnet default): pass, with the `summary-card` scenario
   checking that no card body's first heading repeats its title (add that check if missing; a dry test for it).
   Budget: $5 for both modes together, stop at it; time limit 20 min a mode. The known narration flake (about 1 in
   3 on `summary-card`, also on v3.29) is reported, not chased.

## Constraints

Worktree `.claude/worktrees/skill-443` (branch `feat/skill-443`, from main), `VB_TEST_PORT` 8500, the eval's door
6010. Never port 4466, the repo's own `.visionboard/`, or `node_modules`. No git commits. Writes >50 lines in chunks.

## Implementation Notes

**Status**: completed 2026-11-05 (worktree `feat/skill-443`, uncommitted). Model `sonnet` for every eval run.

- **Skill v3.31**: the Body line says "A longer card's parts take `##` headings (the title above them shows large)";
  `###` stays in the small-labels list. The summary-card line already said `##` per part: unchanged. Status entry
  short: "a card's parts take `##`, under its large title". NOTES.md § Skill v3.31; scenarios.md 43 and a v3.31 line.
- **Plugin**: no skill edit touches the Body line, so `skill-edits.ts` is unchanged; `plugin-skill.test.ts` has a v3.31
  test (both skills carry the line, neither the old "(large, medium)") and the v3.30 test's kept string moved.
- **Eval**: `summary-card` gained `title-not-repeated` (the first body heading, any level, compared as words with the
  title); the bad fake opens with `### Venue: the cabin` and lists it in `badFails` (the dry test, `bot-eval.test.ts`).
- **Results** (spend $4.42 of $5 in all): baseline v3.30 `summary-card` ×3: the new check 3/3. Plugin suite on the
  first wording 73/75 (narration in `where-cards-stand`, `new-card-number`), repeat of those and `summary-card` ×2:
  42/42; final wording `summary-card` ×2: 13/14 (the known narration). Standalone final: 18/19 (`ledger-picture`
  narration). `title-not-repeated` 5/5 on v3.31.
- Tests: `plugin-skill.test.ts` 9/9, `bot-eval.test.ts` (dry, both modes) 6/6, `tsc --noEmit` clean, `npm run verify` ok.

### Caught Beyond the Brief

- The first wording ("The title is the card's headline: …") with a long status entry made standalone `join-ledger`
  fail `one-line` 5 of 12 (two lines, or "Which one do you want me to use?"), against 7 of 7 on v3.30 and 4 of 4 with
  the new Body line under the old status; the short status entry: 3 of 3. The status line is not inert text.
- Standalone `ledger-picture` narrated 3 of 5 on v3.31 wordings vs NOTES' ~1 in 6 on v3.30; not baselined (budget).
  Worth a check before the next skill change.

## On Completion

Notes in the main checkout's copy; one LOG line, `[board-agent] Skill heading sizes: … → Task: [[cortex-tasks/board/2026-11-05_board-agent_skill-heading-sizes.md]]`, ending in a newline.
