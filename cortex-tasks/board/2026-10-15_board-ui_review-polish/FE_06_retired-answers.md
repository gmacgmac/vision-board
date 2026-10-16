# FE_06_retired-answers: The retired marker's answers

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

The past version a container's "N cards retired" marker opens shows the person's answers as they
stood when those cards were retired, still read-only (tracker N42).

## Context

PLAN.md ruling 10 and "Decisions inside the rulings" 10. Found by the answer model's VERIFY_01
(problem 6): Kiro's board, "5 cards retired" opened v8, the first draw, reading "0 of 4 answered"
though all four were answered before the retire. Today `retired.ts` `retiredCounts` picks the latest
run before the latest retire (`runs.filter((r) => r.seq < last).at(-1)`), the marker carries it as
`data-version`, `wiring.ts` `bindStage` calls `h.showVersion(seq)`, and `versions.ts` `show` folds
the ledger up to that run's line (`linesTo`, `foldLedger`). Acts after that line are not folded.
A run's `seq` is the last line of one agent's unbroken drawing lines (`packages/actions/src/rounds.ts`),
so a batch that writes a summary card and then retires is one run, and the version opened is the
run before it.

## Inputs

- **Files to modify**: `apps/board/src/board/retired.ts` (`RetiredCount`, `retiredCounts`: add the
  line to fold the answers to), `apps/board/src/board/versions.ts` (`Versions.show`, `linesTo`:
  fold the view's drawing as at the version and the person's acts up to the cut),
  `packages/ui/src/region/region-core.ts` (`RegionRetired`, `retiredMarker`) and
  `packages/ui/src/region/vb-region.ts` (`applyRetired`: carry the cut, e.g. `data-until`),
  `apps/board/src/board/wiring.ts` (the `button.vb-region-retired` branch and `StageHandlers.showVersion`),
  `apps/board/src/board/controller.ts` (`showVersion`).
- **Files to reference**: `packages/actions/src/fold.ts` (`foldLedger`, `BoardRun`,
  `DRAWING_EVENTS`), `packages/actions/src/reads.ts` (`boardVersions`),
  `apps/board/src/shell/VersionBanner.svelte`, `apps/board/src/gallery/retired-section.ts`.
- **Tests to extend**: `apps/board/tests/retired.test.ts`; `tests/pages/versions.spec.ts`,
  `flag-retire.spec.ts`.
- **Not yours**: the rest of `wiring.ts` (FE_04 changes the note branches in wave 2).

## Steps

1. [x] **Failing tests first.** Unit (`retired.test.ts`, a ledger built in the test): a container
   drawn at v1 with four cards that ask; the person ✓ or ✗ on all four; the agent retires two (one
   batch, each its own `retire` line, with a summary card written before the retires in the same
   batch). The marker's past view shows v1's cards (not the summary) with the four answers, "4 of 4
   answered". Also: an agent `reply` before the retire that cleared a ✓ (D-045) shows the card open;
   a ✓ on a card the agent redrew after v1 (a `ver` the past view does not draw); cards retired over
   two rounds; the person's own retire (D-044). Page (`versions.spec.ts`): press the marker, read
   the answers and counts, light and dark; still read-only (`ACTING` guarded).
2. [x] Build: the cut is the first `retire` line on that board after the version's run (the one that
   took the first of these cards); the past state is the ledger to just before the cut with every
   drawing line (`DRAWING_EVENTS`) after the version's run left out, folded with `foldLedger` as
   today. One pure function in `retired.ts` or `versions.ts`, unit-tested; `versions.ts` keeps
   reading the ledger page by page (`linesTo`).
3. [x] Toolbar dropdown versions (not from the marker) are unchanged: they still show the answers as
   at that version. Test it.
4. [x] Docs: `docs/specification/components.md` § Navigation (the marker's past view), the gallery's
   retired section description.

## Validation

- [x] The step 1 tests failed before the build and pass now; the dropdown test passes.
- [x] The five gates exit 0, one after another.

## Constraints

- Read-only stays read-only (`versions.ts` `guard`, `ACTING`). No action-layer or contract change;
  if one turns out necessary, stop and say so.
- If deviation is needed, stop and say so. No git commits. Never touch `.visionboard/`; don't use the
  board on 4466. One page-test run at a time.
- Fill Implementation Notes below and append your own LOG line.

## Implementation Notes

**Status**: Completed (2026-10-16)

- **Build** (decision 10 as written): `retired.ts` `RetiredCount.until` = the first `retire` line on
  the board after the marker's version (a card's or a whole container's, the agent's or the
  person's; `retireLines`). `pastLines(events, board, version, until)` is the one pure function:
  every line before `until` but the board's `DRAWING_EVENTS` lines after `version` (a link's board
  is its `from` card's). Other boards keep their drawing, so an act on a card drawn there meanwhile
  still folds (`seeCards` needs the node). `versions.ts` `show(seq, until?)` reads on to `until - 1`
  (`linesTo`, page by page) and folds `pastLines`; without `until` (the dropdown) it is unchanged.
  The cut rides `retiredMarker(count, version, until)` → `RegionRetired.until` → `vb-region`
  `data-until` → `wiring.ts` `showVersion(seq, until?)` → `controller.ts` `showVersion`. Read-only
  untouched (`guard`, `ACTING`); no contract or action-layer change; banner wording unchanged.
- **Tests first**: `retired.test.ts` 5 new tests (summary in the batch and another board meanwhile;
  a reply that cleared a ✓; a ✓ on a version the past view does not draw; two rounds; the person's
  retire) failed on today's fold (`0 of 4 answered`) and pass; 2 existing tests gain `until`.
  `versions.spec.ts` new page test (marker → v1's four cards ✓/✗, "4 of 4 answered", light and dark
  with axe, no act sent; then the same version from the dropdown: all open, "0 of 4 answered")
  failed before the wiring passed `until` and passes. `flag-retire.spec.ts`: `data-until` and the
  past view's ✓. `region-core.test.ts`: `until` rides only with a version.
- **[INFERENCE]** The "✓ on a ver the past view does not draw" case cannot come from the marker's
  own version (any agent drawing between the version and the cut would itself be a later version),
  so it is tested through `pastLines` with v1 chosen; it folds without error and shows the ✓.
- **Outside the list**: `apps/board/src/board/render.ts` (passes `gone.until`, one line);
  `packages/ui/tests/region-core.test.ts` (two asserts). `docs/specification/api.md` 127 still says
  the marker opens "the board version just before" (true; it does not mention the answers): not edited.
- **Docs**: `components.md` § Navigation item 1; gallery retired description reworded to stay on one
  line (a wrap shifted 12 other gallery screenshots in the first run).
- **Screenshots**: only `flag-retire` `retired-light` / `retired-dark` changed (the description text;
  both diffs viewed). Five gates exit 0, one after another (450 page tests).

## On Completion

1. Fill Implementation Notes; set Status to `Completed`; update your row in TASK-STATUS.md.
2. Append your LOG line to `cortex/LOG.md` (one line, newline-terminated, append-only):
   `[[YYYY-MM-DD HH:MM]] [board-app] FE_06: <what you did> → Task: [[cortex-tasks/board/2026-10-15_board-ui_review-polish/FE_06_retired-answers.md]]`
