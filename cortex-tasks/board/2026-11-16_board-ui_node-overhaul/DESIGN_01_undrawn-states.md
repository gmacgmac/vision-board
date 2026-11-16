# DESIGN_01_undrawn-states: The States Nobody Drew

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Give every state of today's node that the mockups never drew a place on the new node, in both skins, as pages the
maintainer can open and agree before the node is built.

---

## Context

The chosen designs (`design/mockups/node-skins/`) show: at rest, bookmarked, notes, updates, New, waiting, ticked,
crossed, selected, agent replied, the number menu, history, right-click, a narrow node. Today's node has more
(`packages/ui/src/node/pattern.json`, `CODE-MAP.md` § 1). This is a design task: you write mockup pages only. The
settled rules in PLAN.md § Decisions are not reopened; you only place what is missing.

**Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: `design/mockups/node-states/` (new), `design/README.md` (one row for the new folder)
- **Files to reference**: `design/mockups/node-skins/*.html` (copy their styles: these pages are the look);
  `packages/ui/src/node/pattern.json` (every state and part the node has today); `packages/ui/src/node/node-template.ts`
  (`bottomTabs`, `proposalsMarkup`, `handoverMarkup`, `tabs`); `docs/specification/components.md`
- **Patterns to follow**: each page is standalone HTML and CSS like the pages in `node-skins/`, with a dark and a
  light version; no script needed; keep each file under 300 lines or split it

> Modify only the files this task owns. Need a change elsewhere? List it under `REQUESTS`.

---

## Steps

1. [ ] List every state, part and tab of today's node from `pattern.json` and the template. Mark each as drawn in
       `node-skins/` or not. Put the list in your notes.
2. [ ] For each undrawn one, place it on the new node in both skins. At least: a proposal waiting (the agent
       proposes a tick or a cross; the person accepts or rejects), the handover box and "Awaiting", saved for later
       (the node in the Later container, and how to bring it back), moved by you (today's ◆), a board that is locked
       or read-only (marks that can't be pressed), a write that failed (a mark shows its error until the next
       press), the "N updates" stepper inside the history box, tags, emphasis, a node being dragged, keyboard focus
       on the node and on each mark, hover on each mark, and an app node's states.
3. [ ] Start from PLAN.md § Planner's calls 6 and 9 (tabs stay on the bottom border between the badge and the notes
       mark; history holds the stepper). Where a state has two honest answers, draw both side by side and say which
       you recommend and what the other costs. Never more than three.
4. [ ] Hold the rules: nothing on a node at rest is a control except its edge marks; the disc, the icon tile and
       the notes mark share one vertical line; a mark's hit area is at least 24 px; colour is never the only signal.
5. [ ] Render every page in dark and light (Playwright is in `node_modules`; write screenshots to `temp/`), look
       at each one, and fix what is misaligned, clipped or unreadable before you finish.
6. [ ] Write `design/mockups/node-states/README.md`: one line per state saying where it sits and why, and a short
       list of the choices that need the maintainer's answer.

---

## Validation

- [ ] Every state in step 1's list is drawn or named as unchanged, in both skins, dark and light
- [ ] The pages open from the file system with no network (fonts fall back) and no console error
- [ ] `npm run verify` passes (the new files are within its length rules)
- [ ] Your return block lists the open choices; the orchestrator takes them to the maintainer before wave 3

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
   [[YYYY-MM-DD HH:MM]] [board-ui] DESIGN_01: [what you did] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/DESIGN_01_undrawn-states.md]]
   ```

   Cite files by path + symbol, never by line number. Never write the set's entry or to `AUDITED.md`.
