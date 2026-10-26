# ENGINE_01_board-engine-part: The Board's Engine Part

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

The board's server side is one HTTP-free engine, `createEngine(dir)`, giving routes, chip resolve,
tools and a ledger watcher, so nclite's engine can host it; the standalone server and the MCP server
are hosts of it, with behaviour unchanged.

## Context

PLAN § The Plugin Contract (nclite draft v0.1, `~/ai/nclite/docs/plugins.md` § Where each part runs;
the spike's `host/plugin-engine.ts` `PluginEngine` and `host/runtime.ts` `createRuntime`; read only).
Today the HTTP edge and the board are one: `apps/board/server/dispatch.ts` matches every `/api` request
against the generated route table and calls the handler table (`handlers.ts`) with the request, the
ledger, agents, chats and the app host; `ledger.ts` finds its file under the project (`DATA_DIR`
`.visionboard`, `ledgerPath`); `callers.ts` and `caller-folder.ts` turn a secret into a `Caller`. Under
nclite the edge is nclite's (its origin checks, its run door, the bot from its run ticket), the data is
the bot's `plugins/board/` folder, and the bot calls declared tools, not routes.

**The contract may bend to the board** (maintainer, 2026-10-26): build the shape the board needs, and
list each difference from the draft under `REQUESTS` for nclite. Known ones: tool inputs as full JSON
Schema (the draft's are flat strings and booleans; `write_board` takes a list of items); routes and
tools that may return a promise; a per-turn hook for the person's answers since the bot's last
message (`roundOf`); the watch event carrying the board and the ledger head.

Runs in wave 4 beside ARCH_03 (the page): you own the server side, it owns `apps/board/src/`.

## Inputs

- **Files to modify**: `apps/board/server/**` (a new `engine/` folder with its public file, and the
  edge files that become its host: `app.ts`, `dispatch.ts`, `handlers.ts`, `ledger.ts`, `callers.ts`,
  `caller-folder.ts`, `chat-prompt.ts`, `chat-round.ts`), `apps/board/server.ts`, `packages/mcp/src/**`
  (only where it reaches the board), their tests.
- **Files to reference**: the spike files above; `docs/principles.md` § The board is a plugin;
  `docs/specification/api.md` (agents, grants, the action layer); D-016 layers; D-027, D-034 (access).
- **Shared artifacts to reuse**: the typed client and tool table (ARCH_02), `Chip` and `resolveChip`,
  the board-data builder and queries (ARCH_04), module names (ARCH_01).
- **Skills**: `cortex-architecture` (rule 5: one layer, one interface; `references/contracts.md`).

## Steps

1. [ ] **The engine's interface**, plain TypeScript, in the contract's shape where it fits:
   `createEngine({ dir, ... })` → `route(req)` (method, path relative to the board's prefix, query,
   body, and the caller; a reply of status and body), `resolve(kind, ref)` (ARCH_04's `resolveChip`),
   `turn(since)` (the person's answers since the bot's last message, `roundOf`: the board's addition),
   `tools` (one per agent operation in ARCH_02's tool table, input checked against its schema, the
   caller passed in), `watch(onChange)` (`{ board, head }` for each ledger change, from anyone). Promises
   are allowed. No `IncomingMessage`, no socket, no `process.env` inside it.
2. [ ] **The data folder is given**: the ledger, its lock and any other board file live under `dir`;
   the standalone host passes `<project>/.visionboard`, a host like nclite passes the bot's
   `plugins/board/`. Nothing in the engine finds its own folder.
3. [ ] **The caller is given**: the engine takes a `Caller` from its host. The standalone edge keeps
   today's secrets, `join` and grants and turns them into a `Caller`; under a host that already knows
   the agent (nclite's run ticket), the host passes it. What grants still protect with one bot per
   folder goes in your notes, for the handover reply.
4. [ ] **The standalone server is one host**: `dispatch.ts` keeps the HTTP edge (Origin and Host checks,
   body limits, the route table, streams) and calls `route`; the change stream reads `watch`. The chat
   server, app host and folder switching stay in the standalone host. Behaviour, responses and pictures
   unchanged; `gen --check` green.
5. [ ] **Tests with no HTTP server**: the engine on a temp folder answers a read route, a write route, a
   chip resolve (and its refusal), `turn`, each tool (and a refused input), and a watch event for a
   write made through another engine on the same folder.
6. [ ] Note in `docs/specification/api.md` (via `cortex-docs`): the engine, what its host supplies, and
   each difference from nclite's draft.

## Validation

- [ ] `grep` finds no `node:http` import and no `process.env` under `apps/board/server/engine/`
- [ ] The engine tests pass; every API and MCP test passes unchanged
- [ ] `npm test`, `npm run verify`, `npm run check`, `gen --check`; the page specs that write through the API on your port

---

## Implementation Notes

_To be completed by agent after task completion. Re-run? Add a `### Run N` block; never overwrite._

**Status**: Pending  
**Completed**: YYYY-MM-DD HH:MM  

### Changes Made
- 

### Issues & Resolutions
- 

### Caught Beyond the Brief
- None

### Deviations from Plan
- None

---

## On Completion

1. Fill in Implementation Notes; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append your own LOG entry to `cortex/LOG.md` — one line ending in a newline, append-only:
   `[[YYYY-MM-DD HH:MM]] [board-app] ENGINE_01: what you did → Task: [[cortex-tasks/project/2026-10-26_project-tooling_tidy-up/ENGINE_01_board-engine-part.md]]`
4. Return the `cortex-task-exe` Return Contract, with `REQUESTS` for anything outside your files.
   Never write the set entry or `AUDITED.md`. No commits.
