# 2b_FE_01_card-recipe: The card takes Architect's look

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (Stage 2b) ·
> **Decision**: D-024 · **Spec**: `prototypes/board-v3-design/mockups/01b-cards-content-first.html`,
> `05-final-spec.html`, `spec.css` (look only; never copy its code) · **Model**: Opus 5.5

## Objective

`<vb-node>` looks like the locked card: content first, number and kind in gaps on the top
border, kind icon, state word and quick actions in a footer, a soft tint of the kind colour.
Behaviour stays the same. The palette is already in the tokens (`1d7d560`).

## Context

The element pattern is `docs/specification/components.md`. Read the README's "Maintainer picks"
and "Palette" sections first. Selection, the PROPOSAL / UPDATES tabs and overlays come in later
stages; leave no placeholder markup for them. Dragging stays on the whole card for now: the kind
tab becomes the drag handle in Stage 3, when a click starts selecting cards.

## Inputs

- **Modify**: `packages/ui/src/node/{node-template.ts,node.css,node-core.ts,pattern.json}`,
  `packages/ui/tests/node-*.test.ts`, `apps/board/src/styles/board.css` (canvas dot grid),
  `apps/board/src/board/viewport.ts` (zoom attribute, step 5), `tests/pages/` baselines
- **Create**: `packages/ui/src/node/node-icons.ts` (`KIND_ICON: Record<Kind, string>` and the
  action icons moved from the template; SVG paths redrawn from the mockup's `i-<kind>` symbols)
- **Reuse**: the tokens only (`var(--vb-*)`); `--kind` set by the element

## Steps

1. [x] Template, top to bottom: `span.vb-node-num` and `span.vb-node-kind` as tabs sitting in
   gaps cut from the top border (the gap uses `--vb-surface-canvas`); title; body; tags as chips;
   note line as the mockup's `.reply` block; `footer.vb-node-foot` with the kind icon, a divider,
   the state word, then the quick-action buttons. Pin marker stays, top right.
2. [x] CSS, matching 01b by eye: card radius and border mixed from `--kind` and `--vb-line`;
   top-down tint of `--kind` into the card surface; the hairline accent on the top edge; footer
   border tinted by `--kind`; state word coloured by state (open muted, acknowledged ok, dropped
   bad, commented accent text, needs context warn, saved for later violet). Dropped: faded and
   struck through. Remove the old left-border state stripe. Topic: sunken surface; note: dashed.
3. [x] Every value is a token or derived from tokens with `color-mix`; no hex in pattern CSS.
   No inline styles (CSP). Fonts stay system fonts.
4. [x] `pattern.json` and the gallery reflect the new parts (the gallery reads the element, so
   it updates by itself; check it).
5. [~] **N8, small buttons when zoomed out**: the viewport sets `data-zoom="far"` on the stage
   below 0.75; `node.css` hides the footer's quick actions there (keyboard shortcuts still act on
   the focused card). Make the known-failure axe test in `tests/pages/board.spec.ts` a normal
   test, and delete tracker row N8 with a LOG line.
6. [x] Update the page-test screenshot baselines only after viewing them; list the paths.

## Validation

- [x] `npm test`, `npm run check`, `npm run verify`, `npm run test:pages` exit 0 each
- [x] Gallery in dark and light matches 01b by eye: list any difference you chose to keep
- [x] Click-through on `VB_PORT=4467 npm run dev`: ok, drop, comment, move, layout switch,
  reload; no console errors

## Constraints

No tokens or other protected files. No new dependency. No change to `layout`. No commits.
Deviation: stop and report.

## Implementation Notes

**Status**: Completed 2026-10-04, except step 5's last part (see Open). Not committed.

**Files and symbols**
- `packages/ui/src/node/node-icons.ts` (new): `KIND_ICON: Record<Kind, string>` (paths from 05's
  `i-<kind>` symbols; `note` has no mockup symbol, so a sheet with a folded corner was drawn in the
  same stroke style), `ACTION_ICON` (the action icons, moved from the template, was `ICONS`),
  `svgIcon(paths, box, cls)`.
- `node-template.ts`: `nodeTemplate` now draws the tabs (`tabs()`: `vb-node-num`, `vb-node-kind`,
  `vb-node-pin`), `div.vb-node-content` (title, body, tags, `div.vb-node-notes` with
  `vb-node-note-who` and `vb-node-note-text`), and `footer()` (items only:
  `footer.vb-node-foot` > `span.vb-node-state` [kind icon `vb-node-kico`, `vb-node-sep`,
  `vb-node-status`] + `div.vb-node-actions`). `header.vb-node-head` is gone.
- `node-core.ts`: `NodeState.statusWord` now includes "Open" for open items; `noteLine` is
  replaced by `note?: NoteLine` (`{ who, text }`, new interface). Who reads "Your note" or
  "You asked for more context" (01b's wording), led by "N notes · " when there are several.
- `vb-node.ts`: `update()` fills the note's who and text; a non-item has no footer, so the status
  piece is optional (`piece()` returns `HTMLElement | null`).
- `node.css`: rewritten as the 01b card: radius `--vb-radius-lg`, border mixed from `--kind`
  and `--vb-line`, 170deg tint of `--kind` into `--surface` (card, or sunken for topic), hairline
  `::before` on the top edge, tabs with a `--gap` ring (`--vb-surface-canvas`), kind tab with
  grip dots, chips, the note block tinted by `--kind`, footer border tinted by `--kind`, state
  word coloured through `--state`, dropped faded (0.55) and struck through. Left-border stripe
  and the per-state card backgrounds removed. `[data-zoom='far'] vb-node .vb-node-actions`
  hides the buttons with `visibility: hidden`, so no card changes size.
- `pattern.json`: `files.icons`, new `parts`, `data-zoom` under attributes, `update()` wording.
- `packages/ui/src/index.ts`: exports `node-icons.ts`.
- `apps/board/src/board/viewport.ts`: `FAR_K = 0.75`; `apply()` sets or clears
  `data-zoom="far"` on the stage.
- `apps/board/src/styles/board.css`: `.vb-stage` dot grid (`--vb-dot`, 22px).
- `docs/specification/modules.md`: regenerated by `npm run map` (new front-door export).
- Tests: `packages/ui/tests/node-core.test.ts` (status word "Open"; three note tests now assert
  `note`), `node-template.test.ts` (+4: tabs order, footer on items only, note block parts,
  `KIND_ICON` coverage), `tests/pages/board.spec.ts` (new `zoomToButtons`/`clickOn`: the ok/drop/
  comment test zooms in and focuses each card before clicking, since buttons are hidden at the
  fit zoom; note assertion uses who/text; new test: no `.vb-act` visible or flagged by
  `target-size` at the fit zoom), `tests/pages/gallery.spec.ts` (note assertions use who/text).
  Baselines updated after viewing: `tests/pages/__screenshots__/board.spec.ts/board-{dark,light}-darwin.png`,
  `tests/pages/__screenshots__/gallery.spec.ts/gallery-{dark,light}-darwin.png`.

**Gates**: `npm test` 0 (112 -> 116), `npm run check` 0, `npm run verify` 0 (existing
controller.ts length warning), `npm run test:pages` 0 (19 -> 21).

**Differences from 01b kept**
- Card width stays `--vb-card-w` (248px; 01b 300, 05 280). To fit the longest state word beside
  five 24px buttons, the footer is tighter than 01b (8px left padding, 4px gaps around the
  divider, 24 x 26 buttons, no gap between them); the word ellipsizes as a safety net (none does).
- Five quick actions with aria-pressed, as before (behaviour unchanged); 01b shows two or three
  and a Reopen button per state.
- Non-items (topic, note) have no footer: they have no state or actions.
- Title weight is `--vb-weight-medium` (550; 01b 600) and size `--vb-text-lg` (15px, as 05).
- The moved-by-you marker is a small tab on the top border at the right, where 01b has the
  note pin.
- The tab gaps use `--vb-surface-canvas`, so on the board they show as a darker (dark) or grey
  (light) ring over a region's filled surface until the regions become open frames (2b_FE_02).
- The dot grid is fixed on the stage; it does not pan or zoom with the world.

**Screenshots**: `temp/2b-fe01/gallery-node-dark.png`, `temp/2b-fe01/gallery-node-light.png`,
`temp/2b-fe01/board-dark.png`, `temp/2b-fe01/board-light.png`, mockup references
`temp/2b-fe01/mock-01b-{dark,light}.png`.

**Click-through** (dev server, port 4467): ok, drop, comment, drag (pin), layout switch to List,
reload: all held, no console errors or warnings.

**Open**
- N8 not closed: with the card buttons hidden, axe `target-size` still flags the region's
  layout-mode buttons (`.vb-mode`, region pattern, outside this task's inputs). The known-failure
  test stays (comment narrowed to the mode buttons), and tracker row N8 is kept. It closes when
  the mode icon row replaces them.
- APCA: the note heading in the decision colour on its tint scores Lc 44.9 in dark (short label,
  bar 45). Every other new pair passes (`temp/2b-fe01/apca-card.mjs`).
- Proposed token change for the maintainer: `--vb-card-w` 248px -> 280px (05's width), which
  would let the footer take 01b's spacing.
