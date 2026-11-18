# VERIFY_01_testing: Final Verification

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Prove the set against PLAN.md § Success Criteria with the full gates, and use the timeline as its user would, in both
skins, light and dark, reporting every finding with its evidence. Change no code.

---

## Context

You are the persona in TASK-STATUS.md: you plan launches on boards like this every week and have no builder context.
Read PLAN.md § Decisions and § Design review, then the notes of every task. The flag is still on only by `?flags=
timeline`. This is the one run of the full page suite in the set.

**Read previous task notes in TASK-STATUS.md before starting.** Wave 4, alone, in `.claude/worktrees/app-window`,
`VB_TEST_PORT=8210`.

---

## Inputs

- **Files to modify**: this task file and your TASK-STATUS row only (findings go in your notes and `REQUESTS`).
  Interim files (scripts, screenshots, ledgers) in `temp/verify01/`.
- **Files to reference**: PLAN.md, every task's notes, `design/mockups/timeline/`, `docs/specification/api.md`
  § Ledger v21, `components.md` § The timeline, the `pattern.json` files of `node`, `markdown` and `timeline`,
  `skills/vision-board/references/timeline.md`.
- **Skills**: `cortex-docs` (the doc audit: every claim the set added names a symbol or test that exists and says what
  the code does), `design:design-critique` (the look against the pages), `design:accessibility-review`.

---

## Steps

1. [ ] **Gates**, each with its time limit (PLAN.md § Tests): `npm run verify`, `npm run check`,
   `npm run gen -- --check`, `npm test`, then the full page suite once:
   `nice -n 15 env VB_TEST_WORKERS=3 VB_TEST_PORT=8210 npm run test:pages` (35 min), `npm run test:plugin`,
   `npm run test:plugin:webkit`, `npm run eval:bot -- --dry` and `--dry --standalone`. A failure: rerun that spec alone
   once; if it fails again, check it on the commit before the set (`git stash` is not allowed: use
   `git worktree add temp/verify01/before <commit>` and remove it after) and report which it is.
2. [ ] **The contract**: by the API (a temp project, a server on 8210): write dated cards in each of the four forms and
   each habit of decision 2; read them back normalised; each refused form answers with the four forms; an app card is
   refused; a rewrite without the key takes the card off the line; `show_layout` reports the line in drawn order and
   the rest as before. A format-20 copy of a fixture migrates to 21 with only `v` changed.
3. [ ] **As the user**, `?flags=timeline`, a board of a made-up launch plan written by the API: ten dated cards across
   two years, two on the same day, one with a time, a week of three entries, a decision that asks, a tone, an icon
   card, three undated risks in the same container, a link; then:
   - read the dates at a glance at 100%, 50% and 25%; the order, the alternation, the years, the band;
   - answer the decision; comment; bookmark; Save for later; history; Move to another container and back;
   - try to drag a dated card in both skins; drag an undated card; Reset places;
   - switch the container to Down, then Auto; switch its layout to grid: the line stays;
   - the same in Command Lens; the same in light and dark; Tab through the cards; a screen reader's reading of the
     date line (the accessible tree);
   - compare each look with the pages (`design:design-critique`), and every date colour, line, stem and dot with its
     APCA tier.
4. [ ] **Flag off**: the same board draws as an ordinary board, no header, no line; nothing else changed.
5. [ ] **Docs audit** (`cortex-docs`): api.md § Ledger v21, components.md § The timeline, the three `pattern.json`
   files, plugin.md, words.md, the skill reference: each claim checked against the code; a false claim is a finding.
6. [ ] **Report**: in your notes, a table of findings (must fix before T_03 / should fix / later), each with evidence
   (spec, screenshot path, measured Lc, steps), and the gates' results with times.

---

## Validation

- [ ] Every success criterion of PLAN.md marked met or not, with evidence
- [ ] The full page suite ran once, its result and time recorded

---

## Constraints

- Change no code, test, doc or screenshot. No git commands that change state, except the temporary `git worktree
  add`/`remove` in step 1 under `temp/`. Never port 4466; never a real ledger. No PII.

---

## Implementation Notes

_To be completed by agent after task completion._

**Status**: Pending  
**Completed**: YYYY-MM-DD HH:MM  

### Findings
- 

### Gates
- 

---

## On Completion

1. Fill in the notes; set **Status** to `Completed`.
2. Update your row and notes block in [TASK-STATUS.md](./TASK-STATUS.md).
3. Append your own LOG entry to `cortex/LOG.md`, one line, append-only:
   ```
   [[YYYY-MM-DD HH:MM]] [board-layout] VERIFY_01: [result] → Task: [[cortex-tasks/board/2026-11-18_board-layout_timeline/VERIFY_01_testing.md]]
   ```
4. Return block: `TASK_ID`, `STATUS`, `FILES`, `VERIFICATION`, `REQUESTS` (the must-fix findings, for the
   orchestrator to plan as `FIX_NN`), `NOTES`.
