# FE_01_wire-layers: Connectors behind cards: record, tests, gallery

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (ruling 1) ·
> **Decision**: D-032 · **Model**: Sonnet 5.5

## Objective

Record the connector change built on 2026-10-06 (written after the fact, as agreed), and add what
it still owes: a page test, gallery samples, pattern states, and fresh screenshot baselines.

## Context

Built in chat after the maintainer asked to try looks by eye (board items 31, 50). Look A was
kept; plates (`wirePlates`) were tried and removed. Fill 75%, then 70% by the maintainer.

**What landed (already in the working tree):**
- `packages/format/src/flags.ts`: flag `wireLayers`, default on.
- `apps/board/src/board/controller.ts`: `world` gets `data-wire-layers`; `layers` passed to drawing.
- `apps/board/src/board/draw.ts`: `DrawDeps.layers`, `BoardElements.wiresTop`; `createWires(els.wires, top)`.
- `apps/board/src/board/wires.ts` (`createWires`, `topOf`): the focused card's connectors and
  labels are drawn again in the top SVG.
- `apps/board/src/shell/App.svelte`: `<svg id="wires-top" class="vb-wires vb-wires-top">` after the cards.
- `apps/board/src/styles/board.css`: under `[data-wire-layers]` the connector SVG is `z-index: -1`
  (behind the frames, which have no fill); `--card-surface`, `--card-surface-sunken`,
  `--note-surface` mix `--vb-card-fill` with transparent; `.vb-wires-top` is `z-index: 1`.
- `packages/ui/src/node/node.css`: `--surface: var(--card-surface, var(--vb-surface-card))` and
  the topic and note equivalents, so with the flag off the colours are exactly as before.
- `packages/tokens/src/tokens.css`: `--vb-card-fill: 70%` (maintainer's yes).

## Inputs

- **Files to modify**: `tests/pages/board.spec.ts` (or a new `tests/pages/wires.spec.ts`),
  `apps/board/src/gallery/node-section.ts` or a new small section, `packages/ui/src/node/pattern.json`
- **Patterns to follow**: `tests/pages/size.spec.ts` (a flag's page test and gallery screenshot)

## Steps

1. [x] Page test: with the flag on (default), `#wires` computes `z-index: -1`, a card's
   background colour has alpha 0.7, and focusing a linked card puts its path in `#wires-top`;
   with `?flags=-wireLayers`, `#wires-top` stays empty and cards are opaque.
2. [x] Gallery: one sample showing a connector passing behind a card and a note card, with the
   flag on, in both themes. Add `see-through` to `node/pattern.json` `states` and describe the
   `--card-surface` hooks under `attributes`.
3. [x] View the 4 failing gallery diffs (`test-results/*/…-diff.png`), confirm they are the
   browser update only, then `npx playwright test --config tests/pages/playwright.config.ts
   gallery.spec.ts size.spec.ts --update-snapshots` and view the new baselines.
4. [x] Bring `controller.ts` back to 300 lines or under (verify warns at 301); move the layer
   setup into `draw.ts` if that is the natural home.

## Validation

- [x] The five gates in TASK-STATUS exit 0; the new test fails if `z-index: -1` is removed.

## Implementation Notes

**Status**: COMPLETED 2026-10-07

- Page test `tests/pages/wires.spec.ts` (new): flag on (`#wires` z-index -1, `#wires-top` z-index 1,
  card fill alpha 0.7 read from a probe element because a card's own background is a gradient,
  focus on card 7 puts 4 hot paths in `#wires-top`, card 4 one, card 1 none, 14 connectors in
  `#wires`); flag off (`?flags=-wireLayers`: no `data-wire-layers`, opaque fill, hot paths stay in
  `#wires`, top layer empty); gallery section present by default and absent with the flag off; axe
  and a section screenshot per theme. Checked by mutation: with `z-index: -1` changed to 0 the board
  and gallery tests fail.
- Gallery: `apps/board/src/gallery/wire-section.ts` (section "See-through cards", `data-feature=
  "wireLayers"`, added in `main.ts` behind the flag like `nodeSize`/`agentAccess`). One stage on the
  canvas using the board's own `.vb-world[data-wire-layers]` rules, a connector behind an item card,
  one behind a note card, and a hot one in a top layer; real `<vb-node>` from the fixture. The stage
  needs `isolation: isolate` in `gallery.css` (the board's world has a transform, the gallery's does not).
- `node/pattern.json`: state `see-through`, and the `--card-surface*` / `--note-surface` hooks under `attributes`.
- `gallery.spec.ts` full-page screenshot now loads `?flags=-agentAccess,-wireLayers` (the precedent
  for a flagged section), so the new section is not in `gallery-*.png`; its own baselines are
  `__screenshots__/wires.spec.ts/see-through-{dark,light}-darwin.png`.
- Baselines: viewed the gallery and node-size diffs (a few red pixels, browser update only), then
  regenerated `gallery-*` and `node-size-*` with `--update-snapshots` and viewed the result.
- `controller.ts` 301 -> 300 lines (the layer const and its comment on one line); `draw.ts` was already the home for the rest.
- Gates (all exit 0): `npm test`, `npm run check`, `npm run verify`, `npm run test:pages` (129 passed), `npm run gen -- --check`.
- Dropbox put "conflicted copy" files into `test-results/` during runs (git-ignored output); harmless.

## On Completion

Fill in notes, update your row, append your own LOG line (`[board-ui] FE_01: …`).
