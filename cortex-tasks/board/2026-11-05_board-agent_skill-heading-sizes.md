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

## On Completion

Notes in the main checkout's copy; one LOG line, `[board-agent] Skill heading sizes: … → Task: [[cortex-tasks/board/2026-11-05_board-agent_skill-heading-sizes.md]]`, ending in a newline.
