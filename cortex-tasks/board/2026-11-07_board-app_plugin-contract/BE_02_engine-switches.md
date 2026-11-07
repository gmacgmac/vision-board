# BE_02_engine-switches: Engine Switches

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Build the engine's two switches: `singleAgent` (no sign-up, ids never compared, no grants, no scoping; the lock stays)
and `followOtherWriters` (off: no poll for other writers).

---

## Context

PLAN.md Decisions 3 and 4 are the rules; plugin.md § The engine and § The bot (T_01) are the promises and name the
tests. **Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: as TASK-STATUS File Ownership, BE_02 row.
- **Files to reference**: PLAN Current State "Agents", "Lock", "C2"; `apps/board/tests/bot-tool-rules.test.ts` (the
  pattern for flag on/off tests: `open(flags)`); `tests/plugin/tools.spec.ts`.
- **Shared artifacts to reuse**: the flags (T_01), read with `flagOn(name, ctx.flags)` as `botToolRules` is.
- **Skills**: `cortex-architecture`.

---

## Steps

1. [ ] **The folder's agent.** With `singleAgent` on, an agent caller is written and read as the folder's one agent:
   the first agent joined in the ledger, else one the engine joins on its first write (label from `name()`; the join
   goes through the ledger like any line, so read-only and the lock refuse it as they refuse any write). The caller's
   own id is never checked against a pattern or the ledger. One place decides this (in `engine.ts`, beside
   `namedCaller`), and every op takes the caller it gives.
2. [ ] **No grants.** `checkGrant` / `canWrite` give no `needs-grant` and no `creator` refusal for the folder's agent;
   `request_grant` answers `held`; marks say `held`. Person-only actions (✓, ✗, approve, grant) stay person-only.
3. [ ] **No scoping.** `check_responses`, `list_open`, the marks and the answers chip (`resolve`) see everything an
   agent may read on the folder.
4. [ ] **The lock.** Prove it: a locked board refuses a write and a `request_grant` with the switch on, as with it off.
   Read-only (`readOnly()`) too.
5. [ ] **`followOtherWriters` off**: `watch` and the held read never call `ledger.follow()`; own writes still reach
   `watch`. On (default): as today.
6. [ ] Tests for each, on and off, named as plugin.md names them; the switch off leaves every existing test green.

---

## Validation

- [ ] `npm run verify`, `npm test`, `npm run test:plugin` pass (`VB_TEST_PORT=9600`).
- [ ] Page specs on access and grants: `tests/pages/access-by-bot.spec.ts`, `send-access.spec.ts`,
      `lock-board.spec.ts` pass.

---

## Implementation Notes

_To be completed by agent after task completion._

**Status**: Completed  
**Completed**: 2026-11-07 (Opus 5.5)

### Changes Made
- **The one place** (`apps/board/server/engine/engine.ts` `callerOf`, beside `namedCaller`): with `singleAgent` on, an agent
  caller becomes the folder's one agent: `one: true`, `caller` `{ by: 'agent', agent: <first joined> }` (only `by` of the
  host's caller is kept; the host's id is never checked, compared or stored), and `writer()` → `joinedAgent`: the first
  agent joined (`index.agents`, ledger order), else a new one minted and joined now (`join` line, label
  `clip(name(), LIMITS.agentLabel)`, the dir's basename if blank; no secret stored). `run` passes `one` and `writer` to
  every op (`OpCtx`, operations.ts). Off, `writer()` is the caller's id, as before. The person stays the person.
- **No grants**: `write_board` writes as `ctx.writer()`, asked after `writeTarget` (the lock and the board target), and
  `writeItems(…, grants)` (write-board.ts) skips `checkGrant` (no `needs-grant`, no `creator`) for the one agent only;
  every other check stays. `request_grant` answers `{ board, region?, held: true }` for the one agent after
  `requireBoard`, `requireUnlocked` and the region check, writing nothing. `packages/actions/src/permissions.ts` unchanged.
- **No scoping**: `scopeOf(ctx)` (operations.ts) gives no agent for the one agent: `check_responses` (and its wake),
  `list_open`, `write_board`'s `pending`/`containers`. Marks (caller-marks.ts `holds`, `marksFor`) take `{ caller, one }`:
  every board `held`, every note an agent owes `owed`. `resolve('answers', ref)` drops `ref.agent` under the flag.
- **`followOtherWriters` off**: `watch` (engine.ts) and the held read (reads.ts `hold`) never call `ledger.follow()`;
  `run` and `resolve` still `refresh()` first, so another writer's lines are read in, and said, at the next call.
- **BE_01-R1**: `EngineChange` is a type alias. `PluginChange` left in place (see Deviations).
- **BE_01-R2**: `tests/plugin/tools.spec.ts` "the bot: singleAgent" is a `test` now; two fixes to it: `request_grant`
  answers `{ board, held: true }` (the schema's shape; it expected `status: 'held'`), and the lock act needs `board`.
- **Tests**: new `apps/board/tests/engine-switches.test.ts` (7), titles as plugin.md cites them: "every flag the engine
  reads is in the spec" (walks the engine's own imports for `flagOn('…')`, equals plugin.md's flag table, defaults equal
  `FLAGS`), "followOtherWriters off:" (a counted `follow`: 0; own writes heard and waking a held read; another writer's
  heard only at the next call) and its "on" twin, "singleAgent: no sign-up", "singleAgent: the folder's one agent",
  "singleAgent: no grants and no scoping" (each against the same folder with the flag off), "singleAgent: the lock and the
  person's acts".

### Issues & Resolutions
- `npm test` 2432/2433: the one failure is spec-truth test 1 on FE_01's `tests/pages/host-position.spec.ts` (wave 3,
  not yet written). A throwaway script listing every citation (line breaks included) found no other miss.
- First page-spec runs failed on `GET / 404` in a different test each time: FE_01 rebuilt `apps/board/dist` meanwhile
  (index.html mtime inside the run). Re-run: access-by-bot, send-access, lock-board 38/38.
- `npm run verify` ok; `tsc` clean; `npm run test:plugin` 103/103 (no fixme left).

### Caught Beyond the Brief
- **Standalone can turn the switch on.** `apps/board/server/project.ts` passes the server's flags (`VB_FLAGS`) to the
  engine, so `VB_FLAGS=singleAgent` on the board's own server would make every secret-holding agent the folder's one
  agent with no grants. Not reachable from a page (`?flags=`), but a loosening reachable by an env var: REQUEST (drop
  `singleAgent` and `followOtherWriters` from what the standalone server gives its engine).
- **The person's own boards are open to the bot** under the flag: no grant is asked on a board the person made. The lock
  is the person's only guard there (proven). By Decision 3; worth a line in the handover so nclite's UI says it.
- **A folder used standalone first**: the one agent is the first agent ever joined, possibly a standalone chat's agent
  whose secret is still in `agents.json`; that secret and the host's bot then write as one agent. Fine for nclite (its
  own folder per bot, D-077 1); a reason never to open one folder both ways.
- **The join is not atomic across engines**: two engines on one empty folder writing at once may each join; later calls
  settle on the first. Moot with `followOtherWriters` off (one writer).
- A write whose every item fails, on a folder with no agent, still leaves the `join` line (the join runs after the
  up-front refusals, before the items). A locked board, read-only and a bad body join nobody (tested).
- With the flag on, a `board` item on another's board is refused by the ledger's context check (`invalid`, a second board
  line), no longer `forbidden`: the person still renames.

### Deviations from Plan
- `PluginChange` stays in `apps/board/plugin/engine.ts`: dropping it renames a type in the built `plugin.d.ts`, which
  moves `SEAM_TYPES` (seam.ts) and breaks `apps/board/tests/plugin-types.test.ts` (it names `Board.PluginChange`), both
  outside BE_02's files. The request said "may"; `EngineChange` is now a type alias, so either can go later.
- plugin.md says the join is "labelled by `name()`"; it is clipped to the label's 80 characters (blank → the folder's
  basename). Not changed in plugin.md (T_01's file).

---

## On Completion

1. Fill in Implementation Notes; set **Status** to `Completed`.
2. Update this task's row in TASK-STATUS.md (your row only).
3. Append your own LOG line to `cortex/LOG.md` (one line, newline-terminated, append-only), category `[board-security]`,
   trail `→ Task: [[cortex-tasks/board/2026-11-07_board-app_plugin-contract/BE_02_engine-switches.md]]`.
