# VERIFY_01_testing: Final Verification

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Check, with fresh eyes and with the flags both off and on, that the set does what PLAN.md § Success Criteria says,
and report what is wrong. You report; you do not fix.

---

## Context

You did not build this. Use the board as a person would before reading how it was built: open it, read a board,
answer it, comment, ask now, bookmark, zoom, select, switch skin, turn a flow down. Then check it against the designs
(`design/mockups/node-skins/`, `design/mockups/node-states/`) and the decisions (PLAN.md § Decisions).

**Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: none in `apps/` or `packages/`. You may add `temp/` files and write your report in this
  task's notes
- **Files to reference**: PLAN.md; every task's notes in TASK-STATUS.md; `docs/specification/`
- **Skills**: `cortex-docs` (the doc audit), `design:accessibility-review`, `design:design-critique`

---

## Steps

1. [ ] **Flags off**: `npm run verify`, `npm run check`, `npm test`, `npm run gen -- --check`, the full
       `npm run test:pages` (`VB_TEST_WORKERS=3`, `nice -n 15`, 25-minute limit) and `npm run test:plugin`. Every
       one passes with no new baseline beyond those the tasks listed.
2. [ ] **Flags on** (`?flags=nodeEdges,skins,layoutControl,flowDirection,appWindow,appStage` and BE_01's flag): run
       the specs the set added. Then use a real board (seed one in `temp/` from `packages/format/fixtures/`; add a
       board with 30 nodes, built-in and library icons, palette tones and hues, a `flow` container and an app) in a
       browser, in both skins, light and dark, at 20%, 40%, 100%
       and 250% zoom. Walk every row of decision 2 by its mark, its key and right-click. Then the new records, each
       read back from the ledger: Ask now on one node while other answers wait (one `ask` line with its `lines` and
       `context`; the others still unsent; the agent's reply lands in that node's box); a skin change and a rename
       (the skin stays); a flow's Across, Down and Auto, for a container and for the board; a click inside a
       container (one `seen` line with its `head`, and none on a second click that changes nothing); an icon added
       through `add_icon` and used on two boards; a hostile SVG offered to `add_icon` and one dropped into
       `.visionboard/icons/` by hand (neither is drawn).
3. [ ] **Keyboard only**, then with a screen reader's names (the accessibility tree): every mark, menu and box.
       Run axe on the board and the gallery.
4. [ ] **Migration**: in `temp/`, copy BE_02's mixed-format ledger (formats 7 to 19, shaped like the maintainer's)
       and a format-19 ledger with flags, notes, answers and saved-for-later cards; never the maintainer's own
       `.visionboard/`. Open each read-only first (nothing written, same board), then for editing: every line is
       there, in order, with its `seq`; a backup sits in `backups/`; nothing is lost and the flags are bookmarks;
       opening again writes nothing; `npm run ledger:migrate -- <folder> --check` says nothing is left and
       `--undo` puts the backup back. Hand-edit one line to a format above the build's: the ledger opens read-only
       and says why.
5. [ ] **Hosted**: `npm run build:plugin` and the plugin tests; in the fake host, host colours and font still win
       over a skin.
6. [ ] **Contrast and weight**: the contrast tests list every new pair; the page weight is within budget; fonts
       load only for the skin in use; no request leaves the machine.
7. [ ] **Docs** (`cortex-docs` audit): `components.md`, `api.md` (its § Migration and the one-format points among
       them), `apps.md`, `plugin.md`, `words.md`,
       `dependencies.md` and each `pattern.json` say what the code does. List every untrue sentence.
8. [ ] **Design critique** of both skins against the mockups: what differs, what is misaligned, what is hard to
       hit or read. Screenshots in `temp/`.
9. [ ] **For the maintainer**: write, in your notes, how to turn the flags on for his own board and a five-minute
       tour of what to try.

---

## Validation

- [ ] Your report ranks findings (blocking, should fix, note), each with where you saw it and how to see it again
- [ ] Every check in step 1 has its result and time in your notes
- [ ] Nothing in `apps/`, `packages/`, `docs/` or `skills/` was changed by this task

---

## Constraints

- If you need to deviate, stop and tell the maintainer; no breaking change is made silently.
- No PII in examples. Interim files in `temp/`. Writes over 50 lines in chunks.
- No git command that changes state; the orchestrator commits.
- Every flag this set adds stays off by default; existing tests and screenshots pass with them off.
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
   [[YYYY-MM-DD HH:MM]] [board-ui] VERIFY_01: [what you did] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/VERIFY_01_testing.md]]
   ```

   Cite files by path + symbol, never by line number. Never write the set's entry or to `AUDITED.md`.
