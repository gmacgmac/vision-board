# Open-Cards List and Container Title - Plan

> **Status Doc**: [TASK-STATUS.md](./TASK-STATUS.md) · **Created**: 2026-10-19 · **Source**: maintainer,
> chat 2026-10-19 (points 43-46) · **Branch / worktree**: `feat/open-list-container-title` in
> `.claude/worktrees/open-list-title` (the maintainer's board runs from the main checkout)

## Problem Statement

The toolbar's "N open" chip says how many cards need the person but can't take them to one. A
container can only be moved by its small grip at the far left of its title line, which is hidden when
zoomed out; a drag on the title pans the board instead.

## Current State

- `apps/board/src/shell/Toolbar.svelte`: "N open" is a plain `<span class="vb-chip" data-tone="open">`;
  counts from `counts` (`packages/actions/src/board-state.ts`) via `toolbar-counts.ts` `showCounts`.
  The Containers finder is a native `<select>` (`finder.ts` `containerRows`, `rowText`,
  `zoomToContainer`; containerFinder flag). Go to card: `go-to-card.ts` (pans to and focuses a card).
- Container title line: `packages/ui/src/region/region-template.ts` (`.vb-region-head` =
  `.vb-region-label` [grip, h2, count, retired, holders, tip] + `.vb-region-tools`), `region.css`
  (`justify-content: space-between`; the label pans the board, 3_FE_01 ruling 6; the grip is the only
  move handle, 3_FE_04 ruling 5, hidden at `[data-zoom='far']`). The head is drawn at screen size
  (scaled by `1 / --vb-zoom`), so as the board zooms out the frame narrows on screen while the title
  line does not. `apps/board/src/board/pointer.ts` (`GRIP`, `DRAG_THRESHOLD`, `kind: 'frame'`),
  `container-drag.ts`.

## Proposed Solution

1. **Open-cards list (43).** The "N open" chip becomes a dropdown control listing the open cards as
   "number · title" in board order; choosing one goes to the card exactly as Go to card does. The rows
   come from one shared definition of "open" (a function beside `counts` returning the open items, so
   the count and the list can never disagree). Reuse the Containers finder's pattern (one dropdown
   pattern for both) styled as the chip. With nothing open, it stays a plain chip. Built so "replied"
   and "Later" can reuse it later (not asked for yet: out of scope).
2. **Title centred, sliding left when tight (44).** The maintainer's concern: zoomed out, a centred
   title would hit the tools on the right, so it should move left at the extremes. Algorithm, CSS-only
   per frame: the head is `[spacer][label][tools]` in one flex row; the label has
   `margin-inline: auto`; the spacer is a pseudo-element whose flex basis is the tools' width
   (`--tools-w`, set by the element only when its tools change — modes, widths switch, comment —
   never per zoom), and it may shrink. With room, the auto margins centre the label on the frame. As
   the frame narrows on screen (zooming out), the margins collapse first, then the spacer shrinks, so
   the label slides smoothly left until it reaches the start; only then does the title truncate ("…",
   the existing shrink order). No JS on zoom (rule 15). If testing shows a flaw, keep the behaviour
   and say how the algorithm changed.
3. **Drag by the title (45).** A drag on the grip, the title or the count moves the container; a click
   still does what it does today (`DRAG_THRESHOLD` tells them apart). One hover tint over grip and
   title (the grip's hover look), `cursor: grab`. Works zoomed out (the title shows there; the grip
   doesn't). Keyboard move stays on the grip (Alt+arrows). Supersedes 3_FE_01 ruling 6 for the label
   (a component ruling; record it in components.md).

## Dependencies

- Wave 1: FE_01 (open list) and FE_02 (title), disjoint files. FE_01: toolbar, `packages/actions`
  (the open-items function), finder / go-to-card reuse, `apps/board/src/styles/board.css`, its gallery
  section. FE_02: `packages/ui/src/region/*`, `pointer.ts`, `container-drag.ts`, the region gallery
  section. `apps/board/src/gallery/main.ts`: at most one line each, append only.
- Wave 2: VERIFY_01.

## Out of Scope

- "replied" and "Later" dropdowns (43D, not asked yet). Container note or tool changes.

## Risks

| Risk | Mitigation |
|------|------------|
| A click on the title starts a drag by accident | 4 px threshold; page test: a click still selects, a drag moves |
| The centred title meets the tools when zoomed out | The spacer algorithm; page tests at three zooms and on a narrow frame |
| Panning from the title line no longer works | Panning stays on the frame's empty space and ⌘ + drag; noted in components.md |

## Success Criteria

- [x] "N open" opens a list of open cards; choosing one focuses and pans to it; keyboard and screen reader work (VERIFY_01, port 4540 walk: Tab lands on the select named "Go to an open card", 7 options ("6 open" then "N · title", cut at 60 with "…"); typeahead "6" and a pick of 2 select and focus that card; `open-list.spec.ts` covers an off-screen choice, a past version, the flag off and axe; the native popup's own keys cannot be automated, see TASK-STATUS)
- [x] The title is centred at normal zoom, slides left before touching the tools, truncates last, never overlaps (VERIFY_01 sweep 100% to 20%: 0px off centre at 100% and 90%, then -25, -86, -146px at 80, 70, 60%, always 12px clear of the tools; at the frame's start with the title cut only from 56%; below 55% the tools are gone and the label starts the line, cut at 20%; `container-title.spec.ts`)
- [x] A drag on the title or grip moves the container at any zoom; a click still selects (VERIFY_01: a drag by the title moved the frame by the pointer's (80, 50) at 100% (pin 80, 50) and at 40% (pin 280, 175 after 80/0.4, 50/0.4); a click on a card selects it; a still click on the title clears the selection and writes nothing; on a past version the title pans and writes nothing)
- [x] One hover tint on grip and title; APCA tiers light and dark (VERIFY_01: title on the tint Lc 87.8 light / 73.4 dark (tier 60); grip dots 95.1 / 93.8 (30); chip words 84.8 / 70.5 at rest, 88.7 / 91.9 hovered (60); the tint on the canvas reads Lc 0, reported not gated: the grip's own look)
- [x] `npm test`, `npm run test:pages`, `npm run verify` pass (VERIFY_01: npm test 1567 pass + 10 timing; `npm run check` 0 errors, 0 warnings; verify ok with 3 old length warnings; page suite 589 passed in a clean run after the baseline refresh)
