# Overnight report: the tidy-up, Waves 2 to 8

> Kept current as the run goes. Run on the first Mac, in this worktree (the move to another machine
> was cancelled; `HANDOVER-overnight.md` is kept as the run's rules). The maintainer delegated the
> calls that come up (2026-10-27): each one made is listed under Decisions taken, for review.

## Waves

| Wave | Tasks | Status | Commit · tag | Gates |
|---|---|---|---|---|
| 1 | FIX_01, FIX_02 | Done (before tonight) | c2f6110 · `tidy/wave-1` | green |
| — | Principles 286, set refined | Done | e9218f8 | verify ok |
| 2 | ARCH_01 | Done (Run 2, after D-059) | 818c502 · `tidy/wave-2` | 1620 + 10 unit, check 0 errors, gen current, verify ok (18 warnings), 658 page specs passed |
| 3 | ARCH_02, UI_01, ARCH_04 | Done, with the gate fixes (tokens applied, Base gallery entry, docs) | fe64b9c · `tidy/wave-3` | 1690 + 10 unit, check 0 errors, gen current, verify ok (19 warnings), 664 page specs passed; only gallery-{light,dark} changed (new Base section, appended last, every old row identical) |
| 4 | ARCH_03, ENGINE_01 | Done, with the gate fixes (board chip, aria ids per mount, docs) | 80a3a2c · `tidy/wave-4` | Combined tree: 1698 + 10 unit, check 0 errors, gen current, verify ok (19 warnings); after the gate fixes 1707 + 10 unit, 667 page specs passed, no baseline changed |
| 5 | TEST_01 | Done, with the gate's docs pass and D-062 | a9bb4b3 · `tidy/wave-5` | 1710 + 10 unit (1 todo: the lanes sample), check 0 errors, gen current, verify ok (13 warnings, was 19); 667 page specs passed on 3 workers in 6.4 min (was 16.1 on 1), no screenshot changed. Two timing tests ran slow while the page suite ran beside them; all 10 pass alone |
| 6 | ARCH_05 (Runs 1 and 2) | Done, with D-063 and point 290 | see git log · `tidy/wave-6` | 1723 + 10 unit (timing 10/10 once nclite's suite finished), check 0 errors, gen current, verify ok (13 warnings); 667 page specs passed on 5 workers in 6.2 min under load 35; only app-cards and chat {light,dark} changed, by one gallery text line |

## Decisions taken (for the maintainer's review)

- **D-059, one package scope** (ARCH_01 Run 1 blocked on it). A `#name` resolves against the
  importer's nearest `package.json`, so `apps/board/package.json` hid the root `imports` map from every
  file in the app (Node, Vite and svelte-check all failed). Folded it into the root: same dependencies
  at the same exact versions, workspaces dropped, lockfile regenerated offline with scripts off
  (`npm install --ignore-scripts --offline`, nothing new fetched). Fits point 224 (modules, not npm
  packages). This touched protected files under your delegation: `docs/decisions.md` (D-059 appended),
  `docs/principles.md` § Dependencies are a cost (the "npm workspaces" line).
- **D-060, a module's names**, from ARCH_01's draft: `#m` front door, `#m/styles.css`, `#m/files` (file
  paths Node reads, kept off the front door so `node:` stays out of the page bundle), `#m/testing`.
  `verify` fails on any other way in, from `tests/` and `skills/` too.

- **D-061, the board's CSS scope** (UI_01): `vb-`-prefixed selectors count as scoped, root class
  `vb-board` is also the `@container`, a guard undoes a host's element rules, width rules are
  container queries. Proven pixel-identical under a hostile host sheet.
- **New design tokens approved** (UI_01, protected): `--vb-z-*`, `--vb-control-h` / `-small` /
  `-target`, `--vb-focus-offset` / `-tight` / `-inset` / `-card`, each valued at today's literal, so no
  picture moves. Applied in the Wave 3 gate.
- **The base pattern gets a gallery entry**, so the gallery screenshots gain one section (Wave 3 gate).
- **No split of `actions` into `ledger` + `actions` yet** (ARCH_04's case): 118 files import `#actions`
  and every consumer needs both halves. Split when a consumer needs the reads alone (nclite's chip
  `resolve` may be the first).
- **A chip on a card whose notes are hidden is refused** (`hidden`), applied at once by ENGINE_01: the
  bot never gets words the person can't see (nclite § Chips).
- **Chips:** a card's `ref` is `{ board, n, ver }`, a note's `{ board, seq, rev }`; refusals carry a
  code. Added to `nclite-contract-reply.md` with the `vb-board` root and importing-in-place notes.
- **ARCH_03's two deviations accepted:** `pageChip()` returns a new `board` chip (`{ board, head }`,
  added in the gate); the host-styles 1600 px check allows a raster step of 2 (a 1-step flicker on the
  toolbar select's edge; a style leak moves pixels far more), and the 550 px pane case compares layout.
- **Two boards on one page get their own aria ids** (gate), so `aria-controls` never points at the
  other board.
- **The MCP server stays a relay** to the standalone server, not an engine host: an engine in the agent's
  process would be a second writer on a folder the server holds the lock for (ENGINE_01, api.md 162).
- **Tracker M8 added:** the board's toolbar, strips and dialogs become part of the board, so nclite
  doesn't draw them again. Planned with the plugin, after search (M7).
- **D-062, test support per module** (TEST_01, an addendum to D-060): `#format/testing`, `#board/testing`
  (another module finds an app's only with `import.meta.resolve`, to run it as a child), and the gallery
  ledger named by its file (`#format/gallery.ledger.jsonl`). No `packages/testing`: it couldn't reach an app.
- **Project instructions, the Tests line** (protected, applied under the delegation): 3 workers,
  `VB_TEST_WORKERS`, per-worker ports, tasks running at once 100 ports apart.
- **The gallery's "Lanes mode" sample is wrong, not the rule**: two of its cards name no lane. A
  lanes-mode card names its lane; ARCH_05 gives them "Now" and "Next" (that gallery section may move).

- **Test time, from the maintainer (points 287–289, "proceed")**: the page suite defaults to 5 workers
  (4.9 min measured, against 6.4 on 3); a task runs only the page specs for what it changed, and the
  full suite runs once per wave, at the gate (TASK-STATUS rule 12; ARCH_05 told mid-run); tracker M9,
  a quick check that picks the specs for what changed. The project instructions' Tests line says 5. Both edits to that line (TEST_01's ports and fresh boards, and the 5 workers) **approved by the maintainer** (2026-10-27); the file is now v0.4.

- **D-063, words homes** (ARCH_05): every sentence in a `words/` folder of the part that sends it,
  keyed `board.<area>.<name>`; the board's inside `board/`. 756 + 293 sentences moved, no wording changed.
- **Project instructions, point 290 approved by the maintainer**: `words.md` in Sources of truth and a
  Sentences rule under How to work.
- **A sentence both the page and `#actions` say** ("Allow", "Send to agent") stays in both for now:
  sharing it means `#actions` exporting words the page imports; worth doing when the plugin's one words
  file is built from the homes (nclite).

## Requests routed

- ARCH_01-R1 (fold the scope), ARCH_01-R2 (decision entry): done by the orchestrator, D-059.
- ARCH_01-R4 (module map), R5 (D-060): orchestrator. R3 (six READMEs and `components.md` to the
  names): a Sonnet docs sub-agent. R6 (`perf-ledger` into a module's `/testing`) → TEST_01. R7 (tests
  reaching into the board server) → ENGINE_01.

## Caught beyond the brief (ARCH_01)

- verify's old check missed six back-door shapes (side-effect and dynamic imports, `new URL`, globs,
  HTML `href`/`src`, CSS `@import`); the new `checkReferences` catches them.
- nclite resolves `#` names against this repo's `package.json` only while it imports the board's files
  where they sit; copying them into nclite's tree would break the names. Worth a line in the contract.
- verify now scans `tests/` and `skills/`: 15 new length warnings (10 page specs, the calculator's
  `panel.html`, `schema.test.ts` at 301 lines). Warnings, not failures.

## Caught beyond the brief (Wave 3)

- ARCH_02: the problem-codes table is a plain schema, not an `x-` field, because strict ajv rejects
  unknown keywords; the card table is generated into `#format` (`CARD_FIELDS`) rather than hand-kept.
- ARCH_02: a page-test filter `board` matches every spec (the worktree path contains `vision-board`).
- UI_01: Up with no menu row focused now goes to the last row (the old keys went to the second-last).
- UI_01: `localStorage` is used in 5 places `checkIO` does not cover; `vb-image-view` keeps its own dialog.
- ARCH_04: `clip` existed twice; promoted to `#format`.

## Caught beyond the brief (Wave 4)

- ENGINE_01: the ledger now reads lines another writer appended (`refresh` before every write, a 200 ms
  `follow` while anyone watches), so two engines on one folder never repeat a `seq`.
- ENGINE_01: a removed card in a Send now reads "card N on board "b" was removed"; notes that are hidden
  or on removed cards are refused (the person's words only).
- ARCH_03: the pointer's window listeners were never removed before; a key pressed in another board's
  root is now ignored; the app-card menu is found within its card, not by document id.
- A unit run left hung in the worktree from mid-wave (pids 7323, 7324, 7448, `node --test`). Stopping
  it was refused by the permission check, so it may still be running: safe to stop.

## Caught beyond the brief (Wave 5)

- TEST_01: the 1,000-card first draw slipped to 910–1,012 ms (budget 1,000) while the test boards shared a
  process with Playwright's driver; moving them into a child process restored 465–486 ms. No budget,
  wait or assertion was loosened.
- TEST_01: `frames-board.ts` kept its board across spec files, so `note-discard` depended on order.
- TEST_01: `--shard` puts every test in shard 1 unless run with `--project=chromium`.
- The orchestrator's slip: one gate command of mine briefly made an empty `temp-rows.txt` in the main
  checkout (a stray `cat`); removed within minutes, nothing else touched there.

## Caught beyond the brief (Wave 6)

- ARCH_05: the board's words had to live inside `board/` (in `src/words/` verify failed 28 host rules).
- ARCH_05: three imports had landed between a JSDoc comment and its declaration; fixed in Run 2.
- ARCH_05 ran the full suite twice, the second after the new rule reached it.
- Timing and budget tests are sensitive to load: with nclite's test suite running beside them (load
  average 22), server start took 1.8–2.7 s (budget 1 s) and the 1,200-link layout 1.0–1.8 s (budget
  100 ms); alone they pass. The gate reruns them on a quiet machine.

## To look at by eye (light and dark)

- The ⋯ menu, the Move to list (Shift+M), a container's settings menu, the app card's "Allowed ▾".
- New/Rename board, Open folder…, Archived…, and a confirm: Esc, Cancel, backdrop click, focus back.
- Hover tip and note preview (grace, Esc, tap then press outside); read-only note bubble; the selection pill.
- The toolbar at 1200, 1000 and 768 px. The gallery's new Base section.
- Wave 4: the board at 1600 and 768 px; the chat sidebar open (the stage shrinks); archiving the last
  board (the page reloads empty); switching the open folder; the past-version banner; H (Hide
  answered); Esc closing the Reply panel.

## Points for the maintainer

Numbering continues from 287.
