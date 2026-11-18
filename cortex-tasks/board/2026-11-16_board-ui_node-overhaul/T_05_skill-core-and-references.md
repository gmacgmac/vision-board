# T_05_skill-core-and-references: One Skill Source, a Core and References

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

Restructure the agent skill so one source builds both the standalone skill and the plugin skill: a small core every
agent reads, and references it reads only when the request needs them (progressive disclosure). The maintainer's
strategy, 2026-11-18, points 479 to 483. Then prove it live on Haiku 5.5.

## Strategy (maintainer)

1. **One source, two builds (479)**: the standalone `skills/vision-board/SKILL.md` and the plugin's skill are built
   from the same core and reference files. Today the plugin skill is made by cutting sections out
   (`skill-edits.ts`, 8,192 bytes): that cutting stops. Differences between the builds are listed in one place.
2. **The core, always read, as small as it can be (480, 481)**: the default board (kinds, Markdown, the answering
   loop, Add note and Ask now); the layout headlines (DL-01 to DL-03); **the icon library** for every board (list
   first, reuse, name for reuse, add through `add_icon`, never write a file); **colour** (a node's tone: the kind's
   colour by default, a tone to set parts apart and show what belongs together, a palette name or a hue); **the two
   skins as headlines only**: what each is good for, that both offer the same actions, that the agent chooses one when
   it makes a board and it stays the board's skin unless the person changes it. Details live in references.
3. **References, read on demand (481)**: architecture (laying out a system, icons and tones in depth, Command Lens in
   depth), layouts (each mode and when to use it, flow direction and branching), handover (the "Handover" section in
   Markdown), apps (standalone only; apps are self-contained so they stay portable). Timeline joins when it is built.
   Each reference is a short file beside the core; the core names when to read each.
4. **The plugin build (482)**: the core and the same reference files ship inside the plugin's folder (the host, nclite,
   reads files); apps is left out (the host makes its own artifacts); architecture, Command Lens and the rest stay.
   `docs/specification/plugin.md` names the files; an addition, nothing a host relies on changes.
5. **Tests (483)**: a scenario per mode (default, architecture, layouts, handover; apps standalone only), each checking
   the agent read the right reference and not the others; layout scenarios (straight pipeline, a flow that branches
   and rejoins, a grid of findings, lanes, radial relationships, the header's direction default respected). Then the
   live runs.

## Steps

1. Read the current skill, `NOTES.md`, `scenarios.md`, `skill-edits.ts`, `plugin-skill.test.ts`, the eval harness
   (`tests/evals/bot/`), and how the plugin build packs the skill (`apps/board/vite.plugin.config.ts`, `plugin.md`).
2. Write the core and references; build both skills from them (one script or build step; generated outputs checked by
   a test, never hand-edited). Words that agents read stay in their words homes.
3. Scenarios per (5); `npm run eval:bot -- --dry` and `--dry --standalone` green.
4. Live, approved by the maintainer (point 462): `npm run eval:bot -- --model haiku --port 7310` and
   `npm run eval:bot -- --standalone --model haiku --port 7310`, each once. A run that stalls (no stream line for a
   minute) is a harness fault: add the stall watchdog in `tests/evals/bot/model.ts` first (kill after ~60 s of silence,
   count it as a crash, retry once). Report cost and per-scenario results. Never raise a spend cap.
5. Bump the skill version, `NOTES.md`, the versioned test.

## Where

`.claude/worktrees/app-window` (branch `spike/stage-apps`), `VB_TEST_PORT=7310`. Run after T_04.

## On Completion

Fill Implementation Notes, update your TASK-STATUS row, append your own LOG line:
`[[YYYY-MM-DD HH:MM]] [board-agent] T_05: [what changed] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/T_05_skill-core-and-references.md]]`

## Implementation Notes

**Status**: Pending
