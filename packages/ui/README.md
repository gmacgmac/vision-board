# packages/ui

The visual patterns, in Studio's component model (D-005, D-015): a framework-free core, a template,
and one generic web component per pattern (`<vb-node>`, `<vb-link>`, `<vb-region>`), driven by a
registry of type definitions. Each pattern has all its states and a `pattern.json`. Today it holds
the item card's core and template; the elements arrive in board v3.

- **Depends on**: `packages/format`, `packages/actions`, `packages/tokens` (CSS, loaded by the host page).
- **Used by**: `apps/board`.
- **Public API** (`src/index.ts`): the item core (kinds, labels, which actions an item offers)
  and the item template (`itemTemplate`, `esc`).
