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
