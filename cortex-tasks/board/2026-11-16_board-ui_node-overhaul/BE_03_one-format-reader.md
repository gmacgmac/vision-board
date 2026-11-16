# BE_03_one-format-reader: One Format in the Reader

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Make the reader, the schema, the shape rules, the index and the fold know one format, the current one, now that
every older ledger is migrated before it is read (D-103): delete every version branch, bring the fixtures and test
lines to the current format through the chain, and drop `LEDGER_FORMATS`.

---

## Context

PLAN.md § Decision 23 (D-103 point 3). The ledger review's H6 lists where "older" is read today, and § 3
"Recommended design" its second bullet says what goes (row R11). BE_02 built the upgrade chain
(`packages/format/src/migrate/`), the runner that migrates on a writable open, the in-memory upgrade for a read-only
open, and froze today's fixtures with their folds (`packages/format/fixtures/legacy/`). T_01 added the 19-to-20 step
and format 20, and maps the frozen `flags` to `bookmarks` in the comparison. After this task no line below
`LEDGER_FORMAT` reaches the reader.

The frozen folds are the proof: a branch removed wrongly shows as a migrated frozen file folding differently. Where
a branch decided behaviour (a format-2 line makes no creator), the migrated line must behave the same under the one
rule; if it does not, stop and report. Never add a branch back.

You run in your own git worktree beside T_02 and BE_04 (PLAN.md § House Rules; TASK-STATUS.md § File Ownership).

**Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: `packages/format/src/` except `migrate/`, `index.ts`, `icon-file.ts` and
  `words/format-icons.ts` (the version branches: `ledger.ts`, `ledger-shape.ts`, `ledger-index.ts`,
  `ledger-line.ts`, `view.ts`, `board-view.ts`, `words/`); `packages/format/schema/`; `packages/format/fixtures/`
  except `legacy/`; the existing files in `packages/format/tests/` (`perf-ledger.ts` among them);
  `packages/actions/src/` (only where a fold tests a version); the existing files in `packages/actions/tests/`,
  `apps/board/tests/` (except `plugin-theme.test.ts`) and `tests/plugin/contract/nclite/shared/` that hold a
  literal ledger line; the generated files `npm run gen` writes; `docs/specification/api.md`
- **Files to reference**: the review § 1 H6, § 3; `packages/format/src/migrate/` (`upgradeLines`); BE_02's and
  T_01's notes; `apps/board/tests/schema-v20.test.ts`
- **Skills**: `cortex-architecture`, `cortex-docs`

> Modify only the files this task owns. Need a change elsewhere? List it under `REQUESTS`.

---

## Steps

1. [ ] **List first**: every place that reads a version, with file and symbol, in your notes before changing
       anything. Start from H6 and search for `.v`, `LEDGER_FORMATS`, `LedgerFormat`, `RENAMED_MODES`, `LINE_MODES`,
       `PERSON_TOO`, `NodeBody.item` and every `if`/`then` on `v` in the schemas.
2. [ ] **Test lines first**: bring every fixture (not `legacy/`) and every literal ledger line in a test to the
       current format with `upgradeLines`, by a script in `temp/`, never by hand. Where a test builds lines in code,
       use `LEDGER_FORMAT` rather than a number. Keep an old line only where the test is about old lines (the
       chain's own tests, the frozen files, a test that an old line is refused). `perfLedger` becomes current-format
       lines (its `v: 2` and `agent: 'kiro'` go, review V3). Every test passes before the next step.
3. [ ] **Delete the branches**: `STAMP.v` accepts `LEDGER_FORMAT` only; `LEDGER_FORMATS` and `LedgerFormat` go;
       `eventProblems` loses `e.v === 2`, the `PERSON_TOO` version tests and the `>= 11` rule for `item`;
       `modeRules` its `< 12` and `LINE_MODES`; `contextProblems` its `e.v >= 6`; `indexEvent` its `e.v !== 2`;
       `fromLine` stops applying `RENAMED_MODES`, which goes; `NodeBody.item` and `viewNode`'s strip go;
       `common.schema.json` lists one `v`; the `act`, `board`, `node`, `region` and `retire` schemas lose their
       conditions on lists of versions. A line below the current format is refused with words that say to migrate
       it (`npm run ledger:migrate`). The ledger `$id` scheme stays as it is.
4. [ ] **Prove it**: every frozen file and the mixed ledger in `fixtures/legacy/`, migrated, fold with the
       one-format reader to their frozen results (T_01's `flags` to `bookmarks` mapping applies). A read-only open
       of a format-7 ledger still shows the same board (BE_02's in-memory upgrade).
5. [ ] `npm run gen`; `api.md`: points 5 and 11 and every sentence saying older lines "stay valid" or "still read"
       now say one format, migrated (D-103); a search finds none left. Run the checks.

---

## Validation

- [ ] `npm run verify`, `npm run check`, `npm test`, `npm run gen -- --check` pass
- [ ] A search for `LEDGER_FORMATS`, `RENAMED_MODES`, `LINE_MODES` and a comparison on `.v` finds nothing outside
      `packages/format/src/migrate/` and its tests
- [ ] Every frozen file, migrated, folds to its frozen result; `legacy-folds.test.ts` and `schema-v20.test.ts` pass
- [ ] A line one format below the current one is refused with the migrate words; a newer one still opens the ledger
      read-only (BE_02)
- [ ] `npm run test:pages -- board.spec.ts read-only.spec.ts ledgers.spec.ts` passes with no new baseline

---

## Constraints

- If you need to deviate, stop and tell the maintainer; no breaking change is made silently.
- No PII in examples. Interim files in `temp/`. Writes over 50 lines in chunks.
- No git command that changes state; the orchestrator commits.
- Never edit a file in `packages/format/fixtures/legacy/`.
- A problem outside this task is reported (`REQUESTS`, `NOTES`), never fixed here.

---
## Implementation Notes

_To be completed by agent after task completion._
_Re-run? Add a `### Run N` block below the last one; never overwrite an earlier run._

**Status**: Pending  
**Completed**: YYYY-MM-DD HH:MM  

### Changes Made
- 

### Issues & Resolutions
- 

### Caught Beyond the Brief
- None / [what you noticed that this task didn't ask about]

### Deviations from Plan
- None / [Describe if any, and why approved]

---

## On Completion

1. Fill in Implementation Notes above; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append **your own** LOG entry to `cortex/LOG.md` — one line, terminated with a newline, append-only:

   ```
   [[YYYY-MM-DD HH:MM]] [board-format] BE_03: [what you did] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/BE_03_one-format-reader.md]]
   ```

   Cite files by path + symbol, never by line number. Never write the set's entry or to `AUDITED.md`.
