# packages/ui

The visual patterns, in Studio's component model (D-005, D-015): a framework-free core, a template,
and one generic web component per pattern (`<vb-node>`, `<vb-link>`, `<vb-region>`), driven by a
registry of type definitions. Each pattern has all its states and a `pattern.json`. How a pattern
is built: `docs/specification/components.md`. Today it holds the node pattern (`src/node/`), whose
element `<vb-node>` draws every card on the board; `<vb-region>` and `<vb-link>` follow.

- **Depends on**: `packages/format`, `packages/actions`, `packages/tokens` (CSS, loaded by the host page).
- **Used by**: `apps/board`.
- **Public API** (`src/index.ts`): the node core (`nodeState`, `NodeState`, `nodeLabel`, `offers`,
  `isPressed`, `STATUS_LABEL`), the node template (`nodeTemplate`, `esc`), the element type
  `VbNodeElement`, and `defineBoardElements()`, which the page calls once at start-up. Pattern CSS
  (`src/node/node.css`) is imported by the page.
