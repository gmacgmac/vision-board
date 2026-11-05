---
model: strong
skills: [cortex-architecture, cortex-docs]
persona: Interaction engineer for canvas apps — the wheel goes where the pointer is until that runs out, then the canvas moves; one gesture never changes target.
---

# Wheel: scroll what is under the pointer, then pan

> **Created**: 2026-11-05 · **From**: maintainer chat (the "scroll then pan" point, after 436) · **Flag**: `wheelChaining`

## Problem

`apps/board/src/board/input/pointer.ts`: the stage's wheel handler returns early whenever the target is inside
`vb-note-bubble` or `.vb-tip` (components.md line ~456: so a long tip's body scrolls). So the board never pans there:
- a container title carries a hidden full-title tip over it (`packages/ui/src/region/region-template.ts`,
  `.vb-tip.vb-title-tip`), so the wheel over a title does nothing;
- over a reply/note bubble the wheel scrolls its text and stops, even at the end or with nothing to scroll.

## Decisions (maintainer, binding)

1. One rule: if the element under the pointer (or an ancestor up to the stage) can still scroll in the wheel's
   direction, it scrolls; otherwise the board pans. Replaces the blanket bubble/tip exception.
2. One gesture, one target, as browsers latch: the target chosen at a gesture's first wheel event keeps the whole
   gesture (until a short quiet gap, as browsers use, ~100-150 ms), so momentum never spills from a bubble into a
   pan mid-flick; the next gesture at the edge pans.
3. Ctrl/Cmd + wheel zooms everywhere, as today. App cards keep the pan-key (Cmd) rule: their sandboxed frame keeps
   its own wheel (`app-pan-key.spec.ts`).
4. Covers: container titles (pan), reply and note bubbles (scroll, then pan), long tips (scroll, then pan), text
   boxes (textarea) scroll only while they can, the selection pill's wheel close still works.
5. Behind a new flag `wheelChaining` (on) in `packages/format/src/flags.ts` with its `FLAG_DESCRIPTIONS` line; off is
   exactly today's behaviour.

## Steps

1. Failing page tests first (new `tests/pages/wheel-chaining.spec.ts`): wheel over a container title pans; over a
   bubble with overflow it scrolls to its end and that gesture does not pan, the next gesture pans; over a bubble
   with no overflow it pans; a tip that scrolls, the same; Ctrl/Cmd zooms; flag off = today.
2. A small pure helper (which element can scroll by deltaX/deltaY: overflow auto/scroll and not at that edge) plus
   the latch, in `apps/board/src/board/input/` (its own file); `pointer.ts` uses it.
3. `docs/specification/components.md` (the wheel exemption paragraph) says the new rule.
4. The page specs of what wheels touch (`app-pan-key`, the selection pill, note bubble, tips) stay green.

## Constraints

Work in worktree `.claude/worktrees/wheel-01` (branch `feat/wheel-01`), `VB_TEST_PORT` 8100. Never port 4466, the
repo's own `.visionboard/`, or `node_modules` (a link). No git commits. No PII. Writes >50 lines in chunks. Every
test run with a time limit, `nice -n 15`, `VB_TEST_WORKERS=3`, spec paths in full (`tests/pages/<name>.spec.ts`).
Run `npm run build` once in the worktree before tests that need the page.

## Implementation Notes

## On Completion

Notes here (in the main checkout's copy); one LOG line, `[board-app] Wheel chaining: … → Task: [[cortex-tasks/board/2026-11-05_board-app_wheel-chaining.md]]`, ending in a newline.
