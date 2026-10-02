# board-v3-design

The agreed visual spec for board v3 (D-024). Reference only: the build ports the look and the
behaviour into `packages/` and `apps/`, never this code. Open the pages through a local server
(`python3 -m http.server 4477 --bind 127.0.0.1` from the repo root, then
`/prototypes/board-v3-design/mockups/index.html`), since browsers block `file:` stylesheets.

- `architect-extract/`: Uplynk Architect's stylesheet, interactions and markup, copied verbatim,
  with `README.md` listing every capability and where it goes.
- `mockups/01b-cards-content-first.html`: **locked.** Cards, border tabs, footer, selection,
  open-frame containers.
- `mockups/02-mode-picker.html`, `03-proposals-and-seen.html`, `04-decision-flow.html`: options
  for the maintainer to pick by eye.
