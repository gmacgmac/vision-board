---
category: project-tooling
last_updated: 2026-10-04
status: active
scope: Every direct third-party package, with its exact version, who uses it and why; install scripts, licences and weight
keywords: [dependencies, register, supply chain, npm, licences, install scripts, versions]
---

# Dependency register

**What this is.** One row for every third-party package a `package.json` names directly, with its
exact version and why we have it. The full installed tree is not listed: run `npm ls --all`.

**The check.** `npm run verify` (`checkManifest` in `scripts/verify.mjs`) fails when a
`package.json` names a package that is not exact or has no row here.

**The rule** (rule 20, cortex-rules 11, D-007): build it ourselves when that is small, install only
what a decision lists, pin exact versions, install with scripts off (`.npmrc`), and update this
register in the same change.

## Summary (2026-10-04, macOS arm64)

| Measure | Value |
|---|---|
| Direct dependencies | 8, all `devDependencies`: 4 in `apps/board/package.json`; `typescript`, `@types/node`, `@playwright/test` and `axe-core` at the root |
| Lockfile third-party entries | 77, every platform included, workspace links excluded |
| Installed on this machine | 53 (the earlier 49 plus the 4 page-test packages, all installed) |
| Install scripts run | 0. No installed package declares `preinstall`, `install` or `postinstall` |
| Licences (installed) | MIT 41, Apache-2.0 7, MPL-2.0 3, ISC 1, BSD-3-Clause 1 |

## Direct dependencies: what and why (D-014)

| Package | Version | Declared in | Used by | Why |
|---|---|---|---|---|
| `svelte` | 5.57.1 | `apps/board/package.json` | `.svelte` files in `apps/board/src/` | The app shell around the board (D-012). A compiler, so pages ship as generated code plus a small runtime |
| `vite` | 8.3.1 | `apps/board/package.json` | `apps/board/vite.config.ts`; root `build` and `board` scripts | Builds the page into `apps/board/dist/`, which the board server serves |
| `@sveltejs/vite-plugin-svelte` | 7.3.1 | `apps/board/package.json` | `svelte()` in `apps/board/vite.config.ts`, `vitePreprocess` in `apps/board/svelte.config.js` | Compiles `.svelte` files inside Vite |
| `svelte-check` | 4.7.6 | `apps/board/package.json` | root `check` script | Strict type and accessibility checks of `.svelte` and `.ts` files (rules 5, 14) |
| `typescript` | 6.0.3 | `package.json` | `svelte-check` (peer) | Type checking. 6.x because `svelte-check` accepts only `^5 \|\| ^6`; review when it supports 7 |
| `@types/node` | 22.20.5 | `package.json` | `"types": ["node"]` in the root `tsconfig.json` (N7) | Type definitions for Node's built-in modules, so package, server and bin code is strictly checked (rule 14). Major 22 matches our Node 22. Writing our own would be a second source of truth for Node's API (rule 6). Already in the tree through `vite`; now declared directly |
| `@playwright/test` | 1.63.0 | `package.json` | `tests/pages/` and the root `test:pages` script | Page tests (rule 13, D-025): opens the board and the gallery in Chromium and fails on console errors, failed requests, accessibility violations and screenshot changes. Same version as Uplynk Studio. Its browsers are downloaded by a separate `playwright install`, never by `npm install` |
| `axe-core` | 4.13.0 | `package.json` | `tests/pages/helpers.ts` | The accessibility checker the page tests inject into each page (WCAG 2 A and AA, rule 5). Same version as Uplynk Studio. No Playwright wrapper package is installed |

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

## Install scripts

- No installed package declares `preinstall`, `install` or `postinstall` (every installed
  `package.json` read, 2026-10-01). No lockfile entry carries `hasInstallScript`.
- `acorn` and `lightningcss` declare `prepare`, which npm runs only for the root project and git
  dependencies, never for registry packages.
- Guard: `.npmrc` sets `ignore-scripts=true` and `save-exact=true`.

## Licences

- MPL-2.0: `lightningcss` and its `darwin-arm64` binary (Vite's CSS tool, build time only). We do
  not modify their files.
- What ships to the browser is the built page: our code plus the Svelte runtime (MIT).

## Built ourselves instead of installing

| Need | Our code | Not installed |
|---|---|---|
| Unit tests | Node's built-in runner (root `test` script) | Vitest |
| Lint rules | `scripts/verify.mjs` | ESLint |
| Local server | `apps/board/server.ts` on `node:http` | Express, Vite's dev server |
| Workspaces | npm workspaces | pnpm |

Still to come: Prettier (D-007, tracker N5).
