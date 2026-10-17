# FE_03_card-images: Images on the page: Markdown image, zoomed view, updates

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Render images in cards, open them in an animated 70% view, and pick up a replaced image when the card
is selected or the image is opened.

## Context

PLAN.md rulings 19, 21-23 and § Goal state line 11. BE_03 (the route, `imagePathProblem`,
`IMAGE_LIMITS`, `images.md`) and FE_02 (app cards on the page) have landed: read their notes.

## Inputs

- **Files to modify / create**:
  - `packages/ui/src/markdown/inline.ts` (it already parses `![`; today an image falls back to text):
    emit the one fixed `<img>` shape when `imagePathProblem(path)` passes and alt is present, else the
    plain-text forms of ruling 19; `render.ts` if the shape needs a hook; keep every other rule of
    D-023. `packages/ui/tests/markdown-adversarial.ts` `assertSafe`: allow `img` only in the fixed
    shape (a regex like `LINK_SHAPE`), still refuse `style=`, `<script`, `<iframe`, and any
    `javascript:`/`data:` inside a tag. Add CommonMark-style cases for images.
  - `packages/ui/src/image-view/` (a new pattern, framework-free; core + element + css +
    `pattern.json`): `fitImage(natural, screen) → size` (DOM-free, the 70%-of-the-longer-side rule,
    upscaling allowed, never past the screen on the other axis), the modal view (dialog role, labelled by
    alt, focus kept inside, × button, Esc, click outside), the open/close animation from the card's
    image box (transform, about 220 ms, timing from tokens; `prefers-reduced-motion`: no motion).
  - `apps/board/src/board/` (a new `card-images.ts`): images in cards are buttons in the card's tab
    order that open the view; on card **select** and on view **open**, a conditional request through
    `io.ts` (`If-None-Match` with the last `ETag`); a new version is loaded off-screen, then swapped in;
    the card re-measures once its images load (only that card, rule 15); missing / refused images show
    the small reason box.
  - Gallery: a section for images (in a card, missing, refused, the zoomed view tall and wide, reduced
    motion), with fixture images in the gallery's project.
- **Page tests**: `tests/pages/card-images.spec.ts` covering every item of § Goal state line 11 (box
  sizes for a tall and a wide image at 1600×1000 and 1470×956; keyboard; Esc; click outside; focus
  back; replaced image after select with the conditional request asserted and no repeat on a timer;
  reduced motion; axe light and dark); unit tests for `fitImage` and the Markdown shape.
- **Patterns to follow**: `packages/ui/src/note-bubble/` (pattern split), `markdown/` tests,
  `io.ts`, `offscreen.ts`, `cards.ts` re-measure.
- **Shared artifacts to reuse**: BE_03's `imagePathProblem`, `IMAGE_LIMITS` (import; no second check).
- **Skills**: `cortex-architecture` (pattern-owned UI, one I/O layer, every state, accessibility) ·
  `cortex-docs` (`components.md` § Images in cards and § Image view; `apps/board/README.md` names the
  image route and `card-images.ts`).

## Steps

1. [ ] Tests first, each seen failing.
2. [ ] Markdown shape, then the image-view pattern, then page wiring, then the gallery.
3. [ ] Screenshots: view every diff light and dark before updating; say which changed and why.
4. [ ] Gates one after another: `npm run check`, `npm test`, `npm run verify`,
   `node scripts/gen-api.mjs --check`, `npm run build`, `npm run test:pages` — all exit 0.

## Validation

- [ ] All gates exit 0; § Goal state line 11's tests exist by name and pass; page weight holds.

## Constraints

- No git commits. Deviation: TASK-STATUS.md instruction 5.

## Implementation Notes

**Status**: Pending

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-ui] FE_03: <what you did> → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/FE_03_card-images.md]]`
