# FE_05_zoom-groups: Zoom Groups

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Make every part of the board follow one written rule for zoom: it scales, it keeps one size, or it scales but
never below a minimum.

---

## Context

PLAN.md § Decision 10 (tracker U15). Today (`CODE-MAP.md` § 6): the world scales; a container's title line and rail
counter-scale with `--vb-zoom`, written on the regions layer only; overlays sit on the stage in stage pixels; below
`FAR_K` the `hideControlsZoomedOut` flag hides card controls. The mockup's section "Menus stay the same size at any
zoom" and its 40% view show the target. Reuse the one mechanism (`--vb-zoom` and stage overlays); add no second.

**Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: `apps/board/src/board/canvas/viewport.ts`, `apps/board/src/board/notes/` (placing the
  conversation), `apps/board/src/styles/`, `packages/ui/src/node/` styles (the marks' minimum), `packages/ui/src/node/pattern.json`,
  `apps/board/tests/`, `tests/pages/` (`zoom-*.spec.ts` and a new spec), `docs/specification/components.md`,
  `docs/specification/performance.md`
- **Files to reference**: `packages/ui/src/region/region.css` and `region-rail.css` (the counter-scale);
  `packages/ui/src/selection-bar/selection-bar-core.ts` (`pillGap`); `docs/specification/plugin.md` (a host's page);
  T_02's minimum-size token
- **Skills**: `cortex-architecture`, `cortex-docs`

> Modify only the files this task owns. Need a change elsewhere? List it under `REQUESTS`.

---

## Steps

1. [ ] Write the rule as a table in `components.md`: every part of the board in one of the three groups, with the
       mechanism that holds it. Parts already right are listed as they are.
2. [ ] **Edge marks** (with `nodeEdges` on): below the zoom where a mark would draw smaller than T_02's minimum,
       the mark grows in place, so the disc, the icon tile and the notes mark stay on one vertical line and the
       number and badge stay on their corner. Marks stay visible below `FAR_K`; the body's controls follow today's
       far rules.
3. [ ] **The conversation box** scales with the board (it is the one overlay that does), stays attached to its
       node while zooming and panning, and its field stays usable down to the zoom where text is too small to
       read, where it keeps a readable minimum.
4. [ ] **Menus and the selection bar** keep one size and stay attached while zooming (FE_02 built this; add the
       tests here if any are missing).
5. [ ] **Cost**: zooming must not lay out every node on every frame. Measure a 1,000-card board before and after
       (the existing timing tests and `performance.md`'s budgets) and record the numbers.
6. [ ] A hosted board: run `npm run test:plugin`; nothing here may read the window's size or a host's properties.

---

## Validation

- [ ] `npm run verify`, `npm run check`, `npm test`, `npm run test:plugin` pass; `zoom-counter-scale.spec.ts`,
      `zoom-level.spec.ts`, `container-zoom.spec.ts` pass with the flags off and no new baseline
- [ ] A new spec holds, at 20%, 40%, 100% and 250%: mark sizes, the shared vertical line, a menu's size, the
      conversation's scale
- [ ] The timing numbers are in your notes and within `performance.md`'s budgets

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
   [[YYYY-MM-DD HH:MM]] [board-app] FE_05: [what you did] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/FE_05_zoom-groups.md]]
   ```

   Cite files by path + symbol, never by line number. Never write the set's entry or to `AUDITED.md`.
