---
category: project-tooling
last_updated: 2026-11-20
status: active
scope: Every direct third-party package, with its exact version, who uses it and why; install scripts, licences and weight; every vendored asset (the board's fonts)
keywords: [dependencies, register, supply chain, npm, licences, install scripts, versions, fonts, vendored]
---

# Dependency register

**What this is.** One row for every third-party package a `package.json` names directly, with its
exact version and why we have it. The full installed tree is not listed: run `npm ls --all`.

**The check.** `npm run verify` (`checkManifest` in `scripts/verify.mjs`) fails when a
`package.json` names a package that is not exact or has no row here.

**The rule** (rule 20, cortex-rules 11, D-007): build it ourselves when that is small, install only
what a decision lists, pin exact versions, install with scripts off (`.npmrc`), and update this
register in the same change.

## Summary (2026-10-05, macOS arm64)

| Measure | Value |
|---|---|
| Direct dependencies | 11, all in the root `package.json` (one package scope, D-059): `ajv`, `fflate` in `dependencies`; 9 `devDependencies` |
| Lockfile third-party entries | 82, every platform included |
| Installed on this machine | 58 (the earlier 53 plus `ajv` and its 4 dependencies) |
| Install scripts run | 0. No installed package declares `preinstall`, `install` or `postinstall` |
| Licences (installed) | MIT 45, Apache-2.0 7, MPL-2.0 3, BSD-3-Clause 2, ISC 1 |

## Known audit findings we accept (2026-10-30)

`npm audit` reports `deepmerge` 4.3.1 (GHSA-gcqx-w48m-w2h4, low, prototype poisoning of `mergeObject`'s result), through
`@sveltejs/vite-plugin-svelte` 7.3.1. No fixed release exists and the plugin is at its latest. It merges our own build
config at build time and never reaches the page or the server, so it is accepted. Review when either package moves.
`vite` went to 8.3.4 rather than 8.3.5 (which is 9 days old) and `fast-uri` to 3.1.9 for the other findings.

## Direct dependencies: what and why (D-014)

| Package | Version | Declared in | Used by | Why |
|---|---|---|---|---|
| `svelte` | 5.57.1 | root `package.json` | `.svelte` files in `apps/board/src/` | The app shell around the board (D-012). A compiler, so pages ship as generated code plus a small runtime |
| `vite` | 8.3.4 | root `package.json` | `apps/board/vite.config.ts`; root `build` and `board` scripts | Builds the page into `apps/board/dist/`, which the board server serves |
| `@sveltejs/vite-plugin-svelte` | 7.3.1 | root `package.json` | `svelte()` in `apps/board/vite.config.ts`, `vitePreprocess` in `apps/board/svelte.config.js` | Compiles `.svelte` files inside Vite |
| `svelte-check` | 4.7.6 | root `package.json` | root `check` script | Strict type and accessibility checks of `.svelte` and `.ts` files (rules 5, 14) |
| `typescript` | 6.0.3 | `package.json` | `svelte-check` (peer) | Type checking. 6.x because `svelte-check` accepts only `^5 \|\| ^6`; review when it supports 7 |
| `fflate` | 0.8.3 | root `package.json` (`dependencies`) | `packages/documents` | Reads Word, Excel and zip files for `read_attachment` (D-071). MIT, no dependencies, no install scripts, one maintainer: exact pin. 0.8.3 fixes GHSA-px8p-9vwx-vf98 (a hang on a malformed ZIP64). |
| `pdfjs-dist` | 6.4.299 | root `package.json` (`devDependencies`: bundled into the page) | the sandboxed PDF frame in `apps/board/src/shell/` | Turns a PDF's pages into pictures (D-071). Apache-2.0, Mozilla. Its optional `@napi-rs/canvas` is for Node only; the page never loads it, and nothing here renders PDFs in Node. It has had flaws that let a PDF run script (the latest fixed in 6.2.108), so it runs only in a worker inside a frame with no origin and no network (D-072). Its JBIG2 and OpenJPEG decoders (WebAssembly) are bundled into that frame's script: their licences are in `node_modules/pdfjs-dist/wasm/LICENSE_*`. Its `cmaps/` and `standard_fonts/` are inside the script too, as the frame has no network, under their own licences: `cmaps/LICENSE` (Adobe), `standard_fonts/LICENSE_FOXIT` (PDFium) and `standard_fonts/LICENSE_LIBERATION`, all in `node_modules/pdfjs-dist/`. |
| `@types/node` | 22.20.5 | `package.json` | `"types": ["node"]` in the root `tsconfig.json` (N7) | Type definitions for Node's built-in modules, so package, server and bin code is strictly checked (rule 14). Major 22 matches our Node 22. Writing our own would be a second source of truth for Node's API (rule 6). Already in the tree through `vite`; now declared directly |
| `@playwright/test` | 1.63.0 | `package.json` | `tests/pages/` and the root `test:pages` script | Page tests (rule 13, D-025): opens the board and the gallery in Chromium and fails on console errors, failed requests, accessibility violations and screenshot changes. Same version as Uplynk Studio. Its browsers are downloaded by a separate `playwright install`, never by `npm install` |
| `axe-core` | 4.13.0 | `package.json` | `tests/pages/helpers.ts` | The accessibility checker the page tests inject into each page (WCAG 2 A and AA, rule 5). Same version as Uplynk Studio. No Playwright wrapper package is installed |
| `ajv` | 8.20.0 | root `package.json` (`dependencies`) | `apps/board/server/schema.ts` only (the server's I/O layer, its tests and `npm run validate`) | Validates ledger lines against the JSON Schemas in `packages/format/schema/` (D-026, rule 6). Draft 2020-12 through `Ajv2020`, strict mode, `discriminator`. Never imported by the page, so it never reaches the page bundle (rule 15). Timestamps use a pattern, so `ajv-formats` is not installed |

## Weight and risk

Transitive = installed packages reached through that package's own dependencies (shared ones count
under each package that needs them).

| Package | Transitive | Install scripts | Licence | Alternative not taken |
|---|---|---|---|---|
| `svelte` | 18 | none | MIT | staying framework-free (D-012) |
| `vite` | 15 (includes `rolldown`, `lightningcss`, `postcss`, `fsevents`) | none | MIT | Node's type stripping with no bundler: cannot compile `.svelte` |
| `@sveltejs/vite-plugin-svelte` | 5 | none | MIT | none: required to build Svelte with Vite |
| `svelte-check` | 10, plus `typescript` (peer) | none | MIT | none: the Svelte type checker |
| `typescript` | 0 | none | Apache-2.0 | TypeScript 7 (not supported by `svelte-check` 4.7.6) |
| `@types/node` | 1 (`undici-types` 6.21.0, type definitions only, pinned by the lockfile) | none | MIT | our own Node type definitions (would drift from real Node) |
| `@playwright/test` | 2 (`playwright`, `playwright-core`, 13 MB) | none | Apache-2.0 | a DOM emulator (jsdom, happy-dom): no layout, so no placement, contrast or screenshots (D-025) |
| `axe-core` | 0 (3 MB) | none | MPL-2.0 | hand-written accessibility assertions: would miss the rules axe already encodes |
| `ajv` | 4 (`fast-deep-equal` 3.1.3 MIT, `fast-uri` 3.1.8 BSD-3-Clause, `json-schema-traverse` 1.0.0 MIT, `require-from-string` 2.0.2 MIT) | none | MIT | our own JSON Schema validator: a second, untested reading of the standard (D-026) |

## Vendored assets (D-102)

Files copied into the repo from a third party: no package, no install step, no script. Each came over HTTPS from the
family's own repository at the commit named, font and licence files only, and opens as a valid WOFF2 font (its header,
Brotli stream, tables, family and weights: `packages/tokens/tests/fonts.test.ts`, which also holds every SHA-256 below).
They live in `packages/tokens/fonts/` beside their licences; `packages/tokens/src/fonts.css` names them, and the browser
fetches one only when text is drawn in it (`font-display: swap`). The standalone page serves them from itself; the plugin
carries the same files, each beside its licence, in its `view/fonts/` (`docs/specification/plugin.md` § Theme and host
styling, Fonts; D-116). Why: the two skins' type
(D-100, D-102; planner's call 4), with no font loaded from the network.

| File | Family, version | Weights | Source (HTTPS, `raw.githubusercontent.com/<repo>/<commit>/<path>`) | Bytes | SHA-256 |
|---|---|---|---|---|---|
| `figtree-variable.woff2` | Figtree 2.001 | 300-900 (variable) | `erikdkennedy/figtree` `032dfa7fe219ef3a02890d6d3add84eacc9aebfe` `fonts/webfonts/Figtree[wght].woff2` | 27676 | `6b96ce6d4783658f09e2b92d468da8e542d57aa6e4bc461ab2e7ae71565fdc64` |
| `figtree-OFL.txt` | its licence | | same commit, `OFL.txt` | 4388 | `140d37233e7f3ce7313798befa9600893bcceaf41a55fa0fa5ad52f7f657a268` |
| `bricolage-grotesque-semibold.woff2` | Bricolage Grotesque 1.001 | 600 | `ateliertriay/bricolage` `84745e5b96261ae5f8c6c856e262fe78d1d6efdd` `fonts/webfonts/BricolageGrotesque-SemiBold.woff2` | 47184 | `cab8ca1737e585e6405380385affc86cd53f22699c4a9065d81b49951de8ee30` |
| `bricolage-grotesque-OFL.txt` | its licence | | same commit, `OFL.txt` | 4403 | `4b5a7d8f37f5602621c8a8d7358a6a2e71317e6c231c661e15aef0275d3e07ba` |
| `space-grotesk-variable.woff2` | Space Grotesk 2.000 | 300-700 (variable) | `floriankarsten/space-grotesk` `03507d024a01282884232081fc6011c09ff4e849` `fonts/woff2/SpaceGrotesk[wght].woff2` | 49256 | `8e085aa438094f11487a836652edd5c054fa6a96f63fc7c282105ee3a4b08c07` |
| `space-grotesk-OFL.txt` | its licence | | same commit, `OFL.txt` | 4495 | `564ce565c371c5e5bbf286006565a7c9aa55a9f56e7ca58d56e05d649dd61a72` |
| `jetbrains-mono-variable.woff2` | JetBrains Mono 2.305 | 100-800 (variable) | `JetBrains/JetBrainsMono` `19371302b95d218af43299bce79ddbddd0bc364d` `fonts/webfonts/JetBrainsMono[wght].woff2` | 113672 | `31ec365b93e4bad6f202ce23352a56d01ca4462b2afc782ed2cf6fa42ca9ac0e` |
| `jetbrains-mono-OFL.txt` | its licence | | same commit, `OFL.txt` | 4399 | `a76abf002c49097d146e86740a3105a5d00450b1592e820a1109a8c5680cd697` |

- **Licence**: all four are under the SIL Open Font License 1.1, with no Reserved Font Name; each file is
  unmodified and ships with its licence, as the licence asks. The OFL allows bundling with any software.
- **Whole files, not Latin subsets**: cutting a subset needs a font tool (fonttools), which is an install the download
  rules did not allow; the families' own web files are used whole. A subset would shrink JetBrains Mono most (its
  Cyrillic and Greek). Weight at use: the default skin's two faces 74.9 KB, Command Lens's 162.9 KB, none at start.
- **Updating**: replace the file from the same repository, record the new commit, size and SHA-256 here; the test
  fails until the two agree.

## Install scripts

- No installed package declares `preinstall`, `install` or `postinstall` (every installed
  `package.json` read, 2026-10-01). No lockfile entry carries `hasInstallScript`.
- `acorn` and `lightningcss` declare `prepare`, which npm runs only for the root project and git
  dependencies, never for registry packages.
- Guard: `.npmrc` sets `ignore-scripts=true` and `save-exact=true`.

## Licences

- OFL-1.1: the four vendored font families (§ Vendored assets).
- MPL-2.0: `lightningcss` and its `darwin-arm64` binary (Vite's CSS tool, build time only). We do
  not modify their files.
- What ships to the browser is the built page: our code plus the Svelte runtime (MIT).

## Built ourselves instead of installing

| Need | Our code | Not installed |
|---|---|---|
| Unit tests | Node's built-in runner (root `test` script) | Vitest |
| Lint rules | `scripts/verify.mjs` | ESLint |
| Local server | `apps/board/server.ts` on `node:http` | Express, Vite's dev server |
| Modules | Folders named in the root `imports` map (D-059) | npm workspaces, pnpm |

Still to come: Prettier (D-007, tracker N5).
