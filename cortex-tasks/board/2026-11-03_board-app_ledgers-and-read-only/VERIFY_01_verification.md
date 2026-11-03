# VERIFY_01_verification: Verification

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

With fresh eyes and both flags on, find whatever would lose, fork or expose data, or confuse the person, in ledgers and
read-only, and write each finding with a way to reproduce it. Change no code.

## Context

You are a user of the board, not its builder: read PLAN.md's Problem Statement, Decisions and Success Criteria, then
use the board; read task notes only after you have formed your own view. Everything runs on scratch projects in the OS
temp folder, never the repo's own `.visionboard/`, never port 4466 (your block: 7100).

## Inputs

- **Files to modify**: `VERIFY_01_findings.md` (new, this folder), this task file
- **Files to reference**: PLAN.md; every task's notes; `docs/specification/{api,components,plugin,chat}.md`
- **Skills**: `cortex-docs` (the doc audit), `cortex-architecture` (to judge structure)

## Steps

1. **The move**: copy a real-shaped old-layout folder (a ledger of a few hundred lines, `agents.json`, `images/`, an app,
   app state, chat sessions, attachments, a `.gitignore`) into a temp folder; open it with `ledgerFolders` on; compare
   every file byte for byte before and after (a checksum list); `npm run ledgers:undo -- <folder>`; compare again.
   Try it with a live lock held by another process; with `main/` already there; interrupted part-way (kill the server
   between renames, by a test hook or a breakpoint) and reopened.
2. **Two machines, one folder**: two servers (different `HOME`, different hostnames through `LockEnv` or env if the code
   allows, else two processes) on one folder, as Dropbox would sync it: one edits, one reads; the reader follows every
   line; the reader's Edit names the writer; the writer stops, the reader edits; the old writer's server, restarted,
   is read-only. Replace the ledger file under the reader (a longer and a shorter history, as `git pull` would); the
   reader shows exactly what is on disk.
3. **Read-only writes nothing**: with the folder made read-only on disk (`chmod -R a-w`), open, browse every board,
   press every control: no error toast for a write the page should never have tried, and nothing written anywhere in
   the folder (compare listings and checksums).
4. **Agents**: an MCP agent (`packages/mcp`, real stdio) joins `main`, reads, writes; the person switches to `ui`; the
   agent's next call stops with `wrong-folder` naming both ledgers; in read-only, the agent reads (and is told
   `readOnly`) and every write is `read-only`; it reads `scratch` with `ledger` and draws a summary on `main`.
   Try an agent reading another ledger's `agents.json` through the chat's file tools (Claude and Kiro rules): refused.
5. **The header**: at 1400, 900 and 600 px, light and dark: folder / ledger / board / version; the ledger list and New
   ledger… (bad names, "Keep out of git" and then `git status` in the temp folder); the read-only chip and Edit at every
   width; every disabled control says why; keyboard only; screen reader names (axe).
6. **The plugin**: the fake host with the engine read-only: writes refused, reads marked, the view's controls disabled;
   without the option nothing changed (`npm run test:plugin`).
7. **Flags off**: both off, the board behaves as at `checkpoint/before-ledgers` (spot-check the main flows and a sample
   of page specs).
8. **Doc audit** (`cortex-docs`): every claim the set added or changed in `docs/specification/` names a symbol and a
   test that exists.
9. **Findings**: `VERIFY_01_findings.md`: F1, F2, … each with severity (blocking: data lost, forked or exposed, a write
   in read-only, a secret readable; non-blocking: the rest), steps to reproduce, what was expected, what happened,
   and the file + symbol you suspect.

## Validation

- [ ] Every step above done or its reason for not being done written
- [ ] Findings written; blocking ones first

## Implementation Notes

_To be completed by the agent. Re-run? Add a `### Run N` block; never overwrite an earlier run._

**Status**: Completed (Run 1, 2026-11-03)

### What was checked
- Steps 1-8 all done, on scratch projects under the OS temp folder (removed), servers on 7110-7170, never 4466; no code
  changed. Two computers = two servers on one folder with their own `HOME` and port (same host: `LockEnv` can't be set
  from outside a test); a stale lock simulated by ageing its `beat`; an interrupted move by a folder that can't be
  renamed (instead of a kill between renames).
- Steps not done as written: a real chat CLI after Stop editing (F2, from the code: no sign-in under a temp `HOME`);
  keyboard and axe by hand (the read-only and ledgers page specs cover them and pass).
- CONSOLIDATE_01-R4: both defaults flipped in this worktree's `flags.ts` only, run, restored byte for byte, rebuilt;
  `git status` clean.
- Requests weighed: LEDGERS_01-R6 → F3 (blocking), READONLY_01-R6 → F2 (blocking), READONLY_UI_01-R2 → F6,
  LEDGER_UI_01-R3 → F15 (tracker), CONSOLIDATE_01-R4 → F4 (21 unit as reported; 13 page, not 4).
### Findings summary
- [VERIFY_01_findings.md](./VERIFY_01_findings.md): 15 findings, 4 blocking. F1 a watcher of an old-layout folder,
  after another server moved it, shows nothing and its Edit forks a second ledger at the old place; F2 a chat keeps
  writing `images/`/`apps/` after Stop editing, and into every ledger's folder; F3 chat sessions cross ledgers on
  same-id boards and re-key an agent into the other ledger; F4 the flag-on test list. Not blocking: F5-F15 (a
  flags-off server forks a moved folder; no `editing` event on a lost lock; a waking writer re-beats its lock; Edit on
  an unwritable folder is a 500; the Edit menu under the access bar; enabled write controls; page flags separate from
  the server's; reads after a switch; part-way move advice; last ledger by unresolved path; `pageStore`).

### Run 2
**Status**: Completed (2026-11-03, re-check after FIX_01; worktree `verify-01-run2` at fface1c, ports 7150-7199).
- Re-ran Run 1's reproductions: F1 (watcher A, mover C, A's Edit, a fresh D, `ledgers:undo` under watchers, a vanished
  file), F2 (the gate's open-ledger verdicts after Stop editing and a lost lock, another ledger's write rows: FIX_01's
  tests and the code path; no real CLI), F3 (same-id boards in two ledgers), F4 (both defaults flipped in `flags.ts`,
  unit 2242/2242, the 10 related page specs 108/108, three more groups; restored, sha1 `f9cd6c7…`, no diff).
- Spot-checked F5-F9, F11 (read-only half), F12-F14: fixed. Judged FIX_01's three left items (F10, F11 chip half,
  F2 app process): not blocking.
- **Blocking left: F16** — `tests/pages/host-styles.spec.ts` "the gallery's samples … draw the same under a host's
  element rules" (light and dark) fails with both defaults on, at the New ledger dialog sample. New, not blocking:
  N1 (orphan agent hash on a refused join), N2 (`look`'s first beat only notes), N3 (401 on the first write after a
  vanished file returns). Details: [VERIFY_01_findings.md § Run 2](./VERIFY_01_findings.md).

## On Completion

Notes; your row; one LOG line (`[board-app] VERIFY_01: …` → this file, one line ending in a newline); the return block.
No commit. After FIX_01, the orchestrator runs this task again as a re-check (`### Run 2`) of the blocking findings.
