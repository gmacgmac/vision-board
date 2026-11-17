---
type: research
category: board-format
status: completed
completed: 2026-11-16
persona: Principal data architect for event-sourced systems
feeds: cortex-tasks/board/2026-11-16_board-ui_node-overhaul/T_01_contract-first.md
skills: [cortex-research, cortex-architecture]
---

# Ledger review, before the node overhaul changes the contract

Research only: no code, schema or document was changed. Read from the worktree
`.claude/worktrees/app-window` (branch `spike/stage-apps`, commit 430fc4f).

How to read it: every claim about code names its file and symbol. `[INFERENCE]` marks a conclusion
drawn from the sources and not read in them. "Not established" means the sources do not say.
Finding ids (H, S, V, O, C) are this file's own; the ranked list at the end uses R ids.

Updated 2026-11-16 with two additions from the maintainer, relayed by the orchestrating session: a
project-wide icon library (O4, rewritten) and a tone that is a palette name or a hue (O3). They
changed O3, O4, C3 and rows R2, R9, R10, and added R26 to R28.

---

## Summary

- **The shape is sound.** One event per line, a server-stamped envelope, a gap-free `seq`, identities
  never reused, retry keys, unknown fields refused, a pure fold kept current line by line. Nothing in
  the format has to be redesigned for the overhaul.
- **Three things are wrong enough to fix now**: (1) an older build does not stop at a newer format, it
  skips the lines and stays writable (H7); (2) old formats are read through about ten version branches
  spread over the schema, the shape rules, the index and the fold, and T_01 would add another (H6, V1);
  (3) the plan and the D-099 draft promise "`flag` lines still read", which is the opposite of what the
  maintainer now wants, and a decision entry can't be edited after it is appended (C1).
- **Scale**: the real ledgers are tiny (221 and 25 lines). The format carries the vision; three read
  paths do not, and they break long before the file does: the page opening a board (the whole project
  ledger, 500 lines per call, tracker N15), `read_ledger` (scans every event on every call) and
  `check_responses` (walks every act of every board). None needs a format change. Snapshots and
  segments are later work, and compaction is the wrong tool for this record (S6).
- **Migration**: recommended as a pure, line-for-line upgrade chain kept in one module, used two ways:
  written back by a migration that runs under the lock with a backup, and applied in memory when a
  ledger is opened read-only. The reader, the schema, the index and the fold then know one format. The
  rule that makes it safe: a migration never adds, removes or reorders a line and never changes `seq`
  or a card's identity (V2).
- **The overhaul's records**: Bookmark by migration, not by reading both. Skin as planned, with one
  fold trap. Icons as files in a project library, added only through the action layer, with one short
  ledger line per name holding the file's hash; a node stores the name only. A tone as a palette name
  or a whole-number hue, with the board owning lightness and strength. Flow direction on the
  container, in the ledger. Ask now as its own act that lists the lines it carried and says what
  context the agent was given, so the open question stays open without another format change
  (O1 to O7).
- **Four of the plan's calls no longer match what the maintainer has said since** (Ask now, an
  agent's own icons, flow direction, a free hue as tone). They have to be settled before T_01
  freezes format 20, and the D-100 draft reworded before it is appended (C3).

---

## 1. Health

### What is sound

- **H1 The envelope is the server's.** Every line carries `v`, `seq`, `at`, `by`, and `agent` for an
  agent (`packages/format/src/ledger.ts` `Base`). The server stamps them and drops them from any
  request body (`apps/board/server/ledger.ts` `STAMPED`, `stamp`), so a caller cannot claim them.
- **H2 Order and identity are checked, not assumed.** `seq` must be the last one plus one
  (`packages/format/src/ledger-index.ts` `contextProblems`: `formatLedgerWords.seqExpected`). A card's
  identity is above every one given before (`LedgerIndex.maxId`, `nodeContext`), a version is the
  previous plus one, a retired card takes no further line. A board number is worked out on read from
  the order drawn (`LedgerIndex.cards`, `boardNumber`), never stored.
- **H3 Strict by default.** An unknown field is a problem (`packages/format/src/ledger-shape.ts`
  `fieldProblems`); a write is checked against the JSON Schema and the hand rules
  (`apps/board/server/ledger.ts` `check`: `ledgerLineProblems`, then `eventProblems`); a test holds the
  two to the same verdict (header of `ledger-shape.ts`).
- **H4 The fold is pure and incremental.** `packages/actions/src/fold.ts` `applyEvent` applies one
  line; the server folds once on open and then per append (`apps/board/server/ledger.ts` `readHeld`,
  `add`). No server path folds the whole ledger per request.
- **H5 Useful denormalising in the right place.** A `retire` line stores the cards it took
  (`RetireEvent.cards`, "so a reader needs no other fold"); an agent's retry key is on the line
  (`Keyed.key`, `LedgerState.keys`), so a replay survives a restart.

### What is fragile or wrong

- **H6 Old formats are read by scattered version branches.** The reader accepts eighteen formats
  (`LEDGER_FORMATS`, 2 to 19). What "older" means is spread over:
  - `ledger-shape.ts` `eventProblems`: `e.v === 2` (an agent is any name), the `PERSON_TOO` test by
    version, `(e.v as number) >= 11` (`item` refused); `modeRules`: `(e.v as number) < 12`;
    `LINE_MODES` (old mode names accepted).
  - `ledger-index.ts` `contextProblems`: `e.v >= 6` (the built-in Later); `indexEvent`: `e.v !== 2`
    (a v2 line makes no creator).
  - `ledger-line.ts` `fromLine`: `RENAMED_MODES` (`list` read as `column`) on every read.
  - `ledger.ts` `NodeBody.item` ("every reader ignores it"); `board-view.ts` `viewNode` strips it.
  - The schemas: `common.schema.json` lists every `v`; `act`, `board`, `node`, `region` and `retire`
    carry `if`/`then` on lists of version numbers; every ledger `$id` embeds the number
    (`ledger-event.schema.json`: `.../schema/ledger/19/...`), so a bump rewrites every `$id`.
  Each branch is small. Together they mean no one can say what format 19 is without reading all of
  them, and T_01 step 4 adds one more ("`flag` and `unflag` stay valid to read and fold exactly as
  before").
- **H7 A newer format is not refused; it is skipped.** `STAMP.v` is `oneOf(LEDGER_FORMATS)`
  (`ledger-shape.ts`). A line with a higher `v` is a shape problem, so `readLine`
  (`packages/format/src/ledger-read.ts`) reports it and moves on, and `openLedger` keeps the ledger
  writable. An older build opening a newer ledger therefore shows a board with lines missing, or
  empty, and can append after them. The page has a guard (`apps/board/src/board/board-data.ts`
  `canApply`), the server has none. Once a migration rewrites a whole file to one format this turns
  from "a few new lines hidden" into "every line hidden" for any build older than the file.
- **H8 `act` is one type doing twenty-nine jobs.** `ActEvent` has 19 optional fields and its meaning
  depends on which are present (`n`, or `nodes`, or `board` + `region`). The rules are sets and
  branches across `ledger-shape.ts` (`ON_VERSION`, `ON_NODE`, `ON_NOTE`, `NO_NODE`, `ON_GROUP`,
  `GROUP_NOTE`, `actRules`, `nodeRules`, `containerRules`), `ledger.ts` (`CARD_MARKS`, `BOARD_MARKS`,
  `APP_ACTIONS`, `CONTAINER_ACTIONS`) and the schema's `if`/`then`. The stored lines are fine; the
  cost is in the code, and the overhaul adds three to six more actions. A table with one row per
  action (required fields, allowed fields, target) would make a new act one row. Code only, no format
  change.
- **H9 `n` means two things.** In the file `n` is a card's identity; in the API `n` is its board
  number; `ledger-line.ts` `fromLine`/`toLine` rename `n` to `id` and back, for the event types in
  `CARD_EVENTS` only. `nodes`, `cards`, `from`, `to` and `center` also hold identities and are not
  renamed. It works and tests hold it, and D-041 records it ("`id` in code, `n` in the file (unchanged
  on every line)"). It is the easiest place in the format to make a mistake. Not worth a change on its
  own (R24).
- **H10 "Never sent to an agent" is true of the API only.** `read_ledger` is closed to agents
  (`packages/format/schema/openapi.json`: `x-agent: false`) and every agent read leaves private acts
  out (`ledger.ts` `PRIVATE_ACTIONS`, `isPrivateAct`). But the agent's path rules allow reading the
  file (`packages/agent/src/access-rules.ts`: `**/.visionboard/*/ledger.jsonl`, `read: 'allow'`), and
  under a host D-077 accepts that "the bot can reach the ledger there". Harmless for a bookmark. It
  means nothing that must stay private should go in the ledger on that promise.
- **H11 A second writer loses a line without an error.** `append` reads other writers' lines, stamps
  `seq`, then appends (`apps/board/server/ledger.ts` `append`: `checkWritable`, `stamp`,
  `fs.appendFileSync`); the three steps are not atomic across processes. Two writers can stamp the
  same `seq`; every later read then drops the second line as `seqExpected` `[INFERENCE]`. The guard is
  the lock file (`apps/board/server/lock.ts` `takeLock`: a heartbeat, not an operating-system lock),
  and under a host there is none (`docs/specification/plugin.md` open point 14: "the engine takes
  none").
- **H12 No flush to disk.** `append` uses `fs.appendFileSync` with no `fsync`; `writeFileAtomic`
  (`apps/board/server/atomic-file.ts`) renames without one. A line the page was told is stored can be
  lost if the computer loses power. A torn last line is handled (`Held.torn`). Acceptable for a local
  tool, but it is a choice nobody has written down, and D-075 ("a duplicate, never a loss") leans on
  it.
- **H13 A bad line is skipped with a console warning.** `readHeld` passes problems to `warn` and keeps
  them on `Ledger.problems`. A skipped line changes the fold. Whether the board shows the person that
  lines were skipped: not established.
- **H14 Stale spec.** `docs/specification/api.md` points 5 and 11 still say "`LEDGER_FORMAT` is 4";
  the code is at 19.

---

## 2. Scale

### What is there today (measured 2026-11-16, counts only, no content read out)

| Ledger | Bytes | Lines | Formats present | Boards | Cards | `flag` / `unflag` lines |
|---|---|---|---|---|---|---|
| `.visionboard/main/ledger.jsonl` | 52,259 | 221 | 7, 8, 10, 11, 17, 18, 19 | 4 | 58 | 0 / 0 |
| `.visionboard/vision-board-upgrade/ledger.jsonl` | 9,201 | 25 | 19 | 1 | 15 | 0 / 0 |

- `main` spans 2026-10-06 to 2026-11-05: 221 lines in 30 days, about 7 lines a day
  (221 / 30 = 7.4). The average line is 236 bytes (52,259 / 221). `node` lines are 26% of the lines
  and 52% of the bytes (58 lines, 26,953 bytes, 465 bytes each).
- The only size budget is server start: under 1 s on 100,000 events, measured at about 330 ms
  (`docs/specification/performance.md` § Budgets; `apps/board/tests/server-start.timing.ts`).
- At today's rate 100,000 lines is 37 years away (100,000 / 7.4 / 365). Nothing is urgent for the
  maintainer's own boards. The pressure comes from where the project is going: "Every chat and every
  agent writes into the same project ledger" (`docs/vision.md` § Many chats, one board). Ten agents
  writing 200 lines a day each reach 100,000 lines in 50 days (100,000 / 2,000) and a file of about
  24 MB (100,000 × 236 bytes) `[INFERENCE: the rates are an assumption, the arithmetic is shown]`.

### Where it breaks, in the order it will happen

- **S1 Opening a board in the page.** The page reads the raw ledger of the whole project, every
  board's lines, 500 a call, and folds it itself (`apps/board/src/board/live.ts` `load`;
  `apps/board/src/board/io.ts` `PAGE`). At 100,000 lines that is 200 calls (100,000 / 500), which
  tracker N15 already records. It is also the wrong shape for a hosted board: the page downloads
  boards it is not showing.
- **S2 `read_ledger` scans everything on every call.** `apps/board/server/engine/reads.ts`
  `readLedger` runs `ledger.events().filter(...).map(toLine)` over the whole array and only then cuts
  the page. With S1 that is 200 calls × 100,000 events = 20,000,000 event visits to open one board.
  Events are in `seq` order, so a binary search to the cursor and a slice removes the cost.
- **S3 `check_responses` walks every act of every board.** `packages/actions/src/pending.ts`
  `responsesAfter` loops `s.acts` (every person act in the project, kept for ever in
  `LedgerState.acts`) and calls `latestMarks`, which loops every card's log. It runs before the wait,
  on each wake and for the answer. With many agents each holding a wait, one append costs
  agents × acts `[INFERENCE]`.
- **S4 Memory.** The server keeps every event (`apps/board/server/ledger.ts` `Held.events`) and a
  state that itself keeps every version of every card (`packages/format/src/board-view.ts`
  `LedgerNode.versions`), every person act (`LedgerState.acts`) and every retry key
  (`LedgerState.keys`). Memory grows with the file, about two to three times its size `[INFERENCE]`.
  `performance.md` approach 6 says "The board holds the current state of each node"; the state holds
  the history too.
- **S5 Start, and every replace.** Start is linear in the file. `reopen` reads and folds the whole
  file again whenever it was replaced: a git pull, a sync, and in future a migration
  (`apps/board/server/ledger.ts` `replaced`, `reopen`). The 330 ms figure is flattering: the timing
  ledger is the 1,000-card fixture plus about 98,000 short person lines written as `v: 2`
  (`server-start.timing.ts` `bigLedger`), with almost no `node` lines, which are the heavy ones in
  real use `[INFERENCE on the effect]`.
- **S6 One file that only grows, in a synced folder.** The lock's own header says the folder may be
  shared through Dropbox (`apps/board/server/lock.ts`). Every append changes the one file. How
  Dropbox or git behave with a 24 MB file that changes many times a minute, and what happens to a
  "conflicted copy" of the ledger: not established.
- **S7 Under a host.** nclite gets "one engine and one `dir` per bot" (`plugin.md` § Where the board
  lives in nclite). That splits the data well: many small ledgers, not one large one. The cost moves
  to the count of engines, each holding its whole ledger in memory `[INFERENCE]`, and to the missing
  lock (H11).

### What fixes it, in the order worth doing

1. **Slice `read_ledger` by `seq`** (S2). An hour's work, no contract change.
2. **Open a board from a server-folded snapshot plus the lines after it** (S1, tracker N15). The
   server already folds one board for agents (`reads.ts` `getBoard`, `boardData`). No format change.
3. **Index acts by board and start from the cursor** (S3). No format change.
4. **Split the state into current and history, then checkpoint the current part** (S4, S5,
   `performance.md` approach 7). A checkpoint of today's `LedgerState` would be as large as the
   ledger, because the state is the history. The split comes first. A checkpoint is derived, sits
   beside the ledger, is git-ignored and can always be thrown away; it must carry the format number
   and a fold version, so a migration or a fold change discards it.
5. **Sealed segments** (S6). The writer, under the lock, renames a full `ledger.jsonl` to
   `segments/ledger.<first seq>-<last seq>.jsonl`, writes the checkpoint for that `seq`, and starts
   a new active file at the next `seq`. Sealed files never change, so a sync moves them once. `seq`
   runs on across segments. History (a card's versions, a board at an older `seq`) opens sealed
   segments on demand. This keeps D-017 whole: nothing is removed.
6. **Not compaction.** Dropping superseded lines (old `seen`, old `pin`) breaks three things on
   record: "append-only" (D-017), "No feature may remove card lines from the ledger" (D-041), and a
   board version being "a position in this file" (`ledger.ts` header). The better lever is to write
   less: the page already sends a `seen` line only when one is due (`seenDue`, used in
   `apps/board/src/board/cards/update-flow.ts`), and the container seen that T_01 adds must do the
   same (O7).
7. **Not one file per board.** `seq`, card identities, agents and keys are per ledger (D-084: "Keys,
   card identities, board numbers and agents are per ledger"), and `seq` is how lines point at each
   other (V2). D-084 already gives the lever for "many boards": several ledgers per project.

### Streamed board updates (tracker M51)

- A streamed update must not be ledger lines. A `node` line carries the whole body (up to 8,000
  characters, `ledger-shape.ts` `LIMITS.body`); fifty partial lines per rewrite would spend the size
  budget fifty times faster and leave fifty versions nobody asked for `[INFERENCE]`.
- The stream today says only that something changed (`apps/board/server/streams.ts`: `change` carries
  the head `seq`, and the page then reads the ledger). Streaming text needs its own short-lived
  message on that stream, beside `sse-editing` and `sse-chat` (`packages/format/schema/api/`), keyed
  by board and card. The ledger gets one ordinary `node` line when the agent finishes. If the agent
  dies mid-way the draft goes and the card is as it was.
- So M51 asks nothing of format 20. "Changes underlined and struck" (DD-17) can be worked out from
  two versions the ledger already keeps.

---

## 3. Versioning and migration

### Today

- **V1** New lines are stamped `v: LEDGER_FORMAT` (`apps/board/server/ledger.ts` `stamp`). Old lines
  are read in place; the rule on record is "Readers accept every `v` they know ... each format only
  adds, so older lines stay valid" (`api.md` point 11). Four formats did more than add (3 changed
  what `agent` holds, 6 reserved the container id `later`, 11 removed `item`, 12 renamed `list`), and
  each left a branch behind (H6). No migration, backup, snapshot or
  compaction code exists; the nearest thing is the move of an old-layout folder into `main/`, by
  rename only, under the lock, with an undo script (`apps/board/server/ledger-move.ts`;
  `package.json` `ledgers:undo`). No decision covers rewriting lines.
- The maintainer's live ledger mixes seven formats in one file (table in § 2).

### The rule that makes a migration safe

- **V2 A migration is a pure map from one line to one line.** It never adds, removes or reorders a
  line, and never changes `seq`, `at`, `by`, a card's identity or a board id. Reasons, all in code:
  - lines point at each other by `seq`: a note change names its note (`ActEvent.note`), an answer its
    proposal (`proposal`) or request (`request`), a reply its act (`ReplyEvent.to`), a Send and a seen
    the line they reach (`head`);
  - an agent holds a `head` between calls (`api.md` point 43: "the caller passes the `head` it last
    saw"), and a board version shown to the person is a `seq` (`fold.ts` `BoardRun`);
  - D-041: "No feature may remove card lines from the ledger, or board numbers would shift".
  A map of that kind can be run on a stream, checked line against line, and run twice with the same
  result.

### Recommended design

**One module knows the old formats; nothing else does.**

- `packages/format/src/migrate/` (new): `upgradeLine(line)` returns the line in the current format,
  built from a chain of small steps, one per format that did more than add. Pure, no `node:` import
  (the page loads `#format`; `data-folder.ts` header, D-059, D-060). A line already current comes
  back untouched.
- The reader, the schema, the shape rules, the index and the fold then accept exactly one format:
  `v` equal to `LEDGER_FORMAT`. `LEDGER_FORMATS`, `RENAMED_MODES`, `PERSON_TOO`'s version numbers,
  `NodeBody.item` and every `v` condition in the schemas go.
- The chain is used two ways:
  1. **Written back** by the migration, when the opener may write.
  2. **Applied in memory** when a ledger is opened read-only. D-085 says a read-only open "writes
     nothing at all", and its purpose (watching a board that arrived by Dropbox, git or a sent file)
     must still work for a file nobody has migrated. This is one function in front of the reader,
     not a legacy reader: the code that validates and folds still knows one format. The alternative,
     refusing to open an old file read-only until someone migrates it, is simpler and worse for the
     person.

**The steps the chain needs** (from the `LEDGER_FORMATS` comment and the branches in H6):

| From | What the step does | Today's code it replaces |
|---|---|---|
| no `v` | Read as format 2 if the line passes the format-2 shape; if not, stop and report. Never guess. What a line older than 2 looked like: not established | `STAMP` refuses it |
| 2 | Drop the free-text `agent` name (see V3) | `eventProblems` `e.v === 2`; `indexEvent` `e.v !== 2` |
| 3 to 10 | Restamp only | none |
| before 6 | A container an agent named `later`: stop and report; it cannot be fixed one line at a time | `contextProblems` `e.v >= 6` |
| 10 | Delete `node.item` | `NodeBody.item`, `viewNode`, the `>= 11` rule |
| 11 | `list` becomes `column`, in `region.mode` and an act's `mode` | `fromLine`, `RENAMED_MODES`, `modeRules`, `LINE_MODES` |
| 12 to 18 | Restamp only (the person's `board` and `retire` lines need no version test once every line is current) | `PERSON_TOO` |
| 19 | `flag` becomes `bookmark`, `unflag` becomes `unbookmark` (O1) | what T_01 step 4 would add |

- **V3 The one step with a real choice is format 2.** A format-2 line names its agent by any text and
  makes no creator or holder (`indexEvent`; `packages/actions/src/grants.ts` `holders`: "board written
  by a v2 line has none"). Current lines need an agent id (`AGENT_ID_PATTERN`) and do make a creator.
  A `join` line cannot be added (V2). Dropping `agent` from those lines keeps access exactly as it is
  (still no creator) and loses only the name shown on old versions. Mapping the name to a made-up id
  would give those boards a creator nobody holds the secret for. Recommended: drop. No real ledger
  has a format-2 line (lowest is 7); all four fixtures and `perfLedger` do
  (`packages/format/fixtures/*.ledger.jsonl`, `packages/format/tests/perf-ledger.ts`: `v: 2`,
  `agent: 'kiro'`), so the cost is in tests that read that name.
- The `send` line's `head` stays optional. "Left out" is live behaviour, not history: a Send no chat
  carried still writes none (`api.md` point 169; `fold.ts` `applyAct` `e.head ?? e.seq`).

**When it runs**

- **On open for writing, automatically, straight after the lock is taken and before `openLedger`.**
  This is where the layout move already runs (`apps/board/server/project.ts`: Edit takes the lock and
  moves the old layout first).
- **A command**, `npm run ledger:migrate -- <folder>`, beside `ledgers:undo` in `apps/board/bin/`,
  with `--check` (say what would change, exit non-zero, write nothing) and `--undo`.
- **Under a host** the engine migrates when it opens a `dir` it may write (`createEngine`,
  `readOnly()` false). The host is the only writer by contract; the engine takes no lock (H11), so
  this needs plugin open point 14 settled, or a plain statement in `plugin.md` that a host never
  opens one `dir` twice.
- **Never** on a read-only open, and never while another holder's lock is live.

**How it writes** (runner: `apps/board/server/ledger-migrate.ts`, beside `ledger-move.ts`)

1. Hold the lock (`takeLock`); a live holder refuses, in `holderMessage`'s words.
2. Read the file once. Every line already current: stop, write nothing, make no backup. This is what
   makes a second run a no-op.
3. Any line with `v` above `LEDGER_FORMAT`: stop. "This ledger was written by a newer Vision Board."
4. Upgrade each line. A line that is not JSON or fails its shape today is kept byte for byte: the
   migration fixes formats, it does not drop or repair data.
5. Check before anything is replaced: the same number of lines; the same `seq`, `at`, `by` and `type`
   on every line; the strict reader finds no problem that was not there before.
6. Write `ledger.jsonl.migrating` beside the ledger and `fsync` it. Copy the original to
   `backups/ledger.f<lowest>-<highest>.<head seq>.<UTC time>.jsonl` and `fsync` it. Rename the new
   file over the ledger (atomic on one filesystem), then `fsync` the folder. `writeFileAtomic` does
   not flush today (H12); the runner should.
7. Anyone following the file sees a new inode and reads it again; pages get `reset`
   (`apps/board/server/ledger.ts` `replaced`, `reopen`, `onReset`). That path exists (D-085 point 6).
- A crash before the rename leaves the original untouched and a stale `.migrating` file the next run
  deletes. A crash after it leaves a complete new ledger and its backup.
- `--undo` puts the newest backup back only if no line was appended since (the head `seq` matches).
- The backup folder's name goes in `packages/format/src/data-folder.ts` (`PER_LEDGER_NAMES`,
  `DATA_FOLDER_NAMES`; `npm run verify` checks them) and in the ledger folder's `.gitignore`.

**Tests**

- **Capture the truth first.** Before any old-format branch is removed, freeze copies of today's
  fixtures under `packages/format/fixtures/legacy/` and, with today's code, write what each folds to
  (each board's view and state) beside them. Afterwards the test is: migrate the frozen file, fold it
  with the strict reader, get the frozen result. Once the old reader is gone nothing else can prove
  the new one agrees with it, so this has to be the first step.
- One test per step: a frozen old line in, the expected line out.
- Run twice, same bytes. A current ledger: no write, no backup.
- The invariants of step 5, over every fixture and a ledger of mixed formats shaped like the
  maintainer's (formats 7 to 19), built from fixtures, with no private data.
- Failure at each point of step 6 (after the temp file, after the backup, before the rename): the
  original is whole and a second run finishes.
- A live lock refuses. A read-only open of an old ledger writes nothing and shows the same board.
- A line one format ahead: the ledger opens read-only with the words for it (H7).
- T_01's format test becomes `schema-v20.test.ts` with "an old ledger migrates to the same board" in
  place of "old ledgers read unchanged".

**How long the chain lives.** It costs a few dozen lines, so keep it while it is cheap. When the
maintainer decides no ledger below some format is left, the steps below it are deleted and such a
ledger is told to migrate with an older release first. The only ledgers known today are his.

**What it needs on record.** A new decision entry: the ledger is migrated to the current format, and
readers know one format. It replaces `api.md` point 11's "Readers accept every `v` they know" and the
property D-075 point 3 states as "Old ledgers fold unchanged", and it names migration as the one
sanctioned rewrite of an append-only file (D-017). Tracker N14 already notes that an exception to
append-only "needs a decision entry first".

---

## 4. The overhaul's ledger changes

Records below are shown as the file would hold them, envelope left out. Names are proposals.

### O1 Bookmark: migrate, do not read both

- Today: acts `flag` and `unflag` (`ledger.ts` `CARD_MARKS`; fold `packages/actions/src/card-flags.ts`
  `foldFlag`, `flagsOn`; state `LedgerState.flags`).
- Recommended: format 20 has `bookmark` and `unbookmark` only. The chain's last step renames the old
  acts (§ 3). `ACTION_IDS` loses `flag` and `unflag`; `flagsOn` is not kept as an alias.
- Neither real ledger holds a `flag` or `unflag` line (§ 2), so no data is at risk either way. The
  choice is about code and about one sentence in a decision (C1).
- T_01 step 4 says the page keeps writing `flag` until FE_02. If that stays, the alias belongs at the
  API's edge (the request is turned into `bookmark` before it is stamped, where board numbers are
  already turned into identities, `apps/board/server/edge.ts`), never in the stored format.
  Switching the page's sender in T_01 is cleaner `[INFERENCE: a small change in
  apps/board/src/board/cards/flag-flow.ts]`.

### O2 A board's skin

- T_01 step 3 is right: `skin` on the `board` line, set by whoever writes it, and a person act
  `skin` naming the board. It is the same class as `mode` and `widths`: a choice about the picture,
  not an answer.
- **A fold trap.** `packages/format/src/board-view.ts` `applyDrawn` builds a fresh board from every
  `board` line (`id`, `title`, `summary`, with `regions` and `cards` carried over). The person's
  rename is a second `board` line with no `skin`. Unless the skin is carried over like `regions`, or
  kept in its own map that only a line naming a skin sets, a rename resets it. T_01 says "the latest
  of either"; the test it needs is "a rename keeps the skin".
- An agent can set it once only: its second `board` line is refused (`contextProblems`,
  `boardAlreadyExists`). That matches DD-18 ("set by whoever makes the board").
- Not a private act: agents read the skin (`get_board`, `list_boards`, T_01 step 3). It must not
  count as an answer or light Send (`packages/actions/src/unsent.ts` `foldUnsent` adds only answers).
  A test should say so.

### O3 A node's icon and tone

**Icon**

- `icon` on `NodeBody`: optional, a name. Added, no data change. A node line carries its whole body
  per version, so it travels with each version.
- Two kinds of name, told apart by the name alone: a built-in (`ICON_NAMES`, T_01 step 2) or one from
  the project's library, which always starts `x-` (O4).

**Tone: a palette name or a hue** (maintainer, 2026-11-16, relayed by the orchestrating session)

- Record it as one field with two spellings:
  ```
  "tone": "teal"      a palette name, one of TONES
  "tone": 210         a hue: a whole number of degrees, 0 to 359
  ```
- **Store the hue and nothing else.** No hex, no lightness, no strength. The agent picks where on the
  colour wheel; the board owns how light and how strong each tint is, per theme and per skin. That
  split is what lets contrast pass by construction, and it keeps a full colour from being slipped in
  through the field.
- **Name the colour space in the contract**, or 210 means different colours to different readers.
  Recommended: the OKLCH hue angle. At one lightness OKLCH colours look equally light whatever the
  hue; HSL's do not (a yellow and a blue at the same HSL lightness differ widely), so only the first
  lets one lightness per tint pass for every hue `[INFERENCE from colour science, not from the
  project's sources]`. Browser support for `oklch()`: not established in the sources; the page tests
  run Chromium (`performance.md`), and nclite's webview needs checking.
- 0 to 359, whole numbers; 360 and fractions refused, so each colour has one spelling.
- A name stays a name in the file. It follows the skin's palette, which can be retuned in the tokens
  without touching a ledger; a number is exact. Renaming a palette name later is one step in the
  chain (§ 3).
- How the board draws it (for T_02, not a record matter): the node sets one custom property from the
  checked number (never from text), and the tints are built in `packages/tokens/src/tokens.css` from
  lightness and strength tokens per theme and skin plus that hue. Channels given as variables pass
  the style check (`scripts/verify-style.mjs` `FUNC` refuses only literal channels). A palette name
  can be the same thing with a fixed hue, so there is one derivation.
- The proof it works: a contrast test that sweeps all 360 hues, light and dark, each skin, each
  tinted surface against the text on it, at the project's tiers (APCA, steering § Project numbers).
  "Body text carries no hue" still holds: the tint is on the surfaces.
- A design question, not a record one: a free hue can land on a colour that already means something
  (PLAN decision 13: "pink means notes and buttons only"; Tick green, Cross red). Low-strength tints
  reduce the risk; whether some hue bands are refused is the maintainer's call.
- Conflicts with the plan as written: C3.

### O4 The project's icon library

The maintainer's direction (2026-11-16, relayed by the orchestrating session): icons live in a
defined place in the project folder, likely `.visionboard/icons/`, shared by every board of the
project, so the set grows; agents reuse before they add. This replaces the earlier draft of this
section, which stored a board's icons as ledger lines.

**Files or ledger lines: both, each for what it is good at**

- **The drawing is a file**, one per icon, in `.visionboard/icons/`. A folder can be browsed,
  previewed, reused across boards and committed to git; a ledger line can do none of that.
- **The ledger records which drawing a name meant**: one short line per name, with the file's hash.
  ```
  {"type":"icon","name":"x-encoder","hash":"<64 hex, sha-256 of the file>"}
  ```
  Reasons: (1) every agent action is a line (steering § Board invariants), so who added what, and
  when, is on record; (2) the rule "this node names an icon the ledger knows" stays pure, with no
  file read, so the page and a replay can check it (`ledger-index.ts` `contextProblems` reads no
  file); (3) a file changed behind the board's back is noticed. The hash has the form an app's
  already has (`packages/format/src/apps.ts` `APP_HASH_PATTERN`), and the pattern is the app card's:
  files in a folder, the ledger holding the hash that is trusted (`app-allow`, D-047).
- The cost, stated plainly: a ledger sent without its `icons/` folder draws a plain tile where the
  icon was. Pictures in `images/` have the same limit (D-048).

**Where the folder is**

- Standalone: `.visionboard/icons/`, beside `attachments/`, shared by every ledger of the project.
  Named once in `packages/format/src/data-folder.ts` (`ICONS_DIR`, `ProjectFiles.icons`,
  `DATA_FOLDER_NAMES`, so no ledger can be called `icons`: `ledgerNameProblem`). Committed to git; it
  is project content, not a secret or a lock.
- Under a host the engine reads and writes only its `dir` (`plugin.md` § The engine), so there the
  library is `dir/icons`. One option on the engine says where, default `dir/icons`; the standalone
  server passes the project's folder. An option with a default breaks no host.
- Several ledgers of one project share the files; each ledger has its own `icon` lines.

**What a file holds**

- An `.svg` file, so people can look at the library, in one fixed form the server writes:
  an `svg` element with the set's box, an optional `title` (a few words saying what it shows), and
  `path` elements with a `d` and nothing else.
- **It is path data in an SVG wrapper, never free markup.** The check is a pattern over the whole
  file plus a path grammar (letters `MmLlHhVvCcSsQqTtAaZz`, digits, `.`, `,`, `-`, `e`, spaces). The
  page never puts the file's text into the page: it takes the `d` strings out and builds the
  elements itself, as the node does with its own icons today (`packages/ui/src/node/node-icons.ts`
  `KIND_ICON`: strings the pattern wraps). A tone can then tint it, which a picture shown through
  `<img>` cannot do (`packages/format/src/images.ts` `IMAGE_LIMITS` comment, D-064).
- Limits to set: the same box as FE_01's built-in set; at most 8 paths; 2,000 characters a path;
  one colour (the node's); a `title` of at most 80 characters.
- **The same check runs when a file is read**, not only when it is added. A file can arrive by hand,
  by git or by a sync, and an agent outside the board's chat is not held by the board's path rules
  `[INFERENCE: the rules in packages/agent/src/access-rules.ts are the chat panel agent's, D-066]`.
  The check is pure string logic in `packages/format`, so the server and the page share it, as they
  share `imagePathProblem`.

**How an agent adds one: through the action layer**

- Two operations, defined in `openapi.json` and generated into the MCP tools and `vb` commands
  (`api.md` § Adding an operation):
  - `list_icons`: the built-in names, and the library's names with their titles.
  - `add_icon` with `name`, `title`, `svg`, `key`. The server checks the name; reduces the SVG to
    paths and refuses what paths cannot say (text, gradients, images, `use`, `style`, script,
    transforms); writes the file in the fixed form with `writeFileAtomic`, only if no file has that
    name; then appends the `icon` line.
- **Never a raw file write.** The chat agent's path rules already refuse it: `.visionboard/**` is
  `write: 'refuse'`, and only `images/` and `apps/` are opened (`access-rules.ts`). Icons get no such
  opening. For any other agent the read-time check is the guard.
- **Reuse costs nothing.** When a node names a library icon this ledger has no line for, and the file
  is there and passes the check, the server writes the `icon` line itself, before the node line (as
  it fills `RetireEvent.cards`). So an agent lists, picks a name and uses it. A file a person dropped
  into the folder works the same way.
- The file is written first and the line second: a file with no line is harmless and is taken up on
  first use. The line names no board, so it moves no board's head (as `join` and `app-allow` do
  not). A read-only ledger refuses `add_icon` (D-085).

**Names, and clashes with the built-in set**

- A library name is `x-` followed by what it shows: `^x-[a-z0-9][a-z0-9-]{0,37}$`. The file is
  `x-encoder.svg`: one spelling in the file name, the node and the tool.
- **A clash is impossible, not merely refused.** `add_icon` refuses a name without the prefix, and a
  test holds that no name in `ICON_NAMES` starts with it. A built-in added in a later release can
  therefore never collide with a project's icon. Without a prefix, a clash could only be refused
  against today's built-ins. The prefix letter is the maintainer's to choose.
- **A name is given once.** The same name with the same drawing is a replay; the same name with
  another drawing is refused, in words that point at the existing icon ("reuse it, or pick a more
  specific name"). Agents add; they never replace.
- The convention that makes reuse work: name the thing, not the use. A singular noun, then a
  qualifier if needed: `x-encoder`, `x-encoder-audio`. No board or project names, no numbers, no
  colours, no versions.

**What a board stores when it uses one: the name only**

- The node line holds `"icon": "x-encoder"`. Nothing else.
- The hash is on the `icon` line, once per ledger, not on every node. Because names are given once,
  a board draws the same for ever from the name alone. And because `icon` lines sit in `seq` order,
  the fold at any `seq` knows which hash was in force then, so a hash on each node would add bytes
  and no information.
- **When a file no longer matches its hash** (edited by hand, a merge, a sync): the board draws the
  plain tile, lists the icon as a problem, and the person either puts the file back or accepts the
  new drawing with one act, which writes a new `icon` line with the new hash (as `app-allow` accepts
  an app's code at one hash). Only the person can change what a name draws.
- A limit to accept: after the person accepts a new drawing, older versions of a board draw the new
  one too, because the old file is gone. If exact history matters later, keep replaced files as
  `x-encoder.<hash>.svg`; the ledger already says which hash each `seq` meant, so that needs no
  format change.
- How the page gets the drawings: the board read carries the checked paths of the icons that board
  uses. They are small, and nothing new then crosses a host's transport `[INFERENCE]`.

**The agent's spec, as a few bullets** (a draft for T_03; the sentences belong in
`skills/vision-board/SKILL.md`, and `npm run eval:bot` must pass, steering § How to work)

- Before you add an icon, call `list_icons` and use one that fits.
- Name it for what it shows, not where you use it: `x-` then a singular noun, a qualifier after it
  if needed (`x-encoder`, `x-encoder-audio`). No board names, numbers or colours.
- Draw it as the built-in set is drawn: the same box, paths only, one colour, no text.
- Add it with `add_icon` (the name, a few words saying what it shows, the SVG). Never write a file
  into `.visionboard/icons/` yourself.
- A name is taken for good. If yours is refused, reuse that icon or choose a more specific name.

**What it touches**: `EVENT_TYPES`, `AGENT_EVENTS` (and the person's accept); a schema in
`packages/format/schema/events/`; the index (name to hash); the event scope table
(`packages/actions/src/references.ts` `EVENT_SCOPES`); `data-folder.ts`; a new
`apps/board/server/icons.ts`; `access-rules.ts` (a row that says it); `openapi.json`; the engine's
options and `plugin.md`.

### O5 Flow direction

- The brief: the agent sets it and the person can change it. PLAN call 7 and BE_01 step 5 keep it in
  the page, "not written to the ledger" (C3).
- **Recommended: on the container, in the ledger**, the way `mode` and `widths` already work
  (`Region.widths`, the act `widths`, `LedgerState.widths`, `view.ts` `widthsOf`).
  ```
  region: {"id":"build","title":"Build","mode":"flow","direction":"down"}        the agent, with any redraw
  {"type":"act","action":"direction","board":"plan","region":"build","direction":"across"}   the person
  ```
- Why the ledger: (1) "the agent sets it" needs the contract whatever the person's half does;
  (2) `show_layout` is answered by the server from the ledger, and BE_01 step 6 requires its answer
  to stay "true for what is drawn", which a direction kept in the page cannot give; (3) under a host
  the page's store "May lose anything" (`plugin.md`, `store.get/set`).
- Why the container: an agent writes a `board` line once but a `region` line with every redraw, so
  it can set the direction per version; and mode and widths set the precedent.
- Give the person's act a third value, `auto`, that clears their choice (as `size` has,
  `ledger.ts` `ACT_SIZES`). Without it their first pick hides the agent's for ever.
- The toolbar's board-wide control can be the same act with no `region` (as a `revoke` with no
  `region` means the whole board).
- "Per view" in the brief: read here as "per container, at each version of the board". If it means
  something else, the record changes.

### O6 Ask now

- The brief: a message sent for one node at once, separate from the board-wide Send. PLAN call 1
  builds it as a note followed by the board's Send (C3).
- **A new act, not a scoped `send`.** A `send` means "everything up to `head` went": the fold sets
  `lastSend`, raises `sentHead`, empties the board's unsent lines (`fold.ts` `applyAct`;
  `unsent.ts` `foldUnsent`), and a note counts as history after it
  (`packages/actions/src/note-lock.ts` `sentAfter`). A `send` narrowed to one node would run through
  all of that and mark other answers as sent.
  ```
  {"type":"act","action":"ask","board":"plan","lines":[412],"context":"node"}
  ```
  - `lines`: the `seq` of each of the person's lines this ask carried. Normally one, the note just
    written. That note already names its node, its group (`nodes`) or its container (`region`), so
    the target is not repeated and the words are not copied.
  - `context`: what the agent was given with it: `node`, `board` or `session`. It records a fact
    about that delivery. Which one the board uses is then a setting, or a choice at the button, and
    the ledger is the same whichever the maintainer picks. Changing his mind later leaves history
    true. **This is what keeps the three modes open.**
  - Written once the message went, as a Send is (D-075).
  - The agent's answer needs nothing new: a `reply` naming the note's `seq` (`ReplyEvent.to`), or a
    new version of the node.
- **The fold work it implies.** `sentHead` is a high-water mark: "answers up to here are sent". An
  ask sends line 412 while 405 and 408 wait, which a mark cannot say. The fold needs a set of asked
  lines that `unsent.ts`, `note-lock.ts` and `pending.ts` `replyScope` consult, so the next Send
  does not carry 412 again and the note locks.
- No chat session id on the line: sessions live outside the ledger folder
  (`packages/format/src/data-folder.ts` `projectFiles`: `chat-sessions.json`), and a Send stores
  none either.
- Considered and not recommended: a mark on the `comment` line itself. Delivery is its own fact,
  recorded after it happened, and an existing unsent note may be asked later.

### O7 A seen container (T_01 step 5)

- It reverses part of an accepted decision. D-054 rejected "a stored 'container seen' (a format
  change)" (C2).
- Give it a `head`, as the board form has (`SeenEvent`: `{ board, head }`; `ledger-shape.ts`
  `seenRules`): `{"type":"seen","board":"plan","region":"build","head":431}`. Without it, a line
  that arrives while the person clicks is marked seen without having been shown.
- Write it only when it changes something. DD-19 makes any click inside a container a seen. The
  card form is already conditional (`seenDue`); the container form must be too, or `seen` becomes
  the commonest line in the file (it is 8% of `main`'s lines today).

---

## 5. Where the documents on record disagree with this

- **C1 "Still read" is about to become binding.** The D-099 draft, point 2: "Lines written as `flag`
  and `unflag` still read." PLAN decision 3 says the same, and so do Key change 1 ("lines in formats
  up to 19 still read"), a risk row, a success criterion ("A format-19 ledger opens unchanged"), and
  T_01 steps 4 and 7 with their validation. The decisions file's own rule is "Never edit an Accepted
  entry". If the maintainer wants migration, that sentence has to change before D-099 is appended.
  Suggested: "A ledger written before format 20 is migrated; `flag` and `unflag` become `bookmark`
  and `unbookmark`."
- **C2 D-099 point 4 against D-054.** D-054 rejected a stored container seen; D-099 point 4 and T_01
  step 5 store one. D-099 should say it replaces that part of D-054, and D-054 should be marked so.
- **C3 Four of the plan's calls against what the maintainer has said since.**

  | Topic | The plan | The maintainer since (the brief, and the additions of 2026-11-16) |
  |---|---|---|
  | Ask now | PLAN call 1: adds the note, then runs the board's Send; "A send scoped to one node is not built" | "a message sent for one node at once, separate from the board-wide Send" |
  | Icons | PLAN call 5: "an agent never sends its own SVG as a node icon"; T_01 step 2: `icon` is one of `ICON_NAMES` | Agents add icons to a project library in `.visionboard/icons/`, reused by name across boards |
  | Flow direction | PLAN call 7: "kept by the page (as zoom is), not a ledger line" | "a per-view flow direction ... the agent sets and the person can change" |
  | Tone | PLAN decision 17 and call 2: "one name from a fixed palette"; T_01 step 2: `tone` is one of `TONES`; T_02: one `--vb-tone-<name>` per name | A palette name or any hue; the board derives the tints so contrast passes |

  T_01 as written covers none of the four. The D-100 draft, point 3, says "an icon, by name from the
  board's icon set, and a tone, by name from a fixed palette": both halves need rewording before it
  is appended (the project's icon set; a palette name or a hue), for the reason in C1. The four are
  recorded here as relayed; the maintainer confirms them at kickoff.
- **C4 The migration itself has no decision.** `api.md` point 11, D-075 point 3 and D-017's
  "append-only" all assume old lines are read where they lie (§ 3, "What it needs on record").
- **C5 D-041 stays whole.** `n` stays the file's name for a card's identity and no card line is
  removed (V2).
- **C6** `api.md` points 5 and 11 are stale (H14); whichever task touches the format should correct
  them.

---

## 6. Assumptions and limits

- The growth scenario in § 2 (ten agents, 200 lines a day each) is an assumption to size the risk,
  not a forecast. No fold was timed for this review: the brief allowed reading only. The only
  measured timings quoted are the project's own (`performance.md`).
- Two read-only sub-agents (Sonnet 5.5) surveyed the server's read paths and the documents. Read
  directly for this review: `packages/format/src/ledger.ts`, `ledger-shape.ts`, `ledger-index.ts`,
  `ledger-line.ts`, `ledger-read.ts`, `board-view.ts`, `view.ts`, `data-folder.ts`;
  `packages/actions/src/fold.ts`, `card-flags.ts`; `apps/board/server/ledger.ts`, `atomic-file.ts`;
  PLAN.md and T_01. Spot-checked from the sub-agents' reports: `reads.ts` `readLedger`,
  `pending.ts` `responsesAfter`, `server-start.timing.ts` `bigLedger`, `read_ledger`'s `x-agent`,
  the agent path rule, D-054, `api.md` point 11. Taken from their reports without a second read:
  `live.ts` `load`, `io.ts` `PAGE`, `streams.ts`, `project.ts`, `plugin.md`, D-075, D-077, D-084,
  D-085.
- Not established: what a ledger line older than format 2 looked like; whether the board shows
  skipped lines to the person; whether the write path refuses a link between cards of two boards
  (`contextProblems` checks only that both cards exist); how a synced folder treats a large,
  fast-changing ledger; the cost of migrating the tests, beyond a count (50 test files hold a
  literal `v:` in a line).
- The additions of 2026-11-16 reached this review as a message from the orchestrating session, not
  from the maintainer directly. That `oklch()` is the right space for a hue is colour science, not a
  project source; its browser support is not established in the sources.
- Costs below are estimates `[INFERENCE]`: S is hours, M is a task of a day or two, L is several
  tasks.

---

## 7. Ranked list of changes

### Must: before or with T_01

Row order is the rank. Ids stay as first given; R26 to R28 came with the additions of 2026-11-16.

| Id | Change | Why | Cost | Touches |
|---|---|---|---|---|
| R1 | Decide: migrate, or keep reading old formats. If migrate, reword D-099 point 2 before it is appended and draft the migration decision | An appended decision can't be edited (C1); T_01 step 4 otherwise adds another old-format branch (H6) | A conversation | D-099 draft and PLAN decision 3 (PLAN.md); T_01 steps 4, 7; a new decision entry; `api.md` point 11 |
| R2 | Settle the four contradictions: Ask now, the icon library, flow direction, a hue as tone (C3); reword D-100 point 3 before it is appended | Format 20 is frozen by T_01; each one changes what T_01 must carry | A conversation | PLAN decision 17 and § Planner's calls 1, 2, 5, 7; D-100 point 3; T_01 step 2; T_02; BE_01 step 5; FE_03 |
| R3 | Refuse a newer format: a line with `v` above `LEDGER_FORMAT` opens the ledger read-only and says why | Today such lines are skipped and the ledger stays writable (H7); after a migration that hides a whole file from an older build | S | `apps/board/server/ledger.ts` `readHeld`, `openLedger`; `ledger-read.ts`; a words file |
| R4 | Freeze today's fixtures and what they fold to, with today's code | The only proof that a migrated ledger gives the same board, and it can only be captured while the old reader exists (§ 3 Tests) | S | `packages/format/fixtures/legacy/` (new); `packages/actions/tests/` |
| R5 | The migration: the upgrade chain, the runner with lock, backup and atomic replace, the command, the 19-to-20 step | The maintainer's stated preference; makes every later format change cheap | M | `packages/format/src/migrate/` (new); `apps/board/server/ledger-migrate.ts` (new); `apps/board/bin/`; `package.json`; `data-folder.ts`; `project.ts`; `engine/engine.ts`; words; the new decision |
| R6 | In T_01: `bookmark` and `unbookmark` only, no alias in the reader or the fold (O1) | Follows R1; no real ledger holds a flag line | S, inside T_01 | `ledger.ts` `ACTION_IDS`, `CARD_MARKS`; `card-flags.ts`; `fold.ts`; `edge.ts` or `flag-flow.ts` |
| R7 | In T_01: the skin survives a rename; a `skin` act is no answer (O2) | `applyDrawn` rebuilds the board from each `board` line | S, inside T_01 | `board-view.ts` `applyDrawn`; `fold.ts`; tests |
| R8 | In T_01: a container seen carries `head` and is written only when due; D-099 says it replaces part of D-054 (O7, C2) | Correct under late lines; keeps `seen` from flooding the file | S, inside T_01 | `ledger.ts` `SeenEvent`; `ledger-shape.ts` `seenRules`; `fresh.ts`; D-099 draft |
| R9 | In T_01: an icon name is a built-in or starts `x-`; a test holds that no built-in does (O3, O4) | Makes a clash between a project's icon and a later built-in impossible; changing it afterwards means renaming stored names | S, inside T_01 | `view.ts` (`ICON_NAMES`); `ledger-shape.ts` `NODE`; node schema |
| R26 | In T_01: `tone` is a palette name or a whole-number hue, 0 to 359, with the colour space named (O3) | The record must be right before nodes are written with it; the tints and the contrast sweep follow in T_02 | S in T_01; M added to T_02 | `view.ts` (`TONES`, `ViewNode.tone`); `ledger.ts` `NodeBody`; `ledger-shape.ts` `NODE`; node schema; `packages/tokens/src/tokens.css` (protected, T_02's); the contrast check |
| R27 | In T_01, the icon library's contract: the `icon` line (name, hash), `list_icons`, `add_icon`, the folder's name. Then its own task before FE_01: the handler, the check shared by server and page, the engine option (O4) | Contract first; FE_01 draws icons by name and needs the library's shape | S to M in T_01; M for the task | `ledger.ts` `EVENT_TYPES`; `ledger-index.ts`; `packages/format/schema/events/`; `openapi.json`; `data-folder.ts`; `apps/board/server/icons.ts` (new); `engine/engine.ts`; `access-rules.ts`; `references.ts` `EVENT_SCOPES`; `plugin.md` |
| R10 | In T_01, for each the maintainer confirms: the `ask` act (O6), the `direction` field and act (O5) | Contract first (`docs/principles.md` § The contract comes first). Left out, each is a further format bump, which R5 makes cheap but not free | M added to T_01 | `ledger.ts`; `ledger-shape.ts`; `ledger-index.ts`; schemas; `fold.ts`; `unsent.ts`; `note-lock.ts`; `pending.ts`; `flags.ts` |

### Should: soon after

| Id | Change | Why | Cost | Touches |
|---|---|---|---|---|
| R28 | In T_03: the agent's bullets for icons (list, reuse, name, `add_icon`, never a file write) and for tone (a palette name to follow the palette, a hue when the content has its own colour) | Reuse only happens if the agent is told how; a bot-instruction change needs `npm run eval:bot` | S, inside T_03 | `skills/vision-board/SKILL.md`; T_03 step 2 and its eval |
| R11 | One format in the reader: delete the version branches and schema conditions, migrate the fixtures, drop `LEDGER_FORMATS` | The second half of "no legacy readers" (H6); safe once R4 and R5 exist. Kept apart from T_01 so the contract task stays small | M to L (50 test files hold literal `v:` lines) | `ledger.ts`; `ledger-shape.ts`; `ledger-index.ts`; `ledger-line.ts`; `view.ts` `RENAMED_MODES`; `packages/format/schema/`; fixtures; `perf-ledger.ts`; `api.md` points 5, 11 |
| R12 | `read_ledger` finds its cursor by binary search and slices (S2) | 20,000,000 event visits to open a board at 100,000 lines | S | `apps/board/server/engine/reads.ts` `readLedger` |
| R13 | The page opens a board from a server-folded snapshot plus the lines after it (S1) | The first thing to break as a ledger grows; already tracker N15 | M to L | `apps/board/src/board/live.ts`; `reads.ts`; `openapi.json`; tracker N15 |
| R14 | `check_responses` reads acts per board from the cursor (S3) | Cost grows with every act ever made, on every wake | S to M | `packages/actions/src/pending.ts` `responsesAfter`, `latestMarks`; `fold.ts` `LedgerState.acts` |
| R15 | One table of act shapes, a row per action (H8) | Every new act is edited into several sets today; the overhaul adds several | M, code only | `ledger-shape.ts`; `ledger.ts`; `packages/actions/src/registry.ts`; act schema |
| R16 | A realistic timing ledger (current format, real share of `node` lines) and budgets for `read_ledger` and `check_responses` at 100,000 lines (S5) | The one size budget is measured on lines unlike real ones | S | `apps/board/tests/server-start.timing.ts`; `packages/format/tests/perf-ledger.ts`; `performance.md` |

### Later

| Id | Change | Why | Cost | Touches |
|---|---|---|---|---|
| R17 | Split state into current and history, then a checkpoint (S4, S5) | Memory and start time grow with the file; a checkpoint of today's state would be as big as the ledger | L | `fold.ts` `LedgerState`; `board-view.ts` `LedgerNode.versions`; `apps/board/server/ledger.ts`; `performance.md` approach 7 |
| R18 | Sealed segments (S6) | One ever-growing file in a synced folder; keeps append-only whole | L, and a decision | `data-folder.ts`; `apps/board/server/ledger.ts`; `lock.ts`; D-017 |
| R19 | Streamed updates as short-lived stream messages, one `node` line at the end (M51) | Keeps the ledger out of the stream's way | With M51 | `apps/board/server/streams.ts`; `packages/format/schema/api/`; tracker M51 |
| R20 | A lock, or a written single-opener rule, for a host's `dir` (H11) | Two writers lose a line silently; a migration needs one writer | S to M | `plugin.md` open point 14; `apps/board/server/engine/engine.ts` |
| R21 | Decide what "stored" promises: flush each line, or say plainly that the last lines can be lost on power failure (H12) | D-075 leans on a stored line | S, and a decision | `apps/board/server/ledger.ts` `append`; `atomic-file.ts` |
| R22 | Show the person when lines were skipped (H13) | A skipped line changes the board without a word | S | `apps/board/server/ledger.ts` `Ledger.problems`; the page |
| R23 | Before a second person: private marks carry `person` | A bookmark is one person's; today the line does not say whose (`Base.person` is written only with more than one person) | S, with multi-person work | `ledger.ts` `Base`; `card-flags.ts`; D-018 |
| R24 | Only if another change already touches every line: write a card's identity as `id` in the file (H9) | Removes the one name that means two things | M, and a decision replacing part of D-041 | `ledger-line.ts`; every fixture and test line |
| R25 | Raise the migration floor and delete old steps | Keeps the chain short | S, by decision | `packages/format/src/migrate/` |
