# FE_02_board-wires-the-edges: The Board Wires the Edges

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Make the new node work on the board: each mark does its action, the menus open, the keys and right-click work,
flag is renamed Bookmark everywhere, a container can be marked seen, and a board's skin is applied and can be
changed.

---

## Context

PLAN.md § Decisions 2 to 8, 15, 16, 24 and § Planner's calls 3, 11, 12. FE_01 built the markup; this task is the page
(`apps/board/src/`). Every action goes through the one sender as today (`CODE-MAP.md` § 4): no new way to write.
Overlays live on the stage, outside the scaled world, placed in stage pixels (`CODE-MAP.md` § 6).

**Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: `apps/board/src/board/` (`cards/`, `input/`, `canvas/`, `selection/`, `chrome/`, `io/acts.ts`,
  `controller.ts` and `controller/`, `words/`), `apps/board/src/shell/` (the toolbar's menu, for the skin control),
  `apps/board/src/styles/`, `apps/board/src/gallery/`, `apps/board/tests/`, `tests/pages/`; for the rename only:
  `packages/ui/src/node/`, `packages/ui/src/words/`, `packages/ui/tests/`, `packages/format/src/flags.ts` (`cardFlag`
  becomes `cardBookmark`), `packages/tokens/src/tokens.css`
  (remove the `--vb-state-flag` alias only); `docs/specification/components.md`
- **Files to reference**: `CODE-MAP.md` §§ 4 to 7, 12; `apps/board/src/board/cards/flag-flow.ts`, `item-acts.ts`,
  `update-flow.ts`, `history-flow.ts`; `apps/board/src/board/input/` (`pointer.ts` `HANDLE`, `keys.ts`,
  `commands.ts`, `wiring.ts`); `apps/board/src/shell/ThemeControl.svelte`; `.kiro/steering/svelte-conventions.md`
- **Shared artifacts to reuse**: `packages/ui/src/menu/`, `packages/ui/src/skins.ts`, `packages/ui/src/icons/`
  (FE_01); the acts and folds from T_01 (`bookmarksOn`, `containerSeenDue`); `list_icons` with `paths` (BE_04); `placeBar` and the hover tip's placing for where an overlay goes
- **Skills**: `cortex-architecture`, `cortex-docs`

> Modify only the files this task owns. Need a change elsewhere? List it under `REQUESTS`.

---

## Steps

1. [ ] **Flags to the page**: with `nodeEdges` on, the root carries `data-vb-edges` and the node is drawn with its
       edges; with `skins` on, the root carries `data-vb-skin` from the board's skin.
2. [ ] **Bookmark, renamed everywhere**: the page already writes `bookmark` and `unbookmark` (T_01 changed the
       sender) and T_01 renamed the fold; flag becomes Bookmark in the rest of the page:
       identifiers, class names, files (`flag-flow.ts`, `FlaggedChip.svelte`, the gallery section), words (the
       toolbar chip reads "Bookmarked"), tests and docs. The key is B; Shift+F is removed from the key help. With
       `nodeEdges` off, the old footer's button keeps its place and glyph and is named Bookmark. Start with a test
       that a format-19 ledger with flags, migrated on open (BE_02, T_01's step), shows them as bookmarks.
3. [ ] **The number**: a click toggles Bookmark at once. Press and hold (about 400 ms; a long press on touch) opens
       the number menu instead and toggles nothing. From the keyboard, the menu key or Shift+F10 on the number
       opens it. Report at the gate that a hover pause was not built, so the maintainer can ask for it.
4. [ ] **The answer**: a click on the disc opens the picker beside it; a second click on the disc closes it;
       nothing opens on hover. Tick and Cross call the acts the footer buttons call today, with the same confirm
       and the same 400 ms guard. On an answered node the disc opens the picker to change or clear the answer.
5. [ ] **History and notes**: the change badge and H open the history box; the notes mark and C open the
       conversation (today's thread until FE_03).
6. [ ] **Right-click** on a node, or a long press on touch, opens the action list at the pointer; it never opens
       on the background. Shift+F10 opens it for the focused node.
7. [ ] **Menus**: one open at a time; fixed size at any zoom; they stay open and stay attached while the person
       zooms or pans; Escape and a click outside close them; focus moves in and returns.
8. [ ] **Seen**: on a board that isn't read-only, a click inside a container, on its background or frame, writes
       the container's `seen` line with the `head` the person saw, only when T_01's `containerSeenDue` says it
       changes something. Selecting a node already marks it seen; keep that.
8a. [ ] **Library icons**: the page reads `list_icons` with `paths: true` when it opens a ledger and again when an
       `icon` line arrives, and passes the library to the node (FE_01's `icon(name, cls, library)`). A missing or
       failing icon draws the plain tile; nothing else on the board waits for it.
9. [ ] **Dragging**: a node with an icon is dragged by its grip; add it to `HANDLE`.
10. [ ] **Skin control**: a control beside the theme control lists `SKINS` and writes the `skin` act; add the act
        to `NAMES_BOARD`. On a read-only board it is disabled with its reason.
11. [ ] Page specs for every step with the flags on, light and dark; key help and words updated.

---

## Validation

- [ ] `npm run verify`, `npm run check`, `npm test` pass; the new and changed page specs pass
- [ ] With the flags off the board behaves as before, except that flag reads Bookmark and its key is B; the
      changed baselines are listed in your notes
- [ ] A double-click on the disc never ticks; a press on Tick within 400 ms of another is ignored (tests)
- [ ] An agent still cannot tick, cross, bookmark or set a skin by act (existing refusals pass)
- [ ] A look in a browser, light and dark: each mark, each menu, each key, on a board with 30 nodes

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
   [[YYYY-MM-DD HH:MM]] [board-app] FE_02: [what you did] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/FE_02_board-wires-the-edges.md]]
   ```

   Cite files by path + symbol, never by line number. Never write the set's entry or to `AUDITED.md`.
