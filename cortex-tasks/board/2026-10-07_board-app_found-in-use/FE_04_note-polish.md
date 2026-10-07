# FE_04_note-polish: Note polish: hover preview, growing editor

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (ruling 7;
> board item 48) · **Builds on**: FE_03 (the tip's hover rules, if it made a shared helper) ·
> **Model**: Sonnet 5.5

## Objective

A note cut short on a card can be read in full by hovering it, and the note editor grows with
what you type.

## Rulings (do not reopen)

1. **Hover preview**: a note on a card (`.vb-node-note`, clamped at 3 lines in `node.css`) that is
   cut short shows its full text in a popover beside it on hover and on keyboard focus, with the
   same WCAG 1.4.13 rules as the container-note preview (hoverable, persistent, Esc dismisses).
   It shows the rendered Markdown (`renderMarkdown`), scrolls past a maximum height (the sent
   note's 240px), and opens nothing. A click still opens the note bubble as today. A note that
   isn't cut short shows no preview. Behind a new flag `notePreview`, on by default.
2. **Growing editor**: the bubble's textarea (`.vb-nb-text`) grows with its content from its
   minimum (70px) to its maximum (240px), then scrolls; manual resize stays. It grows on input and
   when a note opens with text. No change to the bubble's width.
3. Reuse before you create: if FE_03 built a hover-tip helper with these rules, use it; else take
   the state handling from `packages/ui/src/region/region-preview.ts` rather than writing new
   timing logic.

## Inputs

- **Files to modify**: `packages/ui/src/node/node.css`, `node-template.ts` (`notesMarkup`),
  `vb-node.ts` or a small new module for the preview, `packages/ui/src/note-bubble/vb-note-bubble.ts`,
  `note-bubble.css`, both `pattern.json` files (`note-preview`; `growing`), gallery
  `node-section.ts` and `note-bubble-section.ts` (a long note; a bubble with long text)
- **Tests that pin today's behaviour**: `packages/ui/tests/note-bubble.test.ts` (textarea markup
  regex), `tests/pages/notes.spec.ts`

## Steps

1. [ ] Failing tests first: a page test hovers a long card note and reads the full text in the
   preview, then presses Esc; one focuses it by keyboard; one types 12 lines into the editor and
   checks its height grew and stopped at the maximum.
2. [ ] Preview; editor growth; gallery samples; pattern.json states.
3. [ ] Screenshots: view the diffs, then update the baselines that changed on purpose.

## Validation

- [ ] The five gates exit 0; axe passes with the preview open in both themes.

## Implementation Notes

**Status**: COMPLETED

- **Preview**: `packages/ui/src/node/node-note-tip.ts` (`bindNoteTip`, one per note) on the shared `bindHoverTip`, extended with `:host` as an anchor/group (the note itself is the anchor, so its label and text both open it). `notesMarkup` adds the note again as `.vb-tip.vb-note-tip` (aria-hidden); `node.css` places it beside the card (`left: 100% + --reach`, bridge to the card, max 240px, scrolls), raises the card (`vb-node:has(.vb-node-note[data-tip-open])`, z 4). Flag `notePreview` (on); the page and gallery mark their world `data-note-preview` (controller.ts: the two tip flags share one loop, still 300 lines). Wheel over a `.vb-tip` scrolls it, not the board (`pointer.ts`).
- **Keyboard**: a note is now a tab stop (`tabindex=0`); focus shows the preview, Esc dismisses it, Enter opens the bubble (as a click does; `notes.spec.ts` checks it). Not in the ruling: it was the only way for focus to reach a note (the pin opens only the latest).
- **Fix found on the way**: the 3-line clamp did not cut a note with a list or code block (grid blocks defeat `-webkit-line-clamp`), so such a note was never "cut short". `.vb-node-note-text` also has a three-line `max-height`.
- **Editor**: `vb-note-bubble.ts` `grow()` (on input, in `show()`, on connect): never shorter than it is, so a manual resize stays; CSS keeps min 70 / max 240. The textarea's natural height at `rows=3` is 75px, so it starts there.
- **Gallery**: ledger +2 lines (seq 196-197: card 91 on the notes board with a 12-item note), group "Note preview" (two cards, tips open), bubble sample "Long text". Pattern states `note-preview`, `growing`; flag text in `flags.ts`.
- **Tests**: `tests/pages/note-polish.spec.ts` (8: hover, scroll cap, hoverable, keyboard + Esc, not-cut, flag off, axe dark/light with the tip open, editor growth, opens grown). Unit: `node-template.test.ts` pins the new markup.
- **Baselines** regenerated after viewing the diffs: gallery, markdown, agent-access, node-size, see-through (dark and light). The new card and group move later sections by a fraction of a pixel, so text there anti-aliases differently; the only visible change is the new group, card 91 and the bubble sample.
- Gates: `npm test` (587), `npm run check`, `npm run verify`, `npm run gen -- --check` exit 0; `npm run test:pages` see TASK-STATUS.

## On Completion

Fill in notes, update your row, append your own LOG line (`[board-ui] FE_04: …`).
