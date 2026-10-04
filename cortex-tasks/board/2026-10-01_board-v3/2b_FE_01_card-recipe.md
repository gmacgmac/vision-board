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

1. [ ] Template, top to bottom: `span.vb-node-num` and `span.vb-node-kind` as tabs sitting in
   gaps cut from the top border (the gap uses `--vb-surface-canvas`); title; body; tags as chips;
   note line as the mockup's `.reply` block; `footer.vb-node-foot` with the kind icon, a divider,
   the state word, then the quick-action buttons. Pin marker stays, top right.
2. [ ] CSS, matching 01b by eye: card radius and border mixed from `--kind` and `--vb-line`;
   top-down tint of `--kind` into the card surface; the hairline accent on the top edge; footer
   border tinted by `--kind`; state word coloured by state (open muted, acknowledged ok, dropped
   bad, commented accent text, needs context warn, saved for later violet). Dropped: faded and
   struck through. Remove the old left-border state stripe. Topic: sunken surface; note: dashed.
3. [ ] Every value is a token or derived from tokens with `color-mix`; no hex in pattern CSS.
   No inline styles (CSP). Fonts stay system fonts.
4. [ ] `pattern.json` and the gallery reflect the new parts (the gallery reads the element, so
   it updates by itself; check it).
5. [ ] **N8, small buttons when zoomed out**: the viewport sets `data-zoom="far"` on the stage
   below 0.75; `node.css` hides the footer's quick actions there (keyboard shortcuts still act on
   the focused card). Make the known-failure axe test in `tests/pages/board.spec.ts` a normal
   test, and delete tracker row N8 with a LOG line.
6. [ ] Update the page-test screenshot baselines only after viewing them; list the paths.

## Validation

- [ ] `npm test`, `npm run check`, `npm run verify`, `npm run test:pages` exit 0 each
- [ ] Gallery in dark and light matches 01b by eye: list any difference you chose to keep
- [ ] Click-through on `VB_PORT=4467 npm run dev`: ok, drop, comment, move, layout switch,
  reload; no console errors

## Constraints

No tokens or other protected files. No new dependency. No change to `layout`. No commits.
Deviation: stop and report.

## Implementation Notes

**Status**: Not started
