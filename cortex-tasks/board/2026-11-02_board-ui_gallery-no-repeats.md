---
task_name: Gallery Without Repeats
created: 2026-11-02
completed:
status: pending
categories: [board-ui]
type: implementation
model: standard
persona: Design-systems engineer — the gallery shows each pattern and each of its states once, drawn the board's way, and is valid markup a screen reader can trust.
skills: [cortex-architecture]
tracker:
---

# Task: Gallery Without Repeats

## Problem Statement

The gallery page repeats ids: some samples draw the same card twice, so ids such as `vb-steps-83`
and `vb-pop-proposal-83` appear more than once (found by the gallery-arrows task, commit 2325275).
The maintainer wants the gallery coalesced: every pattern and every state it has (each pattern's
`pattern.json`) shown, nothing shown twice that adds nothing, and no id twice on the page.

## Steps

1. Load the gallery (`npm run board` from this worktree on port 5020, the gallery's address per
   `docs/specification/` or `apps/board/src/gallery/`) and list every repeated id with the sample that
   draws it: `[...document.querySelectorAll('[id]')]` grouped by id.
2. For each repeat decide: (a) two samples show the same pattern and state: keep one, drop the other;
   (b) two samples show different states of one card: keep both, give each its own ids the way the
   board does (`mount-ids.ts` `takeIdPrefix`, as `gallery/mini-board.ts` now does), never a new naming
   scheme. Record each decision in the notes as a short table: sample, pattern/state, kept or dropped, why.
3. Check nothing a `pattern.json` lists loses its only sample. Drop nothing else.
4. Add a page check that the gallery has no id twice (extend an existing gallery spec; search first).
5. Gates at `nice -n 15`: `npm run map`, `npm run verify`, `npm run check`, `npm test`, the gallery specs
   (`VB_TEST_WORKERS=3 VB_TEST_PORT=5010`), then the full page suite once. A gallery screenshot may move
   only where a dropped sample was; name each in the notes. Never re-baseline a board screenshot.
6. Look at the gallery in a browser, light and dark.

## Files Involved

| File | Purpose |
|------|---------|
| `apps/board/src/gallery/**` | The samples |
| `tests/pages/**` (gallery specs and their screenshots) | The no-repeat check; screenshots of dropped samples only |

## Constraints

- Work only in the worktree you are given (branch `feat/gallery-repeats`). No commits, no git history.
- Never port 4466, never 4600–4999 (other runs). Tests `nice -n 15`, at most 3 workers.
- No protected files; don't touch `apps/board/src/board/` or `packages/` (another task is changing them).
- Don't write `cortex/LOG.md` or `cortex/AUDITED.md`: the orchestrator logs.
- STOP and report if a fix needs a change outside the gallery, or if more than about a quarter of the
  gallery would be dropped.

## Success Criteria

- [ ] No id twice on the gallery page, proven by a spec
- [ ] Every pattern state from `pattern.json` still shown; the decisions table in the notes
- [ ] Gates green, full page suite passes; moved screenshots named
- [ ] Looked at in light and dark

## Implementation Notes

_To be completed by the agent._
