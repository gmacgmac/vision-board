# packages/tokens

Design tokens: the only source of colour, spacing, type and motion (rule 3). One `light-dark()`
value per colour, item-state and kind tokens, reduced motion. Contrast follows the three APCA
tiers (D-009); the automated gate is still to come (tracker N1). Protected: change only with the
maintainer's yes.

- **Depends on**: nothing.
- **Used by**: `apps/board` (the page's stylesheet list, `src/styles/page.ts`, imports `#tokens/styles.css`), and `packages/ui` through it.
- **Public API**: the `--vb-*` custom properties in `src/tokens.css`, reached as `#tokens/styles.css` (D-060); no `<link>` in the HTML pages.
- **Ink tiers**: `--vb-ink-subtle` is muted text, so it is the reading tier (Lc 60) on every surface it is text on, in both themes; dark is `#b8b8c0` (maintainer point 415), Lc 63.0 on a card and 60.1 on the deepest surface, still about 8 Lc under `--vb-ink`.
- **Signals**: one colour per meaning. New is `--vb-state-fresh` (teal); updated is `--vb-state-updated` (a bright amber, D-088), kept apart from the action amber (`--vb-kind-action`) and the changed family's (`--vb-state-context`): by lightness and saturation in dark, by hue and chroma in light (a tangerine amber, ΔE76 20 or more from both and from the flag's and risk's oranges, in both themes). Its figures are in its comment and held by `tests/pages/update-signals.spec.ts`.
