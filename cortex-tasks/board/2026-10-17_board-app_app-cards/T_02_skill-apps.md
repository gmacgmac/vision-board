# T_02_skill-apps: Skill v3.8: apps and images; scenarios with both agents

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Teach agents to show images in cards and to build and show apps (rule 17), and prove with Claude Code and Kiro that an agent can
build a new one from the skill alone.

## Context

PLAN.md rulings 17, 19-23 and § Goal state line 9. Everything else has landed: read all earlier notes,
`docs/specification/apps.md` and the example `skills/vision-board/examples/apps/calculator/`. Harness
for agent runs: the v3.5-v3.7 runs (`cortex-tasks/board/2026-10-15_board-agent_skill-check-cross-rules.md`
and `2026-10-16_board-ui_replied-word-and-unclear-marks.md` notes): scratch board servers on spare
ports with `HOME` and `VB_PROJECT` in the system temp folder, `VB_KIRO_AGENT=0`, the person's acts on
the page, messages from `promptFor` / `roundOf`; Claude Code `claude -p` with the panel's flags;
Kiro `kiro-cli` with a workspace agent whose prompt is the skill and whose tools are `@vb` plus file
writing in the scratch project only (an app is files).

## Inputs

- **Files to modify**: `skills/vision-board/SKILL.md` (v3.8; a short part "Images in cards": put the
  file under `.visionboard/images/` (subfolders welcome), write `![alt](path)` with real alt text, keep
  png/jpeg/webp/gif under 8 MB, overwrite the file to update it (the person sees it when they select
  the card), never an internet URL; when an image beats words (a screenshot of the page being
  discussed, a diagram). Then a chapter "Apps on the board": when an
  app is the right answer (the person asks for something to use, not to read); the folder and files;
  the manifest; the panel protocol in short, pointing at `apps.md` for the rest; tools and `ctx.env`;
  sizes (`APP_SIZE`) and choosing one that fits the controls; the person must Allow tools, and a code
  change asks again; check `list_apps` for problems before drawing the card; draw the `app` card with
  `app {id, w, h}`; never put secrets in code (use `env` names; the person fills `.env`); start from
  the example), `scenarios.md` (v3.8: new scenarios below), `NOTES.md` (§ Skill v3.8 with the runs).
  Keep `SKILL.md` within its current shape; if it would pass about 400 lines, move the app details to
  `skills/vision-board/apps.md` (skill-local) and link it.
- **Skills**: `cortex-docs` (the skill is a documented surface: claims must match the code).

## Scenarios (add to `scenarios.md`)

1. **Show the calculator**: the example is already in the project's `.visionboard/apps/`; the person
   asks "put the calculator on the board". Pass: one `app` card for `calculator` with a size inside
   `APP_SIZE`, no other files written, the agent tells the person to press Allow.
2. **Build a new app**: the person asks for "a unit converter for kilometres and miles, with the
   maths done by your tool". Pass: a new folder with a valid manifest (`list_apps` shows it valid),
   a panel that follows the protocol, a tool that converts, an `app` card drawn; after the person
   allows it (the harness presses Allow), converting 10 km in the panel shows 6.21 mi (the harness
   drives the panel). No `eval`, no network, no secrets in code.
3. **Show a screenshot**: a test image is in the scratch project's `.visionboard/images/ui/`; the person
   asks "show me the settings screen you mean on the card". Pass: the card's body holds
   `![<real alt>](ui/<file>.png)`, nothing else changed, no internet URL.
4. **Fix a broken app**: the manifest has an error; the person says "the app card says invalid".
   Pass: the agent reads `list_apps`, fixes the manifest, and the card turns valid.

## Steps

1. [ ] Write v3.8 and the scenarios.
2. [ ] Run each scenario with Claude Code and with Kiro (record which model actually ran, as before).
   A failure: improve the skill text (not the scenario's pass line), re-run that scenario with both.
   At most three rounds; then record what still fails.
3. [ ] Gates: `npm run verify`, `npm run check`, `npm test` exit 0.

## Validation

- [ ] Each scenario passes with both agents, or each remaining failure is recorded with its example
  (PLAN.md § Goal state line 9 needs scenarios 2 and 3 to pass in at least one run each).

## Constraints

- No git commits. Stop every server and agent process you start. Never port 4466 or this repo's
  `.visionboard/`. Deviation: TASK-STATUS.md instruction 5.

## Implementation Notes

**Status**: Pending

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-agent] T_02: <what you did> → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/T_02_skill-apps.md]]`
