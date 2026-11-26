---
task_name: An XL width, and Width in the card's right-click menu
created: 2026-11-26
completed: 2026-11-26
status: completed
categories: [board-ui]
type: implementation
model: standard
persona: Interaction designer and front-end engineer — a width is one right-click away, and the new size follows every rule the other sizes keep.
skills: [cortex-architecture]
tracker:
---

# Task: An XL width, and Width in the card's right-click menu

## Problem
Setting a card's width needs select, open the pill, open the grid, Width. And L is the widest choice.

## Rulings (maintainer, chat points 831-834, 840-841)
1. Widths the person picks: S, M, L, XL, Auto. XL is the person's only: agents keep S, M, L (`NODE_SIZES`), so
   the skill, the agent contract and `eval:bot` do not change.
2. XL is 600px: a new token `--vb-card-w-xl: 600px` beside `--vb-card-w-l` in `packages/tokens/src/tokens.css`
   (approved, 833).
3. The card's right-click menu gains "Width ›", offering the same S / M / L / XL / Auto as the selection bar; it
   sets the card right-clicked, or every selected card when that card is in the selection.
4. Rides the existing `nodeSize` flag. No new screenshots, no full page suite, no skill changes (834).

## Steps
1. Contract first: `ACT_SIZES` (`packages/format/src/ledger.ts`) becomes s, m, l, xl, auto; `npm run gen`; bump
   the OpenAPI minor version if the generated file changed.
2. `sizeTier` (`packages/layout/src/size.ts`) returns the person's xl; emphasis never steps up past l.
3. `vb-node[data-size='xl']` in `packages/ui/src/node/node.css`; the token; `pattern.json` data-size doc; the
   `nodeSize` flag's description in `flags.ts`.
4. Right-click menu (`packages/ui/src/node/node-menus.ts` `contextMenu`, `apps/board/src/board/cards/mark-menus.ts`):
   reuse the selection bar's width menu (`apps/board/src/board/selection/bar-acts.ts`) rather than a second one.
   Words in the words files (`commandsWords.widthRow` already gives XL).
5. Gallery: the sizes row gains an XL card. Docs naming the widths (grep "S, M, L") say XL too.
6. Tests: format/layout unit tests, the right-click menu rows, a targeted page spec for Width from the right-click
   menu; `npm run verify`. A look in light and dark.
