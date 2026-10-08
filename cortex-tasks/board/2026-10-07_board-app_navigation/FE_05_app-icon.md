# FE_05_app-icon: App icon

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (ruling 5) ·
> **Tracker**: N21 · **Model**: Sonnet 5.5 · **Gate**: the token wording approved by the maintainer

## Objective

The toolbar icon and the browser-tab icon are the A · Flow drawing (one source box fanning out to
three outputs) in teal.

## Rulings (do not reopen)

1. The drawing: the maintainer's `Architect_illustration_options.html`, card "A · Flow" (one
   rounded square at the left, three curved and straight lines fanning to three smaller rounded
   rectangles). Redraw it as our own SVG on a 24px grid; no copy of that page's code or styles.
2. Colour: one token, approved wording in TASK-STATUS (measured 2026-10-07 with the repo's APCA
   helper, `temp/apca-2b.mjs` `lc`, against `--vb-surface-region`). The icon uses
   `currentColor` with `color: var(--vb-brand-mark)`; the outputs at reduced opacity, as the
   drawing has them.
3. Favicon: `apps/board/public/favicon.svg` (Vite copies `public/`; `server/static.ts` serves
   svg) with `<link rel="icon">` in `index.html` and `gallery.html`. A favicon can't read CSS
   tokens, so it carries the token's value, and a unit test fails if it differs from the token.
4. The hover animation from the drawing (lines flowing) is out: the toolbar icon is still.

## Steps

1. [x] The SVG (toolbar, inline in `Toolbar.svelte` replacing `.vb-brand span`), the token (only
   once approved), the favicon, the test, gallery mention.
2. [x] Look at it in a browser, dark and light, at 1x and 2x zoom.

## Validation

- [x] The five gates exit 0.

## Implementation Notes

**Status**: Completed. Token `--vb-brand-mark` added to `tokens.css` (approved wording, after `--vb-brand`). `shell/AppIcon.svelte`: the A · Flow drawing redrawn on a 24 grid (source 6x6 box, three 6x4 outputs at half opacity, connectors stroke 1.5 so it reads at 24px), `currentColor`, still; `.vb-brand` in `board.css` (24px, `color: var(--vb-brand-mark)`) replaced the conic-gradient placeholder. `apps/board/public/favicon.svg` (same drawing; light value as base, dark under `prefers-color-scheme`) linked from `index.html` and `gallery.html`; `apps/board/tests/app-icon.test.ts` fails if its two colours differ from the token's. Gallery section "App icon" (`gallery/app-icon-section.ts`, unflagged: an icon is not behaviour). Looked at in the browser, dark and light (toolbar, favicon as an image at 16/32/128px); the icon is a vector, so 2x is the same drawing. Notes: the favicon's `<style>` only applies when it is used as an image (as a tab icon); opened as a page it is blocked by the server's CSP, so it shows one colour there. The icon is 2px wider than the old 22px mark, so every toolbar item moved 2px right: board and gallery screenshot baselines updated (viewed: toolbar shift plus the new gallery section only).

## On Completion

Fill in notes, update your row, append your own LOG line (`[board-tokens] FE_05: …`).
