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
11. **Your page-test port** is in the Task List's Notes column; never 4466

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
| 6 | ARCH_03 | 4 | strong | Front-end architect for embeddable components — a component that imports its host's state can't be hosted anywhere else. | [The board is hostable](./ARCH_03_board-host-interface.md) | Pending | port 4750 |
| 6b | ENGINE_01 | 4 | strong | Back-end engineer who builds engines other programs embed — an engine that opens its own socket or finds its own folder can only ever run alone. | [The board's engine part](./ENGINE_01_board-engine-part.md) | Pending | port 4755 |
| 7 | TEST_01 | 5 | strong | Test infrastructure engineer — a test that passes only in a certain order is not a test; shared fixtures have one home. | [Test support and parallel page tests](./TEST_01_test-support-and-parallel.md) | Pending | port 4760 (+ worker ports) |
| 8 | ARCH_05 | 6 | standard | — | [Words files](./ARCH_05_words-files.md) | Pending | port 4770 |
| 9 | ARCH_06 | 7 | standard | — | [Feature folders and short functions](./ARCH_06_feature-folders-and-functions.md) | Pending | port 4780 |
| 10 | VERIFY_01 | 8 | strong | Staff engineer joining the nclite team, reviewing this code to host it as a plugin, with no history of how it got here — wants every rule in `docs/principles.md` true of the code, not of the docs. | [Verification](./VERIFY_01_tidy-verification.md) | Pending | port 4790 |

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
| 4 | ARCH_03 | `apps/board/src/**`, `scripts/verify.mjs`, `scripts/verify.test.mjs`, `docs/specification/components.md`, their tests |
| 4 | ENGINE_01 | `apps/board/server/**`, `apps/board/server.ts`, `packages/mcp/src/**` (where it reaches the board), `docs/specification/api.md`, their tests |
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
| ARCH_01-R6 | ARCH_01 Run 2 (note) | `perf-ledger` imported by the actions/layout timing tests: move into a module's `/testing` so verify's warnings clear | TEST_01 | Open |
| ARCH_01-R7 | ARCH_01 Run 2 (note) | cli/mcp tests and the calculator skill test reach into the board server: the engine is their front door | ENGINE_01 | Open |
| UI_01-R1 | UI_01 | Gallery entry for the base (PATTERNS, SAMPLES, pattern.json), gallery baselines | orchestrator: Wave 3 gate sub-agent | Done |
| UI_01-R2 | UI_01 | New tokens `--vb-z-*`, `--vb-control-*`, `--vb-focus-offset*` (today's values), then apply | orchestrator approved under delegation; Wave 3 gate sub-agent | Done |
| UI_01-R3 | UI_01 | Decision: the board's CSS scope | orchestrator: D-061 | Done |
| UI_01-R4 | UI_01 | nclite: `vb-` selectors count as scoped; root class `vb-board` | orchestrator: nclite-contract-reply.md | Done |
| UI_01-R5 | UI_01 | `vb-board` on the mount root; 550 px pane inside a wider page in host-styles.spec | ARCH_03 | Open |
| UI_01-R6 | UI_01 | `styles/page.ts` lists `shell.css` first, not `@import` | Wave 3 gate sub-agent | Done |
| UI_01-R7 | UI_01 | `history-flow.ts` imports `menuKeydown` from `#ui`; delete `board/menu-keys.ts` | ARCH_06 | Open |
| UI_01-R8 | UI_01 | ReplyPanel, BoardAgents, GoToCard take `.vb-surface-panel` / `.vb-surface-pop` | ARCH_06 | Open |
| UI_01-R9 | UI_01 | `packages/ui/README.md`: the base and its recipes | Wave 3 gate sub-agent | Done |
| ARCH_02-R1 | ARCH_02 | `gen-reference.mjs` `optional-agent` row, then `npm run gen` | Wave 3 gate sub-agent | Done |
| ARCH_02-R2 | ARCH_02 | `#format` exports `constants.ts`; `files.ts` exports `TOOLS_FILE` | Wave 3 gate sub-agent | Done |
| ARCH_02-R3 | ARCH_02 | `folders.ts` `FolderEntry` from `OperationOutput`; `caller-folder.ts` `PROJECT_HEADER` from `#format`; `write-problem.ts` `ProblemDocument`, drop `ProblemBody` | ENGINE_01 | Open |
| ARCH_02-R4 | ARCH_02 | `DEFAULT_PORT` / `ENV` for 4466 and `VB_*`: cli, client, reply.ts now; `server.ts`, `vb-mcp.ts` | Wave 3 gate sub-agent; ENGINE_01 for server and mcp | Open |
| ARCH_02-R5 | ARCH_02 | nclite: full JSON Schema tool inputs; `url()` / `watch()` through `host.events` | orchestrator (reply); ARCH_03 (`host.events`) | Open |
| ARCH_04-R1 | ARCH_04 | Docs: components, performance, board README, actions README to `answers/` | Wave 3 gate sub-agent | Done |
| ARCH_04-R2 | ARCH_04 | `CardStep` alias of `UnseenStep`, `CardProposal` a pick of `ProposalRow` | ARCH_06 | Open |
| ARCH_04-R3 | ARCH_04 | `io.ts` `BoardData` re-exported from `#actions` | ARCH_03 | Open |
| ARCH_04-R4 | ARCH_04 | Private `clip` copies → `#format` `clip`: delete `board/clip.ts` (`chat-bridge.ts`, `finder.ts` import it), and `chat-prompt.ts`'s copy | ARCH_03 (page, owns `apps/board/src`), ENGINE_01 (server) | Open |
| ARCH_04-R5 | ARCH_04 | `chat-prompt.ts` built from `cardChip` / `noteChip` / `resolveChip` / `turnOf`; the `hidden` refusal applies at once | ENGINE_01 | Open |
| ARCH_04-R6 | ARCH_04 | nclite: `ref` is opaque JSON; refusal `{ code, reason }`; `detail` is the composer's second line | orchestrator: nclite-contract-reply.md | Done |
| ARCH_04-R7 | ARCH_04 | Actions split: not now (drafted case in ARCH_04 notes) | orchestrator: accepted, no entry; split when a consumer needs reads without actions | Closed |

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
_Status:_ Pending  
_Notes:_ 

---

### ENGINE_01: The board's engine part
_Status:_ Pending  
_Notes:_ 

---

### TEST_01: Test support and parallel page tests
_Status:_ Pending  
_Notes:_ 

---

### ARCH_05: Words files
_Status:_ Pending  
_Notes:_ 

---

### ARCH_06: Feature folders and short functions
_Status:_ Pending  
_Notes:_ 

---

### VERIFY_01: Verification
_Status:_ Pending  
_Notes:_ 

---

## Completion Checklist

- [ ] All implementation tasks complete
- [ ] Verification task complete
- [ ] Every request `Done` or `Closed`
- [ ] LOG entry created (see below)

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
