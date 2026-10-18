# packages/ui

The visual patterns, in Studio's component model (D-005, D-015): a framework-free core, a template,
and one generic web component per pattern (`<vb-node>`, `<vb-link>`, `<vb-region>`), driven by a
registry of type definitions. Each pattern has all its states and a `pattern.json`. How a pattern
is built: `docs/specification/components.md`. Today it holds the node pattern (`src/node/`), whose
element `<vb-node>` draws every card on the board and `<vb-region>` every container frame; `<vb-link>` follows.

- **Depends on**: `packages/format`, `packages/actions`, `packages/tokens` (CSS, loaded by the host page).
- **Used by**: `apps/board`.
- **Public API** (`src/index.ts`): the node core (`nodeState`, `NodeState`, `nodeLabel`, `offers`,
  `isPressed`, `STATUS_LABEL`), the node template (`nodeTemplate`, `esc`), the element type
  `VbNodeElement`, the Markdown renderer (`renderMarkdown`, `MarkdownOptions`, `MARKDOWN_MAX`;
  D-023, `src/markdown/`), and `defineBoardElements()`, which the page calls once at start-up.
  Pattern CSS (`src/node/node.css`, `src/markdown/markdown.css`) is imported by the page.
- **App cards** (D-047): `src/app-frame/` draws an app's panel in a sandboxed frame (`<vb-app-frame>`)
  and speaks the panel protocol (`createAppBridge`, DOM-free); `src/node/node-app.ts` (`appView`)
  is an app card's state view. The page imports `src/node/node-app.css` and
  `src/app-frame/app-frame.css` with the other pattern styles (components.md § App card).
- **Shared state helpers**: `src/tip/` (the hover tip) and `src/paused/` (a locked board's controls
  paused in place, aria-disabled, for the node and region elements; N40, `paused.css` imported by
  the page).
