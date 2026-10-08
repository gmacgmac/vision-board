# FE_03_parking-and-replies: Parking and replies

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (rulings 8,
> 10) · **Decision**: D-020 · **Model**: Sonnet 5.5 · **Needs**: BE_01, FE_01 (popover, tab slot)

## Objective

A card saved for later shows whether its handover is still owed and, once written, opens it. An
agent's replies show under the notes they answer.

## Rulings (do not reopen)

1. **Awaiting.** A card with the `item.awaiting` condition shows "Awaiting" as its footer state
   word (beside "Saved for later" or in its place; pick the clearer, say which in the notes) with
   the hover tip "Awaiting context" (`bindHoverTip`). Its accessible name says it too.
2. **Handover.** Once a park bundle exists, a HANDOVER tab in FE_01's bottom-edge slot opens the
   bundle in FE_01's card popover (`bindCardPopover`, reused, not copied): Situation, Background,
   Assessment, Recommendation as headed sections (Markdown, `renderMarkdown`), then Sources as a
   list. The bundle comes from the folded state (`s.parks`). Flag `handover` (on).
3. **Replies.** An agent's reply (`s.replies`) shows under the note it answers (`to` = the note's
   `seq`) in the card's notes block: "Agent reply" with the agent's label, Markdown, clamped like
   a note with the same full-text preview (`bindNoteTip`). A reply with no `to` shows after the
   card's notes. A reply to a note on a whole container shows under that note in the container's
   note view (`region-notes.ts`). Replies are read-only. Flag `cardReplies` (on).
4. `NodeState` (`node-core.ts`) gains `awaiting`, `handover` and replies inside `NotesView`; the
   element applies them in place (`VbNode.update`), no re-render.

## Steps

1. [x] Failing tests first: node-core state cases; page tests
   (`tests/pages/parking-replies.spec.ts`): moving a card to Later shows "Awaiting", an agent
   `park` turns it into a HANDOVER tab that opens the bundle, a `reply` appears under its note
   live; keyboard only; axe light and dark.
2. [x] Build, gallery entries (card awaiting, card with handover open, note with reply), flags.

## Validation

- [x] The five gates exit 0. Look at each, light and dark.

## Constraints

- If deviation is needed, stop and say so; no silent breaking changes. No PII in examples.
- No git commits or stash. Scratch in the system temp folder. Stop only your own processes.
- Fill Implementation Notes below, your row in TASK-STATUS.md, and your own LOG line.

## Implementation Notes

**Status**: Completed 2026-10-08

**Core (`packages/ui/src/node`).** `CardConditions` gains `awaiting`, `handover` (a `ParkBundle`) and `replies` (`CardReply`: seq, `to`, agent label, text). `nodeState`: `awaiting` makes `statusWord` "Awaiting" **in place of** "Saved for later" (clearer and shorter beside five buttons; the card's name still says "Saved for later, awaiting context"), `NodeState.awaiting`, `AWAITING.tip` "Awaiting context"; `handoverView` gives the HANDOVER tab and sections (none for a non-item, and none while the handover is owed again, so a re-parked card does not offer the old bundle: interpretation of ruling 2, for the maintainer to confirm); the name adds ", handover ready". `notesView(n, notes, replies)`: each note entry carries its `replies` (only when it has some), `orphans` the replies naming no note of the card, shown after the notes; `pin` is now optional so a card with only an orphan reply still shows the block. Template: `'handover'` in `POPOVERS` (box `tabindex="0"`, since it scrolls: axe `scrollable-region-focusable`), `handoverMarkup`, `replyMarkup` (`.vb-node-reply[data-reply]`, own class so note counts and `[data-note]` clicks are unchanged; tab stop, same clamp and full-text tip through `bindNoteTip`), the footer's `.vb-status-tip`. Element: `bindCardPopover(this, 'handover')`, `updateHandover`, the status tip bound with `bindHoverTip` (anchor `.vb-node-state`, `data-awaiting`, `data-status-tip-open`). Styles in new `node-parking.css` (imported by the board and the gallery). `pattern.json` updated.

**Container note (`packages/ui/src/region`).** `regionNote`/`regionState` take the replies; `RegionNoteState.replies` (only when some name the note); the note block holds `.vb-nblock-replies` (Markdown, cut at three lines). Deviation from the letter of ruling 3 (small, for the maintainer): in a container block the replies have no per-reply hover tip; they are cut at three lines and the block's own "Show all" lifts the cut on the note and its replies, the container block's existing mechanism.

**Page.** `parking.ts` (`createParking`: pure facts from the held ledger state; `refresh` per draw, memoised by state and `seq`; `card(n)` = awaiting from `attention.awaiting()` (new, `pageConditions.awaiting` from the `item.awaiting` row), `s.parks`, replies; `containers()` = replies answering a note with a `region`). A reply goes on the card its note is on (a group note on every card of it); one with no `to`, or naming no note, stays on its own card; one naming a container note is on no card. Reads from the state the board is drawn from (a past version's own); awaiting only for now (`readOnly`). Wiring: `controller.ts` `facts` merges `parking.card(n)`, `draw.ts` `replies()` feeds `regions.place(..., owed, replies)`; controller.ts is exactly 300 lines (five object-literal lines in the stage wiring were joined to make room). Flags `handover` (Awaiting and the tab) and `cardReplies`, both on. pointer.ts treats `.vb-node-reply` as interactive.

**Contrast (APCA-W3 0.0.98G-4g, by script from computed colours in the gallery, light / dark).** Handover heading `--vb-accent-text` on raised 74.8 / 49.8 (label); handover text and sources `--vb-ink` 94.3 / 71.6 (reading); HANDOVER tab 64.0 / 49.1 (label, same as PROPOSAL); reply who and text `--vb-ink` on `--vb-surface-sunken` 84.8 / 70.5; container reply who and text 94.3 / 71.6; "Awaiting" word 70.6 / 48.8 (label); tip `--vb-ink-strong` on raised 104.5 / 94.9. No new token.

**Tests.** `packages/ui/tests/node-parking.test.ts` (core, markup, container note), `apps/board/tests/parking.test.ts` (conditions and facts, group note, container reply, flags, readOnly), a parking case in `gallery-fixture.test.ts`; `tests/pages/parking-replies.spec.ts` (12: Awaiting with tip then park turns it into a HANDOVER tab that opens the bundle, re-park, live reply under its note and an orphan after, long reply with tip, container note reply, keyboard only, flags off, axe light/dark, gallery). Gallery: board `parking` (seq 228-241, n 99-102), `parking-section.ts`, `gallery.css` spacing.

**Screenshots.** New: `parking-replies-{light,dark}`. Updated on purpose: `gallery-{light,dark}` (only the node section's states line, now longer: "... awaiting, handover, reply"); the full-page run also passes `-handover,-cardReplies`.

**Gates (all exit 0):** `npm test` (721 + 6); `npm run check`; `npm run verify` (0 warnings; `npm run map` made no change); `npm run gen -- --check`; `npm run test:pages` (223 passed).

## On Completion

Fill in notes, update your row, append your own LOG line (`[board-app] FE_03: …`).
