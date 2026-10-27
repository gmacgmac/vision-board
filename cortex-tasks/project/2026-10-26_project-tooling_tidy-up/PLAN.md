# Tidy-Up To The Target Architecture - Plan

> **Status Doc**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Created**: 2026-10-26 · **Source**: maintainer, chat 2026-10-26 (points 205-271) · **Branch /
> worktree**: `refactor/tidy` in `.claude/worktrees/tidy` (from `feat/app-cards` at da59607). The
> maintainer's board runs from the main checkout on port 4466: never touch it.

---

## Problem Statement

The code is behind its own principles. `docs/principles.md` (rewritten 2026-10-26 as the **target**)
adopts the `cortex-architecture` practices and says the board is a plugin hosted in nclite. The
review `cortex-tasks/board/2026-10-26_project-tooling_code-organisation-review.md` lists the gaps.
This set closes them before the plugin work, with no new features meanwhile.

---

## Current State

The review is the inventory; each task cites its section (§1-§11, "closer look" 12-19). In short:
modules reached by ~500 deep relative paths and CSS back doors (§1); contracts with several sources
(§3); the board needs the Svelte shell and hidden singletons (§2); shared UI written 5-9 times (§4);
pure ledger queries in the app (§5); geometry twice (§7); no words files (skill rule 7); tests with no
shared helpers and order-dependent specs, so one worker (§9); a flat 76-file folder and 150-220-line
factories (§10). Six page tests fail before any change.

---

## The Plugin Contract (nclite, draft v0.1)

nclite's handover (2026-10-26) gives the contract the board will be hosted under:
`~/ai/nclite/docs/plugins.md`, proven by `~/ai/nclite/prototypes/plugin-host/` (commit `e08d402e`).
It is a draft, and the maintainer's ruling is that **the board's needs shape it, not the reverse**
(chat 2026-10-26): where the board needs a different shape, the task builds the board's shape and
lists the change for nclite under `REQUESTS`. The tidy-up builds the seams the contract needs; it
does not build the plugin (manifest, skill, pane, token map: Out of Scope).

| Contract | Board seam | Task |
|---|---|---|
| View: `mount(root, host)` → `{ unmount, pageChip, reveal }`; stays inside its root | `mount` over `createBoard`; no listener outlives `unmount`; two boards on one page | ARCH_03 |
| `PluginHost`: `api`, `events`, `addToChat`, `settings`, `notify` | The board's host interface in that shape, plus `confirm` (the board's need) | ARCH_03 |
| Engine part: `createEngine(dir)` → `route`, `resolve`, `tools`, `watch` | The board's engine, HTTP-free; the standalone server and MCP are hosts of it | ENGINE_01 |
| Data in the bot's `plugins/board/` folder | The ledger's folder is the engine's `dir`, injected, not found | ENGINE_01 |
| Chips `{ plugin, kind, ref, label, detail }`, resolved on send | One chip type and one pure `resolveChip`; the answers since the last message as a query | ARCH_04 |
| Routes under `/api/bots/{bot}/plugins/board/`, called through `host.api` | The typed client takes its transport, paths relative | ARCH_02 |
| Tools declared in the manifest with input schemas | Tool declarations generated from the one OpenAPI source | ARCH_02 |
| Styles under the view's root; the host's element rules reach in | Scoped stylesheets; the board sets what it relies on; sized by its own width | UI_01 |
| Words in the plugin's words file | Namespaced keys a plugin words file can be built from | ARCH_05 |

**Where the board needs a different shape** (asked of nclite in the handover reply): tool inputs as
full JSON Schema (`write_board` takes a list of items, the contract's are flat); `confirm` on the
host (four board actions ask first, one with a list); routes and tools that may return a promise;
a turn hook for the person's answers since the bot's last message (`roundOf`); a change event that
carries the board and the ledger head; `vb-`-prefixed names counting as scoped CSS.

---

## Proposed Solution

Close the gaps in dependency order, one checkpoint per wave, everything green at each checkpoint.

### Key Changes

1. **Green baseline** (FIX_01): the six failing page tests fixed, `temp/` cleared.
   Beside it, one bug fix (FIX_02, maintainer 2026-10-26): retiring a card ends any proposal standing
   on it, and the page never sends an accept the server will refuse.
2. **One front door per module, by name** (ARCH_01): the root `package.json` `imports` map gives each
   module a short name (`#format`, `#ui`, …) pointing at its one public file; CSS and asset front
   doors; a codemod; `verify` catches every back door. Modules, not npm packages (maintainer, point 224).
3. **One source per contract** (ARCH_02): generated operation types and a typed client; problem codes
   from the schema; one card-reference table; constants defined once.
4. **Shared UI base** (UI_01): menu, dismissable layer, dialog, button and popover surface built once
   in `packages/ui`; the app keeps only board rules; style checks in `verify`.
5. **Ledger answers and geometry in packages** (ARCH_04): pure queries and one board-data builder move
   to `packages/actions`; box geometry gets one home.
6. **The board is hostable** (ARCH_03): `mount(root, host)` in the contract's shape; no board module
   imports the Svelte shell; `io`/flags singletons injected; the standalone app is one host.
   Beside it, **the board's engine part** (ENGINE_01): `createEngine(dir)` with routes, chip resolve,
   tools and a ledger watcher, HTTP-free; the standalone server and MCP call it.
7. **Test support and parallel page tests** (TEST_01): shared helpers and fixtures in their packages;
   order-independent specs; more than one worker.
8. **Words files** (ARCH_05): one home per area for screen text and agent words, with its test.
9. **Feature folders and short functions** (ARCH_06): `apps/board/src/board/` in feature folders, long
   factories split, a function-length warning, small copied helpers given one home.
10. **Verification** (VERIFY_01): the review re-run against the result.

---

## Dependencies

- Wave 1: FIX_01 (a refactor needs a green start) and FIX_02 (a bug fix), on disjoint files.
- ARCH_01 alone next: every later task moves or adds imports, and must use the new names.
- Wave 3 runs ARCH_02, UI_01 and ARCH_04 in parallel on disjoint files (TASK-STATUS File Ownership).
- ARCH_03 and ENGINE_01 after wave 3, in parallel (the page and the server, disjoint files): they
  consume the typed client and tool table (ARCH_02), the shared dialog/menu (UI_01), and the moved
  queries, chip type and `resolveChip` (ARCH_04).
- TEST_01, ARCH_05, ARCH_06 then run one per wave: each touches files across the tree.
- Shared Foundations: TASK-STATUS.md.

---

## House Rules

- **Commits**: sub-agents never commit. The orchestrator commits and tags (`tidy/wave-N`) once per
  wave, after that wave's gates pass.
- **Gates per wave (orchestrator)**: `npm test`, `npm run verify`, `npm run check`,
  `node scripts/gen-api.mjs --check`, and the full page suite once. Sub-agents run the unit tests and
  the page specs for what they touched; the full suite is the orchestrator's.
- **Ports**: each task uses its own `VB_TEST_PORT` (TASK-STATUS) under `temp/pages.lock`; never 4466.
- **Behaviour**: unchanged. A refactor changes no picture: a screenshot that changes is a STOP, unless
  the task says it fixes a known failure.
- **Protected** (the maintainer's yes, through the orchestrator): new
  decision entries, new design tokens, the project instructions. A task drafts them in its notes and
  lists them under `REQUESTS`; it never writes them.
- **Orchestrator-only files**: `package-lock.json`, `docs/decisions.md`, `packages/tokens/src/tokens.css`
  (new tokens), `.kiro/steering/`, generated files are regenerated by `npm run gen` / `npm run map` only.
- **Every task**: consult `cortex-architecture` and read `docs/principles.md` first; cite by path and
  symbol; files under 300 lines (split, never squeeze); writes over 50 lines in chunks; no PII.

---

## Out of Scope

- The rest of the server split (review §6: HTTP kit, chat server, app host) and the chat package's own
  cleanup (§3 chat shapes, §8 chat palette): nclite's engine and chat replace them. Only the engine
  seam (ENGINE_01) and the small helper moves the other tasks need are in.
- Any new feature (search, tracker M7; the plugin itself: manifest, skill, pane, the token map, the
  host link to nclite's chat): planned after this set.
- Splitting `packages/actions` into `ledger` + `actions` (review 12): ARCH_04 drafts the decision only.

---

## Risks & Considerations

| Risk | Mitigation |
|------|------------|
| The import codemod breaks Vite, svelte-check or Node type-stripping | ARCH_01 proves the `imports` map in all three on one module before the codemod; STOP if one can't resolve it |
| Parallel wave 3 tasks collide | File Ownership table; a change outside one's files is a REQUEST |
| A refactor quietly changes behaviour | Screenshots unchanged is a gate; unit and page tests green at every wave |
| The host interface leaks Svelte types | ARCH_03 keeps the interface in plain TS; a test mounts the board with a fake host |
| Parallel page tests flake | TEST_01 makes specs order-independent first, raises workers last, and runs the suite three times |
| Context lost between waves | Each task's notes and the Requests table carry it; tasks read earlier notes first |

---

## References

- `docs/principles.md` (§ Architecture we adopt, § The board is a plugin) — the target
- nclite's plugin contract, draft v0.1: `~/ai/nclite/docs/plugins.md`; the spike
  `~/ai/nclite/prototypes/plugin-host/` (`host/plugin-engine.ts`, `host/runtime.ts`, `host/manifest.ts`,
  `public/host/plugin-host.js`); the handover `~/ai/nclite/temp/vision-board-handover-plugin-contract.md`.
  Read only: never write in nclite.
- `cortex-tasks/board/2026-10-26_project-tooling_code-organisation-review.md` — the gaps, §1-§19
- `cortex-architecture` skill and its references (contracts, registries, words)
- `docs/decisions.md` (D-005, D-016, D-026, D-029, D-037), `docs/specification/modules.md`
- `scripts/verify.mjs`, `scripts/gen-api.mjs`, `tests/pages/playwright.config.ts`

---

## Success Criteria

- [ ] Every confirmed review finding §1-§5 and §7-§11 is closed or has a tracker row saying why not
- [ ] `verify` fails on a deep import, a CSS back door, a colour literal outside the tokens, I/O outside its layer, and (warning) a long function
- [ ] The board mounts with a fake host in a test, with no Svelte import: twice on one page, and
      `unmount` leaves no listener and an empty root
- [ ] The board's engine runs with no HTTP server in a test: a route, a chip resolve, each tool, a watch event
- [ ] The board draws unchanged under a host's global element rules and at a pane's width (~550 px)
- [ ] The full page suite passes with more than one worker, three runs in a row
- [x] No screenshot of the person's board changed; a gallery screenshot changes only with a look by eye at its gate (reworded by the maintainer, point 300, 2026-10-27: the 8 gallery baselines that changed are accepted)
- [ ] All tests pass; `verify`, `check` and `gen --check` clean
