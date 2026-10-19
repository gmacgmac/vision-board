# VERIFY_01_testing: Final verification

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

Prove PLAN.md's success criteria with evidence and audit the docs this set touched.

## Context

**Read every task's notes in TASK-STATUS.md first.** Don't touch the maintainer's server on 4466.

## Steps

1. [ ] `npm test`, `npm run check`, `npm run verify`, and the full `npm run test:pages` once under
   the lock with nothing else running; report every failure with its cause (compare with a clean
   `git worktree` of HEAD under `temp/` when unsure; remove it after).
2. [ ] Walk the criteria in a browser on your own port: a multi-step app (the calculator) keeps its
   place through zoom out and in, panning away, a reload; a frozen panel can't be clicked or tabbed.
3. [ ] Security checks on the state route (oversize, bad id, foreign Origin, agent reads).
4. [ ] Doc audit with `cortex-docs`: apps.md, api.md, components.md, performance.md, SKILL.md.
5. [ ] Tick PLAN.md's criteria with evidence in TASK-STATUS.md. Don't edit `docs/decisions.md`
   (D-050 waits for the maintainer's yes) and don't flip the set's frontmatter.

## Validation

- [ ] Every criterion ticked with evidence or reported

## Constraints

- If deviation is needed, stop and ask the maintainer — no silent breaking changes.
- No PII in examples or fixtures. No git commits during execution.
- Protected files (steering, `docs/decisions.md`, `docs/principles.md`, tokens): propose, don't edit.
- The maintainer's board on port 4466: never stop, restart or kill it, or any process you didn't
  start. Page tests under the lock: `until mkdir temp/pages.lock 2>/dev/null; do sleep 10; done; …; rmdir temp/pages.lock`.
- Use the Bash tool's working directory rather than `cd path &&`; writes over 50 lines in chunks.

## Implementation Notes

**Status**: Completed  
**Completed**: 2026-10-19

### Changes Made
- Ran every suite (`npm test`, `npm run check`, `npm run verify`, `npm run test:pages` under the lock): all pass,
  573 page tests. Walked the criteria in Chromium on port 4489 (calculator keeps its place through zoom, pan and
  reload; frozen panel inert) and ran the state route's security checks. Ticked PLAN.md's criteria; evidence in
  TASK-STATUS.md. One garbled sentence in `docs/specification/components.md` reworded. Doc audit (apps.md, api.md,
  components.md, performance.md, SKILL.md): every symbol named exists (`LIVE_PANELS` 8, `SAVE_DELAY_MS`,
  `LOAD_WAIT_MS`, `SAVE_WORDS`, `checkSave`, `renderKeepingPanel`, `overCap`, `APP_STATE_KEY`, `appStateProblem`,
  `stateBytes` 64 KiB) and every test named exists and passes.

### Issues & Resolutions
- `apps/board/README.md` (a flagged doc, so not edited) still says app frames are "loaded only on screen and zoomed
  in enough, ruling 14": stale after D-050 (proposed); for the maintainer.
- `io.ts` is 301 lines (HEAD 293): a new `verify` length warning (not a failure).
- A GET of the state route with a foreign Origin is answered like every GET (Origin is checked on writes, Host on
  all); a foreign page can't read it (no CORS headers). Reported, not changed.

### Deviations from Plan
- None

## On Completion

1. Fill in Implementation Notes; set **Status** to `Completed`.
2. Update your row and your notes section in [TASK-STATUS.md](./TASK-STATUS.md).
3. Append **one** line to `cortex/LOG.md` (ending in a newline):
   `[[YYYY-MM-DD HH:MM]] [board-app] VERIFY_01: [what you did] → Task: [[cortex-tasks/board/2026-10-19_board-app_app-state-kept/VERIFY_01_testing.md]]`
