# PLUGIN_RO_01_plugin-read-only: Read-only for a plugin host

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

A plugin host can open the board read-only: an optional engine option, every write answered `read-only`, every read
marked `readOnly`, the view showing the state from the reads. A host built for `SEAM` 1 still works. The types
fingerprint is set again and whether `SEAM` moves is decided by the rule, not by habit.

## Context

PLAN decision 18. READONLY_01's notes first: it adds `readOnly` to `EngineOptions` (standalone's) and the gate.
Research, 2026-11-03: `apps/board/plugin/engine.ts` `PluginEngineOptions = Pick<EngineOptions, 'dir' | 'name' | 'warn'>
& { flags?: Record<string, boolean> }`; a standalone-only `EngineOptions` member stays out of the seam (as `ledger` and
`onSend` do). `apps/board/plugin/seam.ts` `SEAM` 1, `SEAM_TYPES` (a sha256), `TYPES_FILE`; `apps/board/bin/plugin-types.ts`
(`SEAM_ENTRIES`, `pluginTypes`, `typesHash`, `seamProblem`); `apps/board/tests/plugin-types.test.ts` ("the seam number
cannot stay behind the types…", "a new flag leaves the types alone…"). `docs/specification/plugin.md` § The engine
(member table, proven by `tests/plugin/engine-hooks.spec.ts`), § The types and the seam version, § Standalone's own.
Check whether the new problem code reaches `plugin.d.ts` through `ProblemCode`: if it does, that is part of this
task's types decision.

## Inputs

- **Files to modify**: TASK-STATUS.md File Ownership (PLUGIN_RO_01, wave 5)
- **Shared artifacts to reuse**: READONLY_01's engine option, gate, problem and `readOnly` on reads
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. **Failing tests first** in `tests/plugin/` (the fake host): an engine created read-only answers every write tool
   `isError` with `read-only` and writes nothing; reads carry `readOnly`; the mounted view disables its write controls
   with the reason; a host that never passes the option sees no change.
2. **The option**: `PluginEngineOptions` gains `readOnly?: boolean` (a host flips it by recreating the engine, or a
   function if READONLY_01's shape is one; say which in plugin.md). Rebuild (`npm run build:plugin`), `plugin.d.ts`
   regenerates; set `SEAM_TYPES` with the build's hash; decide `SEAM` by plugin.md's rule (an optional member a host
   may leave out is additive: expected 1), and write the reasoning in your notes.
3. **Docs** (`cortex-docs`): `plugin.md` § The engine (the option, its promise, the test that proves it), § The types and
   the seam version if anything about the rule was learned; `docs/specification/plugin.md` § Open points if a host
   needs more (for example a lock of its own), as a point, not a build.

## Validation

- [ ] `npm run test:plugin` green (port 6800); `plugin-types.test.ts` green with the new hash; `npm test`, `verify`, `check` green
- [ ] The built folder's `manifest.json` `seam` matches the decision in your notes

## Implementation Notes

_To be completed by the agent. Re-run? Add a `### Run N` block; never overwrite an earlier run._

**Status**: Completed (2026-11-03, Opus 5.5, worktree `feat/plugin-ro-01`)

### Changes Made
- **Tests first** (red before the option, green after): `tests/plugin/read-only.spec.ts` (4): an engine made read-only
  answers both write tools (`write_board`, `request_grant`, the manifest's `writes: true`) `isError` with the read-only
  words, and the person's writes and `POST agents` 409 `.../read-only`, with every file of the folder byte-for-byte the
  same; `list_boards`, `get_board`, `ledger` carry `readOnly: true`; the option flipped in place; a host without it sees
  no `readOnly`; the mounted view (fake host flips it and says a ref with no head) refuses ✓ through `notify` `error` with
  the reason and writes nothing, then writes when flipped back; `watch` says a replaced ledger file as `{ head: 0 }` and
  the view goes back from 4 cards to the file's 3. Fake host: `HostOptions.readOnly`, `setReadOnly` (`server.ts`); the
  harness's `hostOptions` fixture.
- **The option** (`apps/board/plugin/engine.ts`): `PluginEngineOptions.readOnly?: (() => boolean) | undefined`, passed to
  `EngineOptions.readOnly` (READONLY_01's shape is a function, so a host flips it in place, no new engine). Declared in
  the seam's own literal (as `flags` is), not picked: the picked member brought `EngineOptions.readOnly`'s comment, which
  names `Ledger.gate` and Edit, into `plugin.d.ts`, and "the types are the code's own" refused it (a standalone name). The
  compiler holds the shape equal at the `createBoardEngine` call.
- **READONLY_01-R4, decided**: the plugin's `watch` also says a replaced ledger file as `{ head: 0 }` (`Engine.ledger.onReset`,
  read inside the entry, not passed on), so a host that turns each change into an `events` call gets the view reading
  from the start (`live.ts`) with nothing new to do. Before, a replaced file was reopened by the engine but never said,
  and the next heads (lower than the view's) were ignored: the view stayed stale. `Engine.watch` itself is unchanged
  (standalone sends its own `reset`; a head 0 there would double it).
- **Types and seam**: `plugin.d.ts` gains `readOnly?` and `createEngine`'s destructured `readOnly`; `SEAM_TYPES` set to
  `1bb9dfb1…d5813`. **`SEAM` stays 1.** By plugin.md's rule: an optional member the host gives and may leave out is not
  breaking, and no member a host is given changed. The `watch` head 0 is no type change; it is a change a host already
  passes on, a value the view already reads (head 0 from the start), and a host that drops it is no worse off than before
  (stale, as it was). Proven additive: `plugin-types.test.ts` "an option a host may leave out is additive" (the host
  fixture without `readOnly` compiles against the new types); the fixture uses `readOnly` so the member-cut test holds
  it. `ProblemCode` does not reach `plugin.d.ts` (the problem code `read-only` is in no seam type): no types decision there.
  Built `manifest.json` `seam`: 1.
- **spec-truth** (`tests/plugin/spec-truth.test.ts`): the options the seam declares itself (`flags`, `readOnly`) must be
  in plugin.md; the "passes on none of it" guard now reads `createEngine`'s call and return exactly (the entry reads the
  ledger's reset, so a plain "no `ledger`" scan no longer fits).
- **Docs** (`docs/specification/plugin.md`): § The engine signature and a **Read-only** paragraph (flip in place, say a ref
  with no head, `POST agents` is a write, left out = never); the `watch` row (replaced file, head 0); § The types and the
  seam version: an option shaped like standalone's is declared in host words; Open points 12-14 (open).

### Issues & Resolutions
- `api-ledgers.test.ts` "the folder open now…" failed in the unit suite before `npm run build` (no cookie on `GET /`
  without the built page); green after the build. Environment, not this change.
- `request_grant` needs `reason`, and `list_boards` takes no `board`: a write tool's input must fit before read-only is
  checked (the schema check comes first), so the test gives each a fitting input.

### Caught Beyond the Brief
- The person's and the bot's read-only words name Edit (`#actions` `READ_ONLY_PERSON`, `READ_ONLY`), a control a plugin host
  has only if it draws one: plugin.md Open point 12; a request below.
- A plugin bot writes pictures straight into `images/` (Open point 1): `readOnly` cannot stop that; the host's file rules
  must (Open point 13).
- The engine takes no lock: a host letting two writers open one `dir` keeps them apart itself (Open point 14).
- The elements still don't look disabled under read-only in the plugin view either (presses are refused with the reason):
  READONLY_01-R3, READONLY_UI_01's `packages/ui` change, reaches the plugin view too.

### Deviations from Plan
- Small, by the principles: `readOnly` declared in `PluginEngineOptions`'s literal instead of added to the `Pick` (why above).
- R4 decided as a build, not only a doc line: the plugin entry says the reset; the seam's types do not move for it.

### Verification
- Tier: normal (the plugin seam and its contract suite; no standalone code). `npm run verify` ok (warnings as before);
  `npm run check` 0 errors (svelte-check and tsc); plugin unit tests (`plugin-*.test.ts`, `tests/plugin/*.test.ts`,
  `engine`, `bot-tool-rules`, `ledger-replace`, `api-read-only`) 75/75; unit suite (npm test's globs, 3 at a time)
  2330/1, the one `api-ledgers` failure gone after `npm run build` (12/12); `npm run test:plugin` (port 6800, 3 workers)
  83/83 (79 + 4 new). No new UI: no screenshots.

## On Completion

Notes; your row; one LOG line (`[board-app] PLUGIN_RO_01: …` → this file, one line ending in a newline); the return block
with `REQUESTS`. No commit.
