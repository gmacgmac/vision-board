---
task_name: The selection pill opens into a 3×3 grid, Comment under the pointer
created: 2026-11-24
completed: 2026-11-24
status: completed
categories: [board-ui]
type: implementation
model: strong
persona: Interaction designer and front-end engineer — the second click lands where the first one did, every cell is reachable by keyboard, and nothing the person didn't aim at sits under the pointer.
skills: [cortex-architecture]
tracker:
---

# Task: The selection pill opens into a 3×3 grid, Comment under the pointer

---

## Problem

With cards selected, the pill ("2 selected", `selectionPill`) opens the selection bar, one row of eight
commands. `placeBar` (`packages/ui/src/selection-bar/selection-bar-core.ts`) centres the opened bar over the
selection, so the wide row re-centres and Remove lands under the pointer: the maintainer nearly removes cards
when they mean to comment. Labels also wrap ("Reset places" on two lines).

## Rulings (maintainer, chat points 773 and 775: the approved mockup)

1. A click or Enter on the pill turns it into a 3×3 grid placed so Comment's centre is at the click point (the
   keyboard: the pill's centre); Comment takes focus, so a second click comments.
2. Rows: "N selected" (centred like a button; a click closes; weight medium, not bold), Reset places, Remove
   (danger look). A thin divider. Save for later, Width, Zoom. Move to, **Comment** (primary), Bookmark all.
3. No room above: the rows reverse and it opens downward; Comment stays under the pointer, Remove stays farthest.
   Clamped to the stage sideways.
4. No wrapping; cells as wide as the longest label; each cell its command's icon where the icon set has one
   meaning that (no new assets).
5. Unchanged: the commands, words, keys, disabled states, a missing command leaves its cell empty (the shape
   holds), Esc and click-outside close, the area bar.
6. Arrow keys move between cells, focus visible, 24px targets, APCA light and dark.
7. Behind a new flag; off, today's bar.

## Plan (how it meets `docs/principles.md` and the `cortex-architecture` skill)

- **Reuse the pattern** (`selection-bar`): a new state of the same element, not a component. `BarView` gains
  `cells` (the grid's eight command slots after the label, `null` for a missing command); the template draws the
  grid when it has them; `pattern.json` gains the states `grid open`, `grid below`, the `data-grid` attribute,
  the cell parts and `vb-toggle`'s `at`.
- **Placement is pure, beside `placeBar`**: `placeGrid(at, size, anchor, stage)` and `gridStep(index, key,
  flipped, usable)` in `selection-bar-core.ts`, unit-tested. The anchor cell is the pattern's (the far row's
  middle), whatever command the page puts there; the page puts its primary there.
- **One command table**: the grid's order is a row of `apps/board/src/board/input/commands.ts`
  (`SELECTION_GRID`), the icon and danger look are columns of `COMMANDS` (`icon`, `danger`); `barButtons` passes
  them. Commands, words and keys unchanged.
- **Icons from the icon set** (`packages/ui/src/icons/icon.ts` `icon`): Comment `notes-group` (a group note),
  Reset places `put-back`, Save for later `clock`, Bookmark all `bookmark`; and, on the maintainer's ask during review
  ("if two have icons then they should all have icons"), four new ones in `icon-set.ts`: `move-to`, `width`,
  `zoom-to` (the lens with a plus, so never Search's) and `trash` (Remove; the cross stays the answer's ✗).
- **Danger look**: `--vb-glass-cross` on the glass (already a checked 45-tier pair, `token-contrast.spec.ts`).
- **Flag**: `selectionGrid` in `packages/format/src/flags.ts`, off by default; needs `selectionPill`.
- **Words**: no new sentence (the grid reuses every label and title).
- **Page wiring**: `selection-flow.ts` keeps where the pill sits and where in it the click landed, and places the
  open grid with `placeGrid` from there on every placing; `controller.ts` passes the flag.

## Steps

1. Core: `placeGrid`, `gridStep`, `BarView.cells`, `barView`'s `cells`; unit tests first.
2. Template and CSS: the grid markup (cells with `data-row`, the divider, gaps), rows reversed on `data-side=below`.
3. Element: `vb-toggle` carries the click point; `anchor()` measures the anchor cell; focus the anchor on open;
   arrow keys.
4. Board: `SELECTION_GRID`, `icon`/`danger` in `COMMANDS`; the flow and controller; the flag.
5. Gallery: the grid open above, open below, paused and without Remove.
6. Page test `tests/pages/selection-grid.spec.ts`: opens under the pointer above and below, Comment focused and a
   second click comments, arrows, Esc and outside close, 24px, no wrap, axe and the Remove pair's Lc, light and
   dark; off, today's bar (the pill spec).
7. Look in a browser, light and dark, above and below; LOG; commit.

## Constraints

Worktree `.claude/worktrees/selection-grid-96673a` (branch `claude/selection-grid-96673a`); `VB_TEST_PORT=4766`;
never 4466. No new token or sentence; icons only as the maintainer asked. Don't merge.

## Implementation Notes

Executed 2026-11-24 (Opus 5.5, direct).

- **Core** (`selection-bar-core.ts`): `GridCell`, `GRID_ANCHOR`, `barView`'s `cells`, `placeGrid`, `gridStep`,
  `isGridKey`. **Template**: the grid's nine cells with `data-row`, the divider, gaps, `data-anchor`, icons and
  `vb-sb-danger` (only in the grid; the one-row bar's markup is unchanged). **Element**: `vb-toggle`'s `at`, focus on
  the anchor as it opens, `anchor()`, arrow keys. **CSS**: one CSS grid, `repeat(3, 1fr)` in a max-content box (all
  columns as wide as the widest label), rows placed by `data-row` and reversed on `data-side=below`; the label muted
  at medium weight (maintainer's review: "the N selected should always be muted"); Remove in `--vb-glass-cross`.
- **Board**: `SELECTION_GRID`, `gridCells`, `icon`/`danger` columns in `COMMANDS`; `selection-flow.ts` keeps the
  pill's place and the click's offset in it and places the open grid with `placeGrid` from there on every placing;
  flag `selectionGrid` (off by default; needs `selectionPill`), `controller.ts` passes it.
- **Gallery**: a "The grid" group with the flag on: upward and downward from a marked click, locked with Remove off,
  focus and hover. `pattern.json`: the description and the gallery-shown fields keep their height (a taller section
  shifted every later section by a fraction of a pixel and failed ~70 screenshots on text antialiasing); the grid is
  described in `placement`, `parts`, `attributes`, `methods`, `events`, `accessibility`; states add `grid`,
  `grid below`. Baselines updated: the selection-bar section only (`gallery-selection-bar-*`,
  `selection-pill-gallery-*`), the states line's two new words.
- **Page weight**: 215.91 KB gzip; budget raised 214.8 → 216.0 (maintainer's yes, 2026-11-24: raise to the measured
  figure; +0.1 headroom as the earlier raises), `scripts/verify-weight.mjs` `PAGE`, `performance.md` § Budgets.
- **Tests**: `packages/ui/tests/selection-grid.test.ts` (8, placement, steps, template); `selection-bar`,
  `icon-set` and the related board unit tests (404 pass); `tests/pages/selection-grid.spec.ts` (opens up and down
  under the pointer, Comment focused and a second click comments, Enter, arrows past disabled cells, Esc, label and
  outside close, 24px and one line, axe and APCA of the label, Remove and a cell on the grid's glass, light and dark);
  `selection-pill.spec.ts` (flag off: today's bar) and the 35 gallery specs: 446 + 4 updated, all pass.
  `npm run check`, `npm run verify` clean.
- **Looked at**: the board in the browser, light and dark, opening upward and downward (screenshots in the session's
  notes folder, `selection-grid/`), Comment under the click both ways.
- **Found**: a page-test filter by file name matches every spec in this worktree (its path holds `selection-grid`), so
  filter with `pages/<name>.spec`; a look server must sit outside the test workers' port block (4866 collided).
- **Not done**: the full page suite once at the set's close (one run here was the whole suite by accident, before
  the icons: no failure but the gallery shift above). The flag ships off: the maintainer turns it on.
- **Follow-up (maintainer, point 788 and "merge it with the feature active")**: the closed pill's "N selected" steps
  down to medium (`--vb-weight-medium`) and the grid's label to regular (one step below it), still muted;
  `selectionGrid` is on by default. `selection-pill.spec.ts` tests the one-row bar with `-selectionGrid`;
  `selection-grid.spec.ts` gains the gallery's grid samples (axe, light and dark). Baselines: 78 gallery images, every
  later section moved a pixel by the grid samples and the pill's narrower label (diffs checked: shift only). Ran: the
  related unit tests (44), the pill, grid, gallery and the 35 gallery-screenshot specs (451 pass; one APCA read in
  `update-signals.spec.ts` failed under load and passed 6 of 6 alone), `npm run verify` clean. Full suite: after merge.
- **After the merge (main eafe1196, full page suite, `VB_TEST_PORT=4766`)**: 13 failed, 1142 passed, 10 did not run
  (`budgets`, behind the failures). Caused by the grid on by default: `selection-bar-edges.spec.ts` "…before Zoom" and
  `zoom-and-lasso.spec.ts` "the selection bar: …; centred above the selection" test the one-row bar's order and
  centring, so they now open it with `-selectionGrid` (the grid's order and placement are `selection-grid.spec.ts`'s);
  10 gallery screenshots (`big-titles`, `go-to-card`, `key-bubble`, `picker-archive`, `versions`, light and dark)
  moved a pixel under the taller selection-bar section (diff: one line's antialiasing), baselines updated. Not the
  grid: `timeline.spec.ts` "a drag anywhere on a dated card…" read the cursor mid-drag under load; it passes 3 of 3 alone
  here and on main before the grid (5366810c). After: the 13 and the 10 `budgets` tests pass; verify clean.
- **Polish (maintainer, 2026-11-24, points 788-792 and D-119)**: a disabled primary drops its fill (`.vb-sb-primary:disabled`);
  the grid's count says why its acting cells are off ("· locked", "· read-only", "· past version";
  `words/commands.ts` `selection*`, `#ui` `selectedBecause`), and in a past version the grid shows them disabled where the
  one-row bar leaves them out; cells at regular weight; the closed pill rests quiet (muted ink on the canvas, no glass or
  shadow) and takes the full look on hover, focus or open. Focus ring only after Tab (D-119): `#ui` `bindFocusMoves`
  marks the root and every `.vb-board` `data-vb-keys` from a Tab to the next pointer press; `base/a11y.css` and
  `shell.css` draw the ring through `--vb-ring-style`; every pattern's own ring removed (node, edges, app frame and
  window, region grip, tiles, layout, holders, image view, menu face, chat grip, the node box's focus line); the
  `data-pointer-focus` mark and `focusCame` are gone; the chat panel follows the switch (`chat-host.css`); the gallery
  binds it. `npm run verify` `checkFocusRing` fails a pattern drawing its own ring. Plugin budgets (maintainer's yes,
  2026-11-24): `view/board.js` 210,600 (measured 210,527; over 209,800 on main already before the grid, 209,956),
  `view/board.css` 27,100 (27,043). Tests changed to the new rules: focus-ring, container-zoom, select, app-cards,
  container-title, header-tiers, ledgers, command-lens, chat-attach-gallery (ring after Tab), person-remove,
  reset-places, versions (disabled, not absent); new: grid locked, regular weight, quiet pill with APCA light and dark.
  Baselines: the pill gallery (the quiet pill and its new hovered sample) and 86 gallery images that moved a pixel
  under that sample (proven: without it, all but one passed, and that one was a test fix). Ran: those specs, the
  related unit tests (2,816), verify; the full page suite once (stopped near its end; its failures are the above).
