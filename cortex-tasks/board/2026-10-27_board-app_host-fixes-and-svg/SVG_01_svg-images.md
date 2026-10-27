# SVG_01_svg-images: SVG images in cards

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

A card shows an SVG from the project's `.visionboard/images/` as it shows a png: drawn, sized, zoomable,
with its CSS animation playing. It never runs script and never loads anything from outside, however
it is reached.

---

## Context

D-048 rejected svg because "it can carry script". That risk depends on how the file is shown:

- **As an image (`<img>`)**, a browser runs no script in an SVG and loads nothing it references from
  outside; its CSS (and SMIL) animation still plays. Cards and the zoomed view already draw images
  only this way (`packages/ui/src/markdown/image.ts` `imageMarkup`, `packages/ui/src/image-view/vb-image-view.ts`).
- **Opened at its own address** (`/board-images/x.svg` in a tab), it is a document on the board's
  origin, so its script could run. The response must forbid that itself.
- **SVG that needs script** belongs in an app card (D-047): a sandboxed frame made for agent code.

So SVG joins the image types as an inert picture. This amends D-048. The orchestrator appends the new
decision with the maintainer's yes, from the text you draft in step 1.

Wave 1, in parallel with M10_01; you share no files.

**Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: `packages/format/src/images.ts` (`IMAGE_LIMITS`, `imageTypeOf` or an SVG check
  beside it, `IMAGE_WORDS`), `packages/format/src/flags.ts` (a new flag), `packages/format/tests/images*.test.ts`,
  `apps/board/server/images.ts` (the route), `apps/board/tests/images*.test.ts`,
  `packages/ui/src/markdown/image.ts`, `packages/ui/src/image-view/` (if sizing needs it),
  `apps/board/src/board/cards/card-images.ts` (sizes), `apps/board/src/gallery/image-view-section.ts`
  and its fixture images, `tests/pages/card-image*.spec.ts`, `docs/specification/images.md`,
  `skills/vision-board/SKILL.md` § Images in cards (and its version line), `skills/vision-board/NOTES.md`,
  `packages/format/README.md` and `apps/board/README.md` (their images paragraphs name the types),
  `packages/ui/src/markdown/pattern.json` (if it lists image types), `apps/board/server/app.ts`
  (`SECURITY_HEADERS` only, and only if the SVG response needs it)
- **Files to reference**: `docs/decisions.md` D-023, D-047, D-048; `apps/board/server/app.ts`
  `SECURITY_HEADERS`; `docs/specification/apps.md` (app cards); `docs/specification/performance.md`;
  `packages/ui/src/image-view/pattern.json`
- **Patterns to follow**: the one table (`IMAGE_LIMITS`) that the route and the renderer both read, so
  they can't disagree; `imagePathProblem` as the one path check; the ETag and `If-None-Match` handling
  in the route
- **Shared artifacts to reuse**: none from this set (Wave 1)
- **Skills**: `cortex-architecture`, `cortex-docs`; the agent skill `vision-board` (you edit its
  Images section: prompts are code, so bump its version line and record why)

> Modify only the files this task owns (TASK-STATUS.md File Ownership). `docs/decisions.md` is the
> orchestrator's: draft the entry in your notes. Need anything else? List it under `REQUESTS`.

---

## Steps

1. [ ] **Draft the decision** (your notes, § Proposed decision; the orchestrator gets the maintainer's
   yes and appends it as the next D-number). Say, each with its reason:
   - SVG is shown only through `<img>`: no script runs, nothing from outside loads, CSS and SMIL
     animation play. Script stays in app cards (D-047).
   - What the SVG response carries. At least a policy that allows no script and sandboxes the
     document (for example `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline';
     img-src data:; sandbox`), plus `nosniff` (already global). Check it against the board's own
     `SECURITY_HEADERS` so neither weakens the other.
   - How a file is known to be SVG with no magic bytes: its text, after an optional BOM, XML
     declaration, comments and a doctype, opens an `<svg` element in the SVG namespace. Within the
     first N bytes (`IMAGE_HEAD_BYTES` grows to cover it, or SVG gets its own head length). A doctype
     that declares entities (`<!ENTITY`) is refused: an entity expansion bomb costs the browser, and
     a picture never needs one.
   - Its size cap (propose one; 8 MB of text is a lot to parse, so something like 1 MB) and its size:
     it must say `viewBox` or both `width` and `height`; one with neither is refused, with words saying
     why. Otherwise the browser's 300 × 150 default jolts the layout.
   - Whether the route also refuses a file holding `<script`, an `on…=` attribute, `<foreignObject>`
     or an outside reference (`http:`, `https:`, `//`). Not as the security boundary (`<img>` and the
     response policy are that), but so the agent hears at once that its script won't run, in words
     pointing it to an app card. Say yes or no, with the reason.
   - Motion: how a person who asked for less motion is respected (`prefers-reduced-motion`). Check in
     Chromium, WebKit and Firefox (Playwright `reducedMotion: 'reduce'`) whether an SVG image's own
     `@media (prefers-reduced-motion: reduce)` applies. If it does, the skill tells agents to write
     their animation inside `@media (prefers-reduced-motion: no-preference)`. Also WCAG 2.2.2: an
     animation that runs over 5 seconds needs a way to pause it, so the skill tells agents to keep
     looping animation short or finite, or to use an app card with a pause control. And WCAG 2.3.1:
     nothing flashes more than three times a second.
   - The flag's name and default.
   Stop and return `DEVIATION` if a browser runs script or loads an outside resource from an SVG
   `<img>`: the premise is wrong.
2. [ ] **Failing tests first** (`packages/format/tests/`, `apps/board/tests/`): `imagePathProblem`
   accepts `x.svg` with the flag on; the SVG content check accepts a plain SVG, one with an XML
   declaration and comments, and refuses HTML named `.svg`, an empty file, and one with no size; the
   route serves an SVG with its own policy header and `image/svg+xml`, answers 304 on a matching ETag,
   and refuses each case your decision refuses, with `IMAGE_WORDS` reasons.
3. [ ] **The one table**: `IMAGE_LIMITS.types.svg` (extensions `svg`, content type `image/svg+xml`),
   the SVG check beside `imageTypeOf`, its cap, the words. Remove the "svg is not here on purpose"
   comment and say why it is here now. `IMAGE_WORDS.type` lists svg because it reads the table: check
   the sentence still reads well ("only png, jpeg, webp, gif or svg").
4. [ ] **The route** (`apps/board/server/images.ts`): the SVG's own response headers, the content check
   on the head it already reads, the cap. Nothing else changes for the other types.
5. [ ] **Drawing and size**: the card's `<img>` and the zoomed view take an SVG like any image. Check
   `card-images.ts` sizes: an SVG's natural size comes from its `viewBox` or `width`/`height`, and the
   card's measured height doesn't jump when it loads. The zoomed view's 70% sizing works for an SVG
   with only a `viewBox`. If it needs explicit sizes, set them where the pattern draws them, not per
   card.
6. [ ] **The flag** (`packages/format/src/flags.ts`): with it off, `.svg` is refused as today ("only
   png, jpeg, webp or gif"), in the renderer and the route alike.
7. [ ] **Every state, in the gallery** (`image-view-section.ts`): an SVG card (static), an animated SVG
   card, the zoomed view of each, an SVG refused (not shown, with its reason), light and dark. The
   fixture SVGs are small, made for the gallery, and hold no outside reference. Take baselines for
   the new entries only.
8. [ ] **The page specs** (`tests/pages/card-image*.spec.ts`, `VB_TEST_PORT=5200`):
   - an SVG holding a `<script>` that would change the page (set a global, post a message) is drawn,
     and the script never ran: in the card, in the zoomed view, and opened at its own address in a
     new page (that page's `<script>` is blocked by the response policy);
   - an SVG referencing an outside image makes no network request (Playwright request log);
   - an animated SVG animates (two screenshots differ, or the computed animation is running) and,
     where step 1 found browsers honour it, holds still under `reducedMotion: 'reduce'`.
9. [ ] **Performance**: one board with many animated SVG cards (say 200) stays inside
   `docs/specification/performance.md`'s budgets. Run `perf.spec.ts` alone with `--no-deps`; check
   `uptime` first and rerun on a quiet machine before reading a failure as yours.
10. [ ] **The agent's skill** (`skills/vision-board/SKILL.md` § Images in cards): svg in the list;
    what runs (CSS and SMIL animation) and what doesn't (script, outside files); the motion guidance
    from step 1; "an SVG that needs script is an app card". Bump the version line, and add the change
    to `NOTES.md` if that is where the history goes.
11. [ ] **Docs** (`cortex-docs`): `docs/specification/images.md`, with every claim naming its symbol
    and test. Note anything in `apps.md` or `components.md` that now reads wrong as a `REQUEST`.
12. [ ] **Checks**: `npm test`, `npm run check`, `npm run verify`, `node scripts/gen-api.mjs --check`
    (the route's problem types may be in OpenAPI), the card-image page specs and `perf.spec.ts`. No
    full page suite (rule 12).

---

## Validation

- [ ] An SVG draws in a card and in the zoomed view, sized from its own dimensions, light and dark
- [ ] Its CSS animation plays; reduced motion is honoured as the decision says
- [ ] No script runs and nothing outside loads: in the card, the zoomed view, or at its own address
      (page specs)
- [ ] Off, the flag gives today's behaviour exactly
- [ ] The decision text is in your notes; the skill and images.md say what's true

---

## Implementation Notes

_To be completed by agent after task completion._
_Re-run? Add a `### Run N` block below the last one; never overwrite an earlier run._

**Status**: Pending  
**Completed**: YYYY-MM-DD HH:MM  

### Proposed decision
- 

### Changes Made
- 

### Issues & Resolutions
- 

### Caught Beyond the Brief
- None

### Deviations from Plan
- None

---

## On Completion

1. Fill in Implementation Notes above; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md): your row only.
3. Append **your own** LOG entry to `cortex/LOG.md`: one line, ending in a newline, append-only.

   ```
   [[YYYY-MM-DD HH:MM]] [board-security] SVG_01: [what you did] → Task: [[cortex-tasks/board/2026-10-27_board-app_host-fixes-and-svg/SVG_01_svg-images.md]]
   ```

4. Return the `cortex-task-exe` Return Contract: the proposed decision as a `REQUEST` to
   `docs/decisions.md` (blocking for the wave's commit), and any other file you don't own.

**Constraints**: deviation → stop and ask; no PII in examples; no commits; never port 4466; never
`cortex/AUDITED.md`; no set LOG entry.
