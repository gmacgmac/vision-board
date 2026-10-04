---
category: project-docs
type: specification
status: active
created: 2026-10-04
scope: How a board UI pattern is built — core, template, element, styles and the node-type registry
---

# Component pattern

The model is `docs/principles.md` § Component model. The decisions are D-005, D-015 and D-016,
and rule 16. This page says how each layer is built, so every pattern (`<vb-node>`,
`<vb-region>`, later `<vb-link>` and the overlays) is built the same way.

## One folder per pattern

```
packages/ui/src/<pattern>/
  <pattern>-core.ts       states and rules, no DOM; unit-tested under plain Node
  <pattern>-template.ts   one pure function from data to markup; unit-tested under plain Node
  vb-<pattern>.ts         the element: renders from the template, updates in place (browser)
  <pattern>.css           the pattern's styles, tokens only (`var(--vb-*)`)
  pattern.json            what the pattern is (name, tag, states, attributes, events, a11y)
```

The page (`apps/board/`) creates elements, places them and listens to them. It never builds a
pattern's markup or styles it.

## The node-type registry (D-015)

- **One registry, in `packages/format`** (`node-types.ts`, `NODE_TYPES: Record<Kind, NodeType>`),
  because three layers read it: the action layer refuses an action the type doesn't offer, the
  layout engine will read outlines and ports, and the UI draws it. `format` is the only layer all
  three may import (D-016).
- A `NodeType` holds what is true of the type everywhere: `label` and `actions` (the review
  actions an item of this type offers) today, and `outline` and `ports` (D-013) once the first
  non-card shape is built (§ Shapes).
- **Presentation keyed by type lives in `packages/ui`** (an icon, a body template for unusual
  content), as `Record<Kind, …>` so the compiler fails when a kind is added and its entry is not.
- `KINDS` stays the list; `Kind` is its type. A new kind is one entry in `KINDS`, one in
  `NODE_TYPES` and the compiler-required UI entries. Nothing else lists kinds: CSS reads a kind's
  colour through `--kind`, which the element sets from `--vb-kind-<kind>`.

## The element

- **Light DOM, no shadow root.** The page's styles, focus handling and delegated events
  (`closest('vb-node')`) keep working, and agents can read the markup. Pattern CSS is scoped by
  the tag name (`vb-node .vb-node-title`), not by a shadow boundary.
- **Defined lazily.** `vb-<pattern>.ts` exports `defineVbNode()` (and so on), which creates the
  class and calls `customElements.define` once. Nothing touches `HTMLElement` at import, so
  the `packages/ui` front door stays importable from Node tests. The page calls
  `defineBoardElements()` once at start-up.
- **Render once, then update in place.** `render(data)` builds markup from the template when the
  data's version changes. `update(state)` changes only attributes, text and `aria-*`, so focus
  survives. The rules for what to show (`nodeState`, labels, which buttons) are in the core, so
  they are tested without a DOM.
- **The element knows nothing about layout.** It never imports `layout` (D-016). The page measures
  it, places it with `style.transform`, and sizes regions.
- **No inline styles.** The page's CSP has no `style-src`, so `style=""` attributes and `<style>`
  tags in templates are refused. Per-instance values (a kind's colour, a position) go through the
  CSSOM: `el.style.setProperty('--kind', …)`, `el.style.transform = …`.
- **Self-describing.** The element sets its own `role`, `tabindex` and label. Custom elements are
  `display: inline` by default, so `<pattern>.css` sets `display`.
- **Don't shadow built-in names** (steering rule 16).

## Shapes: outlines and ports (D-013, D-015)

A shape is data in the registry, not a new element. Approved examples (maintainer, 2026-10-04):
the **decision diamond** (a fork in a flow, one way in, a "yes" and a "no" way out) and the
**start/end pill** (where a flow begins or ends). The card stays the default.

- **`outline`** names the shape: `card` (default), `diamond`, `pill`. It is a word, not a path, so
  the agent never draws coordinates (rule 9). The node pattern owns one drawing per outline in
  `node.css` (CSS `clip-path` or a background SVG, tokens only); a kind's colour still arrives
  through `--kind`.
- **`ports`** say where connectors may attach, as sides and positions on the outline's box:
  `{ side: 't' | 'r' | 'b' | 'l', at?: 0..1 }` (at defaults to the middle). Card: every side,
  spread as today. Diamond: its four points (`t`, `r`, `b`, `l` at 0.5). Pill: its two ends
  (`l`, `r`), or `t`, `b` in a vertical flow. A port may carry a `label` ("yes", "no").
- **The layout engine reads them through `format`**: `routeLinks` picks the nearest port the
  type allows instead of any side, and clips each line to the outline's edge (the box edge for a
  card, the point for a diamond, the rounded end for a pill). Same input, same picture.
- **A link names a port only when it matters**: an optional `fromPort` label on a link (e.g.
  "yes") is a format change, made first with a schema version bump (rule 6 / "change the format
  first").
- **How a type gets a shape**: a new kind (for example `fork`, `start`, `end`) with its outline
  and ports in `NODE_TYPES`, or an optional `shape` on a node for kinds that may take several.
  Which of the two is decided in the shapes task, after the mockups.
- **Order**: mockups of both shapes in Architect's look after Stage 2b, picked by eye, then one
  task adds outline and ports to the registry, the layout engine and the node CSS, behind a flag
  (rule 12), with the gallery and page tests covering both shapes.

## Type checking

- Core and template files run under Node and must not use the DOM at run time; the Node tests
  import them, so a DOM call fails a test.
- The root `tsconfig.json` includes the DOM library types, so element files type-check where they
  live. That is a type-level permission only: a DOM call reached from a Node test still fails.

## Tests

- **Core and template:** unit tests in `packages/ui/tests/`, under `npm test`, on fixture data.
- **Template and element agree:** the element renders by calling the template, never its own
  markup, so there is one markup path. A server render (principles § "One template, two render
  paths") will call the same template when one exists.
- **Element in a page:** page tests (D-025, `npm run test:pages`) open the board and the pattern
  gallery in Chromium and fail on console errors, failed requests, accessibility violations or
  screenshot changes. A new pattern needs a gallery entry: a section in
  `apps/board/src/gallery/` drawn from `gallery.ledger.jsonl` through the pattern's own core
  (`nodeState`, `regionState`), never hand-written markup. The gallery lists patterns from their
  `pattern.json`, and `tests/pages/gallery.spec.ts` fails for a pattern that has no samples.

## Feature flags (rule 12)

A refactor that keeps the look and behaviour needs no flag. A new mode, node type or behaviour
ships behind one; the flag mechanism is defined by the first task that ships new behaviour.
