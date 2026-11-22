---
task_name: The timeline under page zoom and in WebKit
created: 2026-11-22
status: completed
completed: 2026-11-22
model: strong
categories: [board-app, board-ui]
skills: [cortex-architecture]
persona: A WebKit and SVG rendering engineer: geometry lives in SVG user units, never in CSS lengths on SVG children.
---

# The timeline under page zoom and in WebKit

## Problem
Two faults, both seen in Safari and in nclite (a WKWebView); Chromium draws both correctly.
1. **The line and dots leave their cards under page zoom** (Safari zoomed in; nclite at 110%): the line, stems,
   dots and years drift from the cards in proportion to their distance from the board's origin, about 1.10x at 110%.
   `apps/board/src/board/links/timelines.ts` `place` moves each group with a CSS `transform: translate(…px)` on an
   SVG `<g>`, the one SVG part of the board placed by CSS; links are path data and stay true. [INFERENCE] WebKit's
   page zoom scales those CSS px a second time.
2. **The years are garbled in WebKit** at any zoom ("2026" reads ": ( : 6"): the year's canvas-coloured halo is
   painted on the same `<text>` as its letter-spaced glyphs (`paint-order: stroke`,
   `packages/ui/src/timeline/timeline.css` `.vb-timeline-year`), and WebKit lets each glyph's halo cover the glyph
   before it.

## Rulings (maintainer, points 5-6 of 2026-11-22)
- Accuracy first: the timeline is placed in SVG user units, so it is right at any page zoom with no redraw.
- While cards move to a new layout the timeline fades out and back in where they land, as the links do
  (`draw.ts` `settleWires`), in place of gliding with them. The glide test changes to match.

## Steps (tests first: each fails before its fix)
1. `packages/ui/tests/timeline-template.test.ts`: each year is drawn twice, a halo `<text>` first and the year over it.
   Fix: `timeline-template.ts` `timelineLineMarkup` writes `vb-timeline-year-halo` then `vb-timeline-year`;
   `timeline.css` moves the stroke to the halo (the year keeps its fill only; no `paint-order`).
2. `tests/pages/timeline.spec.ts`: the line, stem and dot groups are placed by the SVG `transform` attribute and carry
   no style transform; the glide test becomes "hidden while the cards move, on its cards whenever shown".
   Fix: `timelines.ts` `place` sets `transform="translate(x y)"`; `board.css` hides `.vb-timeline` with `.vb-wire`
   while `.vb-wires.settling` and fades it back (the transform transition goes); `print.css` shows it while settling.
3. Run the timeline unit and page specs, the plugin's in WebKit (`temp/timeline-plugin`), light and dark; the
   maintainer checks Safari at 110% and nclite.

## Constraints
Worktree `.claude/worktrees/timeline-zoom` (branch `fix/timeline-zoom`); `VB_TEST_PORT` 4568; never 4466. No new
sentence, token, icon or flag (a fix to existing behaviour). Docs: `docs/specification/` where it says the timeline
glides.

## Implementation Notes

Executed 2026-11-22 (Opus 5.5, direct), in `.claude/worktrees/timeline-zoom`.

- **Placement**: `timelines.ts` `place` sets `transform="translate(x y)"`. `board.css`: the line, stem and dot groups
  hide at once while `.vb-wires.settling` (`transition: none`) and fade back in over `--vb-motion-fast` when it ends;
  links unchanged. `print.css` shows them while settling, as it does links.
- **Years**: `timelineLineMarkup` writes each year twice, `vb-timeline-year-halo` then `vb-timeline-year`;
  `timeline.css` puts the stroke on the halo only. `pattern.json` names the halo.
- **Tests** (each failed first): `timeline-template.test.ts` (year over its halo); `timeline-layers.spec.ts` "placed in
  SVG units" (moved there to keep `timeline.spec.ts` under 500 lines); `timeline.spec.ts` "while the cards glide…"
  (hidden while the cards move, on its cards whenever shown, back after; passed 8 of 8 repeats).
- **Ran**: the timeline unit test (6 pass); `timeline.spec.ts` and `timeline-layers.spec.ts` (24 pass); the page specs
  that use settling, print and zoom (131 pass); the plugin contract suite (120 pass); `npm run verify` (no failure);
  the fake host in WebKit, light and dark: years clean.
- **Not changed**: the baselines. "the container across and down, default …: as the person sees it" fails now and then
  on the years in the run-down layout (1 of 24 repeats here, 2 of 24 at HEAD 19dd2f31): an older flake, not this
  change.
- **Not verified here**: Safari zoomed and nclite at 110% (Playwright can't set a page zoom); the maintainer checks.
- Docs: `docs/specification/components.md` § The line on the board.
