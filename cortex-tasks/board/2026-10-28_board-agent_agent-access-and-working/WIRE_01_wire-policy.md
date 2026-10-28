# WIRE_01_wire-policy: Every route uses the policy

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

Every tool call the agent makes, by Claude or Kiro, file or command, read or write, is decided by
RULES_01's `policy` before anything else; a remembered yes is narrow; "Allow for this folder" is kept
across sessions in a file only the server writes.

## Inputs

- **Files to modify**: TASK-STATUS.md File Ownership (WIRE_01)
- **Files to reference**: RULES_01's and HOLD_01's notes (Shared Foundations), `chat-access.ts`
  `CHAT_TOOLS`, `claude-args.ts` `gateSettings`, `gate.ts` `decide`, `kiro-permission.ts` `verdictFor`,
  `chat-approvals.ts` `kept`, the chat schema (`packages/chat/schema/chat-event.schema.json`, the
  `folder` scope the orchestrator added)
- **Skills**: `cortex-architecture`, `cortex-docs`; the `vision-board` skill (you edit it: bump its version)

## Steps

1. **Failing tests first**, end to end with the fake CLIs: Claude's Read of `.env` refused, of a file in
   the folder allowed without a question, of a file outside asked; Write to the ledger refused even after
   "this session" for writes; a session yes for `src/a.ts` covers `src/b.ts` but not `docs/x.md`; a
   command yes for `npm test` covers `npm test -- foo` but not `npm run build`; Kiro the same through
   `verdictFor`; `cat .env` refused; "for this folder" survives a new session and a server restart.
2. **Claude**: the hook's matcher adds `Read`, `Glob`, `Grep`; `--settings` also carries
   `permissions.deny` generated from `ACCESS_RULES`' refused reads (absolute paths, `//…`), as a second
   line. `CHAT_TOOLS` keeps the read tools allowed so the hook decides.
3. **The gate and Kiro** call `policy` first: refuse → the reason, allow → no question, ask → the server.
4. **The server** (`chat-approvals.ts`): `policy` again (the server is the authority), then remembered
   yeses: write by folder, command by its first words, `folder` scope from the store. Outside the board's
   folder: once or session only.
5. **The store** (`chat-permissions.ts`): `.visionboard/permissions.json`, written by the server only
   (atomic write), read at start; list and forget operations in openapi.json (`list_permissions`,
   `forget_permission`: the person's, cookie, like the other person routes), api.md rows; regenerate is
   the orchestrator's (a `REQUEST`).
6. **The skill**: what the agent may read and write and that refusals are final; version line, `NOTES.md`.
7. **Docs**: chat.md § approvals, api.md. **Checks**: unit, `check`, `verify`, `gen-api --check` (stale
   until the orchestrator regenerates: say so), chat page specs on 5400.

## Validation

- [ ] One policy on every route; refused holds over any answer; narrow remembered yeses; the store kept and forgettable

## Implementation Notes

**Status**: Pending · **Completed**:

### Changes Made
-

### Caught Beyond the Brief
- None

### Deviations from Plan
- None

## On Completion

Notes; your row in TASK-STATUS.md; one LOG line (`[board-security] WIRE_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS` for anything outside your files.

**Constraints**: deviation → stop and ask; no PII; no commits; never 4466; never `cortex/AUDITED.md`; no test starts a real CLI.
