# BE_01_flow-branching-and-direction: Flow Branching and Direction

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Make a linked sequence inside a container branch into rows instead of sending its links round the cards, and let
the person choose whether sequences run across or down.

---

## Context

PLAN.md § Decisions 19, 20 and § Planner's call 7 (tracker N51, N52). The maintainer's example: a container "From
idea to production line" with seven cards in one line and a side branch from the second card; the links run over
and under the cards to reach cards further along. What is known (`CODE-MAP.md` § 9): `row` and `column` place
cards in card order and ignore links; `flow` layers by links, left to right only, and stacks a fork's branches in
the next column; the router goes round cards only inside one container. So the picture is most likely a `row`
container with links. Layout is a pure function; keep it one.

**Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: `packages/layout/src/` (`modes/`, `board.ts`, `types.ts`, `layers.ts`, `route/`),
  `packages/layout/tests/`, `packages/format/src/flags.ts` (one flag for the branching rule),
  `apps/board/src/board/canvas/` (pass the options), `apps/board/src/board/chrome/` (the toolbar control),
  `apps/board/src/board/words/`, `apps/board/tests/`, `tests/pages/`, `docs/specification/components.md`
- **Files to reference**: `CODE-MAP.md` § 9; `packages/layout/src/route/frame.ts` (one direction, mirrored or
  rotated); `packages/layout/src/structure.ts` (`show_layout`'s answer); how the page keeps a board's zoom
  (`keepView`, `docs/specification/plugin.md` § store); `.kiro/steering/svelte-conventions.md`
- **Skills**: `cortex-architecture`, `cortex-docs`

> Modify only the files this task owns. Need a change elsewhere? List it under `REQUESTS`.

---

## Steps

1. [ ] **Reproduce first**: a layout test with the example's shape (seven cards in card order; links 1→2, 2→3,
       3→4, and a branch 2→5, 5→6, 6→7 that rejoins 4) in `row`, `column` and `flow`. Record in your notes what
       each draws and where a link passes round a card. This failing picture is the test.
2. [ ] **The rule** (behind its own flag, off): in `row` and `column`, when the cards' links are more than a
       simple chain in card order, the container is laid out by the flow rules in that direction, so a fork
       continues as parallel rows (or columns) and links run in the gaps between them. A `row` or `column` with no
       links, or a plain chain, draws exactly as today. If your findings point to a different cause or rule, stop
       and report before building.
3. [ ] **In `flow`**: each branch of a fork keeps its own straight row to its end; a branch that rejoins comes back
       with one clean link. Fix what the reproduction shows; routing round a card remains only where no gap
       exists.
4. [ ] **Direction** (flag `flowDirection`): a layout option `across` or `down` for linked sequences. `flow` in
       `down` layers top to bottom. The router and labels work in both.
5. [ ] **The choice**: a toolbar control, Rows or Columns, kept per board by the page as its zoom is kept (the
       host's store under a host), not written to the ledger. It redraws in place.
6. [ ] `show_layout`'s answer to an agent stays true for what is drawn, in both directions.
7. [ ] Tests: the reproduction now passes; no-overlap, routing and timing tests in both directions; a page spec
       for the control. Update `components.md`.

---

## Validation

- [ ] `npm run verify`, `npm run check`, `npm test` (with `test:timing`) pass
- [ ] With both flags off every layout test and page screenshot is unchanged
- [ ] With them on: in the example no link crosses or rounds a card, and the same view always draws the same
      picture (determinism test)

---

## Constraints

- If you need to deviate, stop and tell the maintainer; no breaking change is made silently.
- No PII in examples. Interim files in `temp/`. Writes over 50 lines in chunks.
- No git command that changes state; the orchestrator commits.
- Every flag this set adds stays off by default; existing tests and screenshots pass with them off.
- A problem outside this task is reported (`REQUESTS`, `NOTES`), never fixed here.

---

## Implementation Notes

_To be completed by agent after task completion._
_Re-run? Add a `### Run N` block below the last one; never overwrite an earlier run._

**Status**: Pending  
**Completed**: YYYY-MM-DD HH:MM  

### Changes Made
- 

### Issues & Resolutions
- 

### Caught Beyond the Brief
- None / [what you noticed that this task didn't ask about]

### Deviations from Plan
- None / [Describe if any, and why approved]

---

## On Completion

1. Fill in Implementation Notes above; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append **your own** LOG entry to `cortex/LOG.md` — one line, terminated with a newline, append-only:

   ```
   [[YYYY-MM-DD HH:MM]] [board-layout] BE_01: [what you did] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/BE_01_flow-branching-and-direction.md]]
   ```

   Cite files by path + symbol, never by line number. Never write the set's entry or to `AUDITED.md`.
