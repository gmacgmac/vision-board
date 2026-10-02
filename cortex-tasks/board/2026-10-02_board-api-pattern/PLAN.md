---
category: board-agent
type: plan
status: approved
tracker: cortex-tasks/tracker.md#U4
created: 2026-10-02
scope: The board API pattern — OpenAPI as the one source, HTTP routes, vb commands and MCP derived from it, drift tests
---

# Board API pattern: plan

> **Status Doc**: [TASK-STATUS.md](./TASK-STATUS.md)
> **Created**: 2026-10-02 · Agreed with the maintainer in chat (points 117–135). Pattern spec:
> `docs/specification/api.md`. Decisions: D-017, D-019, D-022; steering rule 6.

## Problem Statement

Agents need one way to read and write the board: check replies, write nodes with per-item
answers, look up any node by number, and see what is pending. People, `vb`, any MCP agent and
later kiro-cli must all use the same operations, and the code must never drift from the
contract.

## Current State

- The ledger format and its validators exist (`packages/format/src/ledger*.ts`, U3 step 1).
- The ledger module (U3 step 2) is not built; this set needs it for real reads and writes.
- The server has hand-written routes for view files and the transcript
  (`apps/board/server/sessions.ts`); there is no spec, no `vb` beyond `validate` and `reply`, and
  no MCP.

## Proposed Solution

The pattern in `docs/specification/api.md`: JSON Schemas and an OpenAPI 3.1 spec in
`packages/format/schema/` are the one source. Server routes, MCP tools, `vb` commands and API docs
are generated from it or tested against it, and drift fails `npm test`.

### Steps (task files are written one step at a time, from this PLAN as it stands then)

1. **Schemas and spec.** Install `ajv` (D-022, exact pin, register row). Write the event schemas
   from `ledger.ts`, with a test that the TypeScript validator and the schema agree on every
   fixture and on a set of broken events. Write `openapi.json` for the seven operations.
2. **HTTP routes from the spec**, on the ledger module: route table read from the spec, per-item
   answers, `pending`, the shared error shape, JSON Lines streaming for `write`. Drift tests 4 and 5.
3. **`vb` commands** (`packages/cli`): one command per operation, generated table, drift test 6.
4. **MCP server** (`packages/agent`): one tool per operation, generated and checked in, talking to
   the local server. Drift test 6. Try it from this chat and from Claude Code.
5. **Generated API docs** (`docs/specification/api-reference.md`) and the agent skill
   (`skills/vision-board/SKILL.md`, rule 17) updated to the MCP tools, with scenario tests.

## Dependencies

- U3 step 2 (ledger module) before step 2 here. N7 (type check) before any step.
- Board v3 Stage 4 (Send) and Stage 6 (chat panel) use this API.

## Out of Scope

- kiro-cli (after the chat panel, as one more MCP client). Hosting, accounts.

## Risks & Considerations

| Risk | Mitigation |
|---|---|
| Generated code drifts from the spec | Drift tests regenerate and compare in `npm test` |
| A localhost API reachable by other local processes | Host and Origin checks, JSON only, 127.0.0.1 (rule 18); flag any wider exposure |
| Two validators (TypeScript and schema) disagree | One test runs both over every fixture and broken case |
| Streaming makes errors hard to read | Each line gets its own result; the final line carries `pending` |

## References

- `docs/specification/api.md`, `docs/decisions.md` (D-017, D-019, D-022)
- `packages/format/src/ledger.ts`, `ledger-shape.ts`, `ledger-index.ts`
- `cortex-tasks/board/2026-10-02_board-node-ledger/PLAN.md`

## Success Criteria

- [ ] Every operation is in `openapi.json`, and routes, `vb`, MCP and docs match it (drift tests)
- [ ] An agent can check, write (streamed, per-item answers), show, open, propose and park via MCP
- [ ] `npm test`, `npm run verify`, `npm run check` pass
