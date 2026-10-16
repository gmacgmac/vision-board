# FE_01_colours: Colours: frames, selection, hover box

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Containers stand out from the background, a selected card is brighter, and every hover box has a
visible border, all from the four approved tokens.

## Context

PLAN.md rulings 1, 3 and 5, and § Token values. **Start only after the maintainer's yes to those
values**; if the yes changed a value, use the approved one and say so in your notes. `tokens.css` is
protected: write exactly the approved entries, with a comment naming this task, nothing else.

## Inputs

- **Files to modify**: `packages/tokens/src/tokens.css` (the four tokens: `--vb-line-contrast` in
  Lines, `--vb-region-fill` in Surfaces, `--vb-select-lift` and `--vb-select-lift-grey` in Item
  states); `packages/ui/src/region/region-core.ts` (`REGION_COLOUR_DEFAULT`);
  `packages/ui/src/region/region.css` (`vb-region` border reads `var(--region)` whole, background
  `var(--vb-region-fill)`; `[data-drop]` keeps its own fill); `packages/ui/src/node/node.css`
  (`vb-node[data-selected]` and its `::before`: one local `--select` colour,
  `color-mix(in srgb, var(--vb-ink-strong) var(--vb-select-lift), var(--kind))`, the `-grey` lift
  on `[data-kind='note']` and `[data-kind='topic']`, read by border, ring, hairline and glow);
  `packages/ui/src/tip/tip.css` (`.vb-tip` border `--vb-line-contrast`).
- **Files to reference**: `apps/board/src/styles/board.css` (wireLayers: connectors below frames),
  `temp/apca-2b.mjs` (`lc`, the repo's APCA helper), the gallery sections
  `apps/board/src/gallery/region-section.ts`, `node-section.ts` ("Other states" has Selected),
  `title-section.ts`, `wire-section.ts`.
- **Patterns to follow**: tokens only (rule 3); a new colour lives in its token, never per screen.

## Steps

1. [x] **Tests first**: page test (new `tests/pages/review-colours.spec.ts`) reading computed
   colours on the gallery, light and dark: the frame's border colour equals the resolved
   `--vb-line-contrast` and its background the resolved `--vb-region-fill`; a selected decision's
   border equals the lifted colour, a selected note's and topic's the grey lift; a `.vb-tip` border
   equals `--vb-line-contrast`. Then an APCA check in the same spec, using the same `lc` arithmetic,
   for every pair in PLAN.md § Token values (fails under its tier). Red before the build.
2. [x] Build the token entries and the four style changes above.
3. [x] By eye, light and dark: a connector that crosses a frame still shows through the fill
   (wires gallery, the roadmap fixture board); the label's canvas gap over the fill (PLAN risk:
   a notch below the line); cards on the fill still stand off it. Say what you saw; if the notch
   shows, give `.vb-region-label` a two-stop background (canvas above the line, fill below) using
   tokens only.
4. [x] Gallery: the region section shows a filled frame next to a card; the node section's
   Selected row shows every kind selected (add the missing kinds); a tip open over the canvas.
5. [x] Screenshots: nearly every baseline changes (frames, tips). View each diff; say what changed.
6. [x] Docs: `docs/specification/components.md` (frames, selected, tips), the region, node and
   note-bubble `pattern.json` where they name colours.

## Validation

- [x] The new spec passes. The APCA numbers differ from PLAN.md § Token values because the maintainer's answers replaced those values (by eye, one step); the measured numbers are in the notes.
- [x] The five gates exit 0, one after another.

## Constraints

- Tokens only (rule 3); no other token changes. Every state keeps its look otherwise (hover, focus,
  drop target, dragging).
- If deviation is needed, stop and say so. No git commits. Never touch `.visionboard/`; don't use the
  board on 4466. One page-test run at a time.
- Fill Implementation Notes below and append your own LOG line.

## Implementation Notes

**Status**: Completed (2026-10-15)

**The maintainer's answers (PLAN.md, 2026-10-15) overrode the task's token table**: colours by eye (D-009), no
container fill, no grey lift. So: `--vb-region-fill` and `--vb-select-lift-grey` were never added, and the
`background` step and the "notch" step do not apply (nothing is filled; connectors still draw below frames,
board.css untouched).

**Tokens written** (`packages/tokens/src/tokens.css`, approved in chat 132), light / dark:
- `--vb-line-contrast` (new, Lines): `#b5b5bd` / `#4a4a52`. One step up from `--vb-line-strong`
  (`#cbcbd1` / `#3a3a40`) by the size of the existing step `--vb-line` to `--vb-line-strong`
  (`#e1e1e5` / `#2a2a2e`): 22 deeper in light, 16 lighter in dark per channel. **Judgement**: the scale has
  only three entries, and the next one, `--vb-wire` (`#8a8a95` / `#7c7c89`), is the connector colour and a much
  bigger jump, so the step was taken at the scale's own increment. The proposed `#b8b8bf` / `#7c7c84` were not
  used. If the maintainer meant `--vb-wire`, it is a one-line change to this token.
- `--vb-select-lift` (new, Item states): `50%` both themes, every kind.
- Frame today was `color-mix(--region 70%, --vb-line)` with `--region` = `--vb-line-strong`: light about `#d2d2d8`,
  dark about `#333339`. Tip border was `--vb-line-strong`.

**Code**: `region-core.ts` `REGION_COLOUR_DEFAULT` = `var(--vb-line-contrast)` (unit test updated);
`region.css` frame border reads `var(--region)` whole; while dragging, the frame is `--region` 85% into
`--vb-ink-strong` (was 90% into `--vb-line`, still a touch stronger than at rest); `tip.css` `.vb-tip` border
`--vb-line-contrast`; `node.css` `vb-node[data-selected]` sets a local `--select`
(`color-mix(in srgb, var(--vb-ink-strong) var(--vb-select-lift), var(--kind))`) read by the border, the ring, the
glow and the top hairline. Side effects named in the plan: the container title and the mode row's border mix from
`--region`, so both are a little stronger; a container note bubble's edge takes the new frame colour.

**Gallery**: node section gained "Selected, every kind" (one open card of each of the 7 kinds, selected); the
`gallery.spec.ts` selected count is 8 (the old "Selected" risk plus these). No filled-frame sample (no fill).

**Test**: `tests/pages/review-colours.spec.ts` (light and dark): frame border = resolved `--vb-line-contrast`,
frame background transparent, `--vb-region-fill` and `--vb-select-lift-grey` absent; every `.vb-tip` border =
`--vb-line-contrast`; `--vb-select-lift` = 50%; each selected kind's border and hairline = the lifted colour.
Red before the build (6 of 6), green after. Contrast is measured, not gated (maintainer's ruling): each pair
only has to be clearer than what it replaces; the Lc values are recorded as annotations.

**APCA Lc (magnitude, repo's `lc` arithmetic, light / dark; was -> now)**:
- Frame on the canvas: was 17.8 / 0 (the old mixed frame), `--vb-line-strong` alone 21.7 / 0, now 33.7 / 11.7.
- Frame on the card surface (inside the frame): 39.7 / 10.8 (no fill, so the inside is the canvas dots).
- Tip border on its own raised box: was 27.6 / 0, now 39.7 / 10.8. Tip border on the canvas: now 33.7 / 11.7.
- Selected, on the canvas (kind alone -> lifted): question 66.7 -> 86.0 / 52.8 -> 72.9; finding 60.7 -> 83.6 /
  59.8 -> 75.7; decision 66.1 -> 87.1 / 48.5 -> 67.1; risk 58.8 -> 83.3 / 53.3 -> 72.1; action 57.3 -> 82.2 /
  64.5 -> 79.1; topic 70.6 -> 87.6 / 48.8 -> 70.8; note 70.3 -> 87.3 / 49.6 -> 71.8.
- **Reported, not gated**: in dark the frame and tip border are Lc 11.7 / 10.8, under the Lc 30 decoration tier
  (and APCA reads under about 15 as barely there). One step on this scale in dark is a faint line; the
  maintainer may want a second step there (the scale needs a new entry for that, or `--vb-wire`).

**By eye** (gallery, light and dark): frames now read as frames in light; in dark they are visible but quiet.
Tips have a clear edge in both. Selected cards: in light the lifted colour goes deep and a little dull (the
risk and action cards read brown, the finding card dark teal); in dark they go pale pastel. Every kind keeps its
hue, and the grey note and the purple topic now match the others in strength. Connectors draw below the frames
as before (nothing was filled, so nothing hides them).

**Screenshots**: adding the new gallery group moved every section below it by a fraction of a pixel, so 40
baselines changed by text edges (a 1px shift, no colour change); I took those first, with the colour changes
reverted, to isolate the colour effect, viewed four of them (toolbar, selection pill, see-through, flag) and
confirmed in a second run that after the colour changes only `gallery.spec.ts` "screenshot" (light and dark, the
whole gallery page) differed. Viewed that diff by region, light and dark: the new group, the node "Selected"
card, the region frames, the tips, the selection-bar section's selected topic and note. Nothing else changed.
No sibling task's change appeared (FE_02 to FE_06 had not started).

**Gates** (one after another, all exit 0): `npm run check`, `npm test` (1248 + 7 timing pass), `npm run verify`,
`npm run gen` (no generated file changed), `npm run test:pages` (438 passed).

**Docs**: `docs/specification/components.md` (selected colour; a paragraph on frames and hover boxes),
`packages/ui/src/node/pattern.json` (`data-selected`), `packages/ui/src/region/pattern.json` (`--region`). The
note-bubble pattern.json names no changed colour. No `tip/pattern.json` exists.

## On Completion

1. Fill Implementation Notes; set Status to `Completed`; update your row in TASK-STATUS.md.
2. Append your LOG line to `cortex/LOG.md` (one line, newline-terminated, append-only):
   `[[YYYY-MM-DD HH:MM]] [board-tokens] FE_01: <what you did> → Task: [[cortex-tasks/board/2026-10-15_board-ui_review-polish/FE_01_colours.md]]`
