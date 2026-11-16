# FE_06_selection-bar-and-z: The Selection Bar and Z

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Make Z fill the screen with any selection, and give the selection bar its place and its new commands.

---

## Context

PLAN.md § Decision 9 (tracker U17, U18). `zoom-selection` (key Z) already fits the union box of every selected card
(`apps/board/src/board/selection/selection-flow.ts` `zoomTo`), yet the maintainer reports that Z does not work with
several nodes selected. The cause is not established: find it before changing anything. The bar is the
`vb-selection-bar` pattern, placed by `placeBar` above the selection (`CODE-MAP.md` § 7).

**Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: `apps/board/src/board/selection/`, `apps/board/src/board/input/` (`commands.ts`, `keys.ts`),
  `apps/board/src/board/words/commands.ts`, `packages/ui/src/selection-bar/` (and its `pattern.json`),
  `packages/ui/src/words/selection-bar.ts`, `apps/board/src/gallery/selection-bar-section.ts`, `apps/board/tests/`,
  `packages/ui/tests/`, `tests/pages/`, `docs/specification/components.md`
- **Files to reference**: `CODE-MAP.md` § 7; `apps/board/src/board/input/keys.ts` (where Z goes to `zoomRegion`
  when a container's title line has focus); `apps/board/src/board/cards/item-acts.ts` (the `size` and `later`
  acts); `apps/board/src/board/notes/group-pins.ts` (a note on several nodes)
- **Shared artifacts to reuse**: the menu pattern and icons (FE_01); the bookmark acts (T_01, FE_02); the
  conversation box's Ask now (FE_03)
- **Skills**: `cortex-architecture`, `cortex-docs`

> Modify only the files this task owns. Need a change elsewhere? List it under `REQUESTS`.

---

## Steps

1. [ ] **Z, failing test first**: write a page spec that selects several nodes each way a person can (Shift-click,
       lasso, Cmd or Ctrl-click, then with focus on a node, on a mark, in the bar, on a container's title line)
       and presses Z. Find the case that fails and fix its cause. If none fails, keep the spec, say so in your
       return block, and ask the orchestrator to get the maintainer's exact steps; change nothing by guess.
2. [ ] Z fits one node, several, or the container whose title line has focus, with a margin.
3. [ ] **The bar's commands**, with `nodeEdges` on: today's (Comment, Move, Reset places, Remove, Zoom) plus
       **Bookmark all** (it reads "Remove bookmarks" when every selected node is bookmarked), **Save for later**
       and **Width** (a menu: S, M, L, Auto, applied to each selected node by the existing `size` act). Each is a
       row in the command table with its words and key help; nothing is wired outside it.
4. [ ] **A note on the selection**: the bar's Comment opens today's group note with Ask now beside Add note, as a
       node's conversation has.
5. [ ] **Place**: centred above the selection's bounding box at one size; below when there is no room above; kept
       inside the stage; clear of a container's title line. While a menu, the history box or the conversation of
       a selected node is open, the bar steps aside so it never covers it.
6. [ ] Gallery, `pattern.json`, unit tests for placing, page specs with the flags on and off.

---

## Validation

- [ ] `npm run verify`, `npm run check`, `npm test` pass; `select.spec.ts`, `selection-pill.spec.ts`, `pill-gap.spec.ts`,
      `zoom-and-lasso.spec.ts` pass with the flags off and no new baseline
- [ ] The Z spec passes for every way of selecting
- [ ] Bookmark all, Save for later and Width each write one act per node through the one sender (test)

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
   [[YYYY-MM-DD HH:MM]] [board-app] FE_06: [what you did] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/FE_06_selection-bar-and-z.md]]
   ```

   Cite files by path + symbol, never by line number. Never write the set's entry or to `AUDITED.md`.
