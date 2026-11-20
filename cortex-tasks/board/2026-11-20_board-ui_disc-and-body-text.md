---
task_name: The answer disc and card body text
created: 2026-11-20
status: completed
completed: 2026-11-20
model: strong
categories: [board-ui, board-tokens]
skills: [cortex-architecture]
persona: Interaction designer for review tools — an answer is two clicks in one place, and the control says what it does at a glance.
---

# The answer disc and card body text (D-112)

## Problem
The disc reads as a status light, not a tick-or-cross control; ticking needs a move across to the picker; card body
text (13px Figtree) reads small under the 15px Bricolage title. Mockup: `design/mockups/answer-disc/answer-disc-v2.html`.

## Rulings (maintainer, points 656-661; D-112)
1. **The disc**: 28px to 24px (`--vb-answer-size`); the card type's own colour as today; a small tick and cross in it,
   white, while waiting (in place of the dot). In dark mode the disc's fill is the kind's colour 15% toward black
   (`color-mix(in srgb, var(--vb-kind) 85%, black)`, in the disc's own rule, the token unchanged), so white clears Lc
   45 on every kind (measured: 57-70 dark, 68.7-85.1 light). Answered stays as today (white on green or red).
2. **Picker under the pointer** (amends DD-07, "never on it"): hover (after the shared hover delay) or a click opens the
   answer picker with Tick centred exactly on the disc and Cross beside it, so a click without moving ticks. Esc, a
   click elsewhere or the pointer leaving the picker closes it. Keyboard: Enter or Space on the disc opens it with focus
   on Tick. A touch press opens it as a click does.
3. **Body text 14px**: a card's body (paragraphs, lists, the source line) at 14px through a new type token for card
   body text; the title stays 15px; buttons and other 13px text unchanged. Command Lens follows its own scale: keep
   its look unless its body uses the same token.

## Steps
1. Tokens (protected; the maintainer said yes, point 661): `--vb-answer-size: 24px`; a new card body size token
   (14px). Words for any new name in the words file.
2. The disc: `packages/ui/src/node/node-edges.css` (`.vb-mark-answer`), its glyph from the icon set (a tick-and-cross
   icon if none fits; rule 8: no inline SVG), every state (waiting, hover, focus, pressed, saving, failed, locked,
   proposed, ticked, crossed) in both skins, light and dark.
3. The picker: `apps/board/src/board/cards/mark-place.ts` (`right` side today), `mark-menus.ts`, `packages/ui`'s
   `answerPicker`; hover open via the shared hover-tip timing; pointer, keyboard and touch paths.
4. Body text: `packages/ui/src/node/node.css` (`.vb-node-body`) and markdown inside it (`--vb-md-text` inside a card).
5. Tests: the disc's contrast in `tests/plugin/token-contrast.spec.ts` (white on every kind, dark mixed and light, at
   least 45); the picker spec (hover opens it with Tick under the pointer; click without moving ticks; Esc; keyboard);
   the gallery states; renew the baselines this changes (many: every card grows), and name the count.
6. Docs: `docs/specification/components.md` where it states the disc, the picker's side or the body size.

## Constraints
Work in `.claude/worktrees/app-window` (branch `spike/stage-apps`); port 6410-6419; never 4466; a temporary HOME; no
git command that changes state; no PII. Run the tests for what you change; the orchestrator runs the full suite.

## Implementation Notes

Executed 2026-11-20 (sub-agent, Opus 5.5, Single mode), in `.claude/worktrees/app-window`.

**What changed, by step**
1. Tokens (maintainer's yes, point 661): `--vb-answer-size` 28px to 24px; new `--vb-card-text: 14px` (named like
   `--vb-pop-text`: what the size is for). No new sentence anywhere, so no words-file change.
2. The disc (`node-edges.css` `.vb-mark-answer`; `node-edges.ts` `disc`): the dot is gone; a new mark icon
   `tick-cross` (icon set, `MARK_ICONS`; the mockup's two paths) drawn as `.vb-mark-wait` while waiting. Fill
   `light-dark(var(--vb-kind), color-mix(in srgb, var(--vb-kind) 85%, black))` in the disc's own rule. New hover (a
   45% ring in the kind's colour) and pressed (the ring full) states through `--vb-disc-ring`, not on a paused disc or
   past the far breakpoint; saving, failed, locked, proposed, ticked and crossed unchanged. The disc keeps its centre
   on the marks' 34px line (`right: calc(34px - var(--vb-answer-size) / 2)`), so it stays over the notes mark.
3. The picker: `mark-place.ts` `placeOver` (pure: a point of the box on the anchor's centre; `fits`), `MarkSide`
   `right` retired for `over`. `mark-menus.ts`: Tick centred on the disc, Cross on its left (`data-cross="left"`,
   `row-reverse`), flipped right when the stage has no room on the left (a clamp would put Cross under the pointer);
   Left and Right follow the drawing; the pointer leaving the picker and the disc closes it after `CLOSE_GRACE_MS`,
   read from where the pointer is (a picker drawn under a still pointer gets no enter or leave), only once the pointer
   has been on it; `focus: false` for a rest. New `cards/disc-rest.ts`: the rest wait, not on touch, small marks, a
   proposal, a paused board or with another menu or box open; a press cancels it; after a picker closes with the
   pointer still on the disc, the disc is quiet until the pointer leaves (else ticking reopens it at once). The
   "shared hover delay" did not exist as one constant: the layout button's 400 ms `REST_MS` (`region-row.ts`) was the
   one rest-to-open wait, so it moved to `packages/ui/src/tip/rest-open.ts` `REST_OPEN_MS` and both read it
   (`CLOSE_GRACE_MS` is exported from `#ui` too). The picker's row under the pointer or after Tab fills with its
   answer's colour (`menu-fixed.css`), as the mockup's Tick does.
4. Body text: `node.css` `.vb-node-body` sets `--vb-card-text` and `--vb-md-text`; its `#` and `##` stay on the type
   scale (18 and 15px; 15 under a big title: a step over `--vb-md-text` counted from the card's body size, so they
   still grow with a popover's text), so a `##` never outgrows the 15px title (`big-titles.spec.ts`, `markdown-more.spec.ts`
   hold). Command Lens reads the same rule, so its body is 14px too (the ruling's "unless its body uses the same
   token").
   **A fix beyond the plan, needed by it** (`apps/board/src/board/canvas/draw.ts`, `fontsLoaded`): cards were measured
   once, before the web font loaded, and never again. At 13px the fallback and Figtree happened to wrap the timeline
   tests' long body to the same height; at 14px they don't (190 against 169px), so a timeline drawn down put its stem
   10px off its card (`timeline.spec.ts` "from 20% to 250%", "Move to", "the layout menu", all green on HEAD). Now
   every card is measured again on the document's `loadingdone` and laid out again if one changed (`resized`).
5. Tests: `token-contrast.spec.ts` (white on every kind's disc fill, 45, both skins, light and dark; the old wait-dot
   pair replaced); `node-edges-board.spec.ts` (click opens it over the disc, Tick centred, Cross left, Left and Right,
   Esc, two clicks in one place tick, quiet after a choice, click elsewhere; Enter and Space; a rest opens it with
   focus kept, a crossing opens nothing, leaving closes it; zoom keeps Tick on the disc); `node-edges.spec.ts` (24px,
   on the 34px line, the tick and cross shown, title 15px, body 14px); `mark-place.test.ts` (`placeOver`). Gallery:
   "The answer picker over the disc" (`edges-section.ts` `withPickerOver`, Tick in its hover look via
   `data-look="hover"`).
6. Docs: `components.md` (the element, the menus, styles, the disc on the board, the edge gap, the box beside a node);
   `layout/src/types.ts` `EDGE_ROW_GAP` comment (12px above now, the gap unchanged); pattern.json; modules map.

**Measured**: white on the disc, from the page: dark action 57.3, decision 66.0, question 66.6; light action 68.7,
decision 85.1, question 78.0 (the ruling's figures). Plugin bundle (gzip, `buildPlugin`): `view/board.js` 209,456
(HEAD 208,837, already over its 208,700 budget; this change +619); `view/board.css` 26,524 (HEAD 26,357, budget
26,500; +167). Board page start weight 214.4 KB (219,540 B) against its 214.2 KB budget; HEAD 214.1 KB (219,231 B), so +309 B (`npm run verify` `PAGE`, `scripts/verify-weight.mjs` `pageWeight`). Budgets move only by a
decision: raised to the maintainer.

**A test this change tips over, not fixed here**: `proposals.spec.ts` "axe passes with the bar, an open box and one out
of date" (light and dark). On HEAD as here, card 1's proposal box opens on its right over card 2 and covers card 2's
notes mark; on HEAD axe calls the mark "fully obscured" and skips it; with the taller body it shows 11px below the
box's Accept, so axe's `target-size` fails it. The box covering a neighbour's control is the real fault (box placement,
`placeBeside`), outside this task.

**Baselines renewed: 150 of 156** (`--update-snapshots=changed` over the 47 specs that hold screenshots, ports
6410-6419, a temporary HOME): every card grows with its body, and pages that hold cards shift by a pixel. Only the two
`proposals.spec.ts` axe tests failed in that run (above). Then, without renewing: `node-edges`, `node-edges-board`,
`node-edges-seen`, `timeline`, `gallery`, `command-lens`, `big-titles`, `markdown-more`, `board`, `answer-model`,
`focus-return`, `layout-controls`, `container-rail-hover`: 182 passed. `token-contrast.spec.ts` (plugin): 5 passed.
Unit tests of `apps/board`, `packages/ui`, `tokens`, `layout`: 1,672 passed, 1 failed (the bundle budget above).
`npm run check` clean; `npm run verify` fails only on the page weight.

**Looked at** (Playwright Chromium at 2x, gallery and the roadmap board, light and dark, both skins): waiting, hover,
pressed, ticked, crossed, proposed, saving, failed, locked discs; the picker opened by a rest (Tick green under the
pointer, focus not moved) and by Enter (Tick focused, ring); leaving closes it; Command Lens's body at 14px.

### Caught Beyond the Brief
- A double click on the disc now ticks (two clicks in one place, as ruled). DD-07's "a double click never answers" is
  gone with it; `REPEAT_MS` still stops a third.
- On an answered disc the picker opens with Tick under the pointer whether or not Tick is lit; a click on a lit Tick
  clears the answer. The picker's rows carry no lit state, so nothing says "this clears". Worth a look.
- The disc's own tip ("Tick · A  Cross · X") no longer shows on hover (the picker opens first at 400 ms); the keys
  still show on keyboard focus, and the picker rows are named with them.
- The box beside a node (conversation, proposal, history) stays 13px; the spec said it was "the node's body text
  size", now 1px under the body. Kept to the brief (other 13px text unchanged); the spec now says 13px.
- `--vb-answer-wait` is no longer read by anything (the dot is gone); a protected token, left for the maintainer.
- New behaviour shipped without a flag, as the task planned it (project rule: new behaviour behind a flag).

**Follow-up (orchestrator, full suite on 2d0bf55e): four tests that pass on HEAD failed every run.**
- `board-host.spec.ts:18` and `:187`, and `board-guest.spec.ts:185` failed on the listener count after `unmount`: 2
  where 0 was expected, one per board. The cause was `cards/disc-rest.ts`, whose `pointermove` on the document (and
  its stage listeners) were taken off with an `AbortController`. The host counts listeners by `removeEventListener`,
  as a host may, so an abort counts as a leak. Fixed at the cause: `createDiscRest` keeps its listeners and `destroy`
  removes each by name, as the rest of the board does. Nothing was left in the body; the count was of listeners.
- `zoom-groups.spec.ts:85` asserted the old picker side (DD-07: `near(p.x, disc.x + disc.width + 6, 2)`, the picker to
  the right of the disc). The test now asserts D-112's rule instead: Tick's centre stays on the disc's centre at 40% and
  250%, the picker one size. That is the only test change.
- Rerun (ports 6410-6419, a temporary HOME, `--config tests/pages/playwright.config.ts`): board-host, board-guest,
  zoom-groups, node-edges, node-edges-board, answer-model: 49 passed.
