# VERIFY_01_tidy-verification: Verification

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Show, with evidence, that the code now meets `docs/principles.md`, and list exactly what doesn't.

## Context

The set's success criteria (PLAN.md). Review as someone who will host this board in nclite and has no
history of how it got here: a rule is met when the code shows it, not when a doc says so.

## Inputs

- **Files to modify**: this task file's notes only; a findings file
  `cortex-tasks/project/2026-10-26_project-tooling_tidy-up/VERIFY_01_findings.md`.
- **Files to reference**: `docs/principles.md`, the review
  (`cortex-tasks/board/2026-10-26_project-tooling_code-organisation-review.md`), every task's notes.
- **Skills**: `cortex-architecture`, `cortex-docs` (the doc audit), `cortex-research`.

## Steps

1. [x] **Re-run the review** §1-§19, finding by finding: closed (with the evidence: file + symbol, a
   `grep`, a test) or open (why, and the tracker row to add).
2. [x] **Plant a back door of each kind** in a scratch copy (deep import, CSS back door, colour literal,
   I/O outside its layer, a board import of the shell, a user-facing literal, a 120-line function) and
   show `verify` or the tests catch each; remove them.
3. [x] **Mount the board with a fake host** and walk a round: draw, answer, note, Send to the fake
   chat; mount two boards on one page; `unmount` and show nothing is left. Run the board's engine with
   no HTTP server: a route, a chip and its refusal, each tool, a watch event.
3b. [x] **Against nclite's contract** (`~/ai/nclite/docs/plugins.md`, read only): every row of PLAN
   § The Plugin Contract met by the code, and every difference the set asked nclite for listed once,
   with its reason, for the handover reply. Draw the board under the hostile host stylesheet and at
   550 px.
4. [x] **Full gates**: `npm test`, `npm run verify`, `npm run check`, `gen --check`, the full page suite
   three times on several workers; record the times.
5. [x] **Doc audit** (`cortex-docs`): every doc that describes code this set moved still holds.
6. [x] **Look at the board** in a browser, light and dark, at three zooms: nothing changed for the person.

## Validation

- [x] Every success criterion in PLAN.md ticked with its evidence, or listed open with a tracker row

---

## Implementation Notes

_To be completed by agent after task completion. Re-run? Add a `### Run N` block; never overwrite._

**Status**: Completed  
**Completed**: 2026-10-27 14:40  

### Changes Made
- No code or doc changed. Findings, evidence and proposed tracker rows:
  [VERIFY_01_findings.md](./VERIFY_01_findings.md).
- Step 1: review §1-§19 re-run; §1, 2, 3, 4, 5, 7, 9, 10, 11 closed with evidence; open items are
  F7 to F11 and F14 (each with a tracker row or a doc request); §6, 15, 16 out of scope (PLAN).
- Step 2: eight back doors planted in a scratch copy (deep import, CSS back door, colour literal, two
  I/O kinds, a board import of the shell, a path past a feature folder's door, a user-facing literal,
  a 124-line function): verify failed 7, warned 1; `words.test.mjs` failed the literal. Copy reset;
  the worktree never held a plant.
- Step 3: `board-host.spec.ts` passed; a scratch round on the fake host (✓ by key, a note, a key from
  outside both boards, unmount mid-note) found F1 and F2. Engine: `engine.test.ts` 7/7; a reach scan
  of its 25 files finds no socket, env or folder lookup; a probe shows an agent's ✓/✗ refused (403).
- Step 3b: every PLAN contract row checked against `~/ai/nclite/docs/plugins.md` (read only); four new
  differences for the reply (tools a bot gets, unmount and unsaved words, keys, theme).
  `host-styles.spec.ts` 8/8 (hostile sheet, 550 px, pane in a wide page; light and dark).
- Step 4 (rule 12, no full page suite): `npm test` 1735 + 10 pass (unit 12.9 s, timing 1.4 s, 15 s
  wall), `verify` ok with 13 warnings (<1 s), `check` 0 errors (4 s), `gen-api --check` current
  (<1 s); page specs 9 passed on port 5000 in 2.0 min. Load average 5 to 8; no timing test failed.
- Step 5: doc audit: 909 named paths and 179 file + symbol claims checked; one stale symbol
  (`components.md` `render.ts` `readingOrder`), one missing file (principles `primitives.css`), one
  claim untrue in behaviour (keys, F1).
- Step 6: this tree and the pre-tidy tree (da59607) side by side on ports 5090 and 5091, 1600 and
  768 px, light and dark, three zooms: 12 of 12 views pixel-identical, no console errors.

### Issues & Resolutions
- The page suite's filter `board` matches every spec (TASK-STATUS § Found along the way): ran
  `board-host.spec.ts` and `host-styles.spec.ts` by file name.
- The first screenshot pair differed only in the folder chip (the two seed folders had different
  names); rerun with equal names: identical.

### Caught Beyond the Brief
- F1: a key pressed anywhere on the page (a host's button) reaches every mounted board.
- F2: `unmount` drops a note's unsaved words with no save and no question (contract and the board's
  own note-discard rule).
- F3: Markdown images follow a page-wide module switch (`setMarkdownImages`), not `host.settings`.
- F5: no front door for the board's view and stylesheet; a host imports paths into `apps/board`.
- F6: the tool table, the engine's tools and the nclite reply disagree on `list_apps`, `join`,
  `request_grant`; nclite refuses a plugin whose engine and manifest disagree.
- F7: `packages/client/src` sentences are outside the words check and unlisted; `packages/agent`'s
  exemption reason is untrue for its refusals.
- F10: board CSS keys off generic ancestor names (`.panning`, `[data-dragging]`, `[data-zoom]`).
- F12: app frames read the theme from the document.
- Security: none new. The engine refuses an agent's ✓ and ✗ and a caller-less act (403), and refuses
  path-like board ids (400 or no route).

### Deviations from Plan
- Step 4: no full page suite, three times (the maintainer's rule 12 and this run's brief); the
  orchestrator runs it at the gate.
- Step 2: planted in a scratch copy, not the worktree (the brief).

---

## On Completion

1. Fill in Implementation Notes; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append your own LOG entry to `cortex/LOG.md` — one line ending in a newline, append-only:
   `[[YYYY-MM-DD HH:MM]] [project-tooling] VERIFY_01: what you did → Task: [[cortex-tasks/project/2026-10-26_project-tooling_tidy-up/VERIFY_01_tidy-verification.md]]`
4. Return the `cortex-task-exe` Return Contract, with `REQUESTS` for anything outside your files.
   Never write the set entry or `AUDITED.md`. No commits.
