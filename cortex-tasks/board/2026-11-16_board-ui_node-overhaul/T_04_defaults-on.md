# T_04_defaults-on: Switch Over and Remove the Old

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

After the maintainer's yes, make the new node the only node: remove the flags this set added and every old code
path they kept alive, renew the screenshots once, and write the follow-up rows. The maintainer wants no legacy left
(kickoff, points 230-231).

---

## Context

Runs only after VERIFY_01's blocking findings are fixed and the maintainer has used the board with the flags on and
said yes (the orchestrator holds this gate). Until now every existing screenshot was unchanged; this task changes
most of them, once.

**Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: `packages/format/src/flags.ts` (defaults and descriptions), `packages/format/src/node-types.ts`
  (an app node offers no Save for later), `packages/tokens/src/tokens.css` (Decision's colour becomes the token's
  own value; the `[data-vb-edges]` scope goes), tests that assert a default, `tests/pages/__screenshots__/`,
  `tests/plugin/` baselines, `docs/specification/` where a doc says "behind a flag",
  `cortex-tasks/board/2026-11-11_board-ui_app-window-handover/design-decisions.md` (mark what is now built)
- **Files to reference**: VERIFY_01's report; each task's list of changed baselines
- **Skills**: `cortex-architecture`, `cortex-docs`

> Modify only the files this task owns. Need a change elsewhere? List it under `REQUESTS`.

---

## Steps

1. [ ] Remove `nodeEdges`, `skins`, `layoutControl`, `flowDirection`, `appWindow`, `appStage` and BE_01's flag
       (unless the maintainer held one back; the orchestrator says which), so the new behaviour is the only
       behaviour. Delete the old code paths they guarded, with their tests, gallery entries, words and doc lines: the
       old footer (`node-template.ts` `footer`, `bottomTabs`, `flagButton`, `sizeControl` and their CSS and
       handlers), the note bubble modes FE_03 replaced, the mode popover FE_07 replaced, and anything else a flag
       kept alive. Old ledger lines are handled by the ledger migration the plan names, never by a second reader.
       A search for each removed symbol and flag name finds nothing outside `docs/decisions.md` and `cortex/`.
2. [ ] Make Decision's colour the token's value; remove the scoped rule. Put the `tokens.css` diff in your notes.
3. [ ] `NODE_TYPES.app` no longer lists Save for later; an old ledger with a saved app card still opens.
4. [ ] Renew the page and plugin screenshots once (`--update-snapshots`), then look at a sample of at least 40
       across specs, light and dark, before accepting them; list any that look wrong and fix the cause, not the
       picture.
5. [ ] Run every check, the full page suite and the plugin suite.
6. [ ] Write the follow-up tracker rows as text in your return block for the orchestrator to add: fold the kind, action and mode icon records into the icon set; a hover pause on the number, if wanted; seen on a read-only board
       (DO-05); which layout modes to keep (U16's decision); anything VERIFY_01 left as "should fix".

---

## Validation

- [ ] `npm run verify`, `npm run check`, `npm test`, `npm run gen -- --check`, `npm run test:pages`,
      `npm run test:plugin` pass
- [ ] A board opened with no `?flags=` draws the new node in its skin
- [ ] No flag from this set and no old node code path remains; the removed symbols are listed in your notes

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
   [[YYYY-MM-DD HH:MM]] [board-ui] T_04: [what you did] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/T_04_defaults-on.md]]
   ```

   Cite files by path + symbol, never by line number. Never write the set's entry or to `AUDITED.md`.
