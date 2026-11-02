---
task_name: Plugin Skill Images Section
created: 2026-11-02
completed: 2026-11-02
status: completed
categories: [board-agent]
type: implementation
model: standard
persona: Developer-experience writer for AI agents — an instruction names exactly where and how, in the fewest words, and never tells a bot something the host can't make true.
skills: [cortex-architecture]
tracker:
---

# Task: Plugin Skill Images Section

## Problem Statement

Point 377.1 (2026-11-02): under a host the whole board folder lives in the bot's workspace, so a bot
writes pictures straight into the board's `images/` folder and the engine reads them with its usual
checks. The plugin's skill (`dist/plugin/board/skill.md`, built from `apps/board/plugin/skill.ts` and
`apps/board/plugin/words/skill-edits.ts`) has no Images section for a host yet; `plugin.md` open point 1
says "Not done yet".

## Steps

1. Read `docs/specification/plugin.md` § Where the board lives in nclite and open point 1, the standalone
   skill's Images section (`skills/vision-board/SKILL.md`), `apps/board/plugin/skill.ts`, `skill-edits.ts`,
   and how `engine.image` finds a picture (`<dir>/images`, `imagePathProblem`, `imageHeadProblem`, size limit).
2. Give the plugin's skill an Images section: reuse the standalone one's words where they hold; name the
   folder the way the host can make true (relative to the board folder, which the host tells the bot), the
   formats and limits the engine checks, and how a card names a picture. Words live in the skill's words
   files, not code. Keep it short.
3. Update `plugin.md` open point 1 to done. Tests: the existing skill/plugin build tests, extended to
   assert the section is there and names no host. Gates at `nice -n 15`: `npm run verify`, `npm run check`,
   `npm test`, `npm run test:plugin` (`VB_TEST_WORKERS=3 VB_TEST_PORT=5010`).

## Constraints

- Work only in the worktree you are given (branch `feat/skill-images`). No commits, no git history.
- Never port 4466 or 4600–4999, 5200–5399. Tests `nice -n 15`, at most 3 workers.
- No protected files. Don't edit `skills/vision-board/SKILL.md` (the standalone skill). Don't write `cortex/LOG.md` or `cortex/AUDITED.md`.
- Don't touch `apps/board/server/`, `packages/actions/` or `apps/board/src/board/` (another task owns them).

## Implementation Notes

- `apps/board/plugin/words/skill-edits.ts`: the Images edit now puts in `IMAGES` (the standalone section's words, the folder named
  "the `images/` folder of the board folder your host names", paths inside `images/`, formats, 8 MB / 1 MB, 8 deep, alt text,
  no internet address, overwrite to change, svg size and short CSS motion). Left out: `.visionboard/` and the app-card sentence.
  The front matter keeps "It also shows pictures inside a card." `skill.ts` header comment updated.
- `docs/specification/plugin.md`: open point 1 marked Done; "Words differ per host" no longer lists the images folder as taken out.
- `apps/board/tests/plugin-skill.test.ts`: the old "no Images section" assertion removed; new test holds the section's wording, the
  engine's `IMAGE_LIMITS` numbers, and that it names no host, `.visionboard`, app or upload tool.
- Gates (nice 15): `npm run verify` ok (warnings only, none new), `npm run check` 0 errors, `npm test` 2205 pass, `npm run test:plugin` 79 pass (3 workers, port 5010).
- Note: svg is told as available (the `svgImages` flag is on by default); a host that turns it off, which plugin.md already says to pass to `createEngine`, makes a bot's svg "Image not shown".
