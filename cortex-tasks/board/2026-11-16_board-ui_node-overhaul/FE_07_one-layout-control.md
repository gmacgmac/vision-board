# FE_07_one-layout-control: One Layout Control

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Replace a container's strip of layout buttons with one control that shows the active layout and opens the others,
behind `layoutControl`, and give the maintainer a page to compare the six layouts.

---

## Context

PLAN.md § Decision 20 (tracker U16). Today a container draws one button per mode (`modeButton`, six `MODES`) in its
rail or top line and collapses them by container queries; a popover of mode tiles already exists (`modePopover`,
`.vb-mode-pop`, `.vb-mtile`) (`CODE-MAP.md` § 8). No mode is removed: which stay is the maintainer's decision after
trying them.

**Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: `packages/ui/src/region/` (template, core, styles, `region-row.ts`, `region-layout-tip.ts`,
  `pattern.json`), `packages/ui/src/words/region.ts`, `packages/ui/tests/`, `apps/board/src/board/canvas/`
  (`draw.ts`, `render.ts`: pass the flag), `apps/board/src/board/input/wiring.ts`, `apps/board/src/gallery/`,
  `tests/pages/`, `docs/specification/components.md`
- **Files to reference**: `CODE-MAP.md` § 8; `region-narrow.css` and `region-rail.css` (the collapse rules);
  `apps/board/src/board/canvas/places.ts` (`setMode`)
- **Shared artifacts to reuse**: the menu pattern and icons (FE_01)
- **Skills**: `cortex-architecture`, `cortex-docs`

> Modify only the files this task owns. Need a change elsewhere? List it under `REQUESTS`.

---

## Steps

1. [ ] With `layoutControl` on, the rail (or top line) shows one button: the active layout's icon, named "Layout:
       Flow". A click opens the existing tile popover with every mode; a pointer resting on it for a moment opens
       it too, never at once. Choosing a tile records the `mode` act as today and closes it.
2. [ ] Keyboard and screen reader: the button says it opens a menu and what is chosen; arrows move between
       tiles; Escape closes and returns focus.
3. [ ] The other tools (card widths, Comment, settings) stay; the collapse rules get simpler, since one button
       replaces six. Below `FAR_K` the control follows today's far rules.
4. [ ] The popover keeps one size at any zoom (the menu pattern's rule).
5. [ ] **A page to compare layouts**: a gallery section that draws the same eight linked cards in each of the six
       modes side by side, so the maintainer can decide which to keep. Name it in your return block.
6. [ ] `pattern.json`, gallery, unit tests, page specs with the flag on, light and dark.

---

## Validation

- [ ] `npm run verify`, `npm run check`, `npm test` pass; `layout-controls.spec.ts`, `layout-tiles.spec.ts`,
      `layout-tooltip.spec.ts`, `container-rail*.spec.ts` pass with the flag off and no new baseline
- [ ] With the flag on, a container at every width and zoom shows exactly one layout button, and every mode can
      be chosen by pointer and by keyboard

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
   [[YYYY-MM-DD HH:MM]] [board-ui] FE_07: [what you did] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/FE_07_one-layout-control.md]]
   ```

   Cite files by path + symbol, never by line number. Never write the set's entry or to `AUDITED.md`.
