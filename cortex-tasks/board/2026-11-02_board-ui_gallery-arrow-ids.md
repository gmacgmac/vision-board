---
task_name: Gallery Arrowheads On Prefixed Ids
created: 2026-11-02
completed:
status: pending
categories: [board-ui]
type: implementation
model: standard
persona: Design-systems engineer — the gallery is the board's own patterns drawn the board's way, never a look-alike with its own names.
skills: [cortex-architecture]
tracker:
---

# Task: Gallery Arrowheads On Prefixed Ids

## Problem Statement

Since commit 83d1e84 every id the board owns starts `vb<n>-`. The gallery still draws its connectors'
arrowhead markers with the bare ids `arrow` and `arrow-hot`, so `apps/board/src/styles/board.css`
keeps `marker:is(#arrow, [id$='-arrow'])` and `marker:is(#arrow-hot, [id$='-arrow-hot'])` to colour
both. The gallery should draw them the way the board does, so the rules need only the board's names.

## Steps

1. Find where the gallery draws the markers (`git grep` `arrow` under `apps/board/src/gallery/` and the
   wires drawing it reuses). Find how the board names them (`mount-ids.ts` `takeIdPrefix`).
2. Make the gallery draw them with the same names the board's own drawing gives (reuse the board's
   code path or prefix; don't invent a third name). Then drop `#arrow` / `#arrow-hot` from the two
   `board.css` rules.
3. Gates at `nice -n 15`: `npm run map`, `npm run verify`, `npm run check`, `npm test`; the gallery page
   specs and any spec that names the arrows (`VB_TEST_WORKERS=3 VB_TEST_PORT=5010`); then the full page
   suite once. Screenshots must not move: a moved one is a finding, never re-baselined.
4. Look at the gallery's connector sections in a browser from this worktree (port 5020), light and dark.

## Files Involved

| File | Purpose |
|------|---------|
| `apps/board/src/gallery/**` | Where the gallery draws markers |
| `apps/board/src/styles/board.css` | The two marker rules |
| `tests/pages/**` | Only if a spec names the bare arrow ids |

## Constraints

- Work only in the worktree you are given (branch `feat/gallery-arrows`). No commits, no git history.
- Never port 4466, never 4600–4999 (other runs). Tests `nice -n 15`, at most 3 workers.
- No protected files (`.kiro/steering/*`, `AGENTS.md`, `CLAUDE.md`, `docs/principles.md`, `packages/tokens/`, `docs/decisions.md`).
- Don't write `cortex/LOG.md` or `cortex/AUDITED.md`: the orchestrator logs.
- STOP and report if the fix needs more than the gallery and those two rules.

## Success Criteria

- [ ] No bare `arrow` / `arrow-hot` id on the gallery page; `board.css` names only the prefixed form
- [ ] Gates green, full page suite passes, no screenshot moved
- [ ] Looked at in light and dark; notes filled below

## Implementation Notes

_To be completed by the agent._
