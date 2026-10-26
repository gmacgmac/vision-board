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
- **Shared artifacts to reuse**: module names (ARCH_01), the board host interface (ARCH_03) for any
  page-free board test.
- **Skills**: `cortex-architecture` (rules 1, 8).

## Steps

1. [ ] **`packages/testing`**: a ledger builder (defaults to `LEDGER_FORMAT`, validates), `makeTempDir`,
   `startTestBoard` with a port allocator, fake agents, `FIXTURE_LEDGERS`, and a `./playwright` subpath
   with the page helpers. Replace the copies.
2. [ ] **Fixtures with their packages**: `gallery.ledger.jsonl` to `packages/format/fixtures/`; package
   tests no longer read `apps/` or run app files. Where the schema tests live follows D-026 (ajv in one
   home); make that home importable by tests, or leave them and say why.
3. [ ] **Order-independent specs**: each spec that depends on another's writes gets a board of its own
   (as `rail-board.ts` does). Prove it: the suite passes in reverse file order and with `--shard`.
4. [ ] **Parallel**: one server and ledger per worker (port from the allocator), then raise `workers`
   (start at 3; the machine's cores decide). Full suite three runs in a row, green; record the time.
5. [ ] Update the project instructions' test line only through a `REQUEST` (protected).

## Validation

- [ ] Full suite green 3×, with more than one worker, and in reverse order; time recorded (was ~14 min)
- [ ] No package test reads `apps/`; no helper defined in more than one spec (`grep`)
- [ ] `npm test`, `npm run verify`, `npm run check`

---

## Implementation Notes

_To be completed by agent after task completion. Re-run? Add a `### Run N` block; never overwrite._

**Status**: Pending  
**Completed**: YYYY-MM-DD HH:MM  

### Changes Made
- 

### Issues & Resolutions
- 

### Caught Beyond the Brief
- None

### Deviations from Plan
- None

---

## On Completion

1. Fill in Implementation Notes; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append your own LOG entry to `cortex/LOG.md` — one line ending in a newline, append-only:
   `[[YYYY-MM-DD HH:MM]] [project-tooling] TEST_01: what you did → Task: [[cortex-tasks/project/2026-10-26_project-tooling_tidy-up/TEST_01_test-support-and-parallel.md]]`
4. Return the `cortex-task-exe` Return Contract, with `REQUESTS` for anything outside your files.
   Never write the set entry or `AUDITED.md`. No commits.
