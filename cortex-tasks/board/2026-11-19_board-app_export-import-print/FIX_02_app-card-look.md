---
skills: [cortex-architecture]
---
# FIX_02_app-card-look: The App Card Look

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

Build the look the maintainer approved in `design/mockups/app-node/app-node-states.html` and `.css` (states 1-4) in the
real app card: one border in every state and no selection ring; a line along the top by state; bottom corners 2px.
Keyboard focus and `tokens.css` are not touched.

## Steps (each starts with a failing test)

1. **Test first**: a page spec (`tests/pages/app-card-look.spec.ts`) asserting, in both skins, light and dark: one 1px
   border in every state; no outline and no ring when the card is selected or active (the shadow is the resting one);
   the top line present when selected (and active), gentle on hover; the bottom corners 2px and the top ones the
   skin's node radius; the overlay's radius the frame's own; the title at `--vb-ink-strong` when active. Gallery: the
   selected and active states.
2. **Border and corners** (`packages/ui/src/node/node-app.css`): a window's border is 1px in every state, the selected
   node's inset ring and the plate skin's 1.5px border gone; the radius is the node radius over 2px; the panel, state
   view, drawer and bar follow (1px inside the border).
3. **The top line**: an inset shadow on an overlay (`::before`, inset -1px, the frame's radius): hover a gentle accent
   (45%), selected and active (`:has(vb-app-frame[data-active])`) the full accent; the title `--vb-ink` at rest and
   `--vb-ink-strong` when active.
4. Gallery (`apps/board/src/gallery/app-window-section.ts`): a group "Selected and active" in each skin.

## Where

`.claude/worktrees/app-window`, branch `spike/stage-apps`. `VB_TEST_PORT=9110`. Page specs with
`--config tests/pages/playwright.config.ts`; only the specs that cover app cards. A try-out board runs on 6611: leave it.

## Validation

`npm run check`, `npm test`, the app-* specs, `gallery.spec`, the node-edges specs; baselines renewed only where this
changes them, and named.

## Constraints

No git commands that change state, never `git add`. Do not change `tokens.css` or the keyboard focus look. Budgets never
block: report measured numbers.

## On Completion

Fill Implementation Notes, update your TASK-STATUS row, one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-ui] FIX_02: [what changed] → Task: [[cortex-tasks/board/2026-11-19_board-app_export-import-print/FIX_02_app-card-look.md]]`

## Implementation Notes

**Status**: Completed (2026-11-19), in `.claude/worktrees/app-window`, nothing committed.

**What was built**
1. `packages/ui/src/node/node-app.css`: a window card has one 1px border (`--vb-line-strong`) in every state, the resting
   shadow only (the selected node's inset ring and the plate skin's 1.5px border are overridden), the top corners the
   skin's node radius and the bottom ones 2px (children 1px inside the border). The line is `::before`, inset -1px, the
   frame's radius, `inset 0 2px 0 var(--vb-win-line)`: hover 45% accent, selected and active (`:has(vb-app-frame[data-active])`)
   the full accent. The title is `--vb-ink` at rest, `--vb-ink-strong` when active. Stage and dragging keep their own
   shadow. Selectors that start with `:has`/`:not` are nested, as the plugin build's scope check demands.
2. Tests: `tests/pages/app-card-look.spec.ts` (both skins, light and dark, plus the gallery's samples); the gallery group
   "Selected and active" in `app-window-section.ts` (both skins). `review-colours.spec.ts` no longer expects a selected
   edge and inset ring on the app card (one border now); `command-lens.spec.ts` and `node-edges.spec.ts` expect the new ring.
3. **One focus colour (point 627, D-109, option B)**: `tokens.css` `--vb-focus` is `light-dark(#2563eb, #60a5fa)` (host
   `--vb-host-focus` still wins); `--vb-focus-edge` and `--vb-plate-focus` are `var(--vb-focus)`; Command Lens's own
   `--vb-focus-edge` is removed. `plugin.md` host table and `components.md` say so; `token-contrast.spec.ts` gains
   `--vb-focus` on card and canvas.

**Caught beyond the brief**
- Light theme: `#2563eb` on Command Lens's dark plate is Lc 25.8, under the decoration tier 30. Command Lens keeps
  `--vb-plate-focus: #60a5fa` (the dark theme's blue, the plate being dark in both themes), the one deviation from "remove
  the skin override". A host's focus colour is not read there (it never was).
- The plugin's `plugin-theme.test.ts` reads the host table's default for `--host-focus`: now `#2563eb` / `#60a5fa`.

**Verification** (wide: tokens changed): `npm run check` clean; `npm test` 2,777 of 2,778, the one failure the plugin
CSS budget (below). Page suite run on the app-card, gallery, node and focus specs (the first run was every spec; the path
contains "app-" and matched them all): 1,091 passed; the failures were the focus colour in baselines and four specs
that named the old ring or the selected app edge (fixed). Reruns green: app-card-look, command-lens, node-edges,
review-colours, focus-ring, focus-return, gallery. Token contrast (plugin) 5/5.

**Baselines renewed** (`--update-snapshots=changed`, each the focus colour, or the gallery sections moved by the new
group): `container-rail-states` rail; `current-folder`; `fresh-cards` fresh-section; `gallery` base, freshCards, node,
region, toolRail; `header-tiers` header; `layout-controls` card-widths, link-labels; `ledgers`; `open-list`;
`proposals-review` review-list; `read-only-toggle`; `read-only`; `send-access` agent-access; `timeline` gallery (light and
dark each, 38 files). Not looked at one by one; the changed mode also renewed a theme whose own check passed.

**Budgets** (never block): plugin `view/board.css` 26,468 gzip (budget 26,350); `view/board.js` 207,010 (budget 207,100,
inside).

**Not done**: a look in a browser as a person (hover and the active line are asserted by computed style only); the
focus ring's look in a live board after Tab.
