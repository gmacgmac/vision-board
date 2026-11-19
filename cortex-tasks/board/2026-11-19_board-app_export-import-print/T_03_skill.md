---
skills: [cortex-architecture]
---
# T_03_skill: The Agent Learns Export and Import

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

PLAN.md decision 7: an agent exports through `get_board`/`show_container` with `export: true` and imports through
`write_board`'s `import` mode. The skill says so in the fewest words, in a reference read at the point of use (the
plugin skill stays within its 8,192-byte cap; nothing in core unless a bullet fits).

## Steps

1. `skills/vision-board/source/references/` (a new `files.md`, or a section of an existing reference: choose the
   smaller), built into both builds (`npm run build:skill`); core points at it only if bytes allow.
2. Eval scenarios (`tests/evals/bot/scenarios/`): "copy this board into a new one" (export then import, no ✓/✗ sent),
   "bring this exported file into the board" (import mode, reply's drops relayed).
3. Dry evals in both hosts; live Haiku once per host within the default caps (approved pattern: timeline T_02).

## Where

`.claude/worktrees/app-window` after wave 2 merges. Port 8910. `npm run eval:bot` passes before merge.

## Constraints

No git commands that change state. No PII. Deviation: stop and report. Report the eval spend.

## On Completion

Fill Implementation Notes, update your row, one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-agent] T_03: [what changed] → Task: [[cortex-tasks/board/2026-11-19_board-app_export-import-print/T_03_skill.md]]`

## Implementation Notes

**Status**: Completed (2026-11-19), in `.claude/worktrees/app-window`, nothing committed. Skill v3.37.

**What changed**
- `skills/vision-board/source/references/files.md` (new, 1,596 bytes, both builds): the export read, the `import` mode
  (`new` / `current`), the file as it is, a copy as export then import, what an agent's import leaves behind (D-108) and
  no `propose` of the marks, the chat as "Done." plus one plain line (never the `dropped` paths, which answers the
  agent side of BE_01's pointer-first words request), and the retry: fresh keys mean a retried import writes twice, so
  read the board first. Kept because it reverses the core's "a key guards a retry"; `into: "new"` answers `conflict` on
  a retry, so the risk is a second board under another id or a doubled `current`. No scenario can make a call time out:
  this sentence is not proven live.
- `core.md`, Starting a board: "- To copy a board or bring in an exported file, read `references/files.md` first."
  Room in the plugin build: "(large, medium)", "(same tone, related)" and Retiring's "still" cut (43 bytes). Plugin
  `skill.md` 8,187 of 8,192 (was 8,148); standalone `SKILL.md` 19,010. `differences.md` status v3.37.
- Eval: `scenarios/copy-board.ts` (56), `scenarios/import-file.ts` (57, two turns: the bot draws its own board, so no
  grant is needed standalone), `scenarios/files-checks.ts`; both in `SCENARIOS` and `STANDALONE`. Harness: a turn's
  `say` may be a function of the stage (as `send` is), the stage has the bot's `cwd`, `Reference` has `files`.
- Tests: `plugin-skill.test.ts` (v3.37 test; the reads list; the v3.30 heading phrase without "(large, medium)"),
  `plugin-build.test.ts` (FILES has `references/files.md`). Docs: `plugin.md` § The folder lists `files.md` and cites
  the v3.37 test. `NOTES.md` § Skill v3.37, `scenarios.md` 56-57 (status v3.37).

**Verification** (normal tier: the skill, its tests, the eval harness): `plugin-skill.test.ts` + `build.test.mjs` 20/20;
`plugin-build.test.ts` 10/10; `bot-eval.test.ts` 7/7 (dry, both hosts, good and bad); `tsc -p tsconfig.json` clean;
`npm run verify` ok (47 warnings, none on touched files); dry `--only copy-board,import-file` 19/19 in both hosts, the bad
scripts fail what they break.

**Live Haiku 5.5** (approved; default caps, never raised). Spend: **$0.5875 as the eval counts it, $0.0875 billed**.
- Plugin, `--only copy-board,import-file,summary-card,linked-pipeline`: 33/35, 4 runs, $0.0139. copy-board: every check
  but `done-only` (it recapped the copy). import-file: imported the file unchanged into its own board, every drop named
  in one plain line, but read no reference (`reads-references`): the person said "bring it in", the line said "import a
  file". Fixed after: "never what came across" in the chat line; the core line says "bring in an exported file".
- Standalone, all 16, on the fixed build: 120/130, 16 runs, $0.5736 ($0.0736 billed + $0.50 the eval counts for a run
  the stall watchdog killed). copy-board passed every check. handover-park stalled once (the known stall) and passed on
  retry; that retry was the 16th run, so **import-file did not run standalone**. Misses outside this change: flow-branches
  read no reference; radial-ideas linked its ideas and narrated; timeline-plan's week body opened "Week of 15 November."

**Caught Beyond the Brief** (prompt engineer)
1. **Owed: a live run of import-file on the reworded line**, in either host (one or two runs, about $0.01). The reword
   is backed by one plugin miss; `--max-runs` could be lowered to fit, never raised.
2. **The plugin skill has 5 bytes left.** The next core line needs a cut first.
3. **A copy keeps the source's title** (`into: "new"` titles from the file), so the picker shows two "Hiring plan"s.
   The standalone bot said "You may want to rename it". Not taught: no failure shown, and the person renames boards.
4. **Notes on an agent's import** follow D-108 (dropped and named). If BE_01's open ruling changes that, the "What stays
   behind" line changes with it.
5. **Not taught**: saving an export to a file for the person (a `.vboard.json` with Write). No scenario asked for it,
   and the page's Export does it once `boardFiles` is on.
6. **The run cap and the plugin list**: `SCENARIOS` is now 20 and `STANDALONE` 16 (the default `--max-runs`), so a
   standalone run with one retry drops the last scenario, as here. The dry test's `maxRuns: 20` equals `SCENARIOS`: the
   next plugin scenario needs it raised.
