# packages/layout

The layout engine: the agent describes, the engine places (rule 9). One module per layout mode
(`modes/`: grid, column, row, flow, radial, and `modes/lanes/`, layered by link depth with each
lane packed left and its stacks ordered to cut crossings), a region packer that applies the
person's pins, and the connector router (`route/`: right angles with rounded corners and spread
ports; inside a container, through the gutters between columns and lanes, never under a card,
parallel runs on their own tracks; each label's place near the source with a `fits` flag). Each
mode takes the viewer's alignment and the container's card widths (`match` or `own`) as inputs.
`structureOf` answers `show_layout` from the same mode and router. Pure functions, no DOM, fully
unit-tested.

- **Depends on**: `packages/format`.
- **Used by**: `apps/board`.
- **Public API** (`src/index.ts`): `layoutBoard`, `layoutRegion`, `packRegions`, `MODE_FNS`,
  `routeLinks` (pass `BoardLayout.groups` to route moved boxes as the board does), `routeLines`,
  `roundedPath`, `crossingLines`, `crossingPoints`, `labelSize`, `structureOf`, `boundsOf`,
  `overlaps` (both from `#format` `geometry.ts`), region constants, and the layout types (among them `Align`, `LabelPlace`,
  `LayoutStructure` and `CardCell`, a container's structure as `show_layout` serves it, api.md 133).
