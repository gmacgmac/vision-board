---
task_name: Gallery Without Repeats
created: 2026-11-02
completed: 2026-11-02
status: completed
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

- [x] No id twice on the gallery page, proven by a spec
- [x] Every pattern state from `pattern.json` still shown; the decisions table in the notes
- [x] Gates green, full page suite passes; moved screenshots named
- [x] Looked at in light and dark

## Implementation Notes

**Cause.** The fixture numbers its cards and containers once, and many samples draw the same card or
frame (as context for a bar, a bubble, a notice, a connector layer). A card's popover, step-section and
app-menu ids and a frame's ids come from the item number / container id, so 64 ids were on the page more
than once (1506 `[id]`, up to 12 copies of `vb-steps-1`; also `region-n-answered*`, `region-flagged*`,
`gallery-proposals-title`, `gallery-review`, `vb-app-menu-83`).

**Change.** `gallery/dom.ts` `ownIds()` (takeIdPrefix, as `mini-board.ts` did; `mini-board.ts` now uses it
too) is passed as `idPrefix` to every `vb-node` / `vb-region` `render` in the gallery (21 section files),
and as `ids` to the proposals notice (`ProposalsBar`). No new naming scheme; the suffix ids some samples
already carry (`-past`, `bubble-`, `rail-`) stay. After: 0 ids twice (1506 ids), 0 dangling
`aria-controls`/`aria-labelledby`/`aria-describedby`/`for`, and every card's and frame's references point
inside itself (922 checked).

**Decisions (step 2).** Every exact repeat of a card is a different state of the *surrounding* pattern,
so all are (b): kept, each with ids of its own. No sample was dropped, so nothing a `pattern.json` lists
lost its only sample (step 3); no screenshot moved.

| Sample | Pattern / state | Kept or dropped | Why |
|---|---|---|---|
| node / Other states: item 30 pinned, item 37 note | node, pinned / plain | kept | wire section draws the same card as context for connector layers |
| node / Other states: items 36, 37 | node | kept | selection bar draws them as the selected cards under it |
| selection-bar: items 36, 37 in 3 to 4 samples | bar: pill closed, open, hover, area bar | kept | one bar state each; the cards are only the context |
| note-bubble: items 1, 4, 5 twice | bubble: new, edit, error, sent, thread latest / first | kept | one bubble state each (e.g. thread opened at latest vs older note) |
| proposals: item 4 in The tab, notice, pill, Review at rest, Review in focus | tab, notice, pill, review list | kept | five different states of the proposal pattern |
| node: item 5 / 35 / 1 twice, `vb-app-menu-83` twice | node, open vs. cleared by the agent's reply, selected | kept | different node states (the node spec counts them, D-045) |
| region / Parking and replies / Lock / Remove: `region-n-answered`, `region-flagged` | region frames | kept | different samples of the frame, now with own ids |

**Spec.** `tests/pages/gallery.spec.ts`: new test "no id twice on the page, and every reference points at
one". Its region test read `region-frame-grid-modes` by name; it now reads the popover's own id
(`vb<n>-region-frame-grid-modes`). Doc: `docs/specification/components.md` (gallery paragraph).

**Gates** (all `nice -n 15`). `npm run map` no change; `npm run verify` ok (31 warnings, all existing,
`gallery.spec.ts` now 318 lines, was 306, warn only); `npm run check` 0 errors; `npm test` 2187 + 14 pass.
Gallery spec: 23 pass. Full page suite at 3 workers, port 5010: 832 pass, 2 fail, 10 not run. The two
failures were `host-styles.spec.ts` pixel-tolerance checks (`mostApart` 3 > 2 under load: "550px pane
(light)", "gallery samples (dark)"); the file alone, one worker: 8/8 pass. The 10 not run were the
performance budgets, which wait on the first project; run alone (`--no-deps perf.spec.ts`): 11/11 pass.
No screenshot moved, none re-baselined.

**Browser** (port 5100, light and dark): node, proposals, note-bubble sections look as before (console errors fail the page specs, which passed).

