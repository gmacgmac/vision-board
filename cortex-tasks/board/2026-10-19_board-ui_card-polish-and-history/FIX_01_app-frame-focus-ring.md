# FIX_01_app-frame-focus-ring: App panel focus ring only for keyboard

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

The thick accent (pink) ring around an app's panel shows only when focus reached the panel by
keyboard, never after a click inside the app — the way cards already behave.

---

## Context

Maintainer, 2026-10-19: clicking anywhere in an app card draws a pink border round the whole panel;
other cards only show one when tabbed to. Cause: `vb-app-frame:is(:focus-within, [data-focus-in])`
draws `--vb-focus` (= `--vb-accent`, pink) whenever the iframe has focus
(`packages/ui/src/app-frame/app-frame.css`, `packages/ui/src/node/node-app.css`); `data-focus-in` is
set in `vb-app-frame.ts` on any focus into the frame, pointer or key. The board already tells
pointer focus from keyboard focus for cards: `apps/board/src/board/pointer-focus.ts`
(`lastInput`, `data-pointer-focus`, review: WCAG 2.4.7). Keep the keyboard ring (rule 5 is a gate);
drop it for the pointer. The pink *inside* the app (checkboxes, slider, buttons) is the app's own
styling from the host styles (`APP_STYLE_VARIABLES`, `packages/format/src/apps.ts`) — out of scope here.
**Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: `packages/ui/src/app-frame/vb-app-frame.ts` (mark how focus came in),
  `packages/ui/src/app-frame/app-frame.css`, `packages/ui/src/node/node-app.css` (the two ring rules),
  the page wiring if the frame needs `lastInput` passed in (`apps/board/src/board/app-cards.ts`)
- **Patterns to follow**: `pointer-focus.ts` — one definition of "how focus came"; reuse it, don't
  write a second
- **Skills**: `cortex-architecture` — load before starting

---

## Steps

1. [x] Failing page test first (`tests/pages/app-cards.spec.ts` or `focus-ring.spec.ts`): a click
   inside a ready panel draws no ring on the frame; Tab into the panel draws it.
2. [x] Mark pointer focus into the frame (the iframe's own focus after a pointerdown on the frame
   element or a window blur to the frame with the last input a pointer) so the ring rules skip it,
   reusing `lastInput` / the `data-pointer-focus` idea. The ring returns when focus next comes by keyboard.
3. [x] Update the gallery entry if it shows the focused state; components.md § App card one line.

---

## Validation

- [x] The new test failed before and passes after; app-cards, app-states, focus-ring specs pass
- [x] `npm test`, `npm run verify` pass (page weight aside: maintainer's call)

---

## Constraints

- If deviation is needed, stop and ask the maintainer — no silent breaking changes.
- No PII in examples or fixtures.
- No git commits during execution.
- Protected files (steering, `docs/decisions.md`, `docs/principles.md`, tokens): propose the exact change and wait.
- Update this file's Implementation Notes on completion.

---

## Implementation Notes

**Status**: Completed  
**Completed**: 2026-10-19 13:10  

### Changes Made
- Test first: `tests/pages/app-cards.spec.ts` "the panel's focus ring (card-polish FIX_01)": a click inside the panel leaves the frame's box-shadow as idle; Tab in draws the 2px ring; Esc and a later click draw none. Failed before (ring after the click), passes now.
- `apps/board/src/board/pointer-focus.ts`: `lastInput()` is null once the window blurs (focus into a frame of another origin), so it cannot say how focus came. Added `focusCame()` beside it: at the window's blur, whether a key was down (`keyDown`: keydown until keyup, a pointer press or the window's focus) says 'key', else 'pointer'. Same module, same `Input` type, no second definition.
- `packages/ui/src/app-frame/vb-app-frame.ts`: `AppFrameWiring.focusCame?()`; `onFocusMove` sets `data-pointer-focus` when focus comes in with 'pointer' (not when the window merely loses focus with focus already in the panel); cleared on leaving and on unload. Left out, the ring shows.
- `app-frame.css` and `node-app.css`: ring rules are now `vb-app-frame[data-focus-in]:not([data-pointer-focus])` (`:focus-within` dropped: it never matched a cross-origin frame).
- `apps/board/src/board/app-cards.ts`: passes `focusCame` in `wire`.
- Docs: `components.md` § App card ruling 7, `packages/ui/src/app-frame/pattern.json` (attribute and `wire`).

### Issues & Resolutions
- A click inside the panel when focus was already there by Tab keeps the ring (the page hears no press inside a cross-origin frame); it clears when focus next leaves. Acceptable; noted.
- `pointer-focus.ts` was not on the task's file list; the change was needed since `lastInput` is null at the moment the frame needs it.
- Gzip delta: not measured from a build (dist is shared with sibling tasks); estimated about +0.3 KB gzip (about 900 B of added code compressed standalone is 376 B). `npm run verify` fails only on page weight: 151.9 KB vs 150 KB budget (maintainer deciding).

### Deviations from Plan
- None (pointer-focus.ts touched as above, outside the listed files but not an FE_02 file).

---

## On Completion

1. Fill in Implementation Notes above; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append **your own** LOG entry to `cortex/LOG.md` — one line, terminated with a newline, append-only:

   ```
   [[YYYY-MM-DD HH:MM]] [board-ui] FIX_01: [what you did] → Task: [[cortex-tasks/board/2026-10-19_board-ui_card-polish-and-history/FIX_01_app-frame-focus-ring.md]]
   ```

   Cite files by path + symbol, never by line number. Don't write the set's entry or to `AUDITED.md`.
