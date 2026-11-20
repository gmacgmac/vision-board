# Handover for nclite: let the Vision Board plugin bring its own fonts

From Vision Board, 2026-11-20. Paste into nclite's repo. Vision Board's open point 15 (`docs/specification/plugin.md`
§ Open points; § Theme and host styling, Fonts; decision D-102).

## Why

The board is designed in its own typefaces: Figtree (card text) and Bricolage Grotesque (card titles) in the default
skin, and Space Grotesk and JetBrains Mono in the Command Lens skin. Inside nclite they never load. nclite's
stylesheet check (`engine/plugins/stylesheet.ts`) allows no `@font-face` and no `url()` except `data:`, so the board's
build leaves the faces out. Cards then draw in nclite's `--host-font`, or else the system font.

The board still works without them. But the system font draws larger than Figtree at the same size, and card body text
has just moved from 13px to 14px (decision D-112). Without the board's faces, cards in nclite look larger and looser
than designed. **To keep the board's own look in nclite, nclite needs to let the plugin bring its faces.**

## The ask (recommended)

Let a plugin's stylesheet hold `@font-face` rules under these limits, checked by `stylesheet.ts`:

1. `font-family` is in the plugin's scope: `vb-…` for the board (`vb-figtree`, `vb-bricolage-grotesque`,
   `vb-space-grotesk`, `vb-jetbrains-mono`).
2. `src` is one `url()` to a `.woff2` file inside the plugin's own folder, as a relative path such as
   `url("fonts/figtree-variable.woff2")`. Nothing else is allowed: no other folder, no `..`, no address with a scheme,
   no `local()`.
3. Only these descriptors: `font-family`, `src`, `font-weight`, `font-style`, `font-display`, `unicode-range`.
4. nclite serves the plugin folder's `fonts/` the way it serves `view/`, and its content security policy allows fonts
   from there (`font-src`).

The browser fetches a face only when text is drawn in it, so the default skin costs two files.

## What the board ships

Four files under the SIL Open Font License, each with its licence beside it. In the board's repo they are in
`packages/tokens/fonts/`:

| File | Size |
|---|---|
| `figtree-variable.woff2` | 27.7 KB |
| `bricolage-grotesque-semibold.woff2` | 47.2 KB |
| `space-grotesk-variable.woff2` | 49.3 KB |
| `jetbrains-mono-variable.woff2` | 113.7 KB |

## What the board does once nclite allows it

- The plugin folder gains `fonts/` and the four faces, declared in `view/board.css`.
- The board's build stops leaving the faces out: `apps/board/vite.plugin.config.ts` `hostTakesNoFontFaces` goes.
- The board's own check of its built sheet follows the same limits.

A host that still refuses font faces gets today's fallback, so nothing breaks either way. Tell us the exact path form
the check accepts, and we ship the matching folder.

## If nclite would rather not

- **The faces inside the stylesheet as `data:`:** works with today's check, but every view load carries about 240 KB,
  whether a skin uses the faces or not.
- **nclite sets `--host-font` to Figtree and ships the face itself:** the board then draws in it as it does today
  with `--host-font`.

Either way, say which, and the board's spec records it as the answer to open point 15.
