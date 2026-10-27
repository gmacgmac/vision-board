# TEST_01_test-support-and-parallel: Test Support And Parallel Page Tests

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Tests share one support module and their fixtures live with their packages; no page spec depends on run
order, so the full suite runs on several workers and takes minutes, not 14.

## Context

Review §9 and chat points 133-139. No shared test helpers (ledger-line builder ×8 + ~10 variants,
`mkdtempSync` ~40, `createBoardServer` started in 8 places, Playwright `join` ×6, `idle` ×8, `openBoard`
×6, `card`/`frame` locators in 35 and 26 files); packages test against app content (6 `packages/actions`
tests read `apps/board/src/gallery/gallery.ledger.jsonl`; `packages/cli` and `packages/mcp` tests run
`apps/board/tests/serve-fixture.ts`); ~12 specs say "Runs after …", forcing `workers: 1`
(`tests/pages/playwright.config.ts`).

## Inputs

- **Files to modify**: `packages/testing/**` (new, private), `tests/**`, every `*/tests/**`,
  `tests/pages/playwright.config.ts`, the gallery fixture (move to `packages/format/fixtures/`, its
  importers), the root `package.json` `imports` (one line, `#testing`) and `scripts` (test globs).
- **Shared artifacts to reuse**: module names (ARCH_01), the board host interface (ARCH_03) and the
  board's engine (ENGINE_01) for any page-free or server-free test: their fake host and temp-folder
  engine move into `packages/testing` as the one copy.
- **Skills**: `cortex-architecture` (rules 1, 8).

## Steps

1. [x] **`packages/testing`**: a ledger builder (defaults to `LEDGER_FORMAT`, validates), `makeTempDir`,
   `startTestBoard` with a port allocator, fake agents, `FIXTURE_LEDGERS`, and a `./playwright` subpath
   with the page helpers. Replace the copies.
2. [x] **Fixtures with their packages**: `gallery.ledger.jsonl` to `packages/format/fixtures/`; package
   tests no longer read `apps/` or run app files. Where the schema tests live follows D-026 (ajv in one
   home); make that home importable by tests, or leave them and say why.
3. [x] **Order-independent specs**: each spec that depends on another's writes gets a board of its own
   (as `rail-board.ts` does). Prove it: the suite passes in reverse file order and with `--shard`.
4. [x] **Parallel**: one server and ledger per worker (port from the allocator), then raise `workers`
   (start at 3; the machine's cores decide). Full suite three runs in a row, green; record the time.
5. [x] Update the project instructions' test line only through a `REQUEST` (protected).

## Validation

- [x] Full suite green 3×, with more than one worker, and in reverse order; time recorded (was ~14 min)
- [x] No package test reads `apps/`; no helper defined in more than one spec (`grep`) — but seven
  texts bound to their file's own server or constants (Caught Beyond the Brief)
- [x] `npm test`, `npm run verify`, `npm run check`

---

## Implementation Notes

_To be completed by agent after task completion. Re-run? Add a `### Run N` block; never overwrite._

**Status**: Completed  
**Completed**: 2026-10-27 06:40  

### Changes Made
- **Test support per module, by name (D-060)**: `#format/testing` → `packages/format/tests/support.ts`:
  `FIXTURE_LEDGERS` / `fixtureLines`, `lineMaker({ v = LEDGER_FORMAT, at })` (the line builder; 11
  copies replaced), `checkedEvents` (fails on any readLedger problem), `makeTempDir` (36 copies in
  apps/board and mcp tests replaced), `perfLedger` / `BIG` (moved from `tests/pages/perf-ledger.ts` to
  `packages/format/tests/perf-ledger.ts`). `#board/testing` → `apps/board/tests/support.ts`: the one
  door to the board's test kit (`startTestBoard`, `personCookie`, `joinAgent`, `personAct` in the new
  `test-board.ts`; the API harness; fake CLIs, apps, images, seeded random). `createBoardServer` is
  now started only by `startTestBoard` (harness, api-errors, api-events, api-chat-sessions, the page
  suite's servers) and by `server-start.timing.ts`, which times it.
- **ENGINE_01-R1**: `apps/board/tests/serve-fixture.ts` deleted; `support.ts` serves the harness
  when run directly; cli `roundtrip.test.ts` and mcp `tests/support.ts` spawn
  `fileURLToPath(import.meta.resolve('#board/testing'))`. `verify.mjs` reads `import.meta.resolve(…)`
  as a path reference and fails a path into an app from outside its tests (`#app/testing` by name);
  a Vite `?raw` query names the same file. Tests in `verify.test.mjs`.
- **ARCH_01-R6**: the four timing tests import `#format/testing`; verify's three warnings are gone
  (19 → 13 warnings; the others are file lengths and chat.css).
- **Gallery fixture**: `gallery.ledger.jsonl` → `packages/format/fixtures/`, named
  `#format/gallery.ledger.jsonl` (the gallery imports it `?raw`; the built page is byte-identical,
  shasum of every dist file). The six actions tests, `schema.test.ts` and `gallery-fixture.test.ts`
  read it through `FIXTURE_LEDGERS` / `FIXTURES_DIR`; no package test reads `apps/` (comments only).
  Schema tests stay in `apps/board/tests/`: ajv's one home is the I/O layer (D-026,
  `server/schema.ts`), in the app; format may not depend on it.
- **Page suite, parallel**: `global-setup.ts` builds once; each worker gets its own main, perf and
  empty boards in a child process (`servers.ts` → `serve-boards.ts`, IPC `reset`/`close`) on its own
  block of ports (`ports.ts`: `VB_TEST_PORT` + 10 × (slot + 1), slot = `TEST_PARALLEL_INDEX`; never
  4466), **fresh for every spec file** (`helpers.ts` `test`: worker fixture `boards`, auto fixture
  `fresh`, `baseURL` the worker's main board). The specs' own servers (chat, folder, app,
  roadmap) take their port from the same block and start through `startTestBoard`.
  `playwright.config.ts`: no `webServer`; `workers` = `VB_TEST_WORKERS` or 3; project `budgets`
  (perf.spec.ts) depends on `chromium` and runs last, one worker, as the budgets were measured.
- **Order-independent**: per-file fresh boards make every file independent of every other; the one
  cross-file carrier, `frames-board.ts` `fx` (module state shared by containers and note-discard),
  now redraws when its board is gone. "Runs after …" comments in 14 specs rewritten.
- **One home per helper**: `tests/pages/board-page.ts` (card, frame, idle, head, openBoard,
  openDrawn, bar, bubble, toast, picker, menu, menuButton, folderDialog, replies, tab, control,
  panelOf, selected, selectedIds, box, stageBox, world, scale, panBy, zoomToFull, drag, api,
  linesAfter), `chat-page.ts` (side, toggle, text, sendButton, log, status, card), `agent-board.ts`
  (`joinAgent` for the 11 `join` copies; `open`, `act`, `write`, `tabTo` copies removed). 12
  `openBoard` copies and every byte-identical copy that needs no file's own server are gone.

### Verification
Full page suite (667 tests: 657 + the 10 budgets), `VB_TEST_PORT=4760`, no screenshot changed in
any run (`git status tests/pages/__screenshots__` clean):

| Run | Workers | Result | Time |
|---|---|---|---|
| Baseline, HEAD (scratch copy, old config) | 1 | 667 green (2 broken by my smoke run's shared outputDir, green otherwise) | 16.1 min |
| Final infra, run 1 | 3 | 667 passed | 6.4 min |
| Final infra, run 2 | 3 | 667 passed | 6.5 min |
| Run 3 | 5 | 667 passed | 4.9 min |
| One worker | 1 | 667 passed | 15.2 min |
| Reverse file order (`temp/reverse.config.ts`) | 1 | 667 passed | 15.8 min |
| `--project=chromium --shard=1/2`, `2/2` | 3 | 333 + 324 passed | 4.1 + 2.4 min |

(Earlier runs on the infra before the child-process servers: 667/667 in 6.3 min once; one budget
miss, the first draw at 1,012 ms; see Issues.) First draw of 1,000 cards in the final runs:
465-486 ms (baseline 471). `npm test` 1710 pass, 0 fail, 1 todo (the gallery lanes sample) + 10
timing; `npm run check` 0 errors; `gen-api --check` current; `verify` ok, 13 warnings (was 19:
perf-ledger ×3 gone; schema.test.ts, flag-retire.spec.ts and focus-ring.spec.ts now under 300 lines). `grep`: no package test reads
`apps/`; no helper's text defined twice in tests/pages but the seven file-bound ones listed below.

### Issues & Resolutions
- First parallel run: 665/667. `note-discard` found the board `containers` drew on the file's old
  server (`fx` cached per worker): fixed in `frames-board.ts` `ensureBoard`. `perf.spec.ts` timed
  out beside `same-picture`: the budgets now run last and alone (`budgets` project).
- Then the 1,000-card first draw took 910-1,010 ms (budget 1,000; baseline 470): the boards ran in
  the worker's own process, which also runs Playwright's driver (tracing, snapshots), so the server
  answered on a busy thread. Moved into a child process per worker (`serve-boards.ts`): 465-486 ms
  in every run since. No budget, no wait and no spec's assertion was changed for it.
- My baseline copy in the shared scratchpad held a stray `zz-arch03-debug.spec.ts` from an earlier
  task (not in HEAD); its 8 tests are left out of the baseline count. My first smoke run shared the
  baseline's `outputDir` (same `VB_TEST_PORT`) and broke two of its traces: both passed on HEAD
  otherwise. A second run on one `VB_TEST_PORT` at the same time collides there too.

### Caught Beyond the Brief
- The gallery's ledger, now among the format's fixtures, fails the format's view check
  (`validate.test.ts`): its "Lanes mode" sample draws two cards with no lane (gallery board, region
  `frame-lanes`, cards 44 and 45). Kept as a `todo` naming it; the sample or the rule needs a call.
- The actions tests' fixture lists reached `packages/format/fixtures/` and `apps/` by relative
  `new URL(variable)`, which verify cannot see; now `FIXTURE_LEDGERS`.
- Ports: with workers, a task's page run uses `VB_TEST_PORT` + 10 to + 10 × (workers + 1). Tasks
  in one wave need ports at least 10 × (workers + 1) apart (TASK-STATUS gives 5-10 apart today).
- Seven identical helper texts remain, each bound to its file's own server or constants (`open` in
  the app, chat and folder specs on `s`/`srv`, chat `send`, `card(title)` on `REGION`, `texts` on
  `list`, every-node/new-cards `write` on a local `Drawn`); they differ in what they close over.

### Deviations from Plan
- Step 1 asked for a `packages/testing` package with `#testing`. Done as per-module test doors
  instead (`#format/testing`, `#board/testing`, beside `#agent/testing`), as D-060 names them:
  `startTestBoard` needs the board's server, and a package may not import an app (D-016), so a
  shared package could not hold it. The page helpers stay in `tests/pages/` (the suite's own
  support), split by area.
- A new kind of name, `#format/gallery.ledger.jsonl` (a fixture the page loads as text), not in
  D-060's list: drafted under REQUESTS. Root `package.json`: three `imports` entries added; scripts
  and dependencies unchanged.
- "Reverse order": Playwright orders files by name whatever the command line says, so the reverse
  run is a chain of one-file projects, each depending on the one before (`temp/reverse.config.ts`,
  proof only).

### Drafts for the maintainer (REQUESTS)
- **Decision, D-060 addendum (recommend: accept)**: "A module's test support is `#<module>/testing`;
  an app's is named too (`#board/testing`) and another module finds it only with
  `import.meta.resolve`, to run it as a child (its fixture server), never imports it (D-016). A
  fixture a page loads as text is named by its file (`#format/gallery.ledger.jsonl`, imported `?raw`).
  Rejected: one `packages/testing` package (it cannot reach an app); a wildcard `#format/fixtures/*`."
- **Project instructions** (`.kiro/steering/vision-board-proj.md` § How to work, the Tests line),
  proposed text: "**Tests while working**: unit tests plus the page specs for what changed; the full
  page suite once, at the end (`npm run test:pages`: 3 workers, `VB_TEST_WORKERS` for more; each
  worker's servers on `VB_TEST_PORT` + 10 per worker, fresh for every spec file). Never use port
  4466: it is the maintainer's board. Tasks running at once take `VB_TEST_PORT`s 100 apart."

---

## On Completion

1. Fill in Implementation Notes; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append your own LOG entry to `cortex/LOG.md` — one line ending in a newline, append-only:
   `[[YYYY-MM-DD HH:MM]] [project-tooling] TEST_01: what you did → Task: [[cortex-tasks/project/2026-10-26_project-tooling_tidy-up/TEST_01_test-support-and-parallel.md]]`
4. Return the `cortex-task-exe` Return Contract, with `REQUESTS` for anything outside your files.
   Never write the set entry or `AUDITED.md`. No commits.
