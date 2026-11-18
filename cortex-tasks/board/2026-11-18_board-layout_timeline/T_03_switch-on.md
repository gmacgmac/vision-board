# T_03_switch-on: Switch On

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

After the maintainer's yes on the result, make the timeline the board's behaviour: remove the `timeline` flag and its
one gate, as node-overhaul T_04 did ("no legacy"), so nothing points at the flag any more.

---

## Context

PLAN.md decision 25 and call 11. The flag has one gate on the page (FE_02 names it), one row in `FLAGS` and
`FLAG_DESCRIPTIONS` (T_01), a `flag` in `packages/ui/src/timeline/pattern.json` (FE_01) and in the gallery sections
(FE_01, FE_02), and `?flags=timeline` in specs. Run only after the result gate (TASK-STATUS.md) and VERIFY_01's
must-fix findings are closed.

**Read previous task notes in TASK-STATUS.md before starting.** Wave 5, alone, in `.claude/worktrees/app-window`,
`VB_TEST_PORT=8310`.

---

## Inputs

- **Files to modify**: `packages/format/src/flags.ts`; the page's gate (FE_02's notes name it);
  `packages/ui/src/timeline/pattern.json`; `apps/board/src/gallery/timeline-section.ts`,
  `timeline-board-section.ts`; `tests/pages/timeline.spec.ts` and any spec or test naming the flag; the screenshots
  that change; `docs/specification/components.md`, `api.md` and any doc naming the flag.
- **Files to reference**: `cortex-tasks/board/2026-11-16_board-ui_node-overhaul/T_04_defaults-on.md` (how a flag was
  removed with every path).
- **Skills**: `cortex-docs`.

---

## Steps

1. [ ] `grep -rn "timeline" --include=*.ts` and the docs for every use of the flag (`flagOn('timeline')`,
   `flag: "timeline"`, `?flags=timeline`, `FLAG_DESCRIPTIONS`); list them in the notes before changing anything.
2. [ ] Remove the flag's row and description, the page's gate (the view keeps the key), the pattern's and sections'
   flag, and the `?flags=` in specs; the "flag off" spec case becomes "a board with no key draws as before".
3. [ ] Docs: no sentence still says the timeline is behind a flag.
4. [ ] Run `timeline.spec.ts`, `gallery.spec.ts` and every spec whose screenshots change (renew only those, listed in
   the notes); `npm run test:plugin`; the project checks.

---

## Validation

- [ ] `grep` finds no flag named `timeline` anywhere but history (task files, LOG)
- [ ] The named specs, `npm run test:plugin`, `verify`, `check`, `test`, `gen -- --check` pass

---

## Constraints

- Behaviour with the flag on is unchanged; only the switch goes. No git commands that change state. Never port 4466.

---

## Implementation Notes

_To be completed by agent after task completion._

**Status**: Pending  
**Completed**: YYYY-MM-DD HH:MM  

### Changes Made
- 

### Deviations from Plan
- None

---

## On Completion

1. Fill in Implementation Notes; set **Status** to `Completed`.
2. Update your row and notes block in [TASK-STATUS.md](./TASK-STATUS.md).
3. Append your own LOG entry to `cortex/LOG.md`, one line, append-only:
   ```
   [[YYYY-MM-DD HH:MM]] [board-layout] T_03: the timeline switched on, flag removed → Task: [[cortex-tasks/board/2026-11-18_board-layout_timeline/T_03_switch-on.md]]
   ```
4. Return block: `TASK_ID`, `STATUS`, `FILES`, `VERIFICATION`, `REQUESTS`, `NOTES`.
