---
task_name: Pointer Focus Ring
created: 2026-10-09
completed: 2026-10-09
status: completed
categories: [board-ui, board-app]
type: implementation
tracker:
---

# Task: Pointer Focus Ring

A small maintainer fix, built first and written up afterwards as this single task.

---

## Problem Statement

Select one card by clicking it and press Z (zoom to selection): the zoom is right, but the card
gets the pink focus ring. Select several with the lasso and press Z: no ring. The maintainer does
not want the ring on a clicked card; the selected look is enough.

**Cause (confirmed by the page test).** The click focuses the card (`pointer.ts`, the `press`
gesture) and Chrome does not match `:focus-visible` on it (no ring right after the click: the test
asserts `outline-style: none`). Pressing a key while that card has focus makes Chrome start
matching `:focus-visible` on it, so `vb-node:focus-visible` in `packages/ui/src/node/node.css`
draws the ring. With a lasso no card holds focus. `zoom-selection` (`selection-flow.ts`) moves no
focus; the key press alone is the trigger.

---

## Ruling (maintainer, not to be reopened)

1. A card that got focus from a pointer press shows no focus ring when a key that does not move
   focus is pressed (Z, and the other selection and view commands: C, M, R, Esc, Space...).
2. The ring returns as soon as focus is moved by the keyboard (Tab, Shift+Tab, arrows, J/K,
   Home/End, or any keyboard command that focuses another card).
3. Keyboard users always see where focus is (WCAG 2.4.7): a card focused by the keyboard keeps
   its ring.
4. One definition (a small module tracking how focus arrived, a data attribute on the focused
   card, the CSS reading it), not per-command special cases.

---

## Task Overview

1. A failing page test first.
2. One module that records how focus reached a card, wired once in the stage wiring.
3. One CSS rule in the node pattern that reads it; the pattern and the spec say so.
4. The five gates.

---

## Execution Steps

### Step 1: Failing page test

- **Action**: wrote `tests/pages/focus-ring.spec.ts` before the fix. Run against the old code: 4 of
  6 failed (`outline-style` was `solid` after click + Z), the lasso + Z and keyboard-focus + Z cases
  passed, as expected.
- **Files**: `tests/pages/focus-ring.spec.ts`

### Step 2: How focus arrived

- **Action**: `bindPointerFocus(stage)` in `apps/board/src/board/pointer-focus.ts`. A capture
  `pointerdown` on the document sets "last input was a pointer"; a capture `keydown` clears it.
  On `focusin` of a `vb-node` the card gets `data-pointer-focus` when the last input was a pointer,
  and loses it otherwise; `focusout` removes it. A press on the card that already has focus moves
  no focus (no `focusin`), so `pointerdown` marks that card itself; this covers a card focused by
  the keyboard and then clicked. Programmatic focus after a click (`pointer.ts` focuses the card
  on release after a modified click or a kind-tab drag) is a pointer focus too, since no key came
  between.
- **Files**: `apps/board/src/board/pointer-focus.ts` (`bindPointerFocus`),
  `apps/board/src/board/wiring.ts` (`bindStage`: binds it beside `bindSizeControl`, unbinds it in
  the returned function). `controller.ts` is untouched (it is at its 300-line limit).

### Step 3: The CSS and the contract

- **Action**: `vb-node[data-pointer-focus]:focus-visible { outline: none; }` right under the
  `vb-node:focus-visible` rule. Documented `data-pointer-focus` in the node pattern's attributes
  and accessibility text, and added item 5 "The focus ring" to the selection section of the
  components spec.
- **Files**: `packages/ui/src/node/node.css`, `packages/ui/src/node/pattern.json`,
  `docs/specification/components.md` (section "Selecting and moving (3_FE_01)", item 5)

### Step 4: Gates

- **Action**: ran the five gates; all exit 0 (see Agent Notes).

---

## Files Involved

| File | Purpose |
|------|---------|
| `apps/board/src/board/pointer-focus.ts` | New: `bindPointerFocus`, how focus reached a card |
| `apps/board/src/board/wiring.ts` | `bindStage` binds and unbinds it |
| `packages/ui/src/node/node.css` | `vb-node[data-pointer-focus]:focus-visible` draws no ring |
| `packages/ui/src/node/pattern.json` | `data-pointer-focus` attribute, accessibility text |
| `docs/specification/components.md` | Selection item 5, the focus ring |
| `tests/pages/focus-ring.spec.ts` | New page test (6 tests) |

---

## Constraints

- No per-command special cases; no change to `selection-flow.ts` or `keys.ts`.
- `controller.ts` not touched (at its limit); protected files and `.visionboard/` not touched.
- No new tokens; the ring's colour and width stay in `tokens.css` as they were.

---

## Success Criteria

- [x] Click a card, press Z: no outline (also Space, Esc).
- [x] Tab and Shift+Tab from that card: the focused element shows its outline; J moves focus to the
      next card, which shows its outline.
- [x] A card the keyboard focused (J), then Space and Z: its outline still shows.
- [x] Lasso + Z: no card shows an outline (unchanged).
- [x] axe passes, light and dark, with a clicked card zoomed to by Z.
- [x] All five gates exit 0; no screenshot baseline changed.
- [x] Task file updated with completion notes

---

## References

- `.kiro/steering/vision-board-proj.md` (rules 3, 4, 5)
- `apps/board/src/board/pointer.ts` (`bindPointer`, the `press` gesture)
- `apps/board/src/board/selection-flow.ts` (`zoom-selection`)
- `apps/board/src/styles/board.css` (the page-wide `:focus-visible` rule, unchanged)

---

## Agent Notes

### Execution Log
- [x] Started: 2026-10-09 17:10
- [x] Completed: 2026-10-09 17:40

### Changes Made
- New module `pointer-focus.ts` (`bindPointerFocus`), bound in `wiring.ts` `bindStage`.
- One rule in `node.css`; `pattern.json` and `components.md` describe `data-pointer-focus`.
- New page test `focus-ring.spec.ts`: click + Z/Space/Esc no ring; Tab, Shift+Tab, J ring; keyboard
  focus + Space + Z ring; lasso + Z no ring; axe light and dark.

### Issues & Resolutions
- First run with the module: clicking a card that already had keyboard focus (after Shift+Tab)
  fired no `focusin`, so the card kept its ring through Z. Resolved by marking the already-focused
  card on `pointerdown` (ruling 1: the person pressed it with the pointer).

### Gates
- `npm test`: exit 0. `npm run check`: exit 0 (svelte-check 0 errors, tsc). `npm run verify`: exit
  0 (ok, 0 warnings). `npm run gen -- --check`: exit 0 (generated files current).
  `npm run test:pages`: exit 0, 296 passed, no screenshot diff, so no baseline was updated.
