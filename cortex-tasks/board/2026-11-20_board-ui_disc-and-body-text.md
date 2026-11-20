---
task_name: The answer disc and card body text
created: 2026-11-20
status: planned
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
