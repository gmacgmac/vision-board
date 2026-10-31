# packages/ui

The visual patterns, in Studio's component model (D-005, D-015): a framework-free core, a template,
and one generic web component per pattern (`<vb-node>`, `<vb-link>`, `<vb-region>`), driven by a
registry of type definitions. Each pattern has all its states and a `pattern.json`. How a pattern
is built: `docs/specification/components.md`. Today it holds the node pattern (`src/node/`), whose
element `<vb-node>` draws every card on the board and `<vb-region>` every container frame; `<vb-link>` follows.

- **Depends on**: `packages/format`, `packages/actions`; its CSS uses the `packages/tokens` properties, which the host page loads.
- **Used by**: `apps/board`.
- **Public API** (`#ui`, `src/index.ts`, D-059): the node core (`nodeState`, `NodeState`, `nodeLabel`, `offers`,
  `isPressed`, `STATUS_LABEL`), the node template (`nodeTemplate`, `esc`), the element type
  `VbNodeElement`, the Markdown renderer (`renderMarkdown`, `MarkdownOptions`, `MARKDOWN_MAX`;
  D-023, `src/markdown/`), and `defineBoardElements()`, which the page calls once at start-up, and `PATTERNS` (`src/patterns.ts`, each
  pattern's `pattern.json`, which the gallery reads; `tests/patterns.test.ts` fails for a folder missing
  from it).
  Pattern CSS is one front door, `#ui/styles.css` (`src/styles.css`, every pattern's sheet in cascade
  order), which the page imports once through `apps/board/src/styles/page.ts`.
- **The shared base** (`src/base/`, UI_01, its `pattern.json`; `tests/base-menu.test.ts`,
  `base-layer.test.ts`, `base-dialog.test.ts`): what every menu, popover and dialog is built from, once.
  The menu (`openMenu`, `menuKeydown`: the WAI-ARIA keys, a press outside, focus back on Esc), the
  dismissable layer (`dismissable`: Esc and a press outside close what is open), and the modal dialog
  (`syncModal`, `backdropClick`, `whenShut`, over the native `<dialog>`), each a pure core with a
  framework-free browser side, all exported from `#ui`. Its CSS recipes come first in `#ui/styles.css`:
  `root.css` (the `.vb-board` root and its `vb-board` container, the scope, the host guard), `a11y.css`
  (the focus ring, visually hidden), `text.css` (key, code), `surface.css`, `button.css`, `chip.css`,
  `menu.css` and `dialog.css`. A screen reuses these and adds only its own rules (`verify`'s
  `checkScope` fails a selector that reaches outside the board).
- **App cards** (D-047): `src/app-frame/` draws an app's panel in a sandboxed frame (`<vb-app-frame>`)
  and speaks the panel protocol (`createAppBridge`, DOM-free); `src/node/node-app.ts` (`appView`)
  is an app card's state view. Their sheets, `src/node/node-app.css` and
  `src/app-frame/app-frame.css`, are in `#ui/styles.css` (components.md § App card).
- **Images in cards** (D-048): the Markdown renderer writes an image's one shape, or the box saying
  why it is not shown (`src/markdown/image.ts`; `renderMarkdown`'s `images`, `svg` and `imageRoute` say whether and where, from whoever renders);
  `src/image-view/` is an image on a card as its button (`imageButton`, `showProblem`) and the zoomed
  view (`<vb-image-view>`, `fitImage`). Its sheet, `src/image-view/image-view.css`, is in `#ui/styles.css` (components.md
  § Images in cards, § Image view).
- **Shared state helpers**: `src/tip/` (the hover tip) and `src/paused/` (a locked board's controls
  paused in place, aria-disabled, for the node and region elements; N40, `paused.css` in
  `#ui/styles.css`).
