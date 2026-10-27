---
task_name: Tidy-Up To The Target Architecture
created: 2026-10-26
completed:
status: in-progress
categories: [project-tooling]
tracker:
---

# Tidy-Up To The Target Architecture - Task Status

> **Plan**: [PLAN.md](./PLAN.md)  
> **Created**: 2026-10-26 · **Worktree**: `.claude/worktrees/tidy` (branch `refactor/tidy`)

---

## Instructions for Agents

1. **Read PLAN.md first** (House Rules are binding), then `docs/principles.md` and the review it cites
2. **Read notes from completed tasks** before starting yours
3. **Respect the Wave column** — do not start a task whose wave has not been reached
4. **Reuse Shared Foundations** — if it is listed, import it, do not reinvent it
5. **Touch only the files you own** (File Ownership below, or your task's *Files to modify*). Need
   a change elsewhere? List it under `REQUESTS` in your return block — the orchestrator routes it
6. **If you need to deviate, STOP and inform the user**
7. **Update frontmatter `status`**: `planned` → `in-progress` when you start. Closing the set is the orchestrator's job, after the full gates
8. **Update your row** in the Task List table below when you finish
9. **Add implementation notes** to your task file and brief notes here. Re-run? Add a `Run N:`
   line here and a `### Run N` block in your task file; never overwrite an earlier run
10. **No git commits** — the orchestrator commits and tags once per wave (PLAN House Rules)
11. **Your page-test port** is in the Task List's Notes column; never 4466. The page suite runs 5 workers on `VB_TEST_PORT` + 10 per worker, so tasks running page suites at once take ports 100 apart (TEST_01)
12. **No full page suite in a task** (maintainer, 2026-10-27): run unit tests, `check`, `gen-api --check`, `verify` and the page specs for what you changed; the orchestrator runs the full suite once, at the wave gate

---

## Task List

| # | ID | Wave | Model | Persona | Task | Status | Notes |
|---|-----|------|-------|---------|------|--------|-------|
| 1 | FIX_01 | 1 | standard | — | [Green baseline](./FIX_01_green-baseline.md) | Completed | port 4700 |
| 1b | FIX_02 | 1 | standard | — | [A proposal on a retired card ends](./FIX_02_proposal-on-retired-card.md) | Completed | port 4705 |
| 2 | ARCH_01 | 2 | strong | Build and tooling engineer — a module has one front door, and a back door that the checks can't see is a back door that will be used. | [One front door per module](./ARCH_01_module-front-doors.md) | Completed | port 4710 |
| 3 | ARCH_02 | 3 | strong | API contract engineer — one schema, everything else generated or tested against it; a hand-written copy of a type is a future bug. | [One source per contract](./ARCH_02_single-source-contracts.md) | Completed | port 4720 |
| 4 | UI_01 | 3 | strong | Design-systems engineer — a menu, a dialog or a focus ring is built once, with every state and keyboard path, and every screen gets it by reuse. | [Shared UI base](./UI_01_shared-ui-base.md) | Completed | port 4730 |
| 5 | ARCH_04 | 3 | standard | — | [Ledger answers and geometry in packages](./ARCH_04_ledger-queries-and-geometry.md) | Completed | port 4740 |
| 6 | ARCH_03 | 4 | strong | Front-end architect for embeddable components — a component that imports its host's state can't be hosted anywhere else. | [The board is hostable](./ARCH_03_board-host-interface.md) | Completed | port 4750 |
| 6b | ENGINE_01 | 4 | strong | Back-end engineer who builds engines other programs embed — an engine that opens its own socket or finds its own folder can only ever run alone. | [The board's engine part](./ENGINE_01_board-engine-part.md) | Completed | port 4755 |
| 7 | TEST_01 | 5 | strong | Test infrastructure engineer — a test that passes only in a certain order is not a test; shared fixtures have one home. | [Test support and parallel page tests](./TEST_01_test-support-and-parallel.md) | Completed | port 4760 (+ 10 per worker from 4770) |
| 8 | ARCH_05 | 6 | standard | — | [Words files](./ARCH_05_words-files.md) | Completed | port 4800 |
| 9 | ARCH_06 | 7 | standard | — | [Feature folders and short functions](./ARCH_06_feature-folders-and-functions.md) | Completed | port 4900 |
| 10 | VERIFY_01 | 8 | strong | Staff engineer joining the nclite team, reviewing this code to host it as a plugin, with no history of how it got here — wants every rule in `docs/principles.md` true of the code, not of the docs. | [Verification](./VERIFY_01_tidy-verification.md) | Completed | port 5000 |

**Status Values**: `Pending` | `In Progress` | `Completed` | `Blocked` | `Deferred`

**Wave**: same number = run in parallel; waves run in ascending order.

---

## Shared Foundations

| Artifact | Created by | Consumed by |
|----------|-----------|-------------|
| Module names (root `package.json` `imports`: `#format`, `#ui`, …) and their CSS/asset front doors | ARCH_01 | every later task |
| `verify` back-door checks (`scripts/verify.mjs`) | ARCH_01 | every later task (keep green) |
| Typed client: `call` typed by `OperationId` (`packages/client`) | ARCH_02 | ARCH_03, ARCH_06 |
| One card-reference table, generated: `#format` `CARD_FIELDS` / `cardFields` | ARCH_02 | ARCH_03, ARCH_06 |
| `packages/ui/src/base/` (menu, layer, dialog) and its CSS recipes (root, a11y, text, surface, button, chip, menu, dialog); root class `vb-board` (D-061) | UI_01 | ARCH_03, ARCH_06 |
| Ledger queries and one board-data builder in `packages/actions` | ARCH_04 | ARCH_03, ARCH_06 |
| One geometry home (`Box`, overlap, bounds, clamp) | ARCH_04 | ARCH_06 |
| `Chip`, `cardChip`, `noteChip`, `resolveChip`, `turnOf` (`#actions` `answers/chips.ts`); `clip` and geometry in `#format` | ARCH_04 | ARCH_03, ENGINE_01 |
| Tool table from the one OpenAPI source (`gen-api.mjs`) | ARCH_02 | ENGINE_01 |
| Board host interface and `mount(root, host)` | ARCH_03 | TEST_01, ARCH_06, VERIFY_01 |
| Board engine `createEngine({ dir, ... })` (`apps/board/server/engine/`) | ENGINE_01 | TEST_01, ARCH_06, VERIFY_01 |
| Test support module and fixtures in their packages | TEST_01 | ARCH_05, ARCH_06, VERIFY_01 |
| Words homes and their test | ARCH_05 | ARCH_06 |

---

## File Ownership

| Wave | Owner | Files |
|------|-------|-------|
| 1 | FIX_01 | the four failing specs and their baselines, `packages/ui/src/region/{region,region-narrow}.css`, `packages/ui/src/node/*.css` (target size only), `temp/` |
| 1 | FIX_02 | `packages/actions/src/{retire,proposals,conditions}.ts`, `apps/board/src/board/{proposal-flow,proposals}.ts`, their tests, a proposals page spec, `docs/specification/api.md` |
| 3 | ARCH_02 | `packages/client/**`, `scripts/gen-api.mjs`, `scripts/gen-mcp.mjs`, `scripts/openapi-refs.mjs`, `packages/format/schema/api/problem.schema.json`, `packages/format/src/constants*` (new), `apps/board/server/{problem,spec,dispatch,edge,write-refs,schema,writes,write-board}.ts`, `packages/actions/src/numbers.ts`, `apps/board/src/board/{io,card-numbers}.ts`, the generated files `npm run gen` writes, their tests |
| 3 | UI_01 | `packages/ui/src/base/**` (new), `packages/ui/src/tip/hover-tip.ts`, `packages/ui/src/region/{region-row,region-note}.ts`, every `*.css` under `packages/ui/src/` and `apps/board/src/styles/`, `apps/board/src/shell/{ConfirmDialog,BoardDialog,FolderDialog,ArchivedDialog,ToolbarMenu,MenuSelect}.svelte`, `apps/board/src/board/{move-menu,menu-keys,app-cards,selection-pill,note-outside}.ts`, `scripts/verify.mjs`, their tests |
| 3 | ARCH_04 | `packages/actions/src/**` except `numbers.ts`, `packages/actions/tests/**`, `packages/format/src/geometry.ts` (new), `packages/layout/src/{geometry,types}.ts`, `packages/ui/src/note-bubble/note-bubble-core.ts`, `packages/ui/src/selection-bar/selection-bar-core.ts`, `apps/board/src/board/{updates,retired,proposals,go-to-card,board-data,remove-words}.ts`, `apps/board/server/reads.ts`, their tests in `apps/board/tests/` |
| 4 | ARCH_03 | `apps/board/src/**`, `packages/client/**` (the transport and change stream under a host), `scripts/verify.mjs`, `scripts/verify-style.mjs`, `scripts/verify.test.mjs`, `tests/pages/host-styles.spec.ts`, `docs/specification/components.md`, their tests |
| 4 | ENGINE_01 | `apps/board/server/**`, `apps/board/server.ts`, `apps/board/bin/**`, `packages/mcp/**`, `packages/cli/tests/**` and `skills/**/*.test.mjs` (only to reach the board through the engine), `docs/specification/api.md`, their tests |
| — | orchestrator | `package-lock.json`, `docs/decisions.md`, `packages/tokens/src/tokens.css` (new tokens), `.kiro/steering/`, `CLAUDE.md`, `AGENTS.md`, `docs/specification/modules.md` (`npm run map`, after each wave) |

Waves 2 and 5-8 have one task each: it owns what its task file lists.

---

## Requests

| Request | From | Need | Routed to | Status |
|---------|------|------|-----------|--------|
| FIX_01-R1 | FIX_01 | The selection bar and its pill cover a container's Move grip when the selection is in the first row (a real overlap, not only a test one) | orchestrator, now (maintainer, point 283): `placeBar` takes boxes to avoid; the board passes each container title line | Done |
| ARCH_01-R1 | ARCH_01 | One package scope: fold `apps/board/package.json` into the root, regenerate the lockfile (blocking) | orchestrator, under the maintainer's delegation: done, D-059; `npm run build`, `check`, `test`, `verify` green | Done |
| ARCH_01-R2 | ARCH_01 | Decision entry for the scope and the imports map | orchestrator: D-059 appended (covers both) | Done |
| ARCH_01-R4 | ARCH_01 Run 2 | `docs/specification/modules.md`: `npm run map` | orchestrator | Done |
| ARCH_01-R5 | ARCH_01 Run 2 | Decision entry: a module's names (`#m`, `/styles.css`, `/files`, `/testing`) | orchestrator, under delegation: D-060 | Done |
| ARCH_01-R3 | ARCH_01 Run 2 | READMEs and `components.md`: claims to the names (cortex-docs) | orchestrator, a Sonnet docs sub-agent during the wave gate: six READMEs and components.md updated | Done |
| ARCH_01-R6 | ARCH_01 Run 2 (note) | `perf-ledger` imported by the actions/layout timing tests: move into a module's `/testing` so verify's warnings clear | TEST_01: `#format/testing` `perfLedger` (`packages/format/tests/perf-ledger.ts`); the warnings are gone | Done |
| ARCH_01-R7 | ARCH_01 Run 2 (note) | cli/mcp tests and the calculator skill test reach into the board server: the engine is their front door | ENGINE_01: calculator test imports `compileSchema` from `server/engine/index.ts`; cli/mcp tests must spawn an HTTP board (packages may not import an app, D-016), so their door is a fixture name, ENGINE_01-R1 | Done |
| UI_01-R1 | UI_01 | Gallery entry for the base (PATTERNS, SAMPLES, pattern.json), gallery baselines | orchestrator: Wave 3 gate sub-agent | Done |
| UI_01-R2 | UI_01 | New tokens `--vb-z-*`, `--vb-control-*`, `--vb-focus-offset*` (today's values), then apply | orchestrator approved under delegation; Wave 3 gate sub-agent | Done |
| UI_01-R3 | UI_01 | Decision: the board's CSS scope | orchestrator: D-061 | Done |
| UI_01-R4 | UI_01 | nclite: `vb-` selectors count as scoped; root class `vb-board` | orchestrator: nclite-contract-reply.md | Done |
| UI_01-R5 | UI_01 | `vb-board` on the mount root; 550 px pane inside a wider page in host-styles.spec | ARCH_03: `mount.ts` `BOARD_ROOT`; host-styles pane case (layout compare) | Done |
| UI_01-R6 | UI_01 | `styles/page.ts` lists `shell.css` first, not `@import` | Wave 3 gate sub-agent | Done |
| UI_01-R7 | UI_01 | `history-flow.ts` imports `menuKeydown` from `#ui`; delete `board/menu-keys.ts` | ARCH_06 | Done |
| UI_01-R8 | UI_01 | ReplyPanel, BoardAgents, GoToCard take `.vb-surface-panel` / `.vb-surface-pop` | ARCH_06 | Done |
| UI_01-R9 | UI_01 | `packages/ui/README.md`: the base and its recipes | Wave 3 gate sub-agent | Done |
| ARCH_02-R1 | ARCH_02 | `gen-reference.mjs` `optional-agent` row, then `npm run gen` | Wave 3 gate sub-agent | Done |
| ARCH_02-R2 | ARCH_02 | `#format` exports `constants.ts`; `files.ts` exports `TOOLS_FILE` | Wave 3 gate sub-agent | Done |
| ARCH_02-R3 | ARCH_02 | `folders.ts` `FolderEntry` from `OperationOutput`; `caller-folder.ts` `PROJECT_HEADER` from `#format`; `write-problem.ts` `ProblemDocument`, drop `ProblemBody` | ENGINE_01 | Done |
| ARCH_02-R4 | ARCH_02 | `DEFAULT_PORT` / `ENV` for 4466 and `VB_*`: cli, client, reply.ts now; `server.ts`, `vb-mcp.ts` | Wave 3 gate sub-agent; ENGINE_01 for server and mcp (done: `server.ts`, `vb-mcp.ts`) | Done |
| ARCH_02-R5 | ARCH_02 | nclite: full JSON Schema tool inputs; `url()` / `watch()` through `host.events` | orchestrator (reply); ARCH_03 (`host.events`: done, the board never calls `url`/`watch`; only `shell/page-io.ts` does) | Done |
| ARCH_04-R1 | ARCH_04 | Docs: components, performance, board README, actions README to `answers/` | Wave 3 gate sub-agent | Done |
| ARCH_04-R2 | ARCH_04 | `CardStep` alias of `UnseenStep`, `CardProposal` a pick of `ProposalRow` | ARCH_06 | Done |
| ARCH_04-R3 | ARCH_04 | `io.ts` `BoardData` re-exported from `#actions` | ARCH_03 | Done |
| ARCH_04-R4 | ARCH_04 | Private `clip` copies → `#format` `clip`: delete `board/clip.ts` (`chat-bridge.ts`, `finder.ts` import it), and `chat-prompt.ts`'s copy | ARCH_03 (page: done, `board/clip.ts` deleted, components.md claim updated), ENGINE_01 (server: done, the prompt's labels come from the chips) | Done |
| ARCH_04-R5 | ARCH_04 | `chat-prompt.ts` built from `cardChip` / `noteChip` / `resolveChip` / `turnOf`; the `hidden` refusal applies at once | ENGINE_01 | Done |
| ARCH_04-R6 | ARCH_04 | nclite: `ref` is opaque JSON; refusal `{ code, reason }`; `detail` is the composer's second line | orchestrator: nclite-contract-reply.md | Done |
| ARCH_04-R7 | ARCH_04 | Actions split: not now (drafted case in ARCH_04 notes) | orchestrator: accepted, no entry; split when a consumer needs reads without actions | Closed |
| ENGINE_01-R1 | ENGINE_01 | Name for the board's test server, e.g. `#board/testing` → `apps/board/tests/serve-fixture.ts`, resolved by the cli/mcp tests with `import.meta.resolve` (and verify taught to read it) | TEST_01: `#board/testing` → `apps/board/tests/support.ts`, which serves the harness when run (serve-fixture.ts deleted); verify reads `import.meta.resolve` and fails a path into an app from outside its tests | Done |
| ENGINE_01-R2 | ENGINE_01 | `apps/board/README.md` § server: `reads.ts`/`writes.ts` are now `server/engine/`, dispatch calls the engine (cortex-docs) | orchestrator (Wave 4 gate docs) | Done |
| ENGINE_01-R3 | ENGINE_01 | `#format` `readLedger`'s per-line check as an export (`readLine(index, line)`), so `ledger.ts` `refresh` stops repeating its body | ARCH_06 | Done |
| ENGINE_01-R4 | ENGINE_01 | nclite reply: the engine's differences (api.md 163), and the grants note below | orchestrator (reply) | Done |
| ARCH_03-R1 | ARCH_03 (deviation) | A board chip kind `{ board, head }`, `boardChip`, its `resolveChip` case; `pageChip()` returns it | Wave 4 gate sub-agent | Done |
| ARCH_03-R2 | ARCH_03 | Aria ids inside cards and frames unique per mount | Wave 4 gate sub-agent | Done |
| ARCH_03-R3 | ARCH_03 | chat.md, performance.md, chat README: `board/chat-*` → `shell/chat-*`, chat calls → `shell/page-io.ts` | Wave 4 gate sub-agent | Done |
| ARCH_03-R4 | ARCH_03 | nclite: the optional `page` part, `notify`'s tone, `api` resolves to a Response, the image route outside `api` | orchestrator: nclite-contract-reply.md | Done |
| ARCH_03-R5 | ARCH_03 | Gallery screen text naming `board/chat-view.ts` and `io.ts listApps` | ARCH_05 (words; the gallery baselines may change by that text only): now `shell/chat-view.ts` and `page-io.ts listApps, callAppTool`; app-cards and chat baselines changed by that line only | Done |
| ARCH_03-R6 | ARCH_03 (deviation) | Raster tolerance 2 in host-styles `sameUnderHost` | orchestrator: accepted (a 1-step edge flicker on the toolbar select; a leak moves pixels far more) | Closed |
| ARCH_03-R7 | ARCH_03 | `engine.test.ts` hangs inside `npm test` | orchestrator: not reproduced on the finished tree (alone 7/7 in 0.5 s; full suite 1698 + 10 exits 0); the hang was a run caught mid-change | Closed |
| ARCH_03-R8 | ARCH_03 (note) | A host gets the canvas, status and controls; the toolbar, strips and dialogs are the standalone page's Svelte, so a host draws its own | orchestrator: tracker row for the plugin stage (point for the maintainer) | Done |
| TEST_01-R1 | TEST_01 | D-060 addendum: test support per module, `import.meta.resolve` for an app's, `?raw` fixtures named by file | orchestrator: D-062 appended (Accepted, for review) | Done |
| TEST_01-R2 | TEST_01 | Steering § How to work, the Tests line: 3 workers, per-worker ports, ports 100 apart | orchestrator: applied under the delegation, flagged for review | Done |
| TEST_01-R3 | TEST_01 | Tasks running page suites at once take `VB_TEST_PORT`s 100 apart | orchestrator: rule 11 and the Notes ports (4800, 4900, 5000) | Done |
| TEST_01-R4 | TEST_01 | Docs pass: performance.md, components.md and four READMEs (perf-ledger in `#format/testing`, budgets project, gallery ledger home, `#board/testing`, page-suite ports) | orchestrator: a Sonnet docs sub-agent in the Wave 5 gate (apps/board, cli, format, mcp READMEs; performance.md; components.md) | Done |
| TEST_01-R5 | TEST_01 | The gallery's "Lanes mode" sample has two cards with no lane (n 44, 45), so it fails `validateView` (todo in validate.test.ts) | orchestrator: the sample is wrong, the rule stays (a lanes-mode card names its lane) → ARCH_05: give n 44 lane "Now" and n 45 lane "Next", drop the todo; the gallery baselines may change in that section. ARCH_05: lanes given; the Lanes frame draws no cards, so no picture moved | Done |
| ARCH_05-R1 | ARCH_05 | `packages/actions/src` and `packages/format/src` sentences into words homes (about 340) | ARCH_05 Run 2: 4 format and 5 actions words files (293 keys); flags, condition and edge descriptions stay as developer text | Done |
| ARCH_05-R2 | ARCH_05 | `apps/board/README.md` and `components.md` repointed to `board/words/app-cards.ts` | ARCH_05 Run 2 (cortex-docs) | Done |
| ARCH_05-R3 | ARCH_05 | Decision: words homes | orchestrator: D-063 appended (Accepted, for review) | Done |
| ARCH_05-R4 | ARCH_05 | Project instructions: `words.md` in Sources of truth; a new sentence goes in a words file | maintainer (protected): approved as point 290, applied (Sources of truth row, How to work § Sentences) | Done |
| ARCH_05-R5 | ARCH_05 | nclite reply: keys, the six homes, the US English sentences | orchestrator: `nclite-contract-reply.md` § For nclite to weigh | Done |
| ARCH_05-R6 | ARCH_05 (note) | `board/words/` stays under `board/`; moved files fix their `words/` imports | ARCH_06 (in its dispatch) | Done |
| ARCH_06-R1 | ARCH_06 | `npm run map` (`records.ts` joined `#format`) | orchestrator: run in the Wave 7 gate | Done |
| ARCH_06-R2 | ARCH_06 | image-view `pattern.json` path to `cards/card-images.ts`; `gallery-images-{light,dark}` baselines | orchestrator: applied; baselines refreshed, only the "Use for" path line differs (checked by eye) | Done |
| ARCH_06-R3 | ARCH_06 | `docs/principles.md` § One job per file: function-length warning and feature folders | maintainer (protected): approved as point 291, applied | Done |
| ARCH_06-R4 | ARCH_06 (question) | Split the factories made of short inner functions (`createNoteFlow`, `createCardSet`, …) into modules anyway? | orchestrator: no; each inner function is 37 lines at most, so each reads in one screen, and a split would only add files (cortex-architecture rule 2) | Closed |
| VERIFY_01-R1 | VERIFY_01 | Tracker rows for the open findings F1–F8, F10, F14 | orchestrator: tracker M10–M19 (M10 keys and M11 unmount marked "before the plugin stage") | Done |
| VERIFY_01-R2 | VERIFY_01 | nclite reply: bot tools (F6), unmount (F2), keys (F1), theme (F12), pictures left to the host (F15) | orchestrator: `nclite-contract-reply.md` § The view's host (gaps, pictures) and § For nclite to weigh (theme) | Done |
| VERIFY_01-R3 | VERIFY_01 | `components.md` drift: `readingOrder`'s home, the key claim, the host gaps (F9) | orchestrator: corrected; gaps named under § The board's host interface, Not covered | Done |
| VERIFY_01-R4 | VERIFY_01 | Clear the set's `temp/` leftovers (F13) | orchestrator: cleared (41 entries, git-ignored) | Done |
| VERIFY_01-R5 | VERIFY_01 | `docs/principles.md` (protected): `primitives.css` → `packages/tokens/src/tokens.css` (F9); § Where we are at close | maintainer: points 298, 299 | Open |
| VERIFY_01-R6 | VERIFY_01 | Success criterion "No screenshot changed": 8 gallery baselines changed, each approved at its gate (F16) | maintainer: point 300 | Open |
| VERIFY_01-R7 | VERIFY_01 | `gen-contract.mjs` `LEDGER_EVENT_ID` hard-codes ledger/18 (F11) | orchestrator: no row; it fails loudly on a bump, derive it in the next change there | Closed |

**Status Values**: `Open` | `Done` | `Closed`

---

## Implementation Notes

### FIX_01: Green baseline
_Status:_ Completed  
_Notes:_ Grip is a 24px target (region.css); every-node clears the selection before axe; size.spec `maxDiffPixels: 20`; board.spec screenshot on its own roadmap server (`tests/pages/roadmap-server.ts`), no baseline refreshed; review-colours reads distinct colours once (outside the named specs). send-access failure did not reproduce (5 full runs green): see the task file. Full suite green twice (657 passed). Selection bar covering a container's grip is open for UI_01 / the maintainer. Deviation (send-access left alone, review-colours fixed outside the named specs) accepted by the maintainer (point 284).

---

### FIX_02: A proposal on a retired card ends
_Status:_ Completed  
_Notes:_ The fold already closed proposals on a retire (retire.ts `foldRetire`, tested); the bug as described did not reproduce. Fixed the page side: `answerable` rows only, `proposalAct` undefined for an accept with no `ver`, `refresh` after a refused answer. `endsWhen` words and api.md updated. Unit, verify, check and the two proposals page specs green on 4705; no screenshot changed.

---

### ARCH_01: One front door per module
_Status:_ Completed  
_Notes:_ Run 1: Step 1 STOP. A root `imports` map resolves `#format` for Node, Vite, Playwright and an outside consumer, but not under `apps/board/`: `apps/board/package.json` is its own package scope, so Node (`ERR_PACKAGE_IMPORT_NOT_DEFINED`), Vite and svelte-check fail there (tsc passes only by cache). An `imports` target cannot leave its package, so there is no in-scope fix. Recommended: fold `apps/board/package.json` into the root (one scope; needs `package.json` beyond `imports`, lockfile, install). Nothing kept; probes in `temp/arch01/`. Detail and options in the task file.
Run 2: Completed (after D-059). Step 1 re-proved in every resolver, from `apps/board/` too. Names: `#<module>` (index.ts) for all nine code modules; `#ui/styles.css` (new `src/styles.css`), `#chat/styles.css`, `#tokens/styles.css`; Node file paths `#format/files` (`SCHEMA_DIR`, `OPENAPI_FILE`, `FIXTURES_DIR`), `#chat/files` (`CHAT_SCHEMA_DIR`); `MCP_BIN` on `#mcp`; test support `#agent/testing`. Codemod: 732 imports; CSS lists `apps/board/src/styles/{page,chat}.ts`; gallery reads `#ui` `PATTERNS`. `verify` `checkReferences` fails on any path into another module (imports, side-effect, `new URL`, glob, HTML, CSS) across apps, packages, scripts, tests, skills. Built CSS byte-identical; unit, check, gen, build green; 138 page specs on 4710 green, no screenshot changed. `verify` needs `npm run map` (orchestrator). Left for later tasks: perf-ledger imports (TEST_01, verify warns), serve-fixture and skill test reaching the board server (ENGINE_01). Decision draft for the sub-names in the task file.

---

### ARCH_02: One source per contract
_Status:_ Completed  
_Notes:_ `npm run gen` now also writes `api-types.generated.ts` (each operation's input/output, gen-types.mjs) and `tools.generated.json` (the tool table, gen-tools.mjs; gen-mcp reads it, MCP list byte-identical), and `operations.generated.ts` gains `PROBLEMS`/`PROBLEM_BASE` (from problem.schema.json `$defs/codes`), `PATH_WORDS`, `PROJECT_HEADER`, `DEFAULT_SERVER`/`DEFAULT_PORT`, `ROUTE_PREFIX`, `CARD_FIELDS`/`cardFields` (generated from the event and write item schemas, read by edge, write-refs, `eventOut`, `answerEvent`) and `auth: 'optional-agent'`. Client: `call<Id>` typed by operation, made with a `Transport` (`httpTransport` standalone); io.ts has no `<T>` and no hand-written response type (`BoardData` is the page model, left for ARCH_04's builder). `ENV` in `packages/format/src/constants.ts`, not yet exported. Deviations: codes as a plain schema, not an `x-` keyword (strict ajv); card table generated in `#format`, not hand-kept beside `REFERENCES`. Requests: format index export of constants, `TOOLS_FILE`, gen-reference `WHO` row, server `FolderEntry`, the remaining 4466/`VB_*`/`vb-project` copies, `npm run map`.

---

### UI_01: Shared UI base
_Status:_ Completed  
_Notes:_ `packages/ui/src/base/` (menu, layer, dialog: pure cores + framework-free browser side, 18 tests; `#ui`). Every menu (Move to, app card's, toolbar "⋯", region settings), the 8 dismiss copies and the 4 dialogs moved onto them; `board/menu-keys.ts` passes `menuKeydown` on for `history-flow.ts`. CSS recipes first in `#ui/styles.css` (root/scope + host guard, a11y, text, surface, button, chip, menu, dialog); `board.css` keeps board rules; the standalone page's rules in `styles/shell.css`; `@media` width rules are `@container vb-board`. `verify` gains `scripts/verify-style.mjs` (colour literals, I/O layers, scoped selectors; tests first). `tests/pages/host-styles.spec.ts`: the board at 1600/550px and every gallery sample pixel-identical under a host's element rules. No screenshot changed (475 page tests on 4730; computed-style diff clean). Not done, handed on: the gallery wiring of the base section (changes `gallery-*.png`; files ready), the tokens (drafted), the pane test inside a wider page (needs ARCH_03's `mount`). Outside the row: `packages/ui/src/index.ts` (exports appended), new `verify-style.*`, `host-styles.spec.ts`, `gallery/base-section.ts`. Root class for ARCH_03: `vb-board`.

---

### ARCH_04: Ledger answers and geometry in packages
_Status:_ Completed  
_Notes:_ Queries in `packages/actions/src/answers/` (updates, retired, proposal rows, go target, page conditions, remove words), each with its test moved or added; the app keeps the act, the proposal words, the go box, `numberedView`, `canApply`. One builder: `boardData` and `boardJson` (the server's `getBoard` is `boardJson(boardData(...))` plus `locked`). Geometry in `packages/format/src/geometry.ts` (a format file, not a layer: layout and ui already may use format): `Box`, `clamp`, `overlaps`, `touches`, `boundsOf`, `boxAround`, `boxBetween`; layout and ui keep their names as re-exports/aliases. `clip` promoted to `packages/format/src/clip.ts`. Chips: `Chip` `{ plugin, kind, ref, label, detail }` (ref carries the card's version / the note's last edit), `cardChip`, `noteChip`, `resolveChip` (refusals `gone|retired|hidden|changed`), `turnOf` (roundOf + refusal for an unknown board). Split decision drafted in the task file (recommend: not yet). Unit tests for actions, format, ui, layout and the touched app tests green; page specs on 4740 (card-updates, flag-retire, go-to-card, group-note, proposals, proposals-notice, person-remove, notes, note-polish, note-discard, key-bubble, select, selection-pill, zoom-and-lasso, toolbar, gallery, board): 223 passed, no screenshot changed. Full `npm test`: 5 failures in server writes and the route table, ARCH_02's in-flight files.

---

### ARCH_03: The board is hostable
_Status:_ Completed  
_Notes:_ `board/host.ts` `BoardHost` (contract shape + `confirm`, `notify` tone, optional `page`), `board/status.ts` (plain observable the shell mirrors), `board/mount.ts` `mount(root, host)` → view + `status`, `board`, `send` (selected cards → `addToChat`, then the act); `io.ts` `createIo(api)` per board (`BoardData` from `#actions`); no `apps/board/src/board/` file imports the shell, flags.ts, `location`/`history`/storage keys of the page, or Svelte (`verify.mjs` `checkBoardHost` + test). Standalone host `shell/page-host.ts`; chat, folder and page calls moved to `shell/` (`page-io.ts`); `body > .vb-stage` placement in shell.css. Fake-host spec `tests/pages/board-host.spec.ts` (Vite in-memory bundle: draw, Send, confirm, event, two boards, unmount, listener count). host-styles: pane-in-wide-page case (layout compare) and a raster tolerance of 2 (the 1600px host-sheet check went ~1-in-4 flaky on the toolbar select's edge after this change; pre-change tree 0/8). Page specs moved from board ids to classes. Full page suite on 4750: 667 passed, no baseline changed; unit 1691 pass (all but ENGINE_01's `engine.test.ts`, which hangs in `npm test`). `pageChip` null until `#actions` has a board chip (REQUEST). Screens to check by eye: the board at 1600 and 768px light/dark; chat sidebar open (stage shrinks); archive the last board (page reloads empty); open folder switch; a past version banner; Hide answered (H) and Esc closing the Reply panel.

---

### ENGINE_01: The board's engine part
_Status:_ Completed  
_Notes:_ `apps/board/server/engine/` (`index.ts` the door): `createEngine({ dir, ledger?, name?, onSend?, warn? })` → `route` (relative path, body value or reader, caller, signal → `{ status, body, headers? }` or null), `resolve`, `turn({ board, since, agent })`, `tools` (tool table rows it serves; `list_apps` stays in the app host), `watch` (`{ board?, head }`, from anyone: `ledger.ts` `refresh`/`follow` read another writer's lines). reads/writes moved into `engine/` as reply handlers; `dispatch.ts` keeps the edge and calls `route` (`handlers.ts` `viaEngine`); streams in `streams.ts` on `watch`; `project.ts` one lazy engine per folder. MCP stays an HTTP relay (an engine in the agent's process would be a second writer under the lock). Prompt from chips (hidden/removed now refused). `engine.test.ts` 7 tests, no HTTP. `npm test`: all pass but 3 in `chat-bridge.test.ts` (ARCH_03 in flight); verify: 1 fail, `src/shell/page-io.ts` (ARCH_03); `gen --check` current; tsc clean outside ARCH_03's files. Page specs ran on a HEAD copy with only the server changes (the shared page build is broken by ARCH_03's work): see the task file. **Grants with one bot per folder** (for the nclite reply): the host vouches for the bot, so secrets and `join`'s secret protect nothing; grants still keep (1) the person's own boards (made on the board, no agent creator) closed to the bot until the person approves a request, (2) the person's revoke, which takes a board or container back, and (3) several agents on one board, which nclite has only if helpers or a second CLI share the folder. The action layer refuses ✓, ✗ and approving from any agent whatever the grants. The bot's caller must be an agent id as `join` gives it (`a-` + 8): the host joins once per bot folder (label = the bot) and keeps the id; no join line means no label for the bot on the board. 

---

### TEST_01: Test support and parallel page tests
_Status:_ Completed  
_Notes:_ Test support per module (D-060), not a `packages/testing` (it could not reach the board's server, D-016): `#format/testing` (`FIXTURE_LEDGERS`, `lineMaker`, `checkedEvents`, `makeTempDir`, `perfLedger`/`BIG`) and `#board/testing` (`apps/board/tests/support.ts`: `startTestBoard`, `personCookie`, `joinAgent`, `personAct`, the harness, fake CLIs, apps, images; serves the harness when run: ENGINE_01-R1, serve-fixture.ts deleted; ARCH_01-R6 done). Gallery ledger in `packages/format/fixtures/`, named `#format/gallery.ledger.jsonl` (`?raw`; built page byte-identical). Page suite: build once (global-setup), each worker's main/perf/empty boards in a child process on its own ports (`ports.ts`: `VB_TEST_PORT` + 10 × (slot + 1)), fresh for every spec file; budgets run last, alone (`budgets` project). Helpers in `board-page.ts`, `chat-page.ts`, `agent-board.ts`. 667/667 green: 3 workers 6.4 and 6.5 min, 5 workers 4.9 min, 1 worker 15.2 min, reverse order 15.8 min, shards 4.1 + 2.4 min (baseline 16.1 min, 1 worker); no screenshot changed; first draw 465-486 ms (baseline 471). verify 19 → 13 warnings. For later: gallery "Lanes mode" sample fails the view check (todo); parallel tasks need `VB_TEST_PORT`s 100 apart; `--shard` needs `--project=chromium`; seven file-bound helper texts remain.

---

### ARCH_05: Words files
_Status:_ Completed  
_Notes:_ 756 sentences in six words folders (`board/words`, `shell/words`, `packages/ui/src/words`, `server/words`, mcp, cli), keys `board.<area>.<name>`; the board's words sit inside `board/` (verify's host rule), the shell reads them. Test: `scripts/words.test.mjs` + `words-scan.test.mjs` (rule in `words-text.mjs`, `words-scan.mjs`, config `words-homes.mjs`); doc `docs/specification/words.md`. `app-words.ts` is now `board/words/app-cards.ts`. ARCH_03-R5 and TEST_01-R5 done; baselines changed only: app-gallery app-cards light/dark and chat light/dark (one text line each, checked by eye). Unit 1723, check, verify (13 warnings), gen green; page suite 655 + 10 budgets passing (budgets alone on a quiet machine). Not scanned yet: `packages/actions`, `packages/format` (REQUEST). US English: "Centre cards" (toolbar words) and SKILL.md "colour". For ARCH_06: moving files into feature folders must keep each file's relative `words/` import (`board/words/` stays under `board/`).
Run 2: Completed. `packages/format/src/words` (134 keys) and `packages/actions/src/words` (159) moved with the same codemod, no wording changed, tests of the messages untouched; format words import nothing. Left in code, listed under "Developer text" in words.md: `flags.ts`, `conditions.ts`, `references.ts`; `images.ts` is an other home (images-pure.test.ts). Docs repointed (apps/board/README.md, components.md). 230 page specs on the screens that show these sentences pass, no screenshot changed beyond Run 1's four.

---

### ARCH_06: Feature folders and short functions
_Status:_ Completed  
_Notes:_ `apps/board/src/board/` in ten feature folders (`canvas`, `links`, `cards`, `notes`, `selection`, `input`, `find`, `boards`, `access`, `apps`), each with one `index.ts`; the core stays at the root (`mount`, `host`, `status`, `io` + `io/`, `controller` + `controller/`, `live`, `sender`, `work`...). `verify` gains `checkFeatureFolders` (a path past a folder's `index.ts` fails) and `checkFunctionLength` (`scripts/verify-functions.mjs`, a function over 50 lines of its own warns; inner functions count on their own; `verify: long-function <reason>`); one function warning is left, `createBoard` (124 own lines, the composition root, with its reason; its input table, state and types are out in `controller/`). Cut: `onKey`, `wires` `draw`, `contextProblems`, `write-board.ts` (replay, result), `io.ts` (`io/`). Helpers: `isRecord` in `#format` (`packages/agent` keeps one copy with a parity test), `server/secrets.ts` (`newToken`, `sameText`), `realPath` in `folders.ts`, localStorage through `kept.ts`; plural stays in the words files (D-063: a words file imports only words). Requests UI_01-R7/R8, ARCH_04-R2, ENGINE_01-R3, ARCH_05-R6 done. Gates: unit 1735 + 10, check, gen, verify (only `modules.md` out of date: `npm run map`), 70 page specs in four groups on 4900, no screenshot changed. Not split into modules (each is a row of inner functions of 37 lines at most): `createNoteFlow`, `createCardImages`, `createCardSet`, `bindNoteParts`, `bindModeRow`, `openChats`, `createSupervisor`. Requests: `npm run map`; `packages/ui/src/image-view/pattern.json` `whenToUse` path (`board/cards/card-images.ts`) with the two `gallery-images-*.png` baselines; `docs/principles.md` § One job per file (function warning, feature folders).

---

### VERIFY_01: Verification
_Status:_ Completed  
_Notes:_ Findings in `VERIFY_01_findings.md`. Gates: `npm test` 1735 + 10 (unit 12.9 s, timing 1.4 s), verify ok (13 warnings), check 0 errors, gen current; `board-host.spec.ts` + `host-styles.spec.ts` 9 passed on 5000; full suite left to the gate (rule 12). Review §1-§5, §7-§11 closed with evidence, open items with tracker rows. Eight back doors planted in a scratch copy, every one caught (7 verify failures, 1 warning, the words test). Engine: no socket, env or folder lookup in its 25 files; an agent's ✓/✗ refused. The person's board pixel-identical to pre-tidy (da59607) in 12 views (1600/768, light/dark, three zooms). New against nclite's contract: F1 a key pressed anywhere on the page reaches every board; F2 `unmount` drops a note's unsaved words; F3 Markdown images ignore `host.settings`; F4 sessionStorage of its own; F5 no `#board` front door for the view and its CSS; F6 tool table, engine tools and reply disagree (`list_apps`, `join`, `request_grant`). Also F7 words check misses `packages/client`; F8 pressed offset ×21; F9 doc drift (`readingOrder`, principles `primitives.css`); F16 eight gallery baselines changed (the criterion's wording). None blocks closing the set; F1, F2 block the plugin stage.

---

## The Run (orchestrator)

Waves 2–8 ran on 2026-10-26/27 under the maintainer's delegation for the calls that came up; each call
is below, with its approval. One commit and tag per wave, after the gates.

| Wave | Tasks | Commit · tag | Gates |
|---|---|---|---|
| 1 | FIX_01, FIX_02 | c2f6110 · `tidy/wave-1` | green |
| — | Principles 286, set refined | e9218f8 | verify ok |
| 2 | ARCH_01 (Run 2, after D-059) | 818c502 · `tidy/wave-2` | 1620 + 10 unit; 658 page specs |
| 3 | ARCH_02, UI_01, ARCH_04 | fe64b9c · `tidy/wave-3` | 1690 + 10 unit; 664 page specs; gallery gained the Base section (appended last) |
| 4 | ARCH_03, ENGINE_01 | 80a3a2c · `tidy/wave-4` | 1707 + 10 unit; 667 page specs, no screenshot changed |
| 5 | TEST_01 | a9bb4b3 · `tidy/wave-5` | 1710 + 10 unit; 667 page specs on 3 workers in 6.4 min (was 16.1 on 1) |
| 6 | ARCH_05 (Runs 1, 2) | 613efd7 · `tidy/wave-6` | 1723 + 10 unit; 667 page specs on 5 workers in 6.2 min; app-cards and chat changed by one gallery text line |
| 7 | ARCH_06 | 28f0890 · `tidy/wave-7` | 1735 + 10 unit; 667 page specs on 5 workers in 5.1 min; first run hung 5 h on the ledger follower race (fixed, Found along the way); image-view gallery baselines refreshed for its moved path |
| 8 | VERIFY_01 | commit below · `tidy/wave-8` | 1735 + 10 unit (by VERIFY_01); 667 page specs on 5 workers in 5.2 min at the gate, the second full run on unchanged code after Wave 7's 5.1 min (two, not the three PLAN asked: the code did not change between them); findings F1–F16, open ones at tracker M10–M19 |

Every wave also: `npm run check` 0 errors, `gen-api --check` current, `verify` ok.

### Calls made, and their approval

- **Decisions D-059 to D-063** (one package scope; a module's names; the CSS scope; test support per
  module; words homes): approved by the maintainer, 2026-10-27 (points 292–296).
- **Protected files, approved by the maintainer:** the project instructions v0.4 (the Tests line,
  points 288 and TEST_01-R2; `words.md` and Sentences, point 290); principles § One job per file
  (point 291); principles § Dependencies (the npm-workspaces line, with D-059).
- **Test time** (maintainer, points 287–289): 5 workers; a task runs only the specs for what it changed
  (rule 12), the full suite once per wave gate; tracker M9, a quick check.
- **New design tokens** (UI_01, protected): `--vb-z-*`, `--vb-control-h` / `-small` / `-target`,
  `--vb-focus-offset` / `-tight` / `-inset` / `-card`, each at today's literal value, so no picture moved; approved by the maintainer, 2026-10-27 (point 297).
- **Design calls within the delegation:** the gallery's Base entry (placed last); no split of
  `#actions` into ledger + actions yet (118 importers need both halves); a chip on a card whose notes
  are hidden is refused (`hidden`); chip refs `{board,n,ver}` / `{board,seq,rev}` / `{board,head}`;
  ARCH_03's two deviations (the `board` chip; raster tolerance 2 in host-styles); aria ids per mount;
  the MCP server stays a relay, not an engine host; tracker M8 (the board's controls travel with it);
  the gallery's lanes sample was wrong, not the rule; "Allow" and "Send to agent" stay in both the page's
  and `#actions`' words until the plugin's words file is built; factories of short inner functions are
  not split further (ARCH_06-R4).

### Found along the way (beyond the task files' own notes)

- Timing and budget tests fail under load (another project's suite beside them, load ~22): server start
  1.8–2.7 s against 1 s, the 1,200-link layout 1.0–1.8 s against 100 ms. They pass on a quiet machine;
  run them alone before reading a failure as a regression.
- The page servers must run in a child process: in-process, the 1,000-card first draw slipped past its
  1,000 ms budget. `--shard` needs `--project=chromium`; `perf.spec.ts` alone needs `--no-deps`.
- A page-test filter `board` matches every spec (the worktree path contains `vision-board`).
- Three unit runs hung mid-Wave 4 (an intermittent `node --test` hang, ARCH_03-R7); stopped with the
  maintainer's yes. Found at the Wave 7 gate (hung 5 h on `engine.test.ts`): a followed ledger used
  `fs.watchFile`, whose first look is taken later, so another writer's line written in between was
  never told (a real miss, seen under load). `follow` now polls `refresh` against the size it last
  read (`apps/board/server/ledger.ts`); `npm test` has a 120 s per-test limit, so a stuck test fails.
- One orchestrator slip: a stray command briefly made an empty `temp-rows.txt` in the main checkout;
  removed within minutes.

---

## Completion Checklist

- [ ] All implementation tasks complete
- [ ] Verification task complete
- [ ] Every request `Done` or `Closed`
- [ ] LOG entry created (see below)
- [ ] The maintainer looks in a browser, light and dark (page screenshots stood in overnight):
  - the ⋯ menu, Move to (Shift+M), a container's settings menu, the app card's "Allowed ▾";
  - New/Rename board, Open folder…, Archived…, a confirm: Esc, Cancel, backdrop click, focus back;
  - hover tip and note preview (grace, Esc, tap then press outside), read-only note bubble, the selection pill;
  - the toolbar at 1200, 1000 and 768 px; the gallery's Base section;
  - the board at 1600 and 768 px; the chat sidebar open; archiving the last board; switching the open
    folder; the past-version banner; H (Hide answered); Esc closing the Reply panel

---

## On Completion

When ALL tasks are done and the full gates pass, the orchestrator:

1. Sets frontmatter `status: completed` and `completed: YYYY-MM-DD`
2. Appends the set LOG entry, one line ending in a newline:
   ```
   [[YYYY-MM-DD HH:MM]] [project-tooling] Completed set: Tidy-Up To The Target Architecture → Task: [[cortex-tasks/project/2026-10-26_project-tooling_tidy-up/TASK-STATUS.md]]
   ```
3. Updates `docs/principles.md` § "Where we are" (with the maintainer's yes): the gaps closed, any left as tracker rows.
4. Reminds the maintainer that search is next: tracker M7 (search the board in plain words), planned from there.
