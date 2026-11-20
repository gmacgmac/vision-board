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

## Implementation Notes (T_03, 2026-11-20)

- **Pattern reused, none invented**: the shared hover tip `bindHoverTip` with `opens` (`packages/ui/src/tip/hover-tip.ts`, the
  card popover's rules: hover or focus opens, Enter, Space or a click keeps it open, Esc and a press outside close; WCAG 1.4.13)
  and the shared popover surface (`.vb-surface-pop`). New: `region-holders.ts` (`bindHoldersTip`, 20 lines: the binding, `aria-expanded`,
  focus back to the chip on Esc via `returnFocus`) and `region-holders.css` (the old holder rules moved out of `region.css`).
- **Markup** (`holdersTemplate`): `button.vb-holders-chip` (icon set `user` via `icon()`, count; named "N agents have access"; aria-expanded,
  aria-controls) and `div.vb-holders-pop[role=dialog]` with a list: label, "Created this container" on the creator, a Remove button
  (`data-revoke`, named "<label>: remove access") on the rest. No holders: no chip. Words in `words/region.ts` (`holdersChip`, `holdersList`;
  `removeAccess2` dropped); `regionIds` gained `holders`.
- Read-only board: the Remove buttons hide (board.css) but the list still opens; the old rule that disabled pointer events on the holders is gone.
- **Tab order**: the chip is a new Tab stop between the grip and the rail; `container-rail-states.spec.ts` follows it.
- **Gallery**: the Agent access section's two frames show the chip at rest and hovered (list open); a new last-of-all section `holdersChip`
  shows one holder, many (a long label wrapping), focus (list open) and none. A longer note under "Holders on a container" shifted every later
  section by a fraction of a pixel and failed their screenshots, so that note keeps its two lines and the states live in their own last section.
- **Tests**: `region-template.test.ts` (chip, list, escaping); `send-access.spec.ts` (chip count, list on hover, Remove and Cancel, Remove revokes,
  keyboard Tab / Esc / Enter / Space and focus return, axe in light and dark with the list open, both gallery sections and their screenshots);
  `container-title.spec.ts`, `container-polish.spec.ts`, `zoom-level.spec.ts`, `container-rail-states.spec.ts` follow the chip; the
  `holdersChip` feature joins the "last section" exclusion lists in `ledgers`, `header-tiers`, `read-only`, `read-only-controls`.
  Screenshots renewed: `agent-access-{light,dark}` (its frames changed), new `holders-chip-{light,dark}`. No other screenshot changed
  (the 44 specs that draw a container, the gallery sections and the screenshot specs for them were run: all pass).
- **Docs**: `components.md` (top-line shrink paragraph; new paragraph "The holders chip"), `region/pattern.json` (held, files, events, accessibility).

### Caught Beyond the Brief
- `npm run verify`: the board page is 214.7 KB gzip, budget 214.6 (`docs/specification/performance.md`, `scripts/verify.mjs` `PAGE`). Main measures
  about 214.5; this task adds about 0.2 KB (the chip's markup and binding). Raising the budget needs a reason in the PLAN: left to the orchestrator (REQUESTS).
- No new flag: the chip replaces the holders under `agentAccess` (already a flag); keeping both renderings would double the template.
- A chip with no room leaves the line whole, as the holders did; on a one-card frame at 100% it is out of sight (as the holder was), so
  `container-title.spec.ts` no longer expects `o holders whole`.
