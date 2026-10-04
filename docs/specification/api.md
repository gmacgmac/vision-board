---
category: project-docs
type: specification
status: active
created: 2026-10-02
scope: How the board API pattern is built — one OpenAPI source, everything else derived and drift-tested
---

# Board API pattern

The rule is steering rule 6. The decisions are D-017 (ledger), D-019 (one API, three doors)
and D-022 (schema validation). This page says how the pattern is built, so every endpoint is
built the same way.

## One source

```
packages/format/schema/*.schema.json   ledger events, node body, park bundle (JSON Schema 2020-12)
            │  $ref
packages/format/schema/openapi.json    every route, request, response and error (OpenAPI 3.1)
            │  generated from / tested against
  ├─ server routes   apps/board/server   (route table read from the spec)
  ├─ MCP tools       packages/agent      (one tool per operation, generated, checked into git)
  ├─ vb commands     packages/cli        (one command per operation)
  └─ API docs        docs/specification/api-reference.md (generated)
```

1. The OpenAPI spec is the only place an operation is defined: its name (`operationId`), path,
   inputs, outputs and errors. Nothing else declares a route or a tool by hand.
2. Data shapes live once, in the JSON Schemas, and the spec references them with `$ref`. The
   TypeScript types in `packages/format` are checked against the same schemas.
3. Change order: schema, then spec, then code. A code change that is not in the spec fails a test.

## Drift tests (run by `npm test`, all must pass)

4. **Routes match the spec.** Every server route has an operation in the spec and every operation
   has a route, same method and path.
5. **Responses match the spec.** Every API test checks the real response body against the spec's
   schema for that operation and status code.
6. **MCP is generated.** The tool list is generated from the spec; a test regenerates it and fails
   if it differs from the checked-in file. Same for the `vb` command table and the API docs.
7. **Fixtures match the schemas.** Every fixture ledger validates against the event schemas.

## How every operation behaves

8. **Requests.** JSON only, on `127.0.0.1`, with the existing Host and Origin checks (rule 18).
   Every request names its caller in an `agent` field or header (D-019); a person's requests come
   from the board page.
9. **Per-item answers.** A write takes one or many items and answers each one on its own:
   `{ "results": [ { "ref": "...", "n": 47, "ok": true } , { "ref": "...", "ok": false,
   "problems": ["node.title: required"] } ], "pending": [52, 58] }`. One bad item never rejects
   the rest. `pending` is the reaction check: items the person flagged that the agent has not
   answered.
10. **Errors.** A whole request that cannot be processed returns one shape everywhere:
    `{ "error": { "code": "…", "message": "…", "problems": [ … ] } }`, with codes listed in the
    spec. Problem strings are the validators' own (`eventProblems`, `contextProblems`).
11. **Streaming.** `write` also accepts JSON Lines, one item per line; each result is sent back as
    soon as that item is checked, and the board draws each node as it passes.
12. **Minimal surface.** Optional fields are omitted when they do not apply, so an agent carries no
    configuration it does not need (D-019). Single-person boards never mention people.
13. **Only the I/O layer writes.** Handlers validate, then hand events to the ledger module, which
    assigns numbers and `seq` and appends one at a time (rule 7, D-017).

## Operations (first set)

| operationId | Does | Who |
|---|---|---|
| `check` | The person's new responses since the caller's last check | agent |
| `write` | Create or update nodes, links, regions; per-item answers plus `pending` | agent |
| `show` | Every version of node N, notes, replies, container; `linked` adds linked nodes | agent, person |
| `open` | Everything pending or unseen; the first call after a compaction | agent |
| `propose` | Propose ack or drop for a node, with a reason and source | agent |
| `park` | Write a parking bundle for a node | agent |
| `act` | A person's action (ack, drop, comment, later, seen, accept a proposal…) | person |
| `container` *(planned)* | One container's full history: every node, version and note it held | agent, person |
| `state` *(planned)* | The current state of every node | agent, person |
| `since` *(planned)* | Every ledger entry after a given `seq`, from anyone | agent, person |

Access (planned, `docs/vision.md` § Many chats, one board): reads are open to every agent. Every
agent write names its target container, and a write to a container the chat holds no grant for is
refused until the person approves it on the board. Entries carry an optional agent id, not yet
enforced.

## Adding an operation

14. Add or extend the schema, then the operation in `openapi.json`, then run the generators, then
    write the handler and its test. The drift tests tell you what is still missing.
