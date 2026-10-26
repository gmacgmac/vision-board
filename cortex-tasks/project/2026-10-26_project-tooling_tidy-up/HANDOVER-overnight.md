# Handover: run the tidy-up overnight, Waves 2 to 8

> From the orchestrator on the first Mac, 2026-10-26. The maintainer is away until morning: work
> without asking, inside the limits below. Read this, then TASK-STATUS.md, then PLAN.md.

## Where things stand

- Worktree: `/Users/gm/Library/CloudStorage/Dropbox-Personal/Developer/web-apps/vision-board/.claude/worktrees/tidy`,
  branch `refactor/tidy`. Work only here; the main checkout runs the maintainer's board.
- Wave 1 is done and tagged `tidy/wave-1`. The last commit is `e9218f8` (the set refined against
  nclite's plugin contract, and principles § The board is a plugin).
- Next: Wave 2 (ARCH_01), then 3 (ARCH_02, UI_01, ARCH_04 in parallel), 4 (ARCH_03, ENGINE_01),
  5 (TEST_01), 6 (ARCH_05), 7 (ARCH_06), 8 (VERIFY_01), then close the set.

## Before you start

1. `git log -1 --oneline` shows `e9218f8` and `git status` is clean. If not, Dropbox has not finished
   syncing: wait and check again. If git cannot find the repository, stop and write that in the
   report (the worktree's `.git` file points to this absolute path).
2. `node -v` is v24 and `uname -m` is `arm64` (the synced `node_modules` were built there). If either
   differs, stop and report; do not reinstall.
3. Playwright's Chromium 1228 is in `~/Library/Caches/ms-playwright`. If it is missing, run
   `npx playwright install chromium` from the worktree (the project's pinned version).
4. `npm test` and `npm run verify` pass before Wave 2 begins.

## How to run it

- Run the `cortex-task-exe` skill in Parallel mode on `TASK-STATUS.md`, starting at Wave 2. Follow
  its protocol and the set's House Rules (PLAN.md): one sub-agent per task, the persona from the
  Task List pasted first, `contextFiles` = TASK-STATUS.md and PLAN.md, never pasted task text.
- Name the model on every dispatch: `strong` → Opus 5.5 (`opus`), `standard` → Sonnet 5.5 (`sonnet`).
- Each task's page-test port is in its Notes column. Never port 4466. Run gates from outside the
  worktree with `npm --prefix <worktree>`; no `cd path &&` in Bash.
- The wave gate: every request routed; `npm test`, `npm run verify`, `npm run check`,
  `node scripts/gen-api.mjs --check`, the full page suite (`VB_TEST_PORT=<port> npm run test:pages`,
  about 15 minutes); then `npm run map`.
- **The maintainer authorises, for tonight only:** after a wave's gates are green, commit that wave
  and tag it `tidy/wave-N`, as the House Rules say. Commit messages end with the co-author line.
  Never push, never amend or rebase an earlier commit.

## When to stop

Stop the pipeline (finish the wave in flight, start no new wave, commit nothing unfinished) when:

- a sub-agent returns `BLOCKED` or `DEVIATION`;
- a gate stays red after one fix attempt by the task's own sub-agent;
- a request needs a protected file: the steering file, `AGENTS.md`, `CLAUDE.md`, `docs/principles.md`,
  the design tokens, or an existing `docs/decisions.md` entry;
- anything would need a decision only the maintainer can make (wording, a new pattern's look, the
  contract with nclite).

Never write in `~/ai/nclite` (read only). Never write `cortex/AUDITED.md`. No PII in anything written.

## The morning report

Keep `OVERNIGHT-REPORT.md` in this folder current as you go, so a stop mid-night still leaves it true:

- each wave: done or not, its commit and tag, the gate results with counts;
- what stopped you, if anything, and exactly what the maintainer must decide;
- requests routed, and anything a sub-agent caught beyond its brief;
- what was not checked by eye: "done" includes a look in light and dark, which page-test screenshots
  stand in for overnight. List the screens the maintainer should look at.

Points the maintainer may answer go in one numbered list; the conversation's numbering continues
from 287. One point per number, the question last.

When Wave 8 closes the set, follow TASK-STATUS § On Completion, including step 4: remind the
maintainer that search (tracker M7) is next.
