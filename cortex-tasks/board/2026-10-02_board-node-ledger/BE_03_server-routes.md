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
- **Reuse**: `openLedger`, `append`, `state`, `onAppend` (BE_02); `boardView` (format),
  `boardState`, `replyText` (actions); `guard`, `readJson`, `HttpError` (`server/guard.ts`)

## Steps

1. [x] Project: `VB_PROJECT` (default: repo root). Seed: if `VB_SEED` names a fixture ledger and
   the project ledger does not exist yet, copy it in first. Never write to a fixture.
2. [x] Routes:
   - `GET /api/boards` -> `[{ id, title, seq }]`
   - `GET /api/boards/:id` -> `{ seq, view, state, versions }`: `view` = `boardView`, `state` =
     `boardState` as plain objects, `versions` = node id -> latest `ver`
   - `POST /api/boards/:id/act` -> append one `act`, caller `{ by: 'person' }`; 201 with the event
   - `GET /api/boards/:id/events` -> SSE `change` with `{ seq }` from `onAppend`, not `fs.watch`
3. [x] `package.json`: `demo` script = build, then start with
   `VB_PROJECT=temp/demo VB_SEED=packages/format/fixtures/roadmap.ledger.jsonl`.
4. [x] `bin/reply.ts <board> [--json]`: reads the project ledger, prints `replyText` (or JSON of
   `boardState`). Stays until U4's `vb check`.
5. [x] Update the route list in the `server.ts` header comment and `apps/board/README.md`.

## Validation

- [x] `npm test`, `npm run check`, `npm run verify` exit 0 each
- [x] `curl` (localhost only): list, load, a valid act (201), an invalid act (422 with problems),
  `/api/sessions` (404)

## Constraints

Localhost only, Origin and Host checks and JSON only stay as they are (rule 18). No commits.
Deviation: stop and ask.

## Implementation Notes

**Status**: Completed 2026-10-03

- **Project and seed** (`server.ts`): `VB_PROJECT` (default repo root) -> `ledgerPath`; if `VB_SEED`
  is set and the project ledger is absent, the seed file is copied in once (`COPYFILE_EXCL`), then
  `openLedger` opens the copy. The fixture is only read (checked: its hash is unchanged after acts).
  A missing seed file exits with a message. The "page is not built" check runs before seeding, so
  a failed start writes nothing.
- **Routes**: as listed in step 2. `seq` in the list and in `GET :id` is the project ledger
  position (`state().seq`), the same number `boardView` puts in `view.version`, so it is
  project-wide, not per board. `state` = `boardState` with each Map as a plain object. Board ids are
  checked against `ID_PATTERN` (400) and must exist (404). Anything else under `/api/` is 404,
  including `/api/sessions`.
- **`POST :id/act`**: the body's `type` is forced to `act` (a body cannot smuggle a `node` or any
  other event through this route), a `mode` act gets `board` = the URL's board, and a node act
  naming a node on another board is refused with 422 (`n: node N is not on board "x"`). Everything
  else (stamping, shape, context, `validateAct`) is the ledger store's. Caller is `{ by: 'person' }`.
  The cross-board check is a small addition the task did not list; `contextProblems` does not
  check the board for acts because an act carries no board.
- **SSE**: `onAppend` -> `event: change` with `{ seq }`, on every append in the project (not
  filtered to the board); unsubscribed on close; 20 s heartbeat kept. No `fs.watch`.
- **`bin/reply.ts <board> [--json]`**: opens the project ledger (`VB_PROJECT`, default repo root)
  through `openLedger`, prints `replyText(boardView, boardState)` or JSON `{ board, seq, items,
  pins, modes }`. Unknown board or no argument: message, exit 2.
- **`npm run demo`**: build, then `VB_PROJECT=temp/demo VB_SEED=...roadmap.ledger.jsonl`. The
  inline env syntax needs a POSIX shell (not Windows `cmd`).
- **Not changed**: `server/sessions.ts` (now unused by the server and `reply.ts`; FE_01 archives
  it); the page (`src/board/io.ts`) still calls `/api/sessions`, so the page shows no board until
  FE_01. `npm run board` with the default project (repo root, no ledger yet) serves an empty list.
- **Probe** (port 4477 and the demo on 4466, localhost only, stopped afterwards, scratch project
  under `temp/` removed): list 200; load 200 (seq 36, 17 nodes, 14 links, 17 versions); ack,
  comment and mode acts 201 with seq 37-39, body `by`/`seq` ignored; invalid comment 422 with
  problems; smuggled `node` body 422; cross-board act 422; no Origin 403; bad Host 403; text/plain
  415; `/api/sessions` 404; unknown board 404; bad id 400; SSE delivered `change` for seq 37, 38, 39;
  restart with a different `VB_SEED` kept the existing ledger; `reply.ts` text and `--json` match.
- **Gates**: `npm test` 0 (71 tests, unchanged count), `npm run check` 0, `npm run verify` 0 (one
  existing warning, `controller.ts` 336 lines). No existing test changed; no new test (the task
  lists curl as its validation; route tests arrive with U4's spec tests).
- Security: localhost bind, Host/Origin/JSON guards unchanged (rule 18); the board id never
  reaches a path; the ledger path is fixed under the project folder. None found.
