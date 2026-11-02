---
task_name: Plugin Types And Seam Version
created: 2026-11-02
completed: 2026-11-02
status: completed
categories: [board-app]
type: implementation
model: standard
persona: Platform engineer who maintains an SDK used by several apps — a host learns of a breaking change from its compiler or from a version check, never from a broken page.
skills: [cortex-architecture, cortex-docs]
tracker:
---

# Task: Plugin Types And Seam Version

## Problem Statement

The maintainer decided (points 377.4, 377.5, 2026-11-02): the plugin folder (`dist/plugin/board/`)
ships (a) a generated `plugin.d.ts` so a TypeScript host (nclite) type-checks against the seam, and
(b) a seam version in its manifest so a host can tell whether a new folder speaks a seam it can host.
The aim is one plugin for every host: what the board gains, every host gets, safely. Also write into
`docs/specification/plugin.md` the decided home of the board folder in nclite (point 377.1).

## Steps

1. Read `docs/specification/plugin.md` (open points 1, 9, 10; § What nclite needs), `apps/board/plugin/`
   (`view.ts`, `engine.ts`, `manifest.ts`, `manifest.schema.json`), `apps/board/src/board/host.ts`,
   `apps/board/bin/build-plugin.ts`, `apps/board/bin/validate.ts`, and the plugin contract tests in `tests/plugin/`.
2. **Types:** generate `plugin.d.ts` from the existing types at build (`build-plugin.ts`), one source,
   no hand-written copy; it covers `mount` and its `BoardHost`/`BoardView`, and the engine. Prefer the
   TypeScript compiler already in the repo; no new dependency without stopping to ask. A test proves the
   emitted file compiles against a small host that uses every member, and fails if a member is removed.
3. **Seam version:** a `seam` integer in the manifest (schema first: `manifest.schema.json`, then
   `manifest.ts`), starting at 1. One home for the number. A test fails when the seam's types change
   without the number changing (for example a checked hash of the emitted `plugin.d.ts` beside the
   number), so a bump is never forgotten. State the rule in `plugin.md`: what is a breaking change, when
   the number moves, what a host does with it.
4. **377.1 in `plugin.md`:** the whole board folder (`.visionboard`, its images and apps) lives inside
   each bot's workspace in nclite; each bot has its own board; a bot writes pictures straight into the
   board's images folder and the engine reads them with its usual checks; no `put_image`. Accepted for
   now: the bot can reach the ledger file; splitting it out is a later option. Close open points 1, 9, 10.
5. Gates at `nice -n 15`: `npm run map`, `npm run verify`, `npm run check`, `node scripts/gen-api.mjs --check`,
   `npm test`, `npm run test:plugin` (`VB_TEST_WORKERS=3 VB_TEST_PORT=5010`). Page suite not needed
   unless you touch page code.

## Constraints

- Work only in the worktree you are given (branch `feat/plugin-types`). No commits, no git history.
- You own `docs/specification/plugin.md` in this round; another task may send you no edits there.
- Never port 4466 or 4600–4999, 5200–5399. Tests `nice -n 15`, at most 3 workers.
- No protected files. Don't write `cortex/LOG.md` or `cortex/AUDITED.md`.
- STOP and report if the types can't be generated without a new dependency.

## Implementation Notes

**Types.** `apps/board/bin/plugin-types.ts` `pluginTypes` makes `plugin.d.ts` with the repo's own TypeScript (no new dependency): it
starts at the exported declarations of `plugin/view.ts` and `plugin/engine.ts`, follows every interface and type alias they reach
(through `#` names too), and copies each as written with its comments. A `Pick`/`Omit` is opened to its members; a `typeof` is
written out as its literal type; anything else (a class, an enum, an `import()` type) stops the build. Written into the folder by
`textFiles()`; the sentences it prints are in `server/words/bin.ts`.

**Changes to existing types so the seam is exactly what the spec promises** (all type-level; runtime unchanged):
- `plugin/view.ts`: `mount(root, host: PluginHost)`, `PluginHost = Omit<BoardHost, 'page'>` (the file no longer carries `BoardPage`,
  `BoardPageParts`, `PagePart`); `PluginView.status` is `PluginViewStatus`, whose `now` is `PluginStatus` = the five fields the spec
  named (`boardId`, `title`, `counts`, `unsaved`, `chatWork`), not the wide `BoardStatus` (which would have put the ledger event
  types in the seam). `BoardStatus` is now exported from `src/board/index.ts`.
- `src/board/host.ts`: one comment named nclite (`BoardView`'s doc); reworded, because the folder may not name a host.

**Seam version.** `apps/board/plugin/seam.ts`: `SEAM = 1`, `SEAM_TYPES` (sha256 of the types' tokens, comments and layout ignored),
`TYPES_FILE`. `manifest.schema.json` then `manifest.ts`: `seam` required, integer >= 1. `build:plugin` fails with the rule when the
hash is stale (`seamProblem`); `apps/board/tests/plugin-types.test.ts` does too. The hash catches every change to the types; it
cannot tell breaking from additive, so the author decides (the message and `plugin.md` say how).

**Tests.** `plugin-types.test.ts` (new): a host using every member compiles against the emitted file (own copy of the compiler
program, libs cached); each of the ~150 members taken out in turn fails the compile (one survivor by construction: `Round.text`,
also `ChipText.text` in the same intersection); the seam hash. Also `plugin-build.test.ts` (file list, `seam`, types equal
`pluginTypes()`), `tests/plugin/engine-hooks.spec.ts` + fake host (`SEAM_WRITTEN_FOR`: a host reads `seam` first, `plugin.d.ts` is there),
`spec-truth.test.ts` (names `PluginViewStatus` and the five status fields).

**plugin.md.** New section "The types and the seam version" (what is breaking, when the number moves, what a host does); folder
table, `mount` signature, `PluginHost`, status row and manifest table updated; open points 1, 9, 10 marked Settled (377); new
subsection "Where the board lives in nclite" (377.1) under the last section, where nclite may be named.

**Gates** (`nice -n 15`): `npm run map`, `verify` (ok, only existing warnings), `check`, `gen-api --check`, `npm test` (2204 + 14
pass), `test:plugin` with `VB_TEST_WORKERS=3 VB_TEST_PORT=5010` (79 pass). Page suite not run: no page code changed beyond one type
export and a comment.

**Not done / for the maintainer.** The plugin's `skill.md` still has no Images section for a host (point 377.1 says a bot writes
into `images/` itself): that is a change to `plugin/words/skill-edits.ts` and the skill, a separate task. `plugin.md` says so in
open point 1.
