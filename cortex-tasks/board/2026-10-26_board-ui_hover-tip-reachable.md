---
task_name: Hover Tips Reachable
created: 2026-10-26
completed: 2026-10-26
status: completed
categories: [board-ui]
type: implementation
model: standard
skills: [cortex-architecture]
tracker:
---

# Task: A hover tip stays open while the pointer travels to it

> **Source**: maintainer, chat 2026-10-26 (points 141-148, approved) · **Branch / worktree**:
> `feat/tool-rail-and-examples` in `.claude/worktrees/tool-rail` (the maintainer's board runs from the main checkout)

## Problem Statement

Hovering an agent reply whose text is cut shows its full-text tip beside the card, but moving the
pointer to it closes it, so it can't be scrolled. Reproduced with Playwright on a copy of this repo's
ledger: on every path (straight across, diagonal, from the reply's bottom) the tip closed over the
card's own padding (`.vb-node-content`), a few px short of the tip. Cause: the gap bridge
(`node.css` `.vb-note-tip::before`, `right: 100%`, width `--reach`) lies outside the tip's box, and the
tip box is `overflow: auto`, which clips its own bridge. A hit test across the gap never finds it.
The wheel over an open tip already scrolls it (`apps/board/src/board/pointer.ts`, wheel handler skips
`.vb-tip`), and a click already opens the conversation and closes the tip; both stay as they are.

## Design (approved)

1. **The bridge works.** A tip that scrolls keeps its outer box unclipped (`overflow: visible`) and
   scrolls an inner body instead, so its `::before` bridge takes the pointer. Apply to every tip
   whose box scrolls and has a bridge outside it: the note tip and reply tip (`.vb-note-tip`,
   `packages/ui/src/node/node.css`, `node-parking.css`) and check the card popover (`.vb-card-pop`,
   `node-popover.css`). The wheel handler's `.vb-tip` / bubble exemption must still match the inner body.
2. **A short close delay, once, for every hover tip.** Leaving the anchor or the tip closes after a
   grace of about 300 ms (a motion token if one fits, else a named constant beside the open rules);
   re-entering either within it cancels the close. Opening stays immediate. Esc, a press outside,
   `close()` and focus rules stay immediate. Implement it once, beside the open rules, and use it from
   both callers of the rules: `packages/ui/src/tip/hover-tip.ts` (`bindHoverTip`: note, reply, title,
   status, card popover, app apply, link marks) and `packages/ui/src/region/region-note.ts` (the
   container note preview). `previewStep` stays pure; the timer lives in one browser-side helper.
3. **No other change**: look, flags, ledger, clicks.

## Steps

1. Tests first, failing now: a page spec (`tests/pages/hover-tip.spec.ts`) on a fixture card with a long
   agent reply and a long note: walk the pointer from the anchor to the tip in small steps (straight
   and diagonal) at 100% and at a zoomed-out level; the tip stays open and the wheel scrolls it; it
   closes about 300 ms after the pointer leaves both, at once on Esc. A unit test for the delay helper
   with fake timers. The scratch probe used to find the bug is
   `/private/tmp/claude-501/-Users-gm-Library-CloudStorage-Dropbox-Personal-Developer-web-apps-vision-board/7e4c8ee3-2ede-4ce4-93de-c9ae9610bdb4/scratchpad/hover-probe.mjs` (reference only).
2. CSS (Design 1), then the delay (Design 2).
3. Run the specs that use tips: notes, popover-thread, note-polish, conversation, card-history,
   container-title, container-polish, link labels, app-cards, gallery. Not the full suite: it runs once
   at the end.

## Constraints

- No ledger, schema or token value changes. Files under 300 lines. No git commits. No PII.
- Page tests on `VB_TEST_PORT=4620` under `temp/pages.lock`; never port 4466.
- **STOP** and report if a screenshot baseline changes, since this should change no picture.

## Success Criteria

- [x] The new spec failed first and passes; the tip stays open on every path and scrolls
- [x] Every hover tip closes after the grace, and at once on Esc / outside / close
- [x] `npm test`, `npm run verify`, `npm run check`, the tip specs, and the full page suite once at the end pass
      (the 6 known failures in `send-access.spec.ts` and `size.spec.ts` excepted)

## Implementation Notes

**Done.**
- Bridge: the note and reply tip (`.vb-note-tip`) keeps its box unclipped (`padding: 0`, no overflow) and scrolls a new inner `.vb-tip-body` (`node-template.ts` two places, `node.css`). The body carries the old padding and `max-height: calc(var(--vb-pop-max-h) - 2px)`, so the picture is the same. The wheel exemption (`.vb-tip` in `board/pointer.ts`) matches the body unchanged.
- Grace: `packages/ui/src/tip/close-grace.ts` (`closeGrace`, `CLOSE_GRACE_MS` = 300, `isPointerLeave`), used by `bindHoverTip` (`tip/hover-tip.ts`) and the container note preview (`region/region-note.ts`). Only a pointer leaving a tip that shows waits; opening, Esc, outside, focus and `close()` apply at once. `previewStep` is untouched. The state still updates at once; only the draw of "closed" is held, so a pointer that comes back cancels it cleanly.
- Tests: `tests/pages/hover-tip.spec.ts` (7: note and reply, full size and zoomed out, straight and diagonal walks, wheel scroll, close after ~300 ms, back within the grace, Esc at once; plus a card-popover hover crossing), `packages/ui/tests/close-grace.test.ts` (8, fake timers). The walk tests failed first (closed at step 4 of 30 over the card padding). `note-polish.spec.ts` now measures the body for "scrolls"; `node-template.test.ts` expects the body wrapper.
- Doc: one paragraph in `docs/specification/components.md` ruling 5.
- **Card popover (`.vb-card-pop`) not restructured.** Its box is itself the scroller and a tab stop (`tabindex` 0 for handover and history), filled by three producers (`vb-node.ts` x2, `history-flow.ts`), so an inner body would change keyboard scrolling and several markup contracts. Its anchor is a bottom tab, far from the box, so its 12px bridge never carried the pointer across the card anyway; the grace is what makes a hover crossing work (covered by the last test in `hover-tip.spec.ts`), and a click opens it for good. Left for the maintainer to decide.
- Test path note: the diagonal walk targets no lower than the anchor's bottom; a path that dips below it crosses the neighbouring reply (another anchor) and, when slow (~100 ms a step in the test), outlasts the grace.

**Verification.** `npm run verify` ok (3 existing warnings); `npm run check` 0 errors; `npm test` 1605 pass; `npm run test:timing` has one failure, the 100,000-event server start under 1000 ms (1.6 s, server code untouched, machine load). Page suite once: 625 passed, 6 failed, exactly the known ones (`send-access.spec.ts` x4, `size.spec.ts` x2). No screenshot baseline changed. The earlier subset run had 2 `review-colours` timeouts that passed on re-run (load).


## On Completion

1. Frontmatter `status: completed`, `completed:` date.
2. Append one LOG line: `[[YYYY-MM-DD HH:MM]] [board-ui] Completed: Hover Tips Reachable → Task: [[cortex-tasks/board/2026-10-26_board-ui_hover-tip-reachable.md]]`
3. Do not write to `AUDITED.md`.
