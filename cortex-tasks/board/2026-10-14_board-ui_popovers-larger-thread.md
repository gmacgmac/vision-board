---
category: board-ui
status: open
created: 2026-10-14
tracker: cortex-tasks/tracker.md#U1
---

# Larger popovers, and a click opens the whole comment exchange

> **From**: maintainer, 2026-10-14, using the board on a MacBook Air (chat 684-688: "the comment box
> … too small … the whole thing needs to scale up 1 step"; "when agent responds, i only see the
> entire text IF the user hovers – i can't click it"; "lets try on clean git then test") · **Model**:
> Opus 5.5 · **Go**: given (688, including the token change in ruling 4)

## Rulings (maintainer; do not reopen)

1. **One step bigger** for the comment box (`<vb-note-bubble>`, all modes: new, edit, sent):
   reading text and the textarea `--vb-text-md` → `--vb-text-lg`; head, hint, buttons, error
   `--vb-text-sm` → `--vb-text-md` (the number chip and `kbd` `xs` → `sm`); width 300px → 360px;
   textarea taller in proportion; buttons and paddings grow with the text (targets at least 32px).
2. **A click opens the exchange**: a click (or Enter/Space) on a person's note **or on an agent's
   reply to it** on a card opens one window showing the note, then every reply to it in order (who
   and when, as the card shows them), placed beside the card next to what was clicked. A reply that
   names no note of the card opens on its own. The person's own note keeps its Edit (sent mode as
   today); replies are read-only. Container notes and their replies (`.vb-nblock-reply`) behave the
   same way.
3. **The hover preview stays** for a quick look (`bindNoteTip`); the click is the way to read and
   keep it open. Fixes the bug where Enter on a reply calls `note.click()` and nothing opens.
4. **All popovers on shared tokens** (`packages/tokens/src/tokens.css`, approved): add popover
   tokens (text size, small text size, width, max height, padding) and make every popover read them:
   the note bubble, `.vb-card-pop` (proposal and handover tabs), the container note `.vb-note-pop`,
   and the note/reply hover tip. So they scale together. Replace the literals found there (300px,
   14px, 10px radii, 240px/320px max heights) with tokens. APCA measured light and dark for every
   pair that changes.

## Steps

1. [ ] Tests first: sizes read from the tokens (computed font size 15px, width 360px); a click and
   Enter on a reply open the exchange with the note and its replies in order; an orphan reply opens
   alone; container note and reply the same; hover tip still shows; Esc closes and focus returns;
   keyboard and axe light and dark; the sent window still edits.
2. [ ] Build: extend `vb-note-bubble` (a replies list in `BubbleView`, read-only) rather than a new
   popover; `apps/board/src/board/wiring.ts` routes a reply click to its note's exchange; the region
   side the same. Gallery entries for the exchange (with replies, orphan reply) and the bigger box.
3. [ ] Screenshots: view every diff before updating; say which changed and why.
4. [ ] Docs: `docs/specification/components.md` (popovers, the exchange), the patterns'
   `pattern.json`.

## Validation

- [ ] The five gates exit 0, one after another.

## Constraints

- Project rules (`.kiro/steering/vision-board-proj.md`): patterns first (extend, don't fork), one job
  per file about 300 lines (500 hard; split along a logical seam), tests first, tokens only, every
  state, accessibility (WCAG 1.4.13 for the hover tip; the window is a non-modal dialog).
- If deviation is needed, stop and say so. No git commits or stash. Scratch in the system temp folder
  (never the repo's `temp/`); stop only your own processes and leave none running; never touch
  `.visionboard/`; don't use the board on 4466. Only one page-test run at a time.
- Fill Implementation Notes below and append your own LOG line.

## Implementation Notes

