# T_02_tokens-skins-fonts: Tokens, Skin Layer and Fonts

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Add the tokens the new node and both skins read, make a skin a set of token values, and ship the fonts with the
board.

---

## Context

PLAN.md § Decisions 13, 14, 17, 21 and § Planner's calls 2, 4. A tone is a palette name or a hue (decision 17;
the ledger review's § 4 O3, row R26): the board derives every tint from the hue, so the tints are built, not
listed, and contrast is proven by a sweep. Colour literals live only in
`packages/tokens/src/tokens.css`, each as one `light-dark()` value fronted by its `--vb-host-*` where a host may give
it (`CODE-MAP.md` § 11). That file is protected: this task changes it under decision 13 and lists its exact diff.
The mockups' values are in the `<style>` of `design/mockups/node-skins/*.html`; they were picked by eye, so measure
them.

You run in your own git worktree beside BE_03 and BE_04 (PLAN.md § House Rules; TASK-STATUS.md § File Ownership).

**Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: `packages/tokens/src/tokens.css`, `packages/tokens/src/` (a new `skins.css`, `fonts.css`),
  `packages/tokens/fonts/` (new), `packages/tokens/README.md`, `packages/tokens/tests/` or the contrast tests that
  list token pairs, `apps/board/plugin/theme.css`, `apps/board/server/static.ts` and `app.ts` (only to serve the
  font files and keep the CSP right), `apps/board/vite*.config.ts` (only so the build and the plugin build carry the fonts),
  `docs/specification/dependencies.md`, `docs/specification/plugin.md` § Theme and host styling, `tests/plugin/`
  (one new test that the built plugin carries its fonts; not `contract/nclite/shared/`, which is BE_03's in this
  wave)
- **Files to reference**: `design/mockups/node-skins/*.html`; `tests/pages/apca.ts`; `apps/board/tests/plugin-theme.test.ts`;
  `packages/format/src/view.ts` (`TONES`, the tone's hue, `SKINS`, from T_01); the review § 4 O3 ("How the board
  draws it"); `scripts/verify-style.mjs` (`FUNC`: channels given as variables pass)
- **Skills**: `cortex-architecture`, `cortex-docs`

> Modify only the files this task owns. Need a change elsewhere? List it under `REQUESTS`.

---

## Steps

1. [ ] **Semantic tokens** for: the answer (waiting, ticked fill, crossed fill, the mark on a fill), the bookmark
       (fill and ink; it replaces `--vb-state-flag`, which stays as an alias until FE_02 removes its last use), the
       notes mark (quiet, counted, unread), the change badge (new, updated, settled), the icon tile, selection (how
       much brighter and thicker), and the minimum mark size FE_05 uses. Decision's new colour (decision 13) applies only under `[data-vb-edges]`, the root attribute
       FE_02 sets when `nodeEdges` is on, so no existing screenshot changes; T_04 makes it the token's own value.
1a. [ ] **Tones from a hue** (R26): one hue property, `--vb-tone-h`, which FE_01 sets on a node from the checked
       number (never from text). Each name in `TONES` is a fixed hue token (`--vb-tone-hue-<name>`), so a name and
       a number go through one derivation. The tints (the body, the top line, the icon tile, and their borders) are
       built in `tokens.css` with `oklch()` from lightness and strength tokens per theme and per skin plus that hue;
       a name with almost no colour (`slate`) gets its own strength. Text on a tint carries no hue. Check that
       `oklch()` renders in Chromium and in WebKit (`npm run test:plugin:webkit`; nclite's webview) and record what
       you saw; if WebKit fails, stop and report.
1b. [ ] **The sweep**: a contrast test over all 360 hues and every palette name, light and dark, each skin, each
       tinted surface against the text and marks drawn on it, at the project's tiers. Tune the lightness and
       strength tokens until it passes. Report any hue whose tint reads as the notes pink or Tick's green or Cross's
       red (call 2); no hue band is refused unless the maintainer says so.
2. [ ] **Measure** every new foreground and background pair with APCA in light and dark and add it to the pair
       list the tests check (Lc 60 reading text, 45 short coloured labels, 30 decoration). A failing colour is fixed
       by lightness within its hue. Report any pair you could not bring to its tier.
3. [ ] **The skin layer**: a skin is token values under `[data-vb-skin='<name>']` on the board's root, in
       `skins.css`. `default` needs no block. `command-lens` sets its surfaces, plates, radii, type and grid. A
       pattern never names a skin. A test fails if a `SKINS` name has no block or a block names an unknown skin.
4. [ ] **Hosts**: host colours and `--host-font` still win over a skin (D-094); extend
       `plugin-theme.test.ts` to hold that, and say it in `plugin.md`.
5. [ ] **Fonts** (the maintainer gave his go at kickoff, point 219A, on condition they are safe): download only
       from the family's own repository or the official Google Fonts repository, over HTTPS, font and licence files
       only (no scripts, no packages, no install step); check each file opens as a valid font; list, for each of
       Figtree, Bricolage Grotesque, Space Grotesk and JetBrains Mono, the file name, the source URL, the size, the
       licence and its SHA-256 in your notes. Then vendor Latin-subset
       `woff2` files into `packages/tokens/fonts/` with each licence file, add `@font-face` rules
       (`font-display: swap`) in `fonts.css`, and type tokens (`--vb-font-display`, the skin's text and label
       fonts) that fall back to today's system stacks. A font loads only when a skin uses it.
5a. [ ] **Fonts in the plugin** (point 226): the font files ship inside the plugin's folder, so a host that loads
       the plugin has them with no network. `plugin.md` says which fonts the plugin brings, that its stylesheet loads
       them from its own folder, and how a host gives its own font instead (`--host-font`). A plugin test holds that
       the built plugin contains the font files and its CSS points only at them.
6. [ ] **Register** the fonts in `dependencies.md` under a new section for vendored assets (name, version, source,
       licence, why).
7. [ ] Put the exact `tokens.css` diff in your notes.

---

## Validation

- [ ] `npm run verify` (no colour literal outside the tokens), `npm run check`, `npm test`, `npm run test:plugin` pass
- [ ] The contrast tests list and pass every new pair, light and dark, and the hue sweep passes for every hue, name,
      theme and skin
- [ ] With the network blocked (the page tests' default) the board loads its fonts from itself; with the font
      files removed it falls back with no error
- [ ] With no flag on, `npm run test:pages -- board.spec.ts every-node.spec.ts host-styles.spec.ts` passes with no
      new baseline

---

## Constraints

- If you need to deviate, stop and tell the maintainer; no breaking change is made silently.
- No PII in examples. Interim files in `temp/`. Writes over 50 lines in chunks.
- No git command that changes state; the orchestrator commits.
- Every flag this set adds stays off by default; existing tests and screenshots pass with them off.
- A problem outside this task is reported (`REQUESTS`, `NOTES`), never fixed here.

---

## Implementation Notes

_To be completed by agent after task completion._
_Re-run? Add a `### Run N` block below the last one; never overwrite an earlier run._

### Run 1

**Status**: Completed, with one deviation awaiting a ruling (step 5a, below)  
**Completed**: 2026-11-16 13:40  

### Changes Made
- `packages/tokens/src/tokens.css` (protected; exact diff at the end): `@import` of `fonts.css` and `skins.css`, so
  `#tokens/styles.css` stays the one entry; edge tokens (`--vb-mark-h`, `--vb-mark-min` 14px, `--vb-answer-size`,
  `--vb-tile-size`, `--vb-tile-icon`, `--vb-node-radius`, `--vb-mark-radius`, `--vb-tile-radius`), tints and selection
  (`--vb-node-tint`, `--vb-node-tint-selected`, `--vb-tile-tint` 12%, `--vb-select-w`), the canvas pattern
  (`--vb-canvas-image`, `--vb-canvas-size`); the answer (`--vb-answer-wait`, `-tick`, `-cross`, `-mark`); Bookmark
  (`--vb-bookmark`, `-ink`; `--vb-state-flag` is now its alias); notes (`--vb-notes-quiet`, `-count`, `-unread`,
  `-unread-ink`); the change badge (`--vb-badge-new`, `-updated`, `-settled`); the plate (`--vb-plate`, `-ink`,
  `-muted`, `-line`) and `--vb-grid`; type (`--vb-font-text`, `-display`, `-label`, host first, system last);
  Decision's fuchsia under `.vb-board[data-vb-edges]` only; tones: `--vb-tone-hue-<name>`, `--vb-tone-strength`
  (slate 0.3), lightness and chroma per part and theme, and `vb-node[data-vb-tone]` building `--vb-tone-body`,
  `-tile`, `-line`, `-ink`, `-edge` with `oklch()` from `--vb-tone-h`.
- **For FE_01**: set `data-vb-tone` to the name or `hue`, and `--vb-tone-h` to the checked number or, for a name,
  `var(--vb-tone-hue-<name>)` (from `TONES`, never text). Body text on a tint keeps `--vb-ink*`. A selected node:
  border `--vb-select-w`, toned nodes use `--vb-tone-line` for it.
- `packages/tokens/src/skins.css` (new): `.vb-board[data-vb-skin='command-lens']`: surfaces, inks, lines, plate,
  grid, radii, faces; each host-givable colour keeps its `--vb-host-*` in front.
- `packages/tokens/src/fonts.css` (new), `packages/tokens/fonts/` (new): four `@font-face` (`vb-figtree`,
  `vb-bricolage-grotesque`, `vb-space-grotesk`, `vb-jetbrains-mono`; `font-display: swap`), four woff2 and four
  OFL files. Downloads (HTTPS, `raw.githubusercontent.com`, each family's own repository at a pinned commit; font and
  licence files only; no package, no script):

  | File | Source | Bytes | Licence | SHA-256 |
  |---|---|---|---|---|
  | `figtree-variable.woff2` | `erikdkennedy/figtree@032dfa7f` `fonts/webfonts/Figtree[wght].woff2` | 27676 | OFL-1.1 | `6b96ce6d4783658f09e2b92d468da8e542d57aa6e4bc461ab2e7ae71565fdc64` |
  | `bricolage-grotesque-semibold.woff2` | `ateliertriay/bricolage@84745e5b` `fonts/webfonts/BricolageGrotesque-SemiBold.woff2` | 47184 | OFL-1.1 | `cab8ca1737e585e6405380385affc86cd53f22699c4a9065d81b49951de8ee30` |
  | `space-grotesk-variable.woff2` | `floriankarsten/space-grotesk@03507d02` `fonts/woff2/SpaceGrotesk[wght].woff2` | 49256 | OFL-1.1 | `8e085aa438094f11487a836652edd5c054fa6a96f63fc7c282105ee3a4b08c07` |
  | `jetbrains-mono-variable.woff2` | `JetBrains/JetBrainsMono@19371302` `fonts/webfonts/JetBrainsMono[wght].woff2` | 113672 | OFL-1.1 | `31ec365b93e4bad6f202ce23352a56d01ca4462b2afc782ed2cf6fa42ca9ac0e` |

  Licence files and their hashes, full commits: `dependencies.md` § Vendored assets. Each opens as a font: WOFF2
  header, Brotli stream and tables read in Node (`fonts.test.ts`), and `FontFace` status `loaded` in Chromium and WebKit.
- `apps/board/plugin/theme.css`: `--vb-host-font`, `--vb-host-font-mono` from the host's two faces.
- `apps/board/vite.plugin.config.ts`: `hostTakesNoFontFaces` (the view's sheet drops the four `@font-face`, carries
  no woff2); and, for BE_04, the engine bundle keeps no doc comments (`comments: { legal, annotation, jsdoc: false }`):
  `engine/engine.js` 236,283 → 198,961 gzip in this worktree (1,017,745 → 914,496 bytes), before BE_04's code.
- Tests: `packages/tokens/tests/skins.test.ts` (a block per `SKINS` name but default, none other; a skin sets only
  declared tokens), `packages/tokens/tests/fonts.test.ts` (faces valid, weights, licences, SHA-256 in the register,
  fallbacks), `apps/board/tests/plugin-theme.test.ts` (+1: host colours and faces win over a skin),
  `tests/plugin/token-contrast.spec.ts` (every new pair; the 360-hue and name sweep per skin and theme, drawn tint =
  OKLCH arithmetic within 1.5/255, so in gamut; a skin reaches the root and a host wins, live).
- Docs: `plugin.md` § Theme and host styling (Skins, Fonts), open point 15, and BE_04's three edits word for word;
  `dependencies.md` § Vendored assets and § Licences; `packages/tokens/README.md`.

### Issues & Resolutions
- **Measured and fixed** (by lightness within the hue, step 2): dark cross fill `#cf3a3a` → `#d84341` (disc on the
  dark card Lc 27.9 → 31.1, white mark 74.7); Command Lens dark muted ink `#a0a4ac` → `#b6bac2` (51.4 → 63.6 on the
  card, 60.8 on deep); plate muted `#8b95a3` → `#aab5c3` (44.2 → 61.2). The kind tile tint 16% → 12% (dark topic
  icon on its tile 44.4 → 45.5). No pair is left under its tier.
- **Tone sweep result** (Chromium and WebKit, both skins, light and dark, 360 hues and 8 names): worst Lc, default:
  muted ink on the body 68.7 / 62.0, a kind word 55.6 / 46.9, icon on tile 65.8 / 59.9, top line on the canvas 55.7 /
  49.4. `oklch()` renders in both engines exactly as the arithmetic (WebKit run: `npm run test:plugin:webkit`).
- **Hues near a meaning colour** (call 2, by hue angle, ±15°; the tints are low in chroma, so the line reads as a muted
  version): notes pink 331-5 (pink at 346-351), Tick green 145-175 (tick 160, state-ack 153), Cross red 10-40 (25).
  Names: `magenta` (330) sits at the pink band's edge and 6° from Decision's new fuchsia (323); `green` (140) is 13°
  from state-ack. No band refused.
- **Fonts**: no Latin subsets: cutting one needs fonttools, an install the download rule forbids; the families' own
  web files are vendored whole (Figtree is Latin-only anyway). With nothing using the type tokens (flags off), no font
  is fetched; used, each comes from the page itself; with the files gone (404), `status: error`, text draws in the
  system stack, no page error (Chromium's console logs the 404). Checked by `temp/t02/fonts-check.mjs`.

- **Weight**: page CSS 22,284 → 23,511 gzip (+1,227); the page 200.68 → 201.88 KB (budget 200; PERF_01). Plugin
  `view/board.css` 20,975 → 21,951 gzip, budget 22,000: 49 bytes left, so FE_01's styles will need room there too.
- **Checks**: `npm run check`, `npm run gen -- --check` pass; `npm test` 2544/2544 after the spec fix; `npm run verify`
  fails only the page weight (201.8 KB, already over at HEAD) and `modules.md` (a new `packages/tokens` row, since the
  package now has `.ts` tests: `npm run map`, the orchestrator's); `tokens.css` 332 lines (warning).
  `npm run test:plugin` 115/116 in Chromium and in WebKit: the one failure, `tools.spec.ts` "tools.list: an input's
  words name no folder", is at HEAD too (T_01's `icon` schema description names `.visionboard/icons/`).
  With every flag off, `npm run test:pages -- board.spec.ts every-node.spec.ts host-styles.spec.ts` (`VB_TEST_PORT=6250`):
  53 passed, no new baseline.

### Caught Beyond the Brief
- **The page build lowers `light-dark()`** (default `cssTarget`) into `--lightningcss-light/-dark` pairs, resolved
  where a token is declared; the plugin keeps it native. So a dark island in a light board (Command Lens's plate) can
  flip its marks by `color-scheme: dark` in the plugin but not on the standalone page. FE_04 needs either the page's
  `cssTarget` raised to the plugin's `CSS_TARGET` (`apps/board/vite.config.ts`; changes how every colour resolves, so
  a decision and a screenshot run) or plate-only tokens for the badges, kind dot and notes on the plate.
- **Command Lens's kind colours** in the mockups differ from the board's (question `#2452c2`, finding a cyan); I kept
  one kind colour per meaning across skins. If the maintainer wants them, they are skin values (FE_04).
- **Bricolage** ships one weight (600, the mockup's titles); a title at 680, today's weight, would be synthesised bold.
  FE_01 should draw display titles at 600.
- **Host faces**: nclite's check refuses `@font-face` outright, so under a host that gives `--host-font` (nclite does
  per its HOST_PROPERTIES) the skins' faces would never draw even if shipped: the ruling below is about a host that gives none.
- The engine bundle's weight was the sources' doc comments (BE_04's request): 37 KB gzip of 236 KB.

### Deviations from Plan
- **Step 5a not done, waiting for the maintainer**: the plugin cannot carry the fonts as written. The host's own
  stylesheet check (`tests/plugin/contract/nclite/engine/plugins/stylesheet.ts`, run by `plugin-build.test.ts` "the
  built sheet stays in its scope") refuses any `@font-face` and any `url()` but `data:`. Until a ruling, the view's
  sheet drops the faces (`hostTakesNoFontFaces`) and the type tokens fall back to `--host-font`, else the system
  stacks; `plugin.md` says so and open point 15 lists the choices: (A) nclite lets a plugin's sheet name a woff2 in
  its own folder (an nclite change; then the folder carries `fonts/` and the test step 5a asks for); (B) the faces as
  `data:` in a second sheet named by the manifest (~240 KB base64, loaded with the view; still refused while
  `@font-face` is); (C) the plugin brings none and a host's `--host-font` is the type. Recommended: C now, A when
  nclite wants the skins' faces.
- **Not Latin subsets** (step 5): the families' whole web files, as above; Figtree is Latin-only, JetBrains Mono would
  shrink most. A one-off subset with fonttools needs the maintainer's yes to install it.

### tokens.css diff (protected; for the gate)

```diff
diff --git a/packages/tokens/src/tokens.css b/packages/tokens/src/tokens.css
index 10ba19d..bbd6cca 100644
--- a/packages/tokens/src/tokens.css
+++ b/packages/tokens/src/tokens.css
@@ -3,7 +3,10 @@
    host, a colour may front a --vb-host-* (the palette's head, below).
    Contrast: three APCA tiers (D-009: Lc 60 reading text, Lc 45 short coloured labels, Lc 30
    decoration; APCA-W3 0.0.98G-4g). Pairs were measured by hand for Stage 2b; the automatic
-   gate is tracker N1. */
+   gate is tracker N1. The node overhaul's pairs and every tone are held by tests/plugin/token-contrast.spec.ts.
+   A skin is a set of these values on the board's root (skins.css, D-100); the faces are fonts.css's. */
+@import './fonts.css';
+@import './skins.css';
 
 :root {
   color-scheme: light dark;
@@ -77,6 +80,50 @@
   --vb-focus-offset-inset: -2px; /* a row that fills its box */
   --vb-focus-offset-card: 3px;
 
+  /* The node's edges (D-099; nodeEdges): a mark on the border is 22px tall and never draws under
+     --vb-mark-min on screen however far out the board zooms (D-101; FE_05; the zoom artboard's 40%);
+     the answer disc and the icon tile. A skin may square the corners. */
+  --vb-mark-h: 22px;
+  --vb-mark-min: 14px;
+  --vb-answer-size: 28px;
+  --vb-tile-size: 40px;
+  --vb-tile-icon: 24px;
+  --vb-node-radius: var(--vb-radius-lg);
+  --vb-mark-radius: 7px;
+  --vb-tile-radius: 11px;
+  /* How much of the kind's colour tints a node's top (at rest, selected) and its icon tile; a selected
+     node's border is this much thicker (DD-09: no outer ring). The tile is 12%, not the mockup's 16%:
+     the kind's icon on it keeps Lc 45 for every kind (dark topic 45.5; 44.4 at 16%). */
+  --vb-node-tint: 9%;
+  --vb-node-tint-selected: 16%;
+  --vb-tile-tint: 12%;
+  --vb-select-w: 2px;
+  /* The canvas's pattern: the dot grid; a skin may draw lines instead. */
+  --vb-canvas-image: radial-gradient(var(--vb-dot) 1.2px, transparent 1.3px);
+  --vb-canvas-size: 22px;
+
+  /* Tones (decision 17, R26): a node's tone is a hue, --vb-tone-h, an OKLCH angle; a palette name is
+     a fixed hue. Every tint is built from the hue with the lightness (l) and chroma (c) below, per
+     theme, scaled by --vb-tone-strength (slate is nearly grey). Each chroma is under sRGB's edge at
+     its lightness for all 360 hues, so no browser has to map a tint into gamut and every hue reads
+     as strong as the next. Body: the top of the node; tile: the icon tile; line: the top line and
+     the selected border; ink: the icon on the tile; edge: the borders. */
+  --vb-tone-hue-teal: 195;
+  --vb-tone-hue-blue: 255;
+  --vb-tone-hue-violet: 295;
+  --vb-tone-hue-magenta: 330;
+  --vb-tone-hue-amber: 80;
+  --vb-tone-hue-orange: 55;
+  --vb-tone-hue-green: 140;
+  --vb-tone-hue-slate: 250;
+  --vb-tone-strength: 1;
+  --vb-tone-strength-slate: 0.3;
+  --vb-tone-body-l-light: 0.965; --vb-tone-body-c-light: 0.015; --vb-tone-body-l-dark: 0.245; --vb-tone-body-c-dark: 0.03;
+  --vb-tone-tile-l-light: 0.935; --vb-tone-tile-c-light: 0.03; --vb-tone-tile-l-dark: 0.31; --vb-tone-tile-c-dark: 0.05;
+  --vb-tone-line-l-light: 0.62; --vb-tone-line-c-light: 0.1; --vb-tone-line-l-dark: 0.72; --vb-tone-line-c-dark: 0.12;
+  --vb-tone-ink-l-light: 0.5; --vb-tone-ink-c-light: 0.085; --vb-tone-ink-l-dark: 0.8; --vb-tone-ink-c-dark: 0.1;
+  --vb-tone-edge-l-light: 0.86; --vb-tone-edge-c-light: 0.04; --vb-tone-edge-l-dark: 0.4; --vb-tone-edge-c-dark: 0.06;
+
   /* Motion */
   --vb-motion-fast: 120ms;
   --vb-motion: 360ms;
@@ -149,7 +196,7 @@
   --vb-state-comment: var(--vb-board-accent-text);
   --vb-state-context: light-dark(#b97c0c, #e6af45);
   --vb-state-later: light-dark(#7257c6, #a48ef2);
-  --vb-state-flag: light-dark(#c2410c, #fb923c); /* the person's private flag (D-041 set, N36) */
+  --vb-state-flag: var(--vb-bookmark); /* the old name, until the flag's last use goes (FE_02) */
   --vb-state-ack-soft: color-mix(in srgb, var(--vb-state-ack) 12%, var(--vb-surface-card));
   --vb-state-drop-soft: color-mix(in srgb, var(--vb-state-drop) 12%, var(--vb-surface-card));
   --vb-state-comment-soft: var(--vb-board-accent-soft);
@@ -187,6 +234,37 @@
      on its kind tab; 61.5 and 58.9 dark (the label tier is 45). */
   --vb-kind-app: light-dark(#0b7fa6, #4ec3e6);
 
+  /* The node's edges (D-099; nodeEdges). APCA, light / dark (tests/plugin/token-contrast.spec.ts):
+     The answer (DD-07, DD-08): a waiting disc is the kind's colour with a dot of the ground (Lc 50.8
+     or more on every kind); answered, it fills green or red with a white mark (Lc 73.2, 74.7). The
+     fills sit on the border, so each is a mark on the card and the canvas (decoration, 30): red is
+     lighter in dark to reach it (31.1 on the card). */
+  --vb-answer-wait: var(--vb-surface-canvas);
+  --vb-answer-tick: #0c8f5f;
+  --vb-answer-cross: light-dark(#cf3a3a, #d84341);
+  --vb-answer-mark: #ffffff;
+  /* Bookmark (DD-03): the person's private mark, the number's fill and its ink (Lc 79.9 / 58.0). */
+  --vb-bookmark: light-dark(#c2410c, #fb923c);
+  --vb-bookmark-ink: light-dark(#ffffff, #2a1203);
+  /* The notes mark (DD-05): quiet when empty, the notes pink with a count, filled while a reply is
+     unread (its ink Lc 77.4 / 50.7). The board's own pink: notes are notes under a host too. */
+  --vb-notes-quiet: var(--vb-ink-subtle);
+  --vb-notes-count: var(--vb-state-comment);
+  --vb-notes-unread: var(--vb-board-accent);
+  --vb-notes-unread-ink: light-dark(#ffffff, #1a0712);
+  /* The change badge (DD-06): new, N updates, then a quiet vN once seen. */
+  --vb-badge-new: var(--vb-state-fresh);
+  --vb-badge-updated: var(--vb-state-updated);
+  --vb-badge-settled: var(--vb-ink-subtle);
+  /* Command Lens's plate (D-100): its default is a quiet one. Command Lens's is dark in both themes,
+     so a mark on it needs its dark value (FE_04). */
+  --vb-plate: var(--vb-surface-sunken);
+  --vb-plate-ink: var(--vb-ink-strong);
+  --vb-plate-muted: var(--vb-ink-subtle);
+  --vb-plate-line: var(--vb-line);
+  /* Lines of a canvas drawn as a grid (decoration; not a tier). */
+  --vb-grid: var(--vb-dot);
+
   /* Lanes */
   --vb-lane-band: light-dark(#f0f0f2, #19191b);
 
@@ -196,6 +274,42 @@
   --vb-shadow-lift: 0 10px 40px light-dark(rgb(24 24 27 / 0.16), rgb(0 0 0 / 0.55));
 }
 
+/* Type faces (D-102; planner's call 4): a node's text, its titles and its labels. Each falls back to
+   today's system stack (--vb-font, --vb-font-mono), and a host's --host-font or --host-font-mono wins over any skin's
+   (apps/board/plugin/theme.css passes them as --vb-host-font, -mono). */
+:root, .vb-board {
+  --vb-font-text: var(--vb-host-font, 'vb-figtree', var(--vb-font));
+  --vb-font-display: var(--vb-host-font, 'vb-bricolage-grotesque', 'vb-figtree', var(--vb-font));
+  --vb-font-label: var(--vb-host-font-mono, var(--vb-font-mono));
+}
+
+/* Decision moves off the notes pink to fuchsia (D-100 4; DD-14), on a board drawing the new node
+   (data-vb-edges, set with nodeEdges) until T_04 makes it the token's own value. Lc 79.9 / 52.7
+   on the card. */
+.vb-board[data-vb-edges] { --vb-kind-decision: light-dark(#a21caf, #e879f9); }
+
+/* A toned node (decision 17): the node sets data-vb-tone to its tone's name, or `hue`, and
+   --vb-tone-h to the checked number or, for a name, var(--vb-tone-hue-<name>), so a name and a hue
+   take one derivation. Text on a tint keeps its ink, which carries no hue. */
+vb-node[data-vb-tone] {
+  --vb-tone-body: light-dark(
+    oklch(var(--vb-tone-body-l-light) calc(var(--vb-tone-body-c-light) * var(--vb-tone-strength)) var(--vb-tone-h)),
+    oklch(var(--vb-tone-body-l-dark) calc(var(--vb-tone-body-c-dark) * var(--vb-tone-strength)) var(--vb-tone-h)));
+  --vb-tone-tile: light-dark(
+    oklch(var(--vb-tone-tile-l-light) calc(var(--vb-tone-tile-c-light) * var(--vb-tone-strength)) var(--vb-tone-h)),
+    oklch(var(--vb-tone-tile-l-dark) calc(var(--vb-tone-tile-c-dark) * var(--vb-tone-strength)) var(--vb-tone-h)));
+  --vb-tone-line: light-dark(
+    oklch(var(--vb-tone-line-l-light) calc(var(--vb-tone-line-c-light) * var(--vb-tone-strength)) var(--vb-tone-h)),
+    oklch(var(--vb-tone-line-l-dark) calc(var(--vb-tone-line-c-dark) * var(--vb-tone-strength)) var(--vb-tone-h)));
+  --vb-tone-ink: light-dark(
+    oklch(var(--vb-tone-ink-l-light) calc(var(--vb-tone-ink-c-light) * var(--vb-tone-strength)) var(--vb-tone-h)),
+    oklch(var(--vb-tone-ink-l-dark) calc(var(--vb-tone-ink-c-dark) * var(--vb-tone-strength)) var(--vb-tone-h)));
+  --vb-tone-edge: light-dark(
+    oklch(var(--vb-tone-edge-l-light) calc(var(--vb-tone-edge-c-light) * var(--vb-tone-strength)) var(--vb-tone-h)),
+    oklch(var(--vb-tone-edge-l-dark) calc(var(--vb-tone-edge-c-dark) * var(--vb-tone-strength)) var(--vb-tone-h)));
+}
+vb-node[data-vb-tone='slate'] { --vb-tone-strength: var(--vb-tone-strength-slate); }
+
 [data-theme='light'] { color-scheme: light; }
 [data-theme='dark'] { color-scheme: dark; }
 
```


---

## On Completion

1. Fill in Implementation Notes above; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append **your own** LOG entry to `cortex/LOG.md` — one line, terminated with a newline, append-only:

   ```
   [[YYYY-MM-DD HH:MM]] [board-tokens] T_02: [what you did] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/T_02_tokens-skins-fonts.md]]
   ```

   Cite files by path + symbol, never by line number. Never write the set's entry or to `AUDITED.md`.
