# T_04: Print-safe container corners

**Objective**: Container corners draw the same on screen and in any engine's PDF, and a check keeps print-unsafe CSS
out (PLAN.md Decision 8, D-115). **Skills**: cortex-architecture, cortex-docs · **Port**: `VB_TEST_PORT=6300`

## Background (proven)
WebKit's print-to-PDF can't apply a CSS mask; it paints the mask image as plain colour (solid squares). A `clip-path`
polygon tracing the four corner squares printed correctly in the same WebKit call nclite makes. Harness and evidence:
`/private/tmp/claude-501/-Users-dev-Dropbox--Personal--Developer-web-apps-vision-board/f2a24d35-ec00-4d2c-8e6d-d8eba2a95d55/scratchpad/maskpdf/` (`render.swift`, `page.html`, `out.png`).

## Steps
1. `region.css` `vb-region::before`: replace `mask` and `--vb-region-mask` with one `clip-path: polygon(...)` of the four
   `--vb-region-corner` squares (evenodd-free: trace each square, joined through the corner points); the drop target
   (`[data-drop]`) sets `clip-path: none`. Same look on screen.
2. `tests/pages/container-rules.spec.ts`: assert the clip shape (four corners at `--vb-region-corner`, none on a drop
   target) instead of the mask properties; renew only the screenshots that change (expect none or few).
3. Re-run the harness above against the built `dist/plugin/vision-board/view/board.css` rule (copy, don't edit the
   harness folder's originals) to show the new corners print in WebKit; attach the PNG path in your notes.
4. A verify check (`scripts/`, wired into `npm run verify`) fails on `mask`, `-webkit-mask`, `mask-image` other than
   `none` in the board's CSS sources and the built plugin CSS, naming the fix.
5. Audit the shipped CSS for other paint features a PDF context may not honour (`mix-blend-mode`,
   `background-blend-mode`, `backdrop-filter`, `filter`): list each use; prove any doubtful one with the harness.
   Fix nothing beyond the mask; report findings.
6. `docs/specification/plugin.md` § A guest in the host's page (or § Theme and host styling): a short "Print-safe CSS"
   paragraph: no masks, why, the check, the audit result.
7. Run `container-rules.spec.ts`, `container-title.spec.ts`, `review-colours.spec.ts`, `board-files.spec.ts`, verify.

## On completion
Notes here and your row; one LOG line `[board-ui] Completed: T_04 …`; the return block. The orchestrator appends D-115.

## Implementation Notes (T_04, 2026-11-20)

- **Corners** (`packages/ui/src/region/region.css` `vb-region::before`): `mask` and `--vb-region-mask` are gone; one
  `clip-path: polygon(…)` of the four `--vb-region-corner` squares, joined along the edges (`--vb-region-far` =
  `calc(100% - corner)`). The drop target sets `clip-path: none`. `pattern.json` `--vb-region` says "clipped … never a mask".
- **Winding (found by the screenshots)**: the harness's proven polygon (case D) turns its top squares clockwise and its
  bottom ones anticlockwise. Under clip-path's nonzero rule, a frame under two corners (128px) tall, where the squares
  overlap, cancels them and cuts a gap in each side (the gallery's dragging frame). All four squares now turn clockwise,
  so overlaps add up as the mask's union did. `container-rules.spec.ts` "corners only" checks a 300 × 100 and a 100 × 300
  box; the old polygon fails it (`[false, false, true, true]`).
- **Test**: `container-rules.spec.ts` reads `clipPath` and the pseudo's size, parses the polygon and tests points by
  the nonzero rule: the 64px corners are kept, nothing between them or in the middle; it is the same when selected, and
  `none` on a drop target; there is no mask.
- **Verify**: `scripts/verify-style.mjs` `checkPrintSafe` (run by `checkStyleAndLayers`) fails on `mask`,
  `-webkit-mask`, `mask-image` or `-webkit-mask-image` with any value but `none`, and on `style.mask`/`webkitMask` or
  `setProperty('mask…')`, in `packages/ui/src`, `apps/board/src` and `apps/board/plugin` (not tests). `scripts/verify.mjs`
  also runs it on the built `dist/plugin/vision-board/view/board.css` (`PLUGIN_SHEET`), and warns when that sheet isn't built,
  as the weight check does. Proven by `scripts/verify-style.test.mjs` "print-safe:" (2 tests). The old `region.css` fails it.
- **WebKit PDF proof** (copied harness, built plugin sheet, the same `printOperation` call):
  `/private/tmp/claude-501/-Users-dev-Dropbox--Personal--Developer-web-apps-vision-board/f2a24d35-ec00-4d2c-8e6d-d8eba2a95d55/scratchpad/t04pdf/harness/out2-dark.png`
  and `out2-light.png` (with the PDFs beside them) show the rest, selected, drop-target and a 96px short frame printing as
  corners, and the old mask beside them printing solid squares.
- **Paint audit** (shipped CSS + built sheet): `backdrop-filter` in `selection-bar.css`, `image-view.css` (scrim) and
  `proposals.css`; `filter: none` in `base/root.css`; no `mix-blend-mode` or `background-blend-mode`. In the same WebKit call
  (`harness/out-backdrop.png`) `backdrop-filter` prints as its translucent fill without the blur, which is a harmless
  fallback, and all three uses are outside `.vb-world`, so the print view hides them. Nothing was fixed beyond the mask.
- **Screenshots**: only `container-rail-states` `rail-{light,dark}`. They were already out of date on main: point 699
  (commit 9784f58d) muted the fresh frame's teal but did not renew them. My change adds a few anti-aliased pixels on
  top. The `fresh-cards`, `gallery` and every other screenshot spec that draws containers match unchanged.
- **Docs**: `docs/specification/plugin.md` § A guest in the host's page has a new "Print-safe CSS" bullet, and its
  `updated:` line names the change. `tests/plugin/spec-truth.test.ts` passes.

### Caught Beyond the Brief
- The polygon proven in the WebKit harness was wrong for short frames (the winding above). The harness only drew
  150px-tall frames, so it never showed.
- `print.css` says a PDF draws a blurred shadow "as a grey block". In this WebKit call a 24px `box-shadow` printed soft.
  The rule may be true of another engine. It is unchanged and harmless.
- The rail screenshots were stale on main (point 699), so the full suite at VERIFY_01 would have failed them anyway.
