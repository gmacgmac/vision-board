# T_03_agent-skill: The Agent Skill

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Teach the agent what the new board offers (icons from the built-in set and the project's library, tones, a skin,
a flow's direction) and the layout guidance (a flow in one container, few tidy links between containers), and prove
it on scenarios.

---

## Context

PLAN.md § Decisions 12, 15, 17, 19, 24, 25 and the kickoff answers on icons and tone (points 242, 246). The
icon and tone bullets are the ledger review's row R28 and its § 4 O4 draft; the tone bullets are the maintainer's
own words at point 246. The skill is `skills/vision-board/SKILL.md` (`CODE-MAP.md` § 14); a change to
it merges only after `npm run eval:bot` passes (project rule). The guidance is headline guidance, not hard rules.
The agent never sees bookmarks. The live eval costs money; the maintainer gave his go at kickoff and it runs on Haiku 5.5.

**Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: `skills/vision-board/SKILL.md`, `skills/vision-board/NOTES.md`, `skills/vision-board/scenarios.md`,
  `apps/board/plugin/words/skill-edits.ts` and `apps/board/plugin/skill.ts` (only if the plugin's skill must
  differ), `apps/board/tests/plugin-skill.test.ts`, `tests/evals/bot/scenarios/`, `tests/evals/bot/` checks,
  `packages/format/schema/` descriptions and `packages/mcp/src/words/` (only to fix a tool description that
  contradicts the skill; then `npm run gen`)
- **Files to reference**: the skill's `## Layout: fit the task and the screen`, `## Writing cards`, `## Starting a
  board`, `## Kinds`; `tests/evals/bot/scenarios/draw.ts` (a scenario's shape); the design decisions' DL-01 to DL-03;
  T_01's notes (the icon names, the tones, how a skin and a direction are set); BE_04's notes (`list_icons`,
  `add_icon`, the name rule, what a drawing may hold); BE_01's notes (what `row` and `flow` now draw); the review
  § 4 O4 "The agent's spec, as a few bullets"
- **Skills**: `cortex-architecture`, `vision-board`

> Modify only the files this task owns. Need a change elsewhere? List it under `REQUESTS`.

---

## Steps

1. [ ] **Layout guidance**, short, at the head of the layout section: draw a flow inside one container; link
       across containers rarely, and then with one tidy link; prefer `flow` when cards are linked; let the board
       place and route.
2. [ ] **Icons** (R28), a few bullets: when a node stands for a component (architecture, a pipeline), give it an
       icon; call `list_icons` first and reuse one that fits; only then add one, named for what it shows, not where
       it is used (`x-` then a singular noun, a qualifier after it if needed: `x-encoder`, `x-encoder-audio`; no
       board names, numbers or colours), drawn as the set is (the same box, paths only, one colour, no text); add
       it with `add_icon`, never by writing a file into `.visionboard/icons/`; a name is taken for good, so if
       yours is refused, reuse that icon or pick a more specific name. An icon never replaces the kind. Do not copy
       the list of names into the skill.
2a. [ ] **Tone** (R28, point 246), a few bullets: the kind's own colour is the default; when the kind already says
       it, leave the tone off. Use a tone to set apart the parts of a flow and to show which nodes belong together
       (the same tone means related), for example a flow of many topic nodes. Normally a palette name; a hue only
       when the content has its own colour. A tone never replaces the kind.
2b. [ ] **Direction**: a `flow` container may say `across` or `down`; choose the one that fits the content; the
       person may change it.
3. [ ] **Skin**: set a board's skin when making it, `command-lens` for operational boards with many answers,
       `default` otherwise; the person may change it.
4. [ ] Remove or reword anything the overhaul made untrue (the footer's buttons, flag). Keep the skill within its
       size limit; cut before you add.
5. [ ] **Scenarios**: add two, a linked pipeline (pass: one container, linked cards, at most one link between
       containers) and an architecture board (pass: `list_icons` called before any `add_icon`; built-in names reused
       where one fits; any added name follows the rule; no file written into `.visionboard/`; valid tones, used to
       group, not on every node; kinds still chosen by meaning). Run `npm run eval:bot -- --dry`.
6. [ ] **Live run** (the maintainer gave his go at kickoff, point 219B): `npm run eval:bot -- --model haiku --port
       7310` (default cap 3 US dollars). Haiku 5.5 is the reference model on purpose: a skill that works on the
       smallest model works more deterministically on the stronger ones. Run it once; if a scenario that passed before now fails, fix the skill, not the scenario.
7. [ ] Bump the skill's version in its front matter, add the version's section to `NOTES.md` and the versioned
       test to `plugin-skill.test.ts`.

---

## Validation

- [ ] `npm run verify`, `npm test` pass (the skill's size and version tests among them)
- [ ] `npm run eval:bot -- --dry` passes; the live run's report is in your notes with its cost
- [ ] No sentence in the skill tells the agent to tick, cross, bookmark or choose for the person
- [ ] No sentence in the skill tells the agent to write a file into `.visionboard/`; the icon and tone bullets are
      a few lines each

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
   [[YYYY-MM-DD HH:MM]] [board-agent] T_03: [what you did] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/T_03_agent-skill.md]]
   ```

   Cite files by path + symbol, never by line number. Never write the set's entry or to `AUDITED.md`.
