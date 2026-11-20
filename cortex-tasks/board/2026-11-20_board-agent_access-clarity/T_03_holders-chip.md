# T_03: Holders as one chip

**Objective**: The container title shows who holds it as one small chip, not a row of names (PLAN.md Decision 7).
**Skills**: cortex-architecture · **Port**: `VB_TEST_PORT=6400`

## Steps
1. Today: `packages/ui/src/region/region-template.ts` `holdersTemplate`, filled by `vb-region.ts`; removable holders are
   buttons (`data-revoke`). Find the board's existing popover or tooltip pattern for a hover list and reuse it; none
   fits: stop and ask.
2. Chip: person icon (from the icon set) and the count, after the title, same shrink order as the holders today.
   Hover or focus opens the list: each holder's label, `created` on the creator, and Remove on each removable one.
   Keyboard: Tab to the chip, Enter or Space opens, Esc closes, focus returns. Words in `packages/ui/src/words/region.ts`.
3. Styles in a new `packages/ui/src/region/region-holders.css` (imported where `region.css` is); tokens only.
4. `pattern.json` states; gallery entry; page test: chip count, list on hover and focus, Remove revokes, axe, light and
   dark; renew the screenshots that change.

## On completion
Notes here and your row; one LOG line `[board-ui] Completed: T_03 …`; the return block.
