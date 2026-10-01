# packages/layout

The layout engine: the agent describes, the engine places (rule 9). One module per layout mode
(grid, list, flow, lanes, radial), a region packer that applies the person's pins, and the
connector router (right-angle connectors with rounded corners, fixed sides). Pure functions, no
DOM, fully unit-tested.

- **Depends on**: `packages/format`.
- **Used by**: `apps/board`.
- **Public API** (`src/index.ts`): `layoutBoard`, `MODE_FNS`, `routeLinks`, `roundedPath`,
  `boundsOf`, `overlaps`, region constants, and the layout types.
