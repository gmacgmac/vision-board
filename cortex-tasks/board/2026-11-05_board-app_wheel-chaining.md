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

Done in worktree `wheel-01` (branch `feat/wheel-01`), uncommitted.

- **Helper** `apps/board/src/board/input/wheel-latch.ts`: `canScroll` (overflow auto/scroll/overlay on that axis and
  more than 1px from that edge), `scrollerOn` (first box on the event's composed path below the stage that can
  scroll; the stage and beyond never), `createWheelLatch` (target fixed at a gesture's first event until a quiet gap
  of `WHEEL_GAP` = 150 ms since the last event; found again if the target left the page), `scrollerIn(stage)` (the DOM
  finder). Exported through `input/index.ts`. A latched target gets the browser's own scroll (no `preventDefault`).
- **pointer.ts** `bindPointer(…, wheelChaining)`: flag on, Ctrl/Cmd zooms always, else the latch decides scroll or
  pan; flag off, the old `closest('vb-note-bubble, .vb-tip')` line, unchanged. `wiring.ts` `bindStage`'s 5th param
  is now an options object `{ pageWide, wheelChaining }` (one caller, `controller.ts`, which reads `on('wheelChaining')`).
- **Flag** `wheelChaining` (on) in `packages/format/src/flags.ts` with its `FLAG_DESCRIPTIONS` line.
- **Docs**: `docs/specification/components.md` § Selecting and moving, 3 (new "The wheel" paragraph) and the hover-tip
  paragraph's old "wheel exemption" sentence now points there.
- **Tests**: `apps/board/tests/wheel-latch.test.ts` (4); `tests/pages/wheel-chaining.spec.ts` (7 × light and dark).
  The spec was run first against a build with the flag defaulting off: 12 of 14 failed, the 2 flag-off cases passed.
  The latch is checked in the page with synthetic wheel events (deterministic timing): the handler prevents the
  default exactly when it pans or zooms.
- **Findings**: the title itself already panned before; what swallowed the wheel was the open full-title tip
  (`.vb-title-tip`, a `.vb-tip`) under the label. Ctrl + wheel over the bubble or a tip did nothing before (the early
  return also skipped zoom); it zooms now.

### Caught Beyond the Brief

- The rule reaches every scroller on the stage, not only the ones listed: a Markdown code block (`.vb-md-code`), a
  card's popover (`.vb-card-pop`), an app card's state box (`.vb-app-state`, `.vb-app-problems`) now scroll under the
  wheel while they can, then pan. Before, the wheel over them always panned. Seen in the browser on a code block. As
  decision 1 says; flagging it in case any of them should stay pan-only.
- The selection pill still closes on any wheel without Ctrl/Cmd (`selection-pill.ts`), including one that only scrolls
  a bubble; unchanged from today. components.md calls it "a wheel pan". Left as is.
- Seen in the browser (light): the open full-title tip draws under the first card's number and kind tabs and title
  (the frame's raise does not lift it over the card layer). Pre-existing, not touched.
- No gallery entry: the behaviour has no look of its own.

**Verification** (VB_TEST_PORT 8100, 3 workers, nice): `wheel-chaining.spec.ts` 14/14; related wheel specs
(`app-pan-key`, `selection-pill`, `pill-gap`, `hover-tip`, `notes`, `note-polish`, `container-title`,
`container-polish`, `card-images`, `chat-follow`) 79/79; further wheel users (`board`, `app-alive`, `app-follow`,
`app-states`, `board-guest`, `zoom-level`, `layout-controls`, `focus-ring`, `open-list`, `live-boards`,
`chat-alongside`) 117/117; `npm run check` 0 errors; `npm test` 2404 + 14 pass; `npm run verify` ok (warnings only:
`pointer.ts` 307 lines and `controller.ts` 313 were already over 300). Browser look on a scratch board (own server,
port 8150, scratch HOME and project), dark and light: code block and conversation bubble scroll to their end, the
gesture stops there, the next pans; wheel over the open title tip pans. Full page suite not run (task said related specs).

## On Completion

Notes here (in the main checkout's copy); one LOG line, `[board-app] Wheel chaining: … → Task: [[cortex-tasks/board/2026-11-05_board-app_wheel-chaining.md]]`, ending in a newline.
