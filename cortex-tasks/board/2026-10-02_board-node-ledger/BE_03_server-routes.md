# BE_03_server-routes: Serve boards from the ledger

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (step 2)

## Objective

The server serves boards and records person actions through the ledger store, replacing the
`/api/sessions` routes.

## Context

These routes are interim: U4 (`../2026-10-02_board-api-pattern/`) replaces them with routes derived
from the OpenAPI spec (D-022). Keep the handlers small and add no agent write route here.
Until U4's `write` exists, boards come only from fixture ledgers (see TASK-STATUS execution record).

## Inputs

- **Modify**: `apps/board/server.ts`, `apps/board/bin/reply.ts`, root `package.json` (scripts)
- **Delete**: nothing. `apps/board/server/sessions.ts` stays until FE_01 archives it.
- **Reuse**: `openLedger`, `append`, `state`, `onAppend` (BE_02); `boardView`, `boardState`,
  `replyText` (BE_01); `guard`, `readJson`, `HttpError` (`server/guard.ts`)

## Steps

1. [ ] Project: `VB_PROJECT` (default: repo root). Seed: if `VB_SEED` names a fixture ledger and
   the project ledger does not exist yet, copy it in first. Never write to a fixture.
2. [ ] Routes:
   - `GET /api/boards` -> `[{ id, title, seq }]`
   - `GET /api/boards/:id` -> `{ seq, view, state, versions }`: `view` = `boardView`, `state` =
     `boardState` as plain objects, `versions` = node id -> latest `ver`
   - `POST /api/boards/:id/act` -> append one `act`, caller `{ by: 'person' }`; 201 with the event
   - `GET /api/boards/:id/events` -> SSE `change` with `{ seq }` from `onAppend`, not `fs.watch`
3. [ ] `package.json`: `demo` script = build, then start with
   `VB_PROJECT=temp/demo VB_SEED=packages/format/fixtures/roadmap.ledger.jsonl`.
4. [ ] `bin/reply.ts <board> [--json]`: reads the project ledger, prints `replyText` (or JSON of
   `boardState`). Stays until U4's `vb check`.
5. [ ] Update the route list in the `server.ts` header comment and `apps/board/README.md`.

## Validation

- [ ] `npm test`, `npm run check`, `npm run verify` exit 0 each
- [ ] `curl` (localhost only): list, load, a valid act (201), an invalid act (422 with problems),
  `/api/sessions` (404)

## Constraints

Localhost only, Origin and Host checks and JSON only stay as they are (rule 18). No commits.
Deviation: stop and ask.

## Implementation Notes

**Status**: Pending
