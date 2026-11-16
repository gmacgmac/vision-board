# FE_04_command-lens-skin: The Command Lens Skin

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Add the second skin, Command Lens, as a registry row, token values and a stylesheet over the same node, with its
controls where that skin puts them.

---

## Context

PLAN.md § Decisions 1, 7, 14. The look is `design/mockups/node-skins/command-lens-skin-dark.html` and `-light.html`
(artboard 12), with the states from `design/mockups/node-states/`. The plate along the top is the handle and holds
the number, the kind, the change badge and the notes button; the switch along the bottom is the answer, one click;
a dark plate and a switch mean the node asks, a light plate and no switch mean it tells; the bookmark is the number
square with a notched tail below the plate; a ticked or crossed node is not recoloured. Function does not change:
the same acts, keys, menus and conversation as the default skin.

**Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: `packages/ui/src/skins.ts` (the `command-lens` row), `packages/ui/src/node/` (template and
  styles, only what the registry row needs; a new `node-command-lens.css`), `packages/ui/src/menu/`,
  `packages/ui/src/note-bubble/` and `packages/ui/src/selection-bar/` styles (the dark glass, by tokens),
  `packages/tokens/src/skins.css` (and `tokens.css` only for a value T_02 missed, listed in your notes),
  `packages/ui/tests/`, `apps/board/src/gallery/`, `apps/board/src/board/input/pointer.ts` (`HANDLE`: the plate),
  `tests/pages/`, `docs/specification/components.md`
- **Files to reference**: FE_01's and FE_02's notes; `packages/ui/src/node/node-template.ts`
- **Shared artifacts to reuse**: `SKIN_DEFS`, `ICONS`, the menu pattern, the conversation box, T_02's tokens
- **Skills**: `cortex-architecture`, `cortex-docs`

> Modify only the files this task owns. Need a change elsewhere? List it under `REQUESTS`.

---

## Steps

1. [ ] Complete the `command-lens` row in `SKIN_DEFS`: answer `switch`, marks `plate`. If the template needs to
       know more than the row says, widen the row's type for every skin; never test the skin's name.
2. [ ] **Template**: for `marks: 'plate'` the number, kind, change badge and notes button are drawn in the plate
       (the plate is the drag handle); for `answer: 'switch'` nodes that ask get the Tick | Cross switch, and
       pressing the lit half clears the answer. The buttons carry the same data attributes as the default skin's,
       so FE_02's wiring serves both without change.
3. [ ] **Styles** from tokens: plates, square corners, the mono labels, the switch's lit halves, selection as the
       module's own border, the bookmark with its tail, the icon tile, tones, and the dark glass for menus, the
       selection bar and the conversation. In light, marks that sit on a dark plate keep colours that read on it.
4. [ ] **Every state** the default skin has, in this skin: the DESIGN_01 states, focus, hover, disabled on a
       read-only board, a failed write.
5. [ ] **A test that the skins agree**: for each kind and state, both skins offer the same set of actions
       (compare the data attributes the template emits).
6. [ ] Gallery sections for the skin; page specs with screenshots, light and dark, with `?flags=nodeEdges,skins`;
       `components.md` and `pattern.json` updated.

---

## Validation

- [ ] `npm run verify`, `npm run check`, `npm test`, `npm run test:plugin` pass; the new specs pass
- [ ] The skins-agree test passes; a search finds no skin name in `packages/ui/src/node/*.ts` outside the registry
- [ ] Contrast: every pair this skin adds is in the pair list and passes, light and dark
- [ ] Side by side with `design/mockups/node-skins/command-lens-skin-*.html` in a browser, the node matches;
      differences are listed with the reason
- [ ] Switching the skin on a live board redraws in place, loses no focus, no open note and no selection

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
   [[YYYY-MM-DD HH:MM]] [board-ui] FE_04: [what you did] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/FE_04_command-lens-skin.md]]
   ```

   Cite files by path + symbol, never by line number. Never write the set's entry or to `AUDITED.md`.
