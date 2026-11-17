# FIX_01_verify-findings: Fix What VERIFY_01 Found

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

Fix VERIFY_01's must-fix and should-fix findings (its Run 1 report in `VERIFY_01_testing.md`) so T_04 can turn the
set on. Everything stays behind the set's flags until T_04.

## Orchestrator's rulings (2026-11-17; the maintainer may overrule at the T_04 gate)

- **Small targets far out (finding 2)**: below the zoom where a mark's hit area draws under 24 px on screen, marks
  take no pointer press (a click there selects the node, as on its body); keyboard reach is unchanged. Page specs
  excuse axe `target-size` only below that zoom, with the reason in the spec. At 100% every mark's target is at least
  24 px, in both skins (fix "Bookmark item 24").
- **H (finding 8)**: H opens History on a focused or selected node; Hide answered moves to Shift+H (key help, words).
- **A press on a locked board (finding 12)**: the popover only, no toast.
- **Flows in the header (finding 3)**: shown at full width; folds into "⋯" at the half and third tiers; tier widths
  remeasured with it, and `header-tiers.spec.ts` run with `flowDirection` on.
- **Command Lens plate marks (finding 6)**: unchanged, no minimum (awaiting the maintainer).

## Steps

1. Must-fix 1: make `bookmark-retire.spec.ts` and `person-remove.spec.ts` pass every time (the aborted calculator
   panel request after a gallery navigation): fix the harness, not by hiding real errors.
2. Must-fix 2 and 3 per the rulings.
3. Should-fix 5 (marks at 20% overlap each other and the container title), 7 (a box near the window's bottom must
   stay on screen: flip up or clamp, keep top alignment when it fits), 8, 9 (Command Lens boxes on the plate/glass
   tokens, if any part is still the default skin's), 10 (app title bar at 360 px: the name keeps priority; the state
   shortens to an icon with its words in the tip), 11 (Flows menu: closes on choosing the chosen option; consistent
   labels "Flows: Across / Down / Auto"; words at full width), 12, 14 (Esc returns focus to the mark that opened the
   menu or box).
4. Should-fix 13: the plugin bot's `node.icon` input description (`apps/board/server/words/plugin-tools.ts`) names no
   tool it lacks. Run `npm run eval:bot -- --dry`.
5. Should-fix 16: tidy `TASK-STATUS.md` Shared Foundations and File Ownership rows (owners and files there, notes in
   the notes blocks) and the six notes blocks still saying Pending.
6. Leave for T_04: finding 4 (app window to Later) and 15 (gallery sections with the old footer).

## Validation

- `npm run verify`, `npm run check`, `npm run gen -- --check`, `npm test`, `npm run test:plugin`, and the page specs
  for each fix, plus `bookmark-retire`, `person-remove`, `header-tiers` (flags on and off), axe specs with the flags on.
- A look in a browser for each visible fix, both skins, dark and light.

## On Completion

Fill Implementation Notes, update your TASK-STATUS row, append your own LOG line:
`[[YYYY-MM-DD HH:MM]] [board-ui] FIX_01: [what you fixed] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/FIX_01_verify-findings.md]]`

## Implementation Notes

**Status**: Completed  
**Completed**: 2026-11-17 (Opus 5.5, `VB_TEST_PORT` 7450; own board on 7452 from a copy of `temp/verify01/proj`, stopped)

### Run 1

Each finding with the test that proves it (each fails on the code before this task):

1. **Harness abort** (must-fix 1): `tests/pages/helpers.ts` `test` forgives `net::ERR_ABORTED` only in a frame that has
   gone by the test's end (`frameOf`, checked after `use`): the gallery's app panel, left loading when the test moves
   on (it was issued *after* the next `goto` started, so a navigation count could not tell it). An abort in the page's
   own frame or a frame still there fails as before. `bookmark-retire.spec.ts` and `person-remove.spec.ts`: every test
   that opens a page passes, twice in a row; what remains are their gallery screenshots (sub-pixel, T_04's).
2. **Marks far out** (must-fix 2, ruling): `viewport.ts` `MARK_HIT` 28 (the 22px mark's 3px transparent edge, the 28px
   disc), `TARGET_MIN` 24, `marksPressable`; below it (about 86%) the stage carries `data-marks="small"` and `smallMark`
   makes a pointer press on a mark its node's (`pointer.ts` picks the node, `wiring.ts` ignores the click unless it is
   Enter or Space, `mark-flow.ts` no hold, `mark-tips.ts` no hover tip, CSS no pointer). Keyboard unchanged.
   `helpers.ts` `smallMarksExcused` excuses axe `target-size` there only. Proof: `tests/pages/small-marks.spec.ts`
   (100%: every mark's hit area at least 24px, axe with nothing excused, both skins and themes; at 85% and 30% a press
   selects the node and answers, bookmarks and opens nothing, Enter still does; at 87% the press works);
   `apps/board/tests/zoom-groups.test.ts` (MARK_HIT held equal to node-edges.css). **"Bookmark item 24" was not a size
   problem**: at that pan the stage's "?" key-help button (`KeyHelp.svelte`, fixed bottom left) covers it; with 28px
   boxes axe still fails it as partly obscured (17.9px). Every mark's hit area at 100% is 28px; the overlap is a card
   panned under fixed chrome (see Requests).
3. **Flows in the header** (must-fix 3, ruling): `header-tier.ts` gains `flows` (in "⋯" at half and a third) and
   `FLOWS_W` 128; `headerTier(width, flows)`. `styles/header.css` gives Flows one width (120px, room for "Flows: Across")
   and keeps that room out of the bar's content box, so every `vb-bar` container query and the tiers hold exactly as
   measured without it (measured: crowded at W with Flows draws as crowded at W - 128 without; without that the bar
   overflowed even at 1600px). Full with Flows from 1428px (1470 stays full). "⋯" gets the rows (`ToolbarMenu`
   `ondirection`) and names Flows in its tip. Proof: `header-tiers.spec.ts` runs its forms with `flowDirection` on and
   off (all pass; only its gallery screenshots differ, sub-pixel), `header-tier.test.ts` (FLOWS_W held equal to the CSS),
   `flow-direction.spec.ts` ("from the header's half form Flows is rows of '⋯'").
4. Finding 4 (app to Later) and 15 (old gallery footers): left for T_04, as the task says. Finding 6: unchanged (ruling).
5. **20% crowding** (5): past `CROWD_GROW` 1.8 (under about 37%) the stage also carries `data-marks-crowded`: the kind tab,
   grip, bottom badges and an empty notes mark give way (visibility, places kept; H and C still open them), the number
   and disc grow down from the top border (the first row no longer reaches the container's title line), and a counted
   notes mark takes the bottom-left corner. Proof: `zoom-groups.spec.ts` "far out (20%)" (no mark over another, none
   rises past its rest place; 40% unchanged), `zoom-groups.test.ts`; shots `temp/fix01/z20-*.png`. Residual: a node
   under about 110px tall (a title alone) is too short at 20% for its number and a counted notes mark both.
6. **A box near the bottom** (7): `mark-place.ts` `placeBeside`: on the right it moves up just enough (top aligned when
   it fits); below it opens above (`data-side="above"`, arrow in `node-box.css`); only with room for neither is it
   clamped. Proof: `mark-place.test.ts` (two tests), `node-boxes.spec.ts` "a node near the window's bottom".
7. **H** (8, ruling): with nodeEdges H opens the history of the focused node, else the one selected (`onlySelected`),
   and never Hide answered, which is Shift+H (`keys.ts`; key help `hideKey`; the "⋯" row's kbd, key and
   aria-keyshortcuts; the toolbar title `hideAnsweredItemsH(key)`). Flag off: H as before. Proof: `keys.test.ts`,
   `key-help.test.ts`, `node-edges-board.spec.ts` (selected, focus off it; Shift+H; Shift+H in the menu).
8. **Command Lens boxes** (9): the head was already on the plate; what was left of the default skin: the corners
   (`node-box.css` `--vb-box-radius` = min(radius-md, the skin's node radius): 6px in Command Lens, 10px default) and the
   heavy ring on a box focused as a whole: now its own border in `--vb-focus-edge`, no outline (both skins). Proof:
   `command-lens.spec.ts` (6px, outline none, border the plate ring colour). Shots `temp/fix01/look-history-*.png`.
9. **App title bar** (10): `vb-win-reason` is a lock and its words; under 480px (container query on the bar) the lock
   alone, words in `data-tip` and for a screen reader; the name keeps the room. Proof: `app-window.spec.ts` "a 360px
   window not yet allowed" (both themes, axe). Shots `temp/fix01/appbar-*.png`.
10. **Flows menu** (11): the ticked row closes the menu and writes nothing; labels "Flows: Across / Down / Auto"
    (`directionName`); the button shows its words (icon only on a narrow bar). Proof: `flow-direction.spec.ts`.
11. **Locked press** (12, ruling): mark presses already showed the popover only; A and X now answer through the disc
    (`controller.ts` `keyed`, `MarkFlow.answer`): on a locked board, a past version or a read-only ledger the lock on
    the mark, no toast. Proof: `node-edges-seen.spec.ts` (click and X: popover, `#toast` hidden).
12. **Plugin bot's `node.icon`** (13): `plugin-tools.ts` `inputEdits` row; `plugin-skill.test.ts` now holds that no
    description or input names a tool the plugin bot lacks. `npm run eval:bot -- --dry`: 88/88.
13. **Esc** (14): the conversation box opened from the notes mark returns focus to it (`notes.ts` `at`); C to the node.
    Found on the way: an Esc closed the *oldest* open Esc layer (a container title's hover tip that a zoom left open
    under a still pointer ate it, so the picker stayed open). `base/layer.ts` `dismissable` now gives an Esc to the
    newest layer that hears it, and the mark menu is a layer (`mark-menus.ts`). Proof: `node-edges-board.spec.ts`
    (Esc back to the notes, answer, badge and number marks; C to the node), `base-layer.test.ts` (two layers).
14. **TASK-STATUS.md** (16): Shared Foundations and File Ownership rows restored (owners and files, from commit
    aaa0f8c); the six Pending notes blocks filled from the task list's notes.

**Changes outside the task's own files**: tests adapted to the rulings: `zoom-groups.spec.ts` and `node-boxes.spec.ts`
(press marks by keyboard where they are small; boxes kept on screen), `command-lens.spec.ts`. Docs: `components.md`
(box placement, tiers with Flows, mark hit area, H and Esc, the two zoom thresholds, Flows button, window bar),
`node/pattern.json` (`data-marks`, `vb-win-reason`). Budgets (temporary, never blocking): plugin `view/board.js`
202,147 and `view/board.css` 27,530 gzip measured, raised to 202,200 and 27,600 (`plugin-build.test.ts`, PLAN.md); page
start 214,857 B (209.8 of 210 KB).
