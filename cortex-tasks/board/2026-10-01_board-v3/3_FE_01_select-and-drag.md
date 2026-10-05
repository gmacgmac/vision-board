# 3_FE_01_select-and-drag: Select cards, move by the kind tab, pan on backgrounds

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (Stage 3,
> maintainer rulings 2026-10-05) · **Tracker**: U5 · **Reference**: Uplynk Architect,
> `prototypes/board-v3-design/architect-extract/` (README §2 points 7, 13; `interactions.js`) ·
> **Spec**: mockup 05 `.card.is-sel` (README revision 13: 1.5px in the card's colour) ·
> **Facts**: `temp/research/stage-2d-2e-3-brief.md` §C (written before N12 split `controller.ts`:
> re-read `apps/board/src/board/` as it is now) · **Model**: Opus 5.5

## Objective

Cards can be selected the way Architect does it, the board never selects text by accident, card
text can be selected and copied on purpose, and a card moves only when you drag its kind tab.
This is step 1 of Stage 3; the lasso, zoom, group notes and moving between containers follow in
3_FE_02 and 3_FE_03, so build seams for them, not the features.

## Rulings (maintainer, do not reopen)

1. **Click** a card selects it alone. **Shift-, Cmd- or Ctrl-click** adds or removes it.
   **Click on the board's or a container's background** clears the selection. **Esc** closes an
   open bubble first, else clears the selection.
2. **Selected look:** 05's `.card.is-sel`, 1.5px in total in the card's own colour (`--kind`),
   with its soft glow. Selection is not focus: the focus ring still shows for the keyboard.
3. **Keyboard (rule 5):** the existing focus route stays (J/K and arrows). **Space** toggles the
   focused card in the selection. Shortcuts that act on "the card" (A, X, C, M, L, O, R) keep
   acting on the focused card in this step.
4. **Moving a card:** ONLY by dragging its kind tab (the grip dots on the top border, already
   styled as the handle in `node.css`). The drop is a pin, as today. Alt+arrows keep nudging.
   Dragging a selected card's tab moves only that card in this step (group move is 3_FE_03).
5. **Inside a card,** a drag selects text so it can be copied (title, body, notes; Markdown code
   blocks included) and never pans. Footer buttons, the size control, the pin and tabs are not
   selectable text. Restore `user-select` accordingly (today `vb-node` is `user-select: none`).
6. **Panning:** a plain drag on the board's background or a container's background (including its
   top line outside its controls) pans. Middle-button drag pans anywhere. While a pan runs,
   nothing on the page gets text-selected (U5); a page test drags across a container's title and
   asserts the document selection is empty afterwards.
7. **Shift+drag on a background is reserved for the lasso** (3_FE_02): in this step it does
   nothing and does not pan, so the gesture is free when the lasso lands.
8. **Selection is view state,** not a ledger event (nothing is decided by selecting). It lives in
   one page module with a small API (`selected()`, `select(ids, mode)`, `clear()`, a change
   event) that 3_FE_02's lasso and selection bar will call. It survives a redraw and drops ids
   that leave the board.
9. **Accessibility:** the selection is perceivable without colour: an accessible state on each
   card (choose a pattern axe accepts for this board's roles and say which) plus a polite live
   region announcing "3 cards selected" / "Selection cleared".
10. **Performance (rule 15, `performance.md`):** selecting touches only the cards whose state
    changed; extend the counting page test (`perf.spec.ts`) so selecting 50 cards updates 50 and
    lays out none.

## Inputs

- **Modify**: `apps/board/src/board/` (pointer, keys, wiring, a new selection module),
  `packages/ui/src/node` (selected state in the core and CSS, `user-select`, `pattern.json`
  states), the gallery (a selected sample, dark and light), `apps/board/src/shell/App.svelte`
  (the help line: "drag the tab to move · drag the background to pan · Shift+click to select
  more"), `tests/pages/` and baselines
- **Do not touch**: ledger formats and schemas (no format change in this step)

## Steps

1. [ ] Failing page tests first: click / Shift-, Cmd-, Ctrl-click / background click / Esc;
   Space on the focused card; drag the kind tab moves and pins; drag on a card body selects text
   and does not move or pan; drag on background pans; drag across a container title leaves no
   selection (U5); Shift+drag on background does nothing; the live region text.
2. [ ] The selection module and the node's selected state; gallery samples.
3. [ ] Pointer rules; `user-select` per ruling 5.
4. [ ] Counting test (ruling 10); axe passes; view baselines before updating.

## Validation

- [ ] All five gates exit 0 (read the exit codes)
- [ ] Board in dark and light: selection matches 05 by eye; text in a card can be selected and
  copied; tracker U5 can be closed

## Constraints

Project rules apply. No new dependency. No commits: the orchestrator reviews and commits. Files
over 300 lines need a reason. Deviation from a ruling: stop and report. Probe scripts under
`temp/` only, deleted after. Fill in the Implementation Notes and return: modules and symbols,
the accessible pattern chosen, tests added or changed and why, baselines, gate exit codes,
anything unsettled.

## Implementation Notes

**Status**: Built, not committed (2026-10-05). All five gates exit 0. Steps 1-4 done.

**Modules and symbols**
- `apps/board/src/board/selection.ts` (new, no DOM): `createSelection()` -> `Selection`
  (`selected()`, `has`, `select(ids, mode)` with `SelectMode` `only | add | remove | toggle`,
  `clear()`, `keep(liveIds)`, `onChange(listener)` -> unsubscribe); `SelectionChange`
  `{ changed, count, text }`; `selectionText(count)`. This is the seam 3_FE_02 calls.
- `packages/ui/src/node`: `nodeState(n, s, tier?, selected = false)` and `NodeState.selected`;
  `nodeLabel(n, status, selected = false)` adds ", selected"; `vb-node.update` sets
  `data-selected`; `node.css` adds the 05 `.card.is-sel` look on `[data-selected]` (border and a
  0.5px ring in `--kind`, `0 0 18px -6px` glow, top hairline 1.5px in full `--kind`; emphasis keeps
  its 2px), `user-select: text` + `cursor: text` on `.vb-node-content`, `cursor: grab` on
  `.vb-node-kind`, the card itself `cursor: default`; `pattern.json` gets the `selected` state,
  `data-selected`, the handle and the text/keyboard notes.
- `cards.ts`: `sync(view, state, versions, selected, tier?)` and a new `restate(ids)` that
  updates only the named cards (it never measures or places); `draw.ts`: `DrawDeps.selected`,
  `Drawing.restate`.
- `pointer.ts` rewritten around one `Gesture` (`move` from `.vb-node-kind` only, `pan`, `press`
  on card content, `reserved` for Shift on a background); `PointerHandlers.pick(id, add)` and
  `clear()`. `.vb-region-head` is out of `INTERACTIVE` and `.vb-region-tools` is in, so the title
  line pans. A `selectstart` guard during pan or move, `mousedown` default stopped for the middle
  button, modified card clicks and Shift on a background.
- `keys.ts`: Space on the card itself -> `toggle(id)` (not on its buttons). `wiring.ts`: plumbs
  `pick`, `clear`; a click on a note that has text selected in it does not open the bubble.
- `notes.ts`: `NoteFlow.open`. `controller.ts`: creates the selection, `keep` on every redraw,
  `clear` on switching boards, Esc = bubble first, else reply panel + clear.
- `places.ts` (new): pin, unpin, size, mode and Reset places moved out of `controller.ts`
  unchanged, so the controller stays under 300 lines (296).
- Shell: `shell.selection`, `<p id="selection-status" role="status">` in `App.svelte`, the help
  line. `board.css`: `.vb-stage { user-select: none }`. `region.css`: grab cursor on the label.
- Gallery: node 79 "Selected" in `gallery.ledger.jsonl`, drawn selected by `node-section.ts`.
- Docs: `components.md` § Selecting and moving; a `performance.md` budget row.

**Accessible pattern (ruling 9)**: the card stays `role="listitem"` (a list item takes no
`aria-selected`, so axe's `aria-allowed-attr` would refuse it, and `listbox`/`option` would break
on the buttons inside a card, `nested-interactive`). The selection is in the accessible name, as
mockup 05 writes it ("Item 42, finding, acknowledged, selected"), plus `data-selected` for the
look, plus a `role="status"` (polite) live region `#selection-status`. axe passes with cards
selected at zoom 1, dark and light.

**Tests (written first: on the old code 12 of the 13 new page tests failed; the one that passed
is the middle-button pan, which was already true)**
- `tests/pages/select.spec.ts` (new, 12): click / Shift / Cmd / Ctrl-click, live text and the
  name; background and container click clear; Esc closes the bubble first, then clears; Space
  toggles and the focus ring still draws; kind-tab drag moves and pins only that card (two
  selected), R puts it back so the ledger is left as found; a drag in a card selects title text,
  no move or pan, `user-select` per part; background drag pans exactly; U5 drag across a
  container title pans with an empty document selection; Shift+drag on backgrounds does nothing;
  middle-button drag on a card pans; selection survives a redraw (H twice); axe x2.
- `tests/pages/perf.spec.ts`: selecting the 50 cards of one container: `cardsUpdated` 50,
  `cardsMeasured`, `cardsPlaced`, `containersLaidOut`, `fullFetches` all 0; clearing: 50 / 0 / 0 /
  0. `linksRedrawn` is left out: each click moves focus, and focus lights connectors (97 here).
- `tests/pages/gallery.spec.ts`: one `vb-node[data-selected]` whose label ends ", selected".
- `packages/ui/tests/node-core.test.ts`: `selected` default, the label, nothing else changes.
- `apps/board/tests/selection.test.ts` (new, 6): modes, change sets, no-op changes, `keep`,
  live text, unsubscribe.

**Baselines (each diff viewed before updating)**
- `board-dark|light`: only the help line differs.
- `gallery-dark|light`: the new "Selected" card (risk, orange 1.5px edge and glow, checked by
  eye in both themes) and everything below it moved down one row.
- `agent-access-dark|light`, `node-size-dark|light`: same content, shifted under 1px because
  the gallery above them grew (expected vs actual compared side by side).

**Gates**: `npm test` 0 (488 unit + 4 timing), `npm run check` 0, `npm run verify` 0 (0
warnings), `npm run test:pages` 0 (87 passed), `node scripts/gen-api.mjs --check` 0.

**Unsettled**
1. No feature flag. Rule 12 asks for one on new behaviour; the rulings make this the behaviour,
   and the old "drag anywhere on a card" would need to live on behind a flag-off path. Say if
   you want `selection` as a flag.
2. A Shift-click on a background clears the selection (ruling 1 read as "any click"); only a
   Shift+drag is reserved. 3_FE_02 may prefer Shift-click to keep it.
3. A click on a card's footer button, size control, pin or note does not change the selection.
4. The live region says the same words when one single selection replaces another ("1 card
   selected" twice), so a screen reader hears it once; the focused card's name still says it.
5. The help line drops "scroll to pan" for the given text and adds "Space select".
6. Plain clicks focus the card (as before), and focus reveals it: a click on a card half off
   screen pans the board.
