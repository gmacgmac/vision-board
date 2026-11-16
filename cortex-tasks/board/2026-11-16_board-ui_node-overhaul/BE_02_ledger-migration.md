# BE_02_ledger-migration: Ledger Migration

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Make an older ledger upgrade to the current format line for line: freeze today's fixtures and what they fold to,
with today's code, before anything changes; build a pure upgrade chain, a runner that writes under the lock with a
backup and replaces the file in one step, an in-memory upgrade for a ledger opened read-only, and a command; and make
a ledger written in a newer format open read-only and say why. The 19-to-20 step is T_01's, added to this chain.

---

## Context

PLAN.md § Decisions 23 (D-103) and § Planner's calls 13, 14. The design is the ledger review's § 3 "Recommended
design", taken as written (`cortex-tasks/board/2026-11-16_board-format_research_ledger-review.md`; rows R3, R4, R5;
findings V2, V3, H7, H12). Read § 3 whole before you start: it gives the steps the chain needs, how the runner
writes, when it runs and the tests.

`LEDGER_FORMAT` stays 19 in this task: the chain brings every older line to 19. The reader keeps accepting older
lines where they lie until BE_03 removes that; this task removes no version branch. The migration is not behind a
flag (call 13). The nearest existing code is the move of an old-layout folder into `main/` (`ledger-move.ts`, under
the lock, with `ledgers:undo`): follow its shape.

The one rule (V2, D-103 point 1): a migration is a map from one line to one line. It never adds, removes or reorders
a line, and never changes `seq`, `at`, `by`, a card's identity (`n` in the file, D-041) or a board id. Lines point at
each other by `seq`, and an agent holds a `head`.

You run in your own git worktree (PLAN.md § House Rules), beside DESIGN_01, which writes only under `design/`.

**Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: `packages/format/src/migrate/` (new), `packages/format/src/index.ts` (one export line),
  `packages/format/src/data-folder.ts` (`BACKUPS_DIR`, `PER_LEDGER_NAMES`), `packages/format/src/ledger-read.ts` (a
  newer line reported as its own kind), `packages/format/src/words/format-ledger.ts`, `packages/format/fixtures/legacy/`
  (new), `packages/format/tests/` (new files only), `packages/actions/tests/legacy-folds.test.ts` (new),
  `apps/board/server/ledger-migrate.ts` (new), `apps/board/server/ledger.ts` (`readHeld`, `openLedger`),
  `apps/board/server/project.ts`, `apps/board/server/editing.ts`, `apps/board/server/engine/engine.ts`,
  `apps/board/server/words/` (`bin.ts`, `server-folders.ts`, where the read-only words are),
  `apps/board/bin/ledger-migrate.ts` (new), `package.json` (the `ledger:migrate` script only), `apps/board/tests/`
  (new files only), the page's read-only reason (only if it cannot already show a reason: the file that shows it and
  its words file, named in your notes), `docs/specification/api.md`, `docs/specification/plugin.md` § The engine
- **Files to reference**: the review § 2 (the maintainer's ledger: which formats, how many lines) and § 3;
  `packages/format/src/ledger.ts` (the `LEDGER_FORMATS` comment: what each format changed), `ledger-shape.ts`
  (`eventProblems`, `modeRules`, `LINE_MODES`, `PERSON_TOO`, `STAMP`), `ledger-index.ts` (`contextProblems`,
  `indexEvent`), `ledger-line.ts` (`fromLine`), `view.ts` (`RENAMED_MODES`), `board-view.ts` (`viewNode`);
  `apps/board/server/ledger.ts` (`replaced`, `reopen`, `onReset`, `stamp`), `lock.ts` (`takeLock`, `holderMessage`),
  `atomic-file.ts` (`writeFileAtomic`), `ledger-move.ts`, `apps/board/bin/ledgers-undo.ts`; `packages/format/tests/perf-ledger.ts`;
  `apps/board/src/board/board-data.ts` (`canApply`, the page's guard); `docs/specification/plugin.md` open points 12
  and 14; D-017, D-041, D-059, D-060, D-075, D-085
- **Patterns to follow**: one module knows the old formats; `packages/format` stays pure (no `node:` import: the
  page loads `#format`); the runner sits beside `ledger-move.ts`, the command beside `ledgers-undo.ts`
- **Creates for later tasks** (TASK-STATUS.md § Shared Foundations): the chain and its step interface, the runner,
  the frozen fixtures
- **Skills**: `cortex-architecture`, `cortex-docs`

> Modify only the files this task owns. Need a change elsewhere? List it under `REQUESTS`.

---

## Steps

1. [ ] **Freeze the truth first** (R4), before any step of the chain exists and with today's code untouched: copy
       every fixture (`packages/format/fixtures/*.ledger.jsonl`) and `perfLedger`'s lines into
       `packages/format/fixtures/legacy/`, and write beside each what today's code folds it to: for every board, its
       view and its state, as JSON. Add one ledger of mixed formats shaped like the maintainer's (formats 7 to 19 in
       one file, about 250 lines, the mix in the review's § 2 table, built from fixture lines, no private data) and
       freeze its fold too. `packages/actions/tests/legacy-folds.test.ts` holds that today's code folds each frozen
       file to its frozen result. No task edits these files after this step; the test file's header says so. Once
       the old reader is gone nothing else can prove the new one agrees with it.
2. [ ] **The chain** (`packages/format/src/migrate/`, pure). The step interface, which T_01 extends with 19 to 20:
       ```ts
       /** One format that did more than add. `up` maps one parsed line to one line, or stops with its words. */
       export interface UpgradeStep {
         from: number | 'none';   // 'none': a line with no `v`
         to: number;
         up(line: Readonly<Record<string, unknown>>): Record<string, unknown> | UpgradeStop;
       }
       export interface UpgradeStop { stop: string }
       export const UPGRADE_STEPS: readonly UpgradeStep[];
       /** A line already current comes back untouched. */
       export function upgradeLine(line: Readonly<Record<string, unknown>>): Record<string, unknown> | UpgradeStop;
       /** Text in, text out: a current line, a line that is not JSON and a line that fails its shape today are kept
        *  byte for byte; an upgraded line keeps its key order with `v` replaced in place. */
       export function upgradeLines(lines: readonly string[]): {
         lines: string[]; changed: number; stops: { index: number; stop: string }[]; newer: number[];
       };
       ```
       The steps are the review's § 3 table without its last row: no `v` (read as 2 only if the line passes the
       format-2 shape; else stop, never guess); 2 (drop the free-text `agent`, V3: the board keeps no creator, as
       today); 3 to 10 (restamp); before 6, a container an agent named `later` (stop and report); 10 (delete
       `node.item`); 11 (`list` becomes `column` in `region.mode` and an act's `mode`); 12 to 18 (restamp). Names
       may differ if the code reads better; the shape (one line in, one line out, a stop with words) may not. A test
       fails when some format below `LEDGER_FORMAT` has no path to it, so a bump without its step fails.
3. [ ] **Unit tests**: one per step, a frozen old line in and the expected line out; over every frozen file and the
       mixed one: the same number of lines, the same `seq`, `at`, `by`, `type`, `n` and board ids on every line; a
       current line comes back byte for byte; running the chain twice gives the bytes of running it once.
4. [ ] **A newer format** (R3, H7): a line whose `v` is above `LEDGER_FORMAT` is reported as its own kind by
       `ledger-read.ts`, not as a shape problem, and makes `openLedger` open the ledger read-only with a reason
       from a words file ("This ledger was written by a newer Vision Board. It opens read-only; update the board to
       edit it.", or better words in the same sense). The reason travels the way the read-only reasons travel today
       (`editing.ts`; the reads' `readOnly`; `plugin.md` open point 12 names the person's reason): find that path
       and reuse it. Edit refuses on such a ledger with the same words; under a host every write answers
       `read-only`. If no existing path can carry a reason to the page, stop and report before building one.
5. [ ] **The runner** (`apps/board/server/ledger-migrate.ts`), as the review's § 3 "How it writes" steps 1 to 7:
       hold the lock (a live holder refuses in `holderMessage`'s words); read the file once; every line current:
       stop, write nothing, make no backup; a newer line: stop (step 4); upgrade; check before replacing (the same
       number of lines; the same `seq`, `at`, `by` and `type` on every line; the strict reader finds no problem that
       was not there before); write `ledger.jsonl.migrating` beside the ledger and `fsync` it; copy the original to
       `backups/ledger.f<lowest>-<highest>.<head seq>.<UTC time>.jsonl` and `fsync` it; rename the new file over
       the ledger; `fsync` the folder. A stale `.migrating` file is deleted by the next run. Readers following the
       file see a new inode and start again (`replaced`, `reopen`, `onReset`; D-085 point 6). `BACKUPS_DIR` goes in
       `data-folder.ts` (`PER_LEDGER_NAMES`, so `npm run verify` checks it) and in the `.gitignore` the code writes
       into a ledger folder.
6. [ ] **When it runs**: on open for writing, straight after the lock is taken and before `openLedger`, where
       `project.ts` moves the old layout today; on Edit of a ledger opened read-only, after Edit takes the lock.
       Under a host, `createEngine` runs it when it opens a `dir` it may write (`readOnly()` false), with no lock,
       on the rule `plugin.md` now states: a host opens one `dir` with one engine at a time (call 14). Never on a
       read-only open; never while another holder's lock is live.
7. [ ] **In memory for read-only** (D-085: a read-only open "writes nothing at all"): a ledger opened read-only,
       a read that names another ledger of the folder, and lines read from another writer pass through
       `upgradeLine` before the reader. `read_ledger` and the page get the upgraded lines; nothing is written.
8. [ ] **The command**: `npm run ledger:migrate -- <folder> [--check | --undo]` (`apps/board/bin/ledger-migrate.ts`).
       `--check` says what would change (lines per step), exits non-zero when anything would, and writes nothing.
       `--undo` puts the newest backup back only when no line was appended since (the head `seq` matches), else
       refuses and says why. Words in `apps/board/server/words/bin.ts`.
9. [ ] **Failure tests**: a crash after the temp file, after the backup and before the rename (inject the file
       calls): the original is whole and a second run finishes. A live lock refuses. A read-only open of an old
       ledger leaves the file's bytes and time unchanged and shows the same board as the migrated file. Every
       frozen file, migrated, folds with today's reader to its frozen result.
10. [ ] **Docs**: `api.md` gains a § Migration (the rule, the chain, when it runs, backups, the command, a newer
        format) and corrects points 5 and 11 (review C6, H14) to say what is true after this task: the format is
        19, older ledgers are migrated on open (D-103), a newer one opens read-only. `plugin.md` § The engine says
        the engine migrates on a writable open and states the single-opener rule.
11. [ ] Run the checks (PLAN.md § House Rules).

---

## Validation

- [ ] `npm run verify`, `npm run check`, `npm test`, `npm run gen -- --check` pass
- [ ] Your notes show the frozen files and folds were written before any step of the chain; `legacy-folds.test.ts`
      passes
- [ ] Every frozen file and the mixed ledger, migrated, fold to their frozen results; line count, `seq`, `at`, `by`,
      `type`, `n` and board ids are unchanged on every line
- [ ] A second run writes nothing and makes no second backup; a current ledger gets no write and no backup
- [ ] Each crash point leaves the original whole and a second run finishes; a live lock refuses
- [ ] A read-only open of an old ledger writes nothing and shows the same board; a newer line opens the ledger
      read-only with its words, and Edit refuses with them
- [ ] `npm run test:pages -- read-only.spec.ts read-only-writes.spec.ts ledgers.spec.ts ledger-folders.spec.ts`
      passes with no new baseline

---

## Constraints

- If you need to deviate, stop and tell the maintainer; no breaking change is made silently.
- No PII in examples. Interim files in `temp/`. Writes over 50 lines in chunks.
- No git command that changes state; the orchestrator commits.
- Never open the maintainer's `.visionboard/` or any real ledger; tests make their own folder under the OS temp
  folder. The mixed ledger is built from fixture lines.
- Never edit a file in `packages/format/fixtures/legacy/` after step 1.
- A problem outside this task is reported (`REQUESTS`, `NOTES`), never fixed here.

---

## Implementation Notes

_To be completed by agent after task completion._
_Re-run? Add a `### Run N` block below the last one; never overwrite an earlier run._

**Status**: Completed  
**Completed**: 2026-11-16 11:21  

### Run 1

### Changes Made
- **Truth frozen first (step 1, R4)**, at 11:08, before any file of `packages/format/src/migrate/` existed and with the
  reader untouched: `packages/format/fixtures/legacy/` holds the four fixtures (byte copies), `perfLedger()`'s lines
  (`perf`) and `mixed.ledger.jsonl` (251 lines, 4 boards, 58 cards, formats 7 to 19: 49/23/2/28/15/4/1/2/2/1/50/27/47,
  heavy where the maintainer's file is; built from fixture lines by a script in `temp/be02/freeze.ts`, no private
  data; it holds a `list` container at v10, `item` nodes at v7-10, every act family by its era). Beside each,
  `<name>.fold.json`: the reader's problems (none), the head, and per board `boardView` + `boardState` as JSON.
  `packages/actions/tests/legacy-folds.test.ts` (header: no task edits those files) proved today's code folds each to
  its result (11:09) before the chain was written; it now also holds the migrated file folds to the same result.
- **The chain** `packages/format/src/migrate/` (`index.ts` public: `UPGRADE_STEPS`, `upgradeLine`, `upgradeLines`,
  `isUpgradeStop`, `UpgradedLines`; `steps.ts`: `UpgradeStep`, `UpgradeStop`, `FORMAT_STEPS`, one step per format
  2 to 18; T_01 appends 19 to 20 to `FORMAT_STEPS`). Steps: no `v` (read as 2 only when, so read, it upgrades to a
  well-formed line; else stop), 2 (drop the free-text `agent`; a `join` keeps an agent id, else stop), 5 (`later`
  container: stop), 10 (delete `node.item`), 11 (`list` to `column` in `region.mode` and a `mode` act), the rest
  restamp. Old names are literals in `steps.ts`, not imports of `RENAMED_MODES`, so BE_03 can delete those.
  `upgradeLines` also returns `byFormat` (for `--check`); a line starting `{"v":19,` is kept without a parse.
  Exported from `packages/format/src/index.ts`.
- **A newer format** (R3, H7): `ledger-read.ts` `readLine` returns `newer` (its own kind, not a problem), `ReadLedger`
  gains `newer: number[]`; `validateLedger` still names such a line (`lineNewer`). Server `ledger.ts`: `Ledger.newer()`,
  `readOnly()` true while newer (at open, after a reopen, or when another writer appends one), writes refused
  `read-only` in `readOnlyWords` (`newerLedgerPerson` / `newerLedgerAgent`). The reason reuses the existing paths:
  the reads' `readOnly`, the `read-only` problem's detail, and Edit's refusal (`conflict`, shown by the page's
  `toggleEditing` toast in the server's words): no page change. `editing.ts` `createEditing(..., newer)`: read-only and
  nobody editing; `project.ts` `hold` lets the lock go on a newer ledger, `edit` refuses it.
- **The runner** `apps/board/server/ledger-migrate.ts`: `migrateHeld` (review § 3 steps 2-7: read once; current =
  no write, no backup; newer/stop = no write; `checkSame`: count, `seq`/`at`/`by`/`type`/`n`/`board` per line, no new
  reader problem; `.migrating` written and fsynced with the file's mode; backup
  `backups/ledger.f<lo>-<hi>.<head>.<YYYYMMDDTHHMMSSZ>.jsonl` fsynced, `backups/` git-ignored via `ignoreInGit`; a file
  changed meanwhile is not replaced; rename; folder fsynced), `migrateLedger` (takes the lock: `holdLock`,
  `holderMessage`), `migrateOnOpen` (on open: words to the log), `planMigration` (`--check`), `undoMigration`.
  `BACKUPS_DIR` in `data-folder.ts` (`DATA_FOLDER_NAMES`, `PER_LEDGER_NAMES`, `LedgerFiles.backups`), so the layout
  move carries it into `main/`.
- **When it runs**: `project.ts` `ledgerOf` (straight after the lock, before `openLedger`); the first ledger (opened by
  `server.ts` under its lock) is migrated in `openProject` and read again (`refresh`, new inode); Edit migrates after
  it takes the lock (`migrated`). `engine.ts` `createEngine` migrates a `dir` it opens itself when `readOnly()` is
  false, no lock. Never on a read-only open.
- **In memory** (step 7): `ledger.ts` `readHeld` and `takeLine` pass every line through `upgradeLines`: a read-only
  ledger, another ledger a read names (`otherLedgers` uses `openLedger`) and another writer's lines.
- **Command** `apps/board/bin/ledger-migrate.ts`, `npm run ledger:migrate -- <folder> [--check | --undo]` (a project
  folder = each ledger, via `ledgerFoldersIn`; or a ledger folder). Words in `server/words/bin.ts`.
- **Tests** (new): `packages/format/tests/migrate.test.ts` (19: per step, paths for every format, the frozen-file
  invariants and idempotence, the reader's newer kind), `apps/board/tests/ledger-migrate.test.ts` (10: line for line +
  backup + gitignore, no-op twice and on a current ledger, crash at temp/backup/rename, an append mid-run, live lock,
  newer and stop, `--check`, `--undo`), `apps/board/tests/ledger-migrate-open.test.ts` (8: read-only in memory with
  bytes and time unchanged and the migrated file's events, another writer's old lines, newer at open and appended,
  engine writable/read-only/newer, through the server: read-only open writes nothing, Edit migrates, newer refuses Edit).
- **Docs**: `api.md` points 5 and 11 corrected (format 19, migrated on open, newer read-only), new § Migration (176-181);
  `plugin.md` § The engine (migrates on a writable open; one engine per `dir`), open point 14 points to it.
- **Words**: `format-ledger.ts` (`lineNewer`, `noFormatNotFormat2`, `laterBeforeFormat6`, `joinNotAnAgentId`),
  `server-folders.ts` (newer reasons, migration log lines, undo refusals, `stoppedLine`), `bin.ts` (the command).

### Issues & Resolutions
- **Checks**: `npm run verify` fails only on `modules.md` (orchestrator's `npm run map`). `npm test` (2503) fails only
  `access-layout.test.ts` "every file the paths module names has a verdict" and `data-folder.test.ts` "ledgerFiles:
  every file", and `npm run check` only on the former's type: both are existing tests that hold the exact list of a
  ledger folder's files, which `BACKUPS_DIR` in `PER_LEDGER_NAMES` (the brief) must grow. Exact edits in REQUESTS;
  patched copies in `temp/be02/req/` pass (17/17). `npm run test:timing` 14/14 (server start under the in-memory
  upgrade). `npm run gen -- --check` current. Page specs `read-only`, `read-only-writes`, `ledgers`, `ledger-folders`:
  37 passed, no new baseline (VB_TEST_PORT=6150).
- The worktree had no built page (`apps/board/dist`), so `api-ledgers.test.ts` failed on a missing cookie before any
  change of mine; `npm run build` fixed it.
- A test stand-in ledger (`api-errors.test.ts`) has no `newer`: `project.ts` calls `ledger.newer?.()`.
- **A call the brief left open**: a line the chain stops on (only the no-`v`, format-2 `join` and pre-6 `later`
  cases; no known ledger has one) stops the whole migration, writes nothing and is logged with its line and words; the
  ledger then opens as before (writable when asked), read through the in-memory upgrade. The command exits 1 and
  says the same. The alternative, opening read-only, would lock the person out of a ledger today's code reads fine.

### Caught Beyond the Brief
- **The no-`v` step changes a fold**: today such a line is a skipped problem; upgraded to a v19 line it is read, so
  the board can change. It is the review's design and the runner's check allows it (fewer problems), but it is the
  one step that is not fold-preserving; the maintainer may prefer "always stop".
- **Format-2 `grant-request` lines**, if any existed, would lose their requester with the dropped `agent`, so a later
  grant makes no holder; today it makes the free-text name a holder nobody can call as. No fixture or real ledger has
  one (the review: lowest real format 7).
- **T_01 renames `BoardState.flags`** (Bookmark): `legacy-folds.test.ts` must then map the frozen result's key in the
  test, never edit the frozen file; its header says so.
- **The page's paused controls** on a newer ledger still say "Read-only: switch to Editing" (`READ_ONLY_PERSON`); the
  newer reason reaches the person when they press Edit (the toast). Open point 12 (`readOnly` answering a reason)
  would close that gap.
- **`server.ts` opens the first ledger before the project migrates it**, so a writable start reads an old ledger
  twice. Moving `migrateOnOpen` into `server.ts` before `openLedger` would read it once (not mine to change).
- **Backups are never pruned**; each migration of a ledger with old lines adds one (a full copy). Fine at today's
  sizes; a retention rule belongs with the review's later rows.
- `ledger.ts` is now 332 lines and `project.ts` 316 (verify warns, under 500).

### Deviations from Plan
- None.

---

## On Completion

1. Fill in Implementation Notes above; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append **your own** LOG entry to `cortex/LOG.md` — one line, terminated with a newline, append-only:

   ```
   [[YYYY-MM-DD HH:MM]] [board-format] BE_02: [what you did] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/BE_02_ledger-migration.md]]
   ```

   Cite files by path + symbol, never by line number. Never write the set's entry or to `AUDITED.md`.
