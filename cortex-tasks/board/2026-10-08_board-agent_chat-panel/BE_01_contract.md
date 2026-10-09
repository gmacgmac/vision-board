# BE_01_contract: Contract for chat events and routes

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (rulings 1-9) ·
> **Decisions**: D-036, D-037 · **Model**: Opus 5.5

## Objective

The chat's contract exists before any code: what a chat event is, and the routes the page uses.

## Rulings (do not reopen)

1. **Chat events are the chat package's own contract**: `packages/chat/schema/chat-event.schema.json`
   (JSON Schema 2020-12, versioned `$id` like the ledger's). Kinds follow nclite's
   (`engine/store/log.ts` `EVENT_KINDS`: message_in, message_out, approval_request,
   approval_result, system) plus `tool_activity` (new): `{ kind, at, session, ... }`.
   message_out carries `interim` (a finished text block mid-turn) or final; tool_activity
   carries a tool's short name, a state (running, done, failed) and, for a board write, the
   board, the card numbers and the head, never the raw input. Read nclite's shapes before
   writing; keep field names compatible where it costs nothing.
2. **Approval facts** follow nclite (`container/approval-ask.ts`): `write` (op, path, and a
   short preview of the change), `command` (command, risks, paths); the answer `{ approved,
   scope: once | session }`, and a request `expiresAt`.
3. **Routes** (person-only, `x-agent: false`, the person cookie, OpenAPI minor bump, `npm run
   gen`): start a session on a board (agent: claude | kiro, model optional); list a board's
   sessions; send a message (text plus chips: notes by seq, cards by number); stop the turn;
   answer an approval; a server-sent event stream of chat events for a session (like
   `watch_project`). One route the gate hook calls, authorised by a per-session run token, not
   the cookie (nclite's `/api/run/approvals`). OpenAPI references the chat schema by `$id`;
   the server's schema registry loads it.
4. api.md points from 98 on; `docs/specification/` gets a short `chat.md` (how the pattern is
   built), linked from its index if there is one.

## Steps

1. [x] Read nclite's event, approval and route shapes; draft the schema and routes.
2. [x] Failing tests first: schema cases (each kind valid and broken; tool_activity rejects a raw
   input field); OpenAPI test; route table generated; the person-only check.
3. [x] Schema, OpenAPI, `npm run gen`, docs, `npm run map`.

## Validation

- [x] The five gates exit 0.

## Constraints

- If deviation is needed, stop and say so; no silent breaking changes. No PII in examples.
- No git commits or stash. Scratch in the system temp folder. Stop only your own processes.
- No dependencies (D-036). Protected files: propose wording, never edit.
- Fill Implementation Notes below, your row in TASK-STATUS.md, and your own LOG line.

## Implementation Notes

**Status**: Completed 2026-10-08

- **Chat schema** `packages/chat/schema/chat-event.schema.json` (`$id` `.../schema/chat/1/...`,
  standalone, no refs into `packages/format`): events `{ kind, at, session, seq, ... }`, closed,
  discriminated on `kind`: `message_in` (`text`, `chips?` `{ kind: note|card, ref, label }`),
  `message_out` (`text`, `interim: true` only mid-turn, nclite's rule), `tool_activity` (`call`,
  `tool`, `state` running|done|failed; `board`, `cards`, `head` for a board write; raw input refused),
  `approval_request` (`approvalId`, `facts`, `expiresAt`), `approval_result` (`approvalId`,
  `approved`, `status` approved|denied|expired|released, `scope?`), `system` (`text`, `turn?`
  done|stopped|error, the turn-end marker). `$defs` for hosts: `facts` (`writeFacts` `{ op, path,
  preview? }`, `commandFacts` `{ command, risks, paths }`, risks/paths may be empty), `answer`
  `{ approved, scope? once|session }`, `outcome` (gate's answer, nclite `AskAnswer` minus
  `timedOut`/`released`, which `status` covers), `sessionId`, `approvalId`, `agent`, `model`.
  `seq` (from 1) is my addition for stream resume; the host stamps `at`, `session`, `seq`.
- **Routes** (OpenAPI 1.9.0 -> 1.10.0): `start_chat`/`list_chats` `POST|GET /api/boards/{board}/chats`,
  `send_chat` `POST /api/chats/{session}/messages` (202 + `message_in`; 409 while busy), `stop_chat`
  `POST /api/chats/{session}/stop` (`{ stopped }`), `answer_approval`
  `POST /api/chats/{session}/approvals/{approval}`, `watch_chat` `GET /api/chats/{session}/events`
  (SSE `chat`, `id` = seq, `after`), all person-only; `ask_approval` `POST /api/run/approvals`,
  new `runToken` bearer scheme (`auth: 'run'`). API bodies in `packages/format/schema/api/chat-*.schema.json`
  and `sse-chat.schema.json`; new components `chatNotFound`, `chatConflict`, `sessionPath`,
  `approvalPath`, `chatAfter`.
- **Server/generators**: `schema.ts` `allSchemaFiles` + `CHAT_SCHEMA_DIR`/`CHAT_EVENT_ID` (discriminator
  messages name `kind` too); `gen-api.mjs` `SCHEMA_DIRS`, `runToken: 'run'`; `spec.ts` Security `run`;
  `callers.ts` refuses the cookie (403) and a missing Bearer (401) on `run` routes, token check left to
  the handler; `chat.ts` placeholder handlers (404 / gate 401) for BE_03 to replace; harness
  `PERSON_OPS` has the chat ops. `LAYERS.chat = []` (agent's entry left for BE_02).
- **Docs**: api.md 98-104 and the operations table (`gate` as a new "who"); `docs/specification/chat.md`
  (no spec index exists; linked from api.md 104); `packages/chat/README.md`; README layout row.
- **Tests**: `apps/board/tests/chat-schema.test.ts`, `apps/board/tests/api-chat.test.ts`; updated
  `openapi.test.ts`, `route-table.test.ts`, `gen-api.test.mjs`.
- **For BE_02/BE_03**: chat events carry no `seq` until the server stamps it; the gate body is the
  facts object itself (nclite's shape); BE_03 must verify the run token in `ask_approval` and replace
  `apps/board/server/chat.ts`.

## On Completion

Fill in notes, update your row, append your own LOG line (`[board-agent] BE_01: …`).
