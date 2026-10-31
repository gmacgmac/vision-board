# BUILD_01_plugin-folder: The plugin folder

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

`npm run build:plugin` writes one self-contained folder, `dist/plugin/board/`: `manifest.json`, `view/board.js` (exports `mount`) and `view/board.css`, `engine/engine.js` (exports `createEngine`), `words.json`, `skill.md`. Standalone is built from the same entry points. Tracker M14.

## Steps

1. **`#board` and `#board/styles.css`** (M14): the view's one name; `#board/engine` for the engine. A host never imports a path into `apps/board`.
2. **Manifest**: JSON, checked by a JSON Schema in `apps/board/plugin/`; version from the API's; its tools generated from the tool table filtered by `x-hosts` (PROOF_01). Words keys, never text, as hosts expect.
3. **The view bundle**: Vite library build, one ESM file carrying Svelte's runtime, one CSS file, no chunk that a host must serve by path. The PDF frame stays standalone's. Note the bundle's size in the task notes, gzip too; a budget test.
4. **The engine bundle**: one ESM file for Node, `ajv` and `fflate` inside; no `import` a host must satisfy.
5. **Theme**: `apps/board/plugin/theme.css` maps `--vb-*` from a small documented list of a host's own properties, with fallbacks, as `chat-host.css` does for the chat; the UI text scale comes with it. A host with none still looks right.
6. **Words and skill**: `words.json` generated from the words files; `skill.md` is `skills/vision-board/SKILL.md` less what only standalone has, with a test they don't drift.
7. **Reproducible**: same input, same bytes; `--watch` for development, so a host linked to the folder picks up changes. `dist/` stays git-ignored.

## Validation

- [ ] A clean build writes exactly the folder; a test imports `mount` and `createEngine` from it with nothing else on the path
- [ ] Standalone behaves as before; bundle sizes recorded

## Implementation Notes

**Status**: Completed · **Completed**: 2026-10-31

### What it is
- **`npm run build:plugin`** (`apps/board/bin/build-plugin.ts`, `buildPlugin({ out, watch })`; `-- --out <dir>`, `-- --watch`) writes `dist/plugin/board/` (git-ignored, as all `dist/`): `manifest.json`, `view/board.js` + `view/board.css`, `engine/engine.js`, `words.json`, `skill.md`. Two Vite builds (`apps/board/vite.plugin.config.ts` `viewBuild`, `engineBuild`) and three generated texts. A full build takes about 1 s.
- **Names** (`package.json` `imports`): `#board` (`apps/board/src/board/index.ts`: `mount`, which defines the elements first, and the contract's types), `#board/styles.css` (`src/styles/sheets.css`, the sheets in cascade order, which replaced `board-sheets.ts`; `page.ts` and the fake host's fixture import it), `#board/engine` (the engine's front door). Inside the app the entries reach the same files by path: verify refuses an app importing its own module's name.
- **View bundle**: one ESM file, no import, no dynamic import, one export (`mount`), Svelte's runtime inside, no sourcemap; one CSS file with no `@import` and no address. `plugin/view.ts` is its entry: tokens, the board's sheets, `plugin/theme.css`.
- **Engine bundle**: one ESM file for Node; imports only `node:` modules; exports only `createEngine`; `ajv` inside (`fflate` is not: only `read_attachment` and the PDF frame use it, and those stay standalone's). BUILD-R1: `treeshake.moduleSideEffects: false` drops what the engine's `#agent`/`#mcp` front-door imports do not use (the adapters are not in it: a test), and `server/format-files.ts` is the one module that reads the format's files (schemas, openapi.json, the tool table) from disk; the build swaps it for the same three readers over their text put in at build time (`embedFormatFiles`; `$comment`s left out, they name the host). `engine.js` reads only the data folder it is given.
- **Manifest** (`plugin/manifest.ts`, `plugin/manifest.schema.json`; checked by the build): `id` `board`, `name` and each chip and tool by words key, `version` from openapi `info.version`, `view`, `engine`, `chips` (typed `satisfies Record<ChipKind, 1>`, so a new chip kind stops the build), `tools` (name, key, input schema, `writes`) exactly `engine.tools.list()`, `skill`, `words`. No `settings` and no `icon`: see Requests.
- **`words.json`** (`bin/plugin-words.ts`): the string leaves of the words of `board/words`, `packages/ui/src/words` and `plugin/words` by their `board.<area>.<name>` keys, plus `board.tool.<name>` (each description as the engine says it). Functions (sentences with a value) are not in it. New words files: `plugin/words/plugin.ts` (name, chip labels), `plugin/words/skill-edits.ts`, `server/words/plugin-tools.ts`; `scripts/words-homes.mjs` has the `plugin` part, `docs/specification/words.md` the rows.
- **Theme** (`plugin/theme.css`, three properties a host sets on its root: `--host-font`, `--host-font-mono`, `--host-text-scale`): colours are deliberately not themable (the contrast tiers are measured on ours, D-009; light or dark follows the page's `color-scheme`). Fallbacks are the tokens' own values, held equal by `plugin-theme.test.ts`. Looked at: set, the fonts and the UI text size change; unset, nothing does.

### BUILD-R2 (what the plugin tells a bot)
- **Skill**: `skillFor(SKILL.md)` applies `plugin/words/skill-edits.ts`, a list of cuts and replacements, each `from` found exactly once (the build stops when the skill changes under one). `SKILL.md` itself is not touched: standalone's bot reads it word for word. The plugin's loses: the "From your own chat" group (`join`, the secret), the chat panel's group (joined, granted, no board yet, quiet, attachments, `Board: <id>`, permissions and closed files), waiting with `wait`, `join` in Access, the Images section (a bot cannot be told a folder the host owns: see Requests), the `app` kind row and the Apps section; the message's blocks that a chip makes (selection, the Send message), "the words are the request", "waiting for your reply", "don't fetch it again" and "never hold your turn open" stay, verbatim.
- **Tool descriptions**: `server/words/plugin-tools.ts` `descriptionEdits` (tool, from, to) applied in `engine/tools.ts` `forPlugin` when the engine lists its tools: `list_open` and `check_responses` lose "With your secret,", `write_board` loses "from `list_apps`". Chosen over neutral wording because neutral wording changes standalone's text; the table (`openapi.json`, D-056) and `vb-mcp` are untouched. The engine stops at start if an edit's text is not in its description.
- **Test** (`plugin-skill.test.ts`): no tool in the skill that the engine does not give; none of `join`, `secret`, `list_apps`, `read_attachment`, `.visionboard`, "chat panel", `Board: <id>`, "attached", "app card" in it; every tool the plugin bot has is in it; every edit finds its place once; standalone's skill and MCP descriptions still say `join`, "With your secret" and `list_apps`; each plugin description is the table's less exactly its edits, and none says what is gone. Scenarios for the new skill text were not run (no real CLI): the replaced text is only cuts and two short joins, but the maintainer should see it before a bot reads it.

### Sizes (bytes, gzip)
`view/board.js` 557,155 (164,030) · `view/board.css` 112,351 (18,799) · `engine/engine.js` 906,500 (208,912; most is the embedded schemas and openapi.json, about 450 KB) · `manifest.json` 41,670 · `words.json` 23,978 · `skill.md` 23,605. Budgets in `plugin-build.test.ts`: 190,000 / 22,000 / 240,000 gzip.

### Standalone
Its own build is byte-identical: `vite build` of `apps/board/vite.config.ts` gave the same file names and hashes (`chat-rules`, `chat`, `gallery`, `index`) as before. The page imports `sheets.css` by path and `mount.ts`, the files `#board` reaches. Nothing in standalone's behaviour changed, so no flag (`flags.ts`) and no gallery entry.

### Decided alone (reversible; for review)
1. **The build lives in `apps/board/bin/`, not `scripts/`.** verify refuses `scripts/` importing an app, and `fs`/`process` outside `server/`, `bin/`, `packages/*`. `bin/build-plugin.ts` and `bin/plugin-words.ts` are the Node side; `plugin/` holds the pure parts and the entries.
2. **Edits outside the row, forced by BUILD-R1**: `apps/board/server/{schema,spec}.ts`, `engine/tools.ts` read their files through the new `server/format-files.ts` (`schemaFiles` and `allSchemaFiles` moved there; five tests import it from there).
3. The manifest has **no `settings` and no `icon`**: nothing in the board declares settings a host draws (flags and `align` come through `host.settings` untyped), and the icon is a host's own name list. A host that wants them says so in CONTRACT_01.
4. The theme is three properties on the root, named `--host-*` (neutral, documented in the file's head); more can be added the same way.
5. `view/board.css` carries the tokens on `:root` as `tokens.css` does (D-061); `--lightningcss-*` fallbacks for `light-dark()` are in it exactly as in standalone's build.

### Validation
- [x] A clean build writes exactly the folder; the engine runs from a copy of it, away from the repository, under Node's permission model (`--permission`, one file to read, the data folder to write); the view built from it mounts in a fake host in light and dark with no console error, 17 cards and the toolbar in each root (a one-off look with the fixture pointed at the built file; the contract test in the folder's own words is CONTRACT_01's).
- [x] Standalone behaves as before (byte-identical build; `board-host`, `board-chrome`, `board-guest`, `host-styles` page specs 24/24); sizes recorded and held by a budget test.

**Verification (normal tier)**: `npm run verify` ok; `npm run check` 0 errors; `gen-api --check` current; `npm test` 2178 + 14 pass; the four host page specs above (`VB_TEST_WORKERS=3`, port 6800). Not run: the full page suite (the orchestrator's).

## On Completion

Notes; your row; one LOG line (`[project-tooling] BUILD_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS`.
