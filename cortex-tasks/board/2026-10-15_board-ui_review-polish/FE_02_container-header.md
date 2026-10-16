# FE_02_container-header: Container header

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

A container's top line keeps one on-screen size at every zoom, and in a narrow container the
retired marker, the count and the controls stay whole while the title takes the rest on one line,
ending in "…" (tracker N41).

## Context

PLAN.md rulings 2 and 9, and "Decisions inside the rulings" 6 and 7. Found by the answer model's
VERIFY_01 (problem 5): "LAUNC / H", the marker cut to "6…" (9 px wide), "0 of 1 a…". Today the title
is a two-line clamp that breaks mid-word (`overflow-wrap: anywhere`; found-in-use FE_03 ruling 2,
now replaced), the count and the marker give way first, and the whole line scales with the board
(`Viewport.apply`: one `scale(k)`, 0.2 to 2.5). FE_01 has landed: the frame reads
`--vb-line-contrast` and `--vb-region-fill`; FE_05 has landed in `viewport.ts`.

## Inputs

- **Files to modify**: `apps/board/src/board/viewport.ts` (`Viewport.apply`: write the zoom once as
  a custom property on the world, e.g. `--vb-zoom`, beside `data-zoom`),
  `packages/ui/src/region/region.css` (`.vb-region-head`, `.vb-region-label`,
  `.vb-region-head h2`, `.vb-region-count`, `.vb-region-retired`, `.vb-region-holders`,
  `.vb-region-tools`, `.vb-title-tip`), `packages/ui/src/region/region-title.ts` (the title tip's
  `needed`: cut on one line now).
- **Files to reference**: `packages/ui/src/region/region-template.ts` (`regionTemplate`: the h2
  keeps the full title for the accessible name), `packages/layout/src/types.ts` (`REGION_HEAD`, 38:
  the top line's room in board units), `apps/board/src/gallery/region-section.ts`,
  `retired-section.ts`, `docs/specification/performance.md`.
- **Tests to extend**: `packages/ui/tests/region-template.test.ts`, `apps/board/tests/viewport-zoom.test.ts`;
  `tests/pages/containers.spec.ts`, `container-polish.spec.ts`, `zoom-level.spec.ts`, `perf.spec.ts`.

## Steps

1. [x] **Tests first** (page): at zoom 0.2, 1 and 2.5 the title's rendered height and font size on
   screen are the same (12px text) and it never draws past the frame's right edge on screen; in a
   one-card-wide container with a long title, a count and "6 cards retired", the marker, the count
   and the controls show their full words (their `scrollWidth` equals `clientWidth`), the title is
   one line ending in "…", its full text is in the h2 (accessible name) and in the title tip on hover
   and focus. Red before the build.
2. [x] Build ruling 2 (PLAN decision 6): the top line is drawn at a constant on-screen size by a
   counter-`transform` read from the zoom property, its layout width tied to the frame's on-screen
   width; a `transform`, not a font size, so no reflow per zoom step. Below `FAR_K` the controls hide
   as now; let the label use their room when they do if that is simple.
3. [x] Build ruling 9 (PLAN decision 7): marker, count and controls `flex: none`; holders give way
   first; the h2 one line, `text-overflow: ellipsis`, no mid-word break.
4. [x] Check at `MIN_K` that a title above the line does not cover the frame above it or the first
   row of cards (the line's room is `REGION_HEAD` board units, small on screen when zoomed out). Say
   what you saw; a fix that changes layout constants is a stop-and-ask.
5. [x] Gallery: a narrow container with a long title and a marker; one at a far zoom. Screenshots:
   view every diff. Docs: `docs/specification/components.md` (the container's top line),
   `region/pattern.json`.

## Validation

- [x] Step 1 tests pass; `perf.spec.ts` budgets hold (zoom on a 1,000-card board).
- [x] The five gates exit 0, one after another.

## Constraints

- Tokens only; the zoom is a runtime value, not a token. One write per `apply`, nothing per region.
- Accessibility (rule 5): the controls keep their 24px targets where they show; the title stays
  readable to screen readers in full.
- If deviation is needed, stop and say so. No git commits. Never touch `.visionboard/`; don't use the
  board on 4466. One page-test run at a time.
- Fill Implementation Notes below and append your own LOG line.

## Implementation Notes

**Status**: Completed with a deviation (2026-10-16): ruling 2 in full; ruling 9 in full but decision 7's count
in the narrowest frame (item 3)

1. **Ruling 2, constant top line (decision 6).** `viewport.ts` `Viewport.apply` writes the zoom once on the world
   as `--vb-zoom`, only when it changed (`zoomWritten`; a pan writes nothing). `region.css` registers it
   (`@property`, `<number>`, initial 1, **not inherited**; `.vb-regions`, `vb-region` and the line take it with
   `inherit`) and draws `.vb-region-head` with `transform: scale(calc(1 / var(--vb-zoom))) translateY(-50%)`
   (origin 0 0), its width `calc((100cqw - 2 * var(--vb-space-4)) * var(--vb-zoom))`, so on screen the line
   is the frame's width less the inset, as before. The line is now the container of the row's narrow forms
   (`@container` 440 -> 408 and 600 -> 568, the same frames at 100%). `.gliding vb-region .vb-region-head`
   transitions `--vb-zoom`, so Fit and Z glides keep the size (checked by hand: 14px title height all through a
   141% -> 47% glide). Below `FAR_K` the tools, grip, retired marker and holders are `display: none`, so the
   title takes their room. Inherited everywhere, a zoom step cost about 30 ms on the 1,000-card board (median;
   2.3 ms before); not inherited it is 2.7 ms.
2. **Ruling 9 (decision 7).** Marker and tools `flex: none`; the title one line, `white-space: nowrap`,
   `text-overflow: ellipsis` (no `overflow-wrap: anywhere`, no clamp), with a floor of about three letters and
   "…" (`min-width: calc-size(max-content, min(size, calc(4.2 * (1ch + 0.22em))))`, so a short title keeps its
   own width; Chromium). Give-way order by shrink factors far apart: each holder `1e12` (its slot is
   `display: contents`, each holder keeps a 24px target), title `1e6`, count `1`. Under 408px of line the
   label's parts sit 4px apart (was 8). `region-title.ts` `cut` is `scrollWidth > clientWidth` only.
3. **Deviation: decision 7's count in the narrowest frame.** One card (336px, layout `MIN_W` 280 + padding) at
   100% has 304px of line: grip 16, padding 16, gaps 12, "6 cards retired" 91 and the collapsed row 115 leave
   ~41px, the title's three-letter floor, and nothing for "1 of 1 answered" (89px). The count gives way there
   (hidden to the eye, read by screen readers). Without a marker the count stays whole in every gallery frame
   (measured: all 40 frames). Options for the maintainer: (a) as built; (b) shorter words, e.g. "6 retired" (the
   ruling's own quote) or "1/1"; (c) the count on a second row under the title in narrow frames; (d) the title
   to zero first. (b) and (c) touch `region-core.ts` / layout.
4. **Step 4, at `MIN_K` (20%, roadmap board):** the line clears the frame above by 2.6px; its lower edge reaches
   about 1px into the first row's top edge in three of four containers (the room is `REGION_HEAD` 38 board units,
   7.6px on screen; the line's lower half is about 8.6px). Reported, not fixed (layout constants: stop-and-ask).
   At far zooms the count still sits beside the title and gives way after the title's floor ("PROVE TH… 0 of 2
   answer…" at 20% in a 208px-on-screen frame); hiding it below `FAR_K` would give the title that room.
5. **Tests, failing first.** Unit: `viewport-zoom.test.ts` (apply writes `--vb-zoom` once, not on a pan; the
   world stub gained `setProperty`); `region-template.test.ts` (a long title whole in the heading and the tip;
   a guard, passed before). Page: `zoom-level.spec.ts` "a container title keeps one on-screen size at 20%, about
   100% and 250%" (12px text, same height, inside the frame; failed: 2.4px at 20%) and "zoomed out, the controls,
   grip and retired marker leave the line" (failed: tools and grip took room); `container-polish.spec.ts` "title:
   one line ending in an ellipsis" (replaces the two-line test; failed) and "a narrow container: the marker and
   the controls stay whole" (gallery `retired-narrow`; failed: marker cut); `perf.spec.ts` "a zoom step on the
   1,000-card board is under 50 ms and updates no card or frame" (median 2.7 ms; a budget guard, passed before).
6. **Gallery.** `gallery.ledger.jsonl` (seq 307-316, marks board): container `retired-narrow`, long title, seven
   questions, one checked, six retired in one line; `retired-section.ts` draws it beside `retired-here`
   (`frameOf`), `gallery.css` sets it to 336px. `title-section.ts`: a "Zoomed out" group, the layout board's row
   drawn at 40% by the board's own drawing (`mini-board.ts` gained `zoom`; below `FAR_K` the mini stage is far).
7. **Outside the listed files (report).** `apps/board/src/gallery/{gallery.ledger.jsonl, retired-section.ts,
   gallery.css, title-section.ts, mini-board.ts}` (step 5's gallery); `tests/pages/flag-retire.spec.ts` (the
   retired section has two frames now: scoped to `retired-here`, plus the narrow marker);
   `tests/pages/gallery.spec.ts` (region count 25 -> 26; the narrow-frame test expects the long `title-*`
   titles cut on one line).
8. **Screenshots (44 files, every diff viewed, light and dark).** Content: `board-*` (titles at full size at
   47%), `retired-*` (the narrow frame), `gallery-*` (the region section: one-line titles, counts whole, the far
   sample, the narrow retired frame), `card-widths-*` ("MATC… 0 of 3 answered" for the old two-line title and
   hidden count), `agent-access-*` (the hover sample's title whole on one line, its holders give way to "· Pri"
   / "· D"). The rest are sub-pixel text-edge shifts from the taller gallery (card-updates, chat, flag, key-bubble,
   link-labels, alignment, lock, folder-picker, parking-replies, remove, archive, proposals, selection-pill,
   node-size, toolbar, past-version, see-through). No sibling's change appeared.
9. **Docs.** `docs/specification/components.md` (a paragraph "A container's top line", and the far-zoom list in
   § Notes item 4); `packages/ui/src/region/pattern.json` (`narrow`, `far`, `retired`, accessibility wording).
   `docs/specification/performance.md` not edited (no budget changed; the zoom test sits under "One change shown").
10. **Gates** (one after another): `npm run check`, `npm test` (1264 + 7 timing), `npm run verify`, `npm run gen`
    (no generated file changed), `npm run test:pages` (454 passed), all exit 0. The `board-*` baselines are the
    full run's actuals: an update run of the screenshot tests alone draws the roadmap board without the earlier
    files' boards ("3 boards updated" missing), so those two were taken from a whole run and viewed.

## On Completion

1. Fill Implementation Notes; set Status to `Completed`; update your row in TASK-STATUS.md.
2. Append your LOG line to `cortex/LOG.md` (one line, newline-terminated, append-only):
   `[[YYYY-MM-DD HH:MM]] [board-ui] FE_02: <what you did> → Task: [[cortex-tasks/board/2026-10-15_board-ui_review-polish/FE_02_container-header.md]]`
