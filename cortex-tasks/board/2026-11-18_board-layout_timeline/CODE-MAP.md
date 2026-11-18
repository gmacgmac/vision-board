# The Timeline - Code Map

> Surveyed 2026-11-18 on `spike/stage-apps` after FIX_06 and T_05 merged (a Sonnet 5.5 Explore survey, checked by the
> planner against the files named). Paths from the repo root; symbols, never line numbers. Verify before you lean on a
> detail: code moves.

## Format (`packages/format`, `#format`)

- **Node type**: `src/view.ts` `ViewNode` (`icon?`, `tone?`; no date), `MODES` (`grid`, `flow`, `lanes`, `radial`,
  `column`, `row`), `DIRECTIONS`, `directionOf(state, board, region)`, `TONES`, `isTone`, `FORBIDDEN_KEYS`,
  `ID_PATTERN`. Ledger: `src/ledger.ts` node event body, `LEDGER_FORMAT = 20`.
- **Shape rules** (the server's check of every line): `src/ledger-shape.ts` `NODE` (`fields: { …, icon: iconProblems,
  tone: toneProblems }`); field checks in `src/view-shape.ts` (`iconProblems`, `toneProblems`). View validator:
  `src/validate.ts`. Twin rules are held equal to `schema/common.schema.json` by tests (`tests/node-look.test.ts`,
  `tests/ledger.test.ts`).
- **Schemas**: `schema/common.schema.json` `$defs` (`iconName`, `tone`, `mode`, …), `schema/events/node.schema.json`,
  `schema/api/view.schema.json`, `schema/api/write-item.schema.json`, `schema/api/show-layout-response.schema.json`
  (`cards[]` of `$defs/cell`), `schema/ledger-event.schema.json`, `schema/openapi.json` (`info.version`; agent-facing
  descriptions). `$id`s carry the format: `https://vision-board.invalid/schema/ledger/20/...` (about 48 schema files,
  3 board tests, 1 script).
- **Generated** (`npm run gen` = `scripts/gen-api.mjs`; `--check` fails when stale; never hand-edit):
  `src/api-types.generated.ts`, `src/operations.generated.ts`, `src/tools.generated.json`,
  `packages/mcp/src/tools.generated.json`, `packages/cli/src/commands.generated.ts`, `docs/specification/api-reference.md`.
- **Migration**: `src/migrate/steps.ts` `FORMAT_STEPS` (ends `…, restamp(18), toFormat20`), `restamp(from)`,
  `UpgradeStep`; `src/migrate/index.ts` `upgradeLine`, `upgradeLines`. Runner `apps/board/server/ledger-migrate.ts`;
  command `npm run ledger:migrate -- <folder> [--check | --undo]`. Tests `tests/migrate.test.ts` (fails when a format
  below `LEDGER_FORMAT` has no step), `packages/actions/tests/legacy-folds.test.ts`. Frozen: `fixtures/legacy/` (never
  edited).
- **Fixtures stamped `"v":20`** (about 490 lines): `fixtures/login-review.ledger.jsonl`, `roadmap.ledger.jsonl`,
  `gallery.ledger.jsonl`, `login-layout.ledger.jsonl`; also `apps/board/tests/bookmark-flow.test.ts`.
- **Geometry types**: `src/geometry.ts` (`Box`, `Point`, `Size`; re-exported by `#layout`).
- **Words** (refusals): `src/words/format-ledger.ts` (section for `view-shape.ts`: `iconName`, `toneOneOf`, …),
  `format-view.ts`, `format-common.ts`. Words files import only words.
- **Flags**: `src/flags.ts` `FLAGS` (one row per flag, `default`), `FLAG_DESCRIPTIONS`, `flagOn`, `parseFlags`.
- **Dates**: none. `packages/ui/src/node/node-time.ts` formats ledger times for history only (`toLocaleString`).

## Server (`apps/board/server`)

- **Writes**: `write-board.ts` `writeOne` (order: `checkProposeWord` → `itemProblems` (schema `WRITE_ITEM_ID`) →
  `refuse` with `itemExample` from `examples.ts` → `storedNames` → `resolve` → checks → `append`). `checkProposeWord`
  is the precedent for a word-level refusal before the schema; `storedNames` for rewriting an item to its stored form.
  `libraryLine` (first use of a library icon).
- **Reads**: `engine/reads.ts` `showLayout` (`boardView` + `placedView`, mode from the person else the region,
  `structureOf(...)`), `showNode`, `showContainer`. Tests `apps/board/tests/api-layout.test.ts`,
  `api-layout-direction.test.ts`, `api-v20.test.ts`, `schema-v20.test.ts`.

## Layout (`packages/layout`, `#layout`, pure)

- `src/board.ts`: `MODE_FNS`, `layoutRegion(region, nodes, links, sizes, RegionOptions)` → `RegionPiece`
  (`applyPins`, `makeRoom(pos, pinned, laneBoxes)`, `boundsOf`, `MIN_W`, `EMPTY_H`, `headInset`), `packRegions`
  (frames, `origin`, `groups`, `downward`, `routeLinks`), `layoutBoard` (filters `hidden`; per region).
- `src/types.ts`: `ModeInput` (`direction`), `ModeOutput` (`pos`, `lanes`, `cells`, `down`), `LayoutOptions` (`pins`,
  `regionPins`, `headInsets`, `modes`, `widths`, `align`, `rowGap`, `directions`, `hidden`), `RegionBox` (`lanes`),
  `RegionPiece`, `LayoutStructure`, `CardCell`; constants `GAP` 24, `ROW_GAP` 30, `EDGE_ROW_GAP` 40, `COL_GAP` 72,
  `REGION_PAD` 28, `REGION_HEAD` 38, `REGION_GAP` 56, `LANE_GUTTER` 112.
- `src/collide.ts` `applyPins`, `makeRoom`; `src/structure.ts` `structureOf(region, nodes, links, mode, widths,
  {direction})`, `STRUCTURE_CARD` {280×120}; `src/route/route.ts` `routeLinks`; `src/size.ts` `sizeTier`.
- Tests `packages/layout/tests/*.test.ts` (node:test; build a `View`, a `sizes` map, call `layoutBoard`/`layoutRegion`):
  `layout`, `head-insets`, `container-pins`, `no-overlap`, `routing`, `structure`, `flow-branches`; timing
  `layout.timing.ts` (`npm run test:timing`).

## Node and Markdown (`packages/ui`, `#ui`)

- `src/node/node-template.ts` `nodeTemplate(n, opts)` → `bodyMarkup` (calls `renderMarkdown`) → `node-edges.ts`
  `edgesMarkup(n, def, parts)`: `handle()` (kind tab `.vb-node-kind`; grip `.vb-node-grip` for an icon node; in the
  plate, `.vb-node-kind` + `.vb-node-kind-word`), `topMarks`, `trailMarks`, `heading()` (`h3.vb-node-title`; for an
  icon node `.vb-node-kick` (default skin) + `.vb-node-tile`), `numberMark`, `badgeMark`.
- `src/node/vb-node.ts` (sets `data-edges`, `data-marks-at`); `node-edges-apply.ts` (sets `--vb-tone-h` from a tone);
  CSS `node.css` (`.vb-node-title`: `--vb-text-lg`), `node-edges.css` (grip, kind tab, kick, tone vars
  `--vb-tone-line/-tile/-ink/-edge/-body`), `node-plate.css` (Command Lens plate). `pattern.json` (`states`).
- `src/skins.ts` `SKIN_DEFS` (`default`: disc + edges; `command-lens`: switch + plate).
- `src/markdown/render.ts` `renderMarkdown(src, MarkdownOptions { headingLevel, images, svg, imageRoute, more,
  details })`, `heading()` (`#` `.vb-md-h1`, `##` `.vb-md-h2`, `###`+ `.vb-md-label`, `role="heading"`);
  `blocks.ts` `parseBlocks`; `inline.ts` `renderInline`, `esc` (every text run escaped); `markdown.css`;
  `markdown/pattern.json` (documents the subset and options).
- `src/patterns.ts` `PATTERNS` (each folder's `pattern.json`; one without an element names `entry` and `selector`, as
  `markdown` does); `tests/patterns.test.ts`.
- `src/zoom-rules.ts` `ZOOM_RULES` (`world` scales nodes, links, frames; the one home of zoom numbers;
  `apps/board/tests/zoom-rules.test.ts`).
- Words: `src/words/node.ts` (node screen text), `src/words/markdown.ts`. Hidden text class: `.vb-visually-hidden`.
- Tokens: `packages/tokens/src/tokens.css` (colour literals only here; type scale `--vb-text-*`), `skins.css`,
  `fonts.css` (`--vb-font-display`).

## Board page (`apps/board/src`)

- `board/input/pointer.ts` `HANDLE` (`.vb-node-kind, .vb-node-grip, .vb-node-plate`), drag start on pointerdown via
  `closest(HANDLE)` → `carriedFrom(id)`.
- `board/canvas/draw.ts` `createDrawing(DrawDeps)` (passes `directions` for every region), `layout-cache.ts` (per-region
  cache keyed on its inputs), `places.ts` (writes `pin` and `direction` acts), `render.ts` `createRegionSet`.
- `board/links/wires.ts` `createWires` (SVG groups: lanes, connectors, labels; `lanesOf(layout)` draws lane bands from
  `RegionBox.lanes`).
- `board/selection/moves.ts` (Move to, region-local pins), `selection/container-drag.ts`.
- Move: action `move` in `packages/actions/src/registry.ts`; `packages/actions/src/moves.ts` `placedView`.
- Region layout menu: `packages/ui/src/region/region-template.ts` `directionRow` ("shown while the layout is a flow").
- Gallery: `apps/board/src/gallery/main.ts` (`SAMPLES`, `build()` appends `*-section.ts`), `mini-board.ts` (a small
  board with real layout), `flow-section.ts`, `command-lens-section.ts`; page test `tests/pages/gallery.spec.ts`.
- Flags reach the page through `flagOn` / `?flags=`.

## Skill and evals

- `skills/vision-board/source/core.md` (every bot reads it; `{{slot}}`s), `differences.md` (per-build blocks),
  `references/{architecture,layouts,handover,apps}.md`, `build.mjs` (`buildSkill`, `stale`, `unused`), `build.test.mjs`.
  Built: `skills/vision-board/SKILL.md` + `skills/vision-board/references/` (`npm run build:skill`); the plugin's by
  `apps/board/bin/build-plugin.ts` (`npm run build:plugin`). A build ships only references its text names.
  `apps/board/tests/plugin-skill.test.ts` (`SKILL_BYTES`). `NOTES.md` (versions), `scenarios.md`.
- `tests/evals/bot/`: `scenarios/index.ts` (`SCENARIOS`, `STANDALONE`), a scenario file (e.g.
  `scenarios/architecture-icons.ts`: `Scenario { id, title, turns, checks, reads: { need, may }, fake: { good, bad,
  badFails } }`), `checks.ts` (`check`, `callsTo`, `itemsOf`, `readsReferences`, …), `run.ts` (`--dry`, `--standalone`,
  `--model`, `--only`, `--port`), `limits.ts` (caps), `model.ts` (stall watchdog), `bot-eval.test.ts` (dry in `npm test`).

## Docs that describe this code

`docs/specification/api.md` (§ Migration 176-181; § Ledger v20 182-187; `show_layout` 133), `components.md` (node edges,
Flow branching and direction, Markdown, feature flags, node size), `plugin.md` (the skill files a host gets),
`performance.md` (budgets), `words.md`; `api-reference.md` is generated.

## Tooling

`npm run verify` (`scripts/verify.mjs`: file length, colour literals, layers, words homes), `npm run check`
(svelte-check + tsc), `npm test`, `npm run gen -- --check`, `npm run test:pages` (Playwright, `VB_TEST_PORT`,
`VB_TEST_WORKERS`), `npm run test:plugin[:webkit]`, `npm run map` (orchestrator), `npm run worktree`. Budgets:
`scripts/verify-weight.mjs` `PAGE.budgetKb` 201.3; `apps/board/tests/plugin-build.test.ts` `BUDGET` (`view/board.js`
195,500, `view/board.css` 24,950).
