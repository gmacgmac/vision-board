# packages/tokens

Design tokens: the only source of colour, spacing, type and motion (rule 3). One `light-dark()`
value per colour, item-state and kind tokens, reduced motion. Contrast follows the three APCA
tiers (D-009); the automated gate is still to come (tracker N1). Protected: change only with the
maintainer's yes.

- **Depends on**: nothing.
- **Used by**: `apps/board` (the page's stylesheet list, `src/styles/page.ts`, imports `#tokens/styles.css`), and `packages/ui` through it.
- **Public API**: the `--vb-*` custom properties in `src/tokens.css`, reached as `#tokens/styles.css` (D-060); no `<link>` in the HTML pages.
