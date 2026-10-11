---
category: project-docs
type: specification
status: active
created: 2026-10-02
updated: 2026-10-11 (the chat carries the board: 131, a note sent once, the selection's heading and one writer; ledger v12: board numbers, retire, the flag, column and row: 125-130); 2026-10-08 (board access, ledger v8: 81-86; board seen and conditions: 87-89; the person's board, ledger v9: 90-92; the chat panel: 98-104)
scope: How the board API pattern is built — one OpenAPI source, everything else derived and drift-tested
---

# Board API pattern

The rule is steering rule 6. The decisions are D-017 (ledger), D-019 (one API, three doors),
D-026 (JSON Schema, OpenAPI 3.2 and ajv), D-027 (agent identity and write grants), D-028 (our
own MCP server) and D-029 (`packages/client` and `packages/mcp`). This page is the contract:
every route, tool and command is built from it. An independent review
(`temp/research/u4-contract-review.md`, 2026-10-05) is folded in.

## One source

```
packages/format/schema/common.schema.json        shared $defs (ids, text, limits, enums)
packages/format/schema/events/<type>.schema.json  one per event type: core, sent and stored forms
packages/format/schema/ledger-event.schema.json  a stored ledger line, by `type`
packages/format/schema/api/*.schema.json          request and response bodies that are not events
            │  $ref (by $id)
packages/format/schema/openapi.json               every operation, input, output and error (OpenAPI 3.2)
            │  generated from / tested against
  ├─ route table     packages/format/src/operations.generated.ts (operationId → method, path)
  ├─ server routes   apps/board/server     (dispatches through the route table)
  ├─ API client      packages/client       (the one module that calls the server, rule 7)
  ├─ MCP tools       packages/mcp          (one tool per agent operation, generated)
  ├─ vb commands     packages/cli          (one command per agent operation, generated)
  └─ API docs        docs/specification/api-reference.md (generated)
```

1. The OpenAPI spec is the only place an operation is defined: its name (`operationId`), path,
   inputs, outputs and errors. Nothing else declares a route, a tool or a command by hand.
   The generated, human-readable form of all of it is [api-reference.md](./api-reference.md).
2. Data shapes live once, in the JSON Schemas, and the spec references them with `$ref`. The
   TypeScript types in `packages/format` stay hand-written. A test checks they agree:
   `EVENT_TYPES`, `ACTION_IDS`, `KINDS` and `MODES` equal the schema enums, and every fixture
   parses and validates as `LedgerEvent[]`.
3. Change order: schema, then spec, then code. A code change that is not in the spec fails a test.
4. Every caller of the server goes through `packages/client`: the board page, `vb` and the MCP
   server. It reads the generated route table, never `openapi.json`, so the page bundle stays
   small (rule 15).

## Schemas

5. **Identity.** Each ledger schema's `$id` is `https://vision-board.invalid/schema/ledger/4/<file>`.
   `.invalid` is reserved (RFC 2606), so it is plainly a name and is never fetched. Every `$ref`
   uses the target's `$id`. API body schemas live under `.../schema/api/<file>` and version with
   `openapi.json` `info.version`, not with the ledger.
6. **Three layers per event, one definition each.** `$defs/core` holds the fields both forms
   share and is left open. `$defs/sent` is what a caller sends: `{ $ref: core }` plus the
   sent-only fields (`key`, `base`, and `n` as a number or `{ "key": … }`), closed with
   `unevaluatedProperties: false`. `$defs/stored` is a ledger line: `allOf: [stamp, stampAgent,
   core, rules?, storedOnly]`, closed the same way. `storedOnly` holds the server-resolved
   integer `n`, `ver`, `from`, `to`, `board` (taken from the path, never sent), `key`, and `by`
   as a `const` (who may write the event). Any `if`/`then` sits in its own piece (`stampAgent`
   for the v2/v3 agent rule, `rules` for per-action rules), because ajv stops counting a
   piece's fields as known when its `if`/`then` fails, which would turn one bad field into a
   list of "unknown field" errors. No field is listed twice, and a sent body can never set a
   stamped field (`v`, `seq`, `at`, `by`, `agent`, `person`).
7. **What gets closed.** Every terminal object schema (the outer `sent` and `stored` wrappers,
   and leaf objects such as `node`, `region`, `bundle`) has `type: "object"` and
   `unevaluatedProperties: false`. Reusable cores stay open, because a closed core inside `allOf`
   would refuse the stamp's fields. Unknown keys are refused, never stored.
8. **One error per bad line.** `ledger-event.schema.json` is `oneOf` over the stored branches
   with the ajv `discriminator` on `type`, so a bad line gets one error, not one per branch.
   Each branch carries `type: "object"`, `required: ["type"]` and `properties.type.const` beside
   its `allOf`, which ajv requires. No `mapping` (ajv refuses it); in `openapi.json` each event
   component is named after its `type` value, so OpenAPI's implicit mapping works too.
9. **Shape in the schema, context in code.** Order, `ver` = previous + 1, "node exists", fresh
   proposals, person-only actions and grants are not JSON Schema. They stay in `contextProblems`,
   `validateAct` and the grant check. A test runs the schema and `eventProblems` over every fixture
   and a table of broken lines; they must give the same verdict (valid or not), not the same words.
10. **Value rules** (in `common.schema.json`, matched by the hand validator):
    - ids `^[a-z0-9][a-z0-9-]{0,63}$`; agent ids `^a-[a-z0-9]{8}$`
    - text non-blank (pattern `\S`); lengths count code points (`[...s].length` in code)
    - timestamps RFC 3339 UTC by pattern, `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$`,
      so no `ajv-formats`; the hand validator uses the same pattern instead of `Date.parse`
    - limits: node and board title 200, region title 80, node body 8000, text and reason 4000,
      summary 2000, link label 80, agent label 80, tags 12 of 40, lanes 12 of 40, columns 1-12,
      sources 20 of 500, propose source 500, park bundle fields 4000, key 64, person 80
11. **Versions.** `LEDGER_FORMAT` is 4 (v3 below, v4 in 58). Every change to a ledger schema
    bumps it and the `$id` path. Readers accept every `v` they know (2, 3 and 4); each format only
    adds, so older lines stay valid. On a v2 line `agent` is any non-blank name (the fixtures say
    `kiro`); from v3 it is an agent id (`if`/`then` on `v`).
12. **Where ajv runs.** `Ajv2020`, strict mode on, `discriminator: true`, only in tests and in the
    server's I/O layer (`apps/board/server`). Never from a front door the page imports, so it never
    reaches the page bundle (rule 15).

## Ledger v3 additions

13. `key` on every agent-written event: the agent's retry key (29).
14. `join` event: `{ label }`. Its stamped `agent` is the new agent id.
15. `grant-request` event, by an agent: `{ board, region, reason }`.
16. New person-only actions in `act`: `grant { request }` and `deny { request, text? }` answer a
    `grant-request` by its `seq`; `revoke { holder, board, region }`; `size { n, size }` with
    `size` one of `s`, `m`, `l`, `auto` (`auto` clears it, like `unpin`); `send { board }`, the
    person's "I'm done, over to you". `grant`, `deny`, `revoke` and `send` name no node.
17. Node body: optional `size` (`s`, `m`, `l`), the agent's suggestion. The person's `size` wins
    (`components.md` § Node size).
18. `region.center` is the integer `n` of the centre node, as the fixtures already write it. The
    View keeps the string node id.
19. The action registry (`packages/actions`) lists every action, for people and agents (rule 8):
    the new person actions above, `comment` and `context` now person-only, and the agent writes
    `reply`, `propose`, `park` and `request_grant` with `personOnly: false`.

## Callers

20. **The person** is the board page. When it serves the page, the server sets a cookie
    `vb_person` (`HttpOnly; SameSite=Strict; Path=/api`), minted fresh at each start and never
    in the page body. Person routes (`act`, `mark_seen`) need the cookie and refuse a request that
    also carries `Authorization`; agent routes refuse a request that carries the cookie. A refusal
    says "only the person can do this, on the board; send a `propose` or `reply` item instead" and
    never names the cookie. After a restart the page reloads on a `forbidden` answer to get the
    new cookie. This stops an agent acting as the person by mistake (rule 8); it is not
    protection against a program that sets out to read cookies.
21. **An agent** calls `join` with a label (for example "Pricing chat") and gets
    `{ agent, secret }` once. The secret is 32 random bytes, base64url. The server writes its
    SHA-256 to `.visionboard/agents.json` before appending the `join` event, ignores hashes that
    have no event, compares with `timingSafeEqual`, and writes `.visionboard/.gitignore` so the
    file is never committed. Agent writes send `Authorization: Bearer <secret>`. Reads need no
    credentials; a read that sends one is scoped to that agent (34, 41).
22. **Keeping an identity.** The secret is the agent's identity, so `join`'s description tells
    the agent to save its id and secret in its durable notes, because a compaction loses its
    context. An unknown secret gets `not-authenticated`, whose detail says: join again, then call
    `request_grant`, and the person must approve again (unless a recent folder's agents know it:
    `wrong-folder`, 115). For MCP, `secret` is a tool argument;
    `VB_AGENT_SECRET` in the environment means one identity for every chat that shares that MCP
    configuration, so it is meant for `vb` and single-chat setups.
23. *(Replaced by 81.)* **Containers** are regions (D-011), named by `board` and `region`. A container's holders are
    the agent that created the region, plus every agent the person granted it to, minus revoked
    ones. They are folded from the ledger, never stored anywhere else. Regions written by v2
    lines have no holder, so any v3 write to them needs a grant.
24. *(Replaced by 83.)* **What each write needs.** One `write_board` call writes one board, the one in the path.
    - New board (`board` item), or a new region id: no grant; the writer becomes its holder.
    - Existing region id (an update to its title, mode or lanes): the region.
    - New node: its `node.region`.
    - New version of an existing node: the node's current region and, if it moves, the target
      region too. So no agent can pull another agent's node into its own container.
    - `link` / `unlink`: the `from` node's region. Both nodes must be on this board.
    - `reply`, `propose`, `park`: the node's current region, or the agent wrote the node's latest
      version. So an author can still answer a node the person moved to Later.
25. *(Replaced by 84.)* **No grant, no write.** The item fails with `needs-grant` and the `{ board, region }` it
    needs. The detail says: call `request_grant` once, wait for the person's answer in
    `check_responses`, then resend the same items with the same keys.
26. *(Replaced by 85.)* `request_grant` while the same agent already has an open request for that container returns
    that request with `replayed: true`, so an agent in a loop cannot flood the person. A holder
    gets `{ held: true }`.
27. *(Kept in 86.)* Limit (vision.md § Many chats, one board): this runs on one machine, so it stops mistakes
    and wrong-container writes, not attackers.

## Requests

28. **Transport.** `127.0.0.1` only, and the Host check on every request (rule 18). On a write, an
    `Origin` header, if present, must be this server. Every write needs the person cookie or a
    Bearer secret, except `join`, the one credential-free write (4 KiB body). The media type is
    parsed exactly: `application/json`, with an optional `charset=utf-8`; nothing else. Body
    limit 64 KiB, or 512 KiB and 200 items for `write_board`.
29. **Retry keys.** Each write item may carry `key`, scoped to the agent across the whole project.
    The server looks the key up first, before grants: a resent key with the same content returns
    the first result with `replayed: true` and writes nothing; the same key with different content
    fails with `conflict` ("key reused for different content"), compared by a hash of the item.
    Failed items reserve no key. Keys are stored on the event, so they survive a restart.
30. **Stale updates.** An item that changes an existing node may carry `base`, the `ver` it was
    based on. If the node has moved on, the item fails with `conflict` and the current `ver`. This
    is the per-item form of `If-Match`; a whole-board check would refuse other agents' work.
31. **Cursors.** Every read returns `head`, the ledger's latest `seq`. `read_ledger` and
    `check_responses` take `after` (a `seq`, default 0, meaning from the start) and `limit`
    (default 100, at most 500), and say `more: true` when there is more.
32. **Minimal surface.** Optional fields are left out when they do not apply, so an agent carries
    nothing it does not need (D-019). Single-person boards never mention people.
33. **Only the I/O layer writes.** Handlers validate, then hand events to the ledger module, which
    assigns numbers and `seq` and appends one at a time (rule 7, D-017).

## Write results

34. The body is `{ "items": [ … ] }`. Items carry no `board`; the path names it. A batch that can
    be read always answers 200, with one result per item, in order:
    `{ "index": 0, "key": "pricing-q", "ok": true, "seq": 81, "n": 47, "ver": 1, "title": "…" }` or
    `{ "index": 1, "ok": false, "problem": { … } }`. A node's `title` is as written, so the agent
    can see it changed the node it meant to. Items run in order. One failure never stops
    the rest, except items that depend on it (they name its key, directly or through another
    failed item), which fail with `depends-on-failed`.
35. `n`, `from` and `to` take a number or `{ "key": "…" }`. A key resolves to a node made earlier
    in the same batch or by an earlier call from the same agent.
36. The answer also carries `head` and `pending`: items in containers the caller holds where the
    person's latest comment or "needs context" has no answer yet, or that the person moved to
    Later and that have no park bundle yet (D-018, D-020). A comment is answered by a `reply`
    naming that act in `to`, or by a newer version of the node.
37. A call that cannot be read at all (bad JSON, wrong media type, no credentials, an unknown
    board when the batch has no `board` item) gets one problem response and writes nothing.

## Errors

38. Every error is RFC 9457 Problem Details, `application/problem+json`:
    `{ "type", "title", "status", "detail", "errors": [ { "pointer", "detail" } ] }`. `type` is
    `https://vision-board.invalid/problems/<code>`. `pointer` is a JSON Pointer into the request
    body, such as `/items/2/node/title` (ajv's `instancePath` form). A write item's `problem` is
    the same object without `status`, because the response's own status is 200.
39. Extension members: `conflict` carries `ver` (the node's current version); `needs-grant`
    carries `board` and `region`. A 401 sends `WWW-Authenticate: Bearer realm="vision-board"`; a
    405 sends `Allow`.
40. `detail` is plain English written for an agent to act on: what is wrong and what to do. It
    never shows internals. Codes:

| Code | Status | When |
|---|---|---|
| `bad-request` | 400 | Not JSON, a bad id in the path, a bad query |
| `not-authenticated` | 401 | An agent write with no secret, or one the server does not know |
| `forbidden` | 403 | Host or Origin not allowed; a person route called as an agent, or the reverse; a `board` item from an agent that did not make that board (84) |
| `needs-grant` | 403 | The agent does not hold the board, or the container (usually per item; 84) |
| `not-found` | 404 | No such board, node, region or route |
| `method-not-allowed` | 405 | Known path, wrong method |
| `conflict` | 409 | `base` is stale, or a key is reused for different content (usually per item) |
| `too-large` | 413 | Body or batch over the limit |
| `unsupported-media-type` | 415 | Not JSON |
| `depends-on-failed` | 422 | The item depends on an item that failed (per item) |
| `invalid` | 422 | Fails the schema or a context rule |
| `server-error` | 500 | Anything unexpected; details go to the server log, not the answer |
| `wrong-folder` | 409 | The board has another folder open: an agent call's `VB-Project` names another folder, or its secret is an agent's of a folder opened before (114, 115) |

## Operations

The `operationId` is snake_case and is also the MCP tool name; the `vb` command is the same name
with hyphens (`show_node` → `vb show-node`). `x-agent: true` marks the operations agents get.

| operationId | Method and path | Who | Does |
|---|---|---|---|
| `list_boards` | `GET /api/boards` | anyone | `{ boards: [{ board, title, seq }], head }`; `seq` is that board's own last line |
| `get_board` | `GET /api/boards/{board}` | anyone | The board now: view, every node's state and version, `head`; with agents, the open grant requests and each region's holders (both left out when empty) |
| `show_node` | `GET /api/boards/{board}/nodes/{n}` | anyone | Every version of node `n`, its notes, replies, proposals, park bundle, links, container and size; `linked=true` adds linked nodes |
| `show_container` | `GET /api/boards/{board}/regions/{region}` | anyone | One container's full history: the region, its holders, every node it has held with every version and note |
| `list_open` | `GET /api/boards/{board}/open` | anyone | Items not yet decided, with `pending` (36) and `unseen` (a newer version than the person last saw) |
| `check_responses` | `GET /api/boards/{board}/responses` | anyone | The person's actions after `after`, and answers to the caller's grant requests; `wait` (0-60 s) holds the call until the person presses Send or answers a request; a timed-out wait returns `{ responses: [], head }` |
| `read_ledger` | `GET /api/ledger` | person | Every ledger line after `after`, from anyone, oldest first, as the file holds it (cards by ledger number, flags included: 125, 128); `board` filters (through a node's board for lines that name only a node); JSON, or `application/jsonl` |
| `join` | `POST /api/agents` | agent | Get an agent id and secret; grants nothing |
| `request_grant` | `POST /api/grants` | agent | Ask the person for write access to a board, or to one container on it (85) |
| `write_board` | `POST /api/boards/{board}/write` | agent | Items: `board`, `region`, `node`, `link`, `unlink`, `reply`, `propose`, `park`, `append`, `retire` (126); per-item results |
| `act` | `POST /api/boards/{board}/act` | person | One action from the action registry (rule 8); a `send` also hands the board's chat session the answers (121) |
| `mark_seen` | `POST /api/boards/{board}/seen` | person | `{ n, ver }`: the person has seen this version (D-018); or `{ board, head }`: the board up to that line (87) |
| `put_board` | `PUT /api/boards/{board}` | person | `{ title, summary? }`: create the board when the id is new, rename it when it exists (90) |
| `watch_board` | `GET /api/boards/{board}/events` | page | Server-sent events: `change` with data `{ seq }` per append |
| `watch_project` | `GET /api/events` | page | The same for the whole project, 200 on an empty one; in watch mode also `build` with data `{ build }` (78-80) |
| `start_chat` | `POST /api/boards/{board}/chats` | person | `{ agent, model? }`: a new chat session on the board, replacing its current one (101) |
| `list_chats` | `GET /api/boards/{board}/chats` | person | `{ sessions }`, newest first; the first is the one in use (101) |
| `start_folder_chat` | `POST /api/chats` | person | `{ agent, model? }`: a new chat session in the folder, on no board until its agent creates one (122) |
| `list_folder_chats` | `GET /api/chats` | person | `{ sessions }` on no board yet, newest first; the first is the one in use (122) |
| `send_chat` | `POST /api/chats/{session}/messages` | person | `{ text?, notes?, cards? }`: the person's message, chips and the board's new answers as one message; 202 with its `message_in` event, or the wait's `system` line (101, 131) |
| `stop_chat` | `POST /api/chats/{session}/stop` | person | Stop the agent's turn; `{ stopped }` (101) |
| `answer_approval` | `POST /api/chats/{session}/approvals/{approval}` | person | `{ approved, scope? }`: allow or deny what the agent waits on; the `approval_result` event (100, 101) |
| `watch_chat` | `GET /api/chats/{session}/events` | person | Server-sent `chat` events after `after`, each with its `seq` as the id (101) |
| `ask_approval` | `POST /api/run/approvals` | gate | Approval facts from a chat session's gate hook, with its run token; waits for the answer (102) |
| `get_project` | `GET /api/project` | person | The open folder: `{ path, name, found, boards? }` (109) |
| `list_folders` | `GET /api/folders` | person | One folder under home (`path`, default home): found or not, its folders marked `hasBoard`, and `recent` (109, 110) |
| `open_project` | `POST /api/project` | person | `{ path, create? }`: open another folder under home in place of this one; the folder now open (111) |

41. Reads take no credentials. With a Bearer secret, `list_open`, `check_responses` and `pending`
    cover only the containers the caller holds, so one agent is never told to answer another's
    items. `act`, `mark_seen`, `watch_board` and `watch_project` are not agent operations (`x-agent: false`).
42. `propose` and `park` are write items, not operations: one write tool with per-item answers
    is easier for an agent than three (fewer, task-shaped tools).
43. `check_responses` keeps no state per caller: the caller passes the `head` it last saw. MCP
    servers are stateless, and so is this.
44. OpenAPI shapes: `read_ledger`'s `application/jsonl` is complete content,
    `schema: { type: array, items: ledgerEvent }`; `watch_board` is `text/event-stream` with
    `itemSchema` describing an event whose `data` has `contentMediaType: application/json` and a
    `contentSchema` of `{ seq }` (OpenAPI 3.2.1 § 4.14.4). `watch_project` is the same, and its
    `itemSchema` is a `oneOf` of that `change` and a `build` event (`{ build }`), which the project
    stream carries in watch mode only (79). Writes have no streaming form: the board already draws
    each node as it is appended, through `watch_project` or `watch_board`.

## MCP (`packages/mcp`)

45. Our own stdio server (D-028), calling the HTTP API through `packages/client`. It speaks MCP
    2026-07-28 and answers the 2025-11-25 handshake for clients that have not moved yet:
    - modern: `server/discover` (supported versions both, capabilities, `serverInfo`, and
      `instructions`: join once, save the secret, write with keys, then `check_responses`);
      `tools/list` with `ttlMs` and `cacheScope`; `tools/call`; version and capabilities read
      from each request's `_meta`; an unknown version gets `UnsupportedProtocolVersionError`
      (-32022); every result carries `resultType: "complete"` and `serverInfo` in its `_meta`
    - legacy: `initialize`, `notifications/initialized`, `ping`, answering `2025-11-25`
    - logs go to stderr; no `notifications/message` unless the request set a log level
46. The tool list is generated from the `x-agent` operations into
    `packages/mcp/src/tools.generated.json`; a test regenerates it and fails on any difference.
47. Each tool's input is the operation's path, query and body inputs merged into one plain
    object. The generator inlines every referenced schema (no `$ref` at all, for clients that do
    not resolve refs), flattens composed objects into `properties` plus
    `additionalProperties: false`, puts no `oneOf` at the root, and strips `$id`, `$schema`,
    `discriminator` and `x-*`. A test checks none remain and that no two merged inputs share a
    name. The server still checks every call with the strict schemas.
48. Each tool declares `outputSchema` = the operation's success response and returns it as
    `structuredContent` plus a short text form. A whole-call problem returns `isError: true` with
    the problem as text only. Per-item failures return `isError: false`, unless every item failed.
49. Annotations: reads `readOnlyHint: true`; every tool `openWorldHint: false`; `write_board`,
    `join` and `request_grant` `destructiveHint: false` (the ledger only grows) and
    `idempotentHint: false` (an item without a key is written again). Hints are advice to the
    client; the grant check is the control.
50. Names match `^[a-z][a-z0-9_]{0,39}$`, which Kiro, Claude Code and Cursor all accept. A
    description's first sentence says what the tool does, and the whole stays under 2,048
    characters; a test checks both.

## `vb` (`packages/cli`)

51. One command per `x-agent` operation, from a generated table, calling the API through
    `packages/client`. Flags are the operation's inputs. Output is the JSON response by default;
    `--text` prints it as `key: value` lines through one generic formatter. A problem prints its
    `detail` and exits non-zero. `vb check-responses --wait 60` is the "wait until the person
    presses Send" loop.

## Drift tests (run by `npm test`, all must pass)

52. **The spec is valid.** `openapi.json` validates against the official OpenAPI 3.2 schema
    (vendored, with its `$dynamicRef` replaced in the test, because ajv mishandles it), and our
    own checks pass: unique snake_case `operationId`s, `x-agent` on every operation, every error
    response is the problem schema, every `$ref` resolves, every schema compiles.
53. **Routes match the spec.** Every server route comes from the route table, and the route
    table is regenerated and compared with the checked-in file.
54. **Responses match the spec.** Every API test checks the real response, status and headers
    against the spec for that operation.
55. **Generated files are current:** the route table, MCP tools, `vb` table and API docs.
56. **Fixtures match the schemas,** and the schema agrees with `eventProblems` (9).

## Adding an operation

57. Add or extend the schema, then the operation in `openapi.json`, then run the generators, then
    write the handler and its test. The drift tests tell you what is still missing.

## Ledger v4 additions: notes beside cards (2e_FE_01)

58. `LEDGER_FORMAT` becomes 4 and every ledger `$id` moves to `.../schema/ledger/4/`; `openapi.json`
    `info.version` becomes 1.1.0. Only adds: v2 and v3 lines stay valid.
59. **A note** is the person's `comment`, or a `context` with `text`. It is named for ever by that
    act's `seq`. A card holds at most one note not yet sent: a second `comment` or `context` with
    text on it is refused (`invalid`, pointer `/n`) until a `send` on its board comes after the
    first. A `context` without words asks for context but is not a note (Reopen undoes it).
60. **Two person-only acts change a note not yet sent:** `note-edit { n, note, text, kind? }`
    replaces its words and, with `kind` (`comment` or `context`), what it asks for;
    `note-remove { n, note }` takes it back. `note` is the `seq` of the act that made it; neither
    names a version. The server refuses either (`invalid`, pointer `/note`) when the note was sent
    (a `send` on its board after it), was removed, is on another node, or is another person's.
    A sent note is history and is never changed; removing one from history is not built (open with
    the maintainer, chat 740).
61. **What every read shows** is a note's latest words and kind, under its own `seq`; a removed
    note shows nowhere. The item's status is worked out as if a removed note had never been made,
    and an edit that sets `kind` counts as a fresh press at the edit. What the agent owes (36) is
    the latest standing ask, still named by the note's `seq`: an edit never makes a second one, and
    a `reply` whose `to` is that `seq` answers it. `check_responses` reports a note as the act that
    made it, with its latest words and kind, and again when it changed after `after`; a
    `note-edit` never shows on its own, and a `note-remove` shows only for a note made at or before
    `after` (one the agent may have read). In `get_board`, `show_node` and `show_container` each
    note carries `seq`, and `sent: true` once a Send came after it. `read_ledger` returns the raw
    lines.

## Ledger v5 additions: a note on a group of cards (3_FE_02)

62. `LEDGER_FORMAT` becomes 5 and every ledger `$id` moves to `.../schema/ledger/5/`; `openapi.json`
    `info.version` becomes 1.2.0. Only adds: v2 through v4 lines stay valid.
63. **A note on a group** is a `comment` or `context` act that carries `nodes` (two or more
    distinct item numbers, each once, on one board) in place of `n` and `ver`: the lasso's
    selection bar offers Comment on two or more selected cards (3_FE_02 ruling 3). It is one note,
    named for ever by that act's `seq`, the same as a note on one card (58); every named node must
    be a numbered item on this board, and the action it offers must be one the item's kind allows.
    The one-note-per-card rule (59) is unaffected: a card's own note (named by `n`) and a group
    note it belongs to (named by `nodes`) are different notes, and either may sit on a card not
    yet sent while the other is edited.
64. **Edit, remove and reads.** `note-edit` and `note-remove` name a group note by the same `note`
    seq from any one of its cards (`n` is any card the note is on); the server refuses a card the
    note is not on. An edit or a removal changes the note on every card it names at once, the same
    append-only way as a note on one card (60): `note-edit` replaces its words (and, with `kind`,
    what it asks for) and `note-remove` takes it back, each a single new act. Every item's status
    among the group is worked out from its own log the same way (61), so a reply naming the note's
    `seq` answers it on every card at once, and a newer version of one card answers it there only
    (api.md 36). `check_responses`, `get_board`, `show_node` and `show_container` show a group note
    once, under its `seq`, carrying `nodes` (every item it is on); `read_ledger` returns the raw
    line, `nodes` and all.
65. **The numbered reply** (`replyText`) lists a group note once, naming every item it is on
    ("12, 14, 15 comment: ..."), instead of repeating it under each item.

## Ledger v6 additions: moving cards between containers (3_FE_03)

66. `LEDGER_FORMAT` becomes 6 and every ledger `$id` moves to `.../schema/ledger/6/`; `openapi.json`
    `info.version` becomes 1.3.0. Only adds: v2 through v5 lines stay valid. **`move`** is a new
    person-only act: `move { n, region }` puts one card in a container, `move { nodes, region }`
    puts a group (two or more, as in 63) in one, in a single act. `ver` is optional on `n` and not
    allowed with `nodes`. Agents cannot move (rule 8); they redraw.
67. **Where it may go.** `region` is a container on the cards' board, or `later`, the board's
    built-in **Later**: every board has one, last, laid out as a grid, which the page works out
    from the fold. No agent draws it and it is never stored as a region: from v6 a `region` line
    with id `later` is refused (`invalid`); a board whose older lines drew one keeps it, and that
    frame is its Later. Later takes only items that can be saved for later (the server refuses any
    other card, pointer `/region`). Every card a move names is on the board the act was sent to.
68. **The person's move wins.** A card's container is the person's latest `move`, else the region
    of its latest version, so an agent's newer version naming its old region does not pull it
    back (as a pin is not undone by a redraw). A move clears the cards' pins, which were local to
    the container they left (rule 9); a drop then pins them where they landed. `show_node`,
    `show_container` and `list_open` give `region` (where it is) and, when the person moved it
    elsewhere, `moved_from` (the region the agent drew it in); `show_container` lists the cards
    the person put in it too. `get_board` keeps `view` as the agent drew it and adds
    `state.moves` (node id -> container, only for cards not where the agent drew them; left out
    when none), as it adds `state.pins`. `check_responses` reports a move to every agent that may
    answer one of its cards; `read_ledger` returns the raw line.
69. **Later is one thing, two ways in.** Putting a card in Later (a drop, L, or the card's Later
    button) writes `move` to `later` and the `later` act, so its status, the "N later" count and
    what the agent owes (36) stay as they were. Taking it out (a drag into a container, or Reopen)
    writes `move` back and `reopen`; Reopen with no target returns the card to the region its
    agent drew it in.
70. **Grants follow the card** (24): a card's "current region" is the container it is in now, so
    the holder of the container the person moved it into may answer and update it, and its author
    may still answer it. Later has no holders, so a card in Later is judged by the region its agent
    drew it in.

## Ledger v7 additions: a note on, and a place for, a whole container (3_FE_04)

71. `LEDGER_FORMAT` becomes 7 and every ledger `$id` moves to `.../schema/ledger/7/`; `openapi.json`
    `info.version` becomes 1.4.0. Only adds: v2 through v6 lines stay valid. **A container act**
    is a `comment`, `context`, `note-edit`, `note-remove`, `pin` or `unpin` that names `board` +
    `region` in place of `n`; it carries no `n`, `ver` or `nodes`. These actions named no `region`
    before v7, so a `region` on one of them is what makes it a container act. All are person-only
    (rule 8): agents cannot write a note on a container or place one.
72. **Which containers.** `region` is a container on `board`. A `pin` or `unpin` may also name
    `later`, the board's built-in Later (67); a note may not, since Later is not a thread an agent
    drew (refused `invalid`, pointer `/region`). An unknown board or container is refused
    `invalid`, pointer `/board` or `/region`.
73. **A note on a container** follows the card-note rules (59-61): it is named for ever by its
    act's `seq`; a container holds at most one note not yet sent (a second is refused `invalid`,
    pointer `/region`, until a `send` on its board comes after the first); `note-edit` and
    `note-remove` name it by `note` with the same `board` + `region`, and are refused (pointer
    `/note`) when it was sent, was removed, is on another container or another card, or is another
    person's. A sent note is history. A container note changes no item's status. What the agent
    owes (36) gains the latest standing ask on each container, and a `reply` whose `to` is the
    note's `seq` answers it. On the page its pin number continues the same sequence as the card
    notes of the current Send.
74. **A container's place** is `pin { board, region, x, y }`, the top-left corner of its frame in
    board coordinates; `unpin { board, region }` returns it to where layout puts it. This is the
    only coordinate a container ever has, and only the person writes it (rule 9). Pinning a
    container does not touch its cards' pins, which are local to the container. **Packing:** a
    pinned container stays exactly where it was put; unpinned containers move right or down to
    make room (`collide.ts`, `applyPins` and `makeRoom`), never on top of one another. Pinned
    containers never move for an unpinned one. When two pinned containers would overlap, the one
    pinned last (higher `seq`) stays and the earlier one is pushed right or down; its stored pin is
    unchanged, so unpinning the later one lets it return. Same input, same picture.
75. **What every read shows.** `get_board` adds `state.containerNotes` (region id -> that
    container's notes, each shaped as a card note, 61) and `state.containerPins` (region id ->
    `{x, y}`), each left out when empty, as `state.moves` is. `show_container` adds `notes` (the
    container's own notes, oldest first, a removed one left out) and `pin` when it is placed.
    `check_responses` reports a container note as the act that made it, with its latest words and
    kind, by the rules of 61, to every agent that may answer the container (a holder, or the agent
    that drew it); a container `pin` or `unpin` is reported the way a card pin is. `read_ledger`
    returns the raw lines.
76. **The numbered reply** (`replyText`) names a container note once, by the container's title:
    `On container "Formats and decisions" comment: ...`, after the item lines.
77. **Where an owed container note shows.** A card-shaped `openItem` cannot name a container, so
    `list_open` and the write result each add `containers` (left out when none): one
    `openContainer { board, region, title, pending, note }` per container whose latest standing
    note has no answer yet (73), for the agents that may answer it. `items` and `pending` stay
    cards only.

## The project stream and watch mode (BE_01, found in use)

78. **The project stream** is `watch_project`, `GET /api/events`: the `change { seq }` events of
    `watch_board` for every board in the project, `retry: 2000` first and a `: beat` comment every
    20 s. It answers 200 on a project with no boards, so the page can wait for the first one.
    `watch_board` is unchanged, for other clients. `openapi.json` `info.version` becomes 1.5.0; the
    ledger format does not change.
79. **Watch mode** is dev only: a server started with `VB_WATCH=1` watches `dist/`
    (`server/build-watch.ts`) and the project stream also sends `build { build }`, once on every
    connect and again whenever the id changes. The id is the server's start time plus the `mtime`
    of `dist/index.html`, so a restart and a new page build both change it; a new one is sent only
    once the folder has been quiet for 300 ms and `index.html` exists, so a page never reloads into
    a half-written build. Without `VB_WATCH` nothing is watched and no `build` is ever sent. The
    item schema is `api/sse-build.schema.json`.
80. **Board heads in the fold.** `list_boards`' `seq`, each board's own last line, is kept by the
    fold (`LedgerState.heads`, set in `applyEvent` through `eventBoard`) and read with `boardList`,
    so the server and the page, which applies each line as it arrives, give the same number.

## Ledger v8 additions: board access, then container access (BE_03, D-034)

81. `LEDGER_FORMAT` becomes 8 and every ledger `$id` moves to `.../schema/ledger/8/`; `openapi.json`
    `info.version` becomes 1.6.0. Only adds: v2 through v7 lines stay valid. **Holders** (replaces
    23) are folded from the ledger, never stored anywhere else (`LedgerIndex.creators` and
    `holders`, keyed by `accessKey`: the board's id, or `containerKey` for a container). A
    container's holders are the agent whose line created the region plus every agent the person
    granted it to, minus revoked ones. A **board's** holders are the agent whose `board` line made
    it (its creator), every agent the person granted the board, and every agent that created a
    region on it or was granted one of its containers, minus board revocations; so an agent that
    already wrote on a board keeps every write it could make before. Lines written in v2 make no
    holder, so any write to a v2 board or region needs a grant.
82. **A board, not a container.** `grant-request { board, reason }` with no `region` asks for the
    whole board; `revoke { holder, board }` with no `region` takes it back. `grant` and `deny`
    answer either kind of request. A grant on a container grants its board too. A board's creator
    cannot be revoked, as a container's cannot; revoking an agent that does not hold the board is
    refused (`invalid`, pointer `/holder`). A board revoke leaves the agent's containers as they
    are, but it can write nothing on the board until the person grants the board again.
83. **What each write needs** (replaces 24). One row per write item in the permissions table
    (`PERMISSIONS` in `packages/actions/src/permissions.ts`, D-033), read alike by `write_board`,
    `pending` and `list_open`. Board first: an agent writes on a board only when it holds it, then
    in a container only when it holds that too. One `write_board` call writes one board, the one in
    the path.
    - `board`: a new id needs nothing, and the writer becomes its creator and holder. An existing
      id only its creator may write (its title and summary); for now the ledger refuses a second
      `board` line from anyone (`invalid`, "already exists"), and the person can rename any board.
    - `region`: a new id needs the board; an existing id needs that region.
    - `node`: a new node needs its `node.region`; a new version needs the region the card is in now
      (the person's move wins, 68; a card in Later is judged by where its agent drew it, 70) and,
      if it moves, the target region too; then the board.
    - `link` / `unlink`: the `from` node's region, then the board. Both nodes on this board.
    - `reply`, `propose`, `park`: the agent that wrote the node's latest version needs only the
      board, so it can still answer a node the person moved; any other agent, the node's region.
    Where a region is missing, the answer names it (its grant brings the board); else the board.
    An unknown board, region or node is judged by the ledger's own checks instead, so the agent is
    told what is wrong rather than to ask for a grant it cannot get.
84. **No grant, no write** (replaces 25). The item fails with `needs-grant` carrying `board`, and
    `region` when it needs a container. The detail says: call `request_grant` once (with just the
    board, for a board), wait for the person's answer in `check_responses`, then resend the same
    items with the same keys. A `board` item for a board another agent made fails with `forbidden`:
    no grant gives it.
85. **`request_grant`** (replaces 26) takes `region` as optional: without it, the request is for
    the board. While the same agent has an open request for the same board or container, that
    request is returned with `replayed: true`, so an agent in a loop cannot flood the person; a
    holder gets `{ held: true }`. The answer leaves `region` out for a board. The `join`,
    `request_grant` and `write_board` descriptions and the MCP instructions tell an agent to ask
    for a board it did not create before writing on it.
86. **What every read shows.** `get_board` adds `boardHolders` (the agents that may write on the
    board, creator first and marked `creator`; left out when none, 32), and a request for the whole
    board in `requests` has no `region`. On the page (agentAccess flag) the requests strip shows a
    board request as "<agent> wants to draw on this board", with the same Allow and Refuse, and the
    header's **Agents** list shows the board's holders, each but the creator with Remove access
    (confirmed, then `revoke` with no `region`). The limit of 27 stands: this runs on one machine,
    so it stops mistakes and wrong-board writes, not attackers.

## Ledger v8 additions: board seen and the conditions table (BE_04, D-033)

87. **Board seen.** `seen` gains a board form, `{ board, head }`: the person has looked at this
    board up to its line `head` (its `seq` in `list_boards`). It names a node (`n`, `ver`) or a
    board (`board`, `head`), never both (`$defs/rules`, a `oneOf`). It is added to v8, which no
    release has carried yet, so the format is not bumped; `openapi.json` `info.version` becomes 1.7.0 and
    `mark_seen`'s body is that `oneOf`, with `board` the same as the path's. The ledger refuses an
    unknown board and a `head` above the ledger's last line. The fold keeps the highest `head` per
    board (`LedgerState.seenBoards`). A board seen is on its board (`scopeOf`, `read_ledger`'s
    board filter) but is not a change to it, so it moves no head (80). The page sends it when one
    is due (`boardNews`): when it opens a board, when it leaves it (a switch, or the page going
    away) and, while the board stays open, at most once a minute when an agent's line arrives.
88. **The conditions table.** What needs attention is one row per kind in `CONDITIONS`
    (`packages/actions/src/conditions.ts`): `item.owed`, `container.owed`, `item.unseen`,
    `grant.requested`, `board.drawn`, `board.new`, `board.changed` (and later rows: `board.unsent`, 123). `conditionsOf(state, { board,
    agent })` returns ids only (`{ kind, board, container?, n?, seq? }`). `list_open`'s `pending`
    and `unseen`, its `containers`, and `write_board`'s `pending` and `containers` read it, as do
    `get_board`'s `requests` and the page. With an agent, rows for the person only are left out and
    the rest are scoped through the permissions table (83): an item it may `reply` on, a container
    it may edit, so an agent revoked from a board is no longer told what is owed there, and
    `check_responses` no longer passes it the container notes and `mode` acts on that board. An
    item owes its unanswered ask first, else its "later" (36).
89. **Board new and changed** are durable: `board.new` is a board other than the open one with no
    board seen; `board.changed` one with an agent's line above its board seen (the fold's
    `agentHeads`: drawing, replies, proposals, requests), so the person's own acts never mark a
    board changed. Both read `boardNews` (conditions.ts). `board.drawn` is an agent
    drawing line (`board`, `region`, `node`, `link`, `unlink`) on the open board after its board
    seen. All three survive a reload and read the same on every computer that shares the ledger.

## Ledger v9 additions: the person's board (navigation BE_01, D-034)

90. `LEDGER_FORMAT` becomes 9 and every ledger `$id` moves to `.../schema/ledger/9/`; `openapi.json`
    `info.version` becomes 1.8.0. Only adds: v2 through v8 lines stay valid. **The person writes a
    `board` line** through `put_board`, `PUT /api/boards/{board}` (`x-agent: false`, the person
    cookie, 20), body `{ title, summary? }` (`api/board-request.schema.json`, the board event's
    `core`, closed). A new id creates the board (201); an existing one is renamed (200): its title
    and summary are replaced, `summary` left out clears it, and its containers, cards and holders
    stay. Both answer the stored line. The stored `board` schema takes `by: person` from v9 only
    (`$defs/rules`; the hand twin is `PERSON_TOO`). The ledger's context check (replacing 83's
    "from anyone") refuses a second `board` line from any agent and allows the person's.
91. **Who may write on it** (D-034). A board the person made has no agent creator and no holders,
    so the permissions table (83) asks every agent for the board (`needs-grant`, `board` only) and
    refuses any agent's `board` item there (`forbidden`, 84); a board grant (82) lets an agent
    draw on it. No agent may rename a board it did not create; today no agent renames at all.
92. **What it changes, and what not.** The person's `board` line is on its board (`scopeOf`) and
    moves its head (80), but it is not an agent drawing line: it makes no version (`runs`), no
    `board.drawn` and no `board.changed` (88-89). `list_boards`, `get_board` and every read show
    the latest title and summary; `read_ledger` returns the raw line. The page offers both from
    the board picker (`BOARD_ACTIONS` in the action registry: New board, Rename board), through
    the one sender, refused while a past version shows.

## Ledger v10 additions: proposals, seen and append (proposals-seen-parking BE_01)

93. `LEDGER_FORMAT` becomes 10 and every ledger `$id` moves to `.../schema/ledger/10/`;
    `openapi.json` `info.version` becomes 1.9.0. Only adds: v2 through v9 lines stay valid. **The
    person rejects a proposal** with a new person act, `reject { n, proposal }` (`proposal` is the
    propose line's `seq`; no status, no reply word: it is not a decision on the item). Accepting
    stays the proposal's own action (`ack` or `drop`) carrying `proposal`. The act rules
    (`validateAct`, `proposalProblems` in `act.ts`; the server and the page run the same) refuse an
    act whose `proposal` is not a proposal on the same card, one already decided ("proposal 812
    was already decided"), an accept whose action is not the proposal's, and an accept made after
    the card moved past the proposal's `ver` ("47 changed after this was proposed; ask the agent
    to look again"). An out-of-date proposal can still be rejected, which clears it; the ledger's
    context check allows that too. The server runs an act's rules before the ledger's context
    check, so the person reads these words, not the ledger's. **Ending.** The fold sets a
    proposal's `decidedBy` and `outcome`: `rejected` by a `reject`, `accepted` by the act that
    names it, and `closed` for every other open proposal on a card the person acknowledges or
    drops, through a proposal or not. `show_node`'s proposals carry both, or neither while open.
94. **Seen by acting.** Any person act that names a card (`n` or `nodes`; every action but
    `send`, and not a note on or place for a whole container) also counts as the person seeing
    each named card's latest version at that line: the fold raises `seen`, never lowers it. No
    `seen` line is written. Tabbing past or hovering is not seeing (the page's rule).
95. **`append`**, a new write item, `{ type: 'append', key?, n, text, base? }`: the server stores
    it as an ordinary `node` line, a new version of card `n` with `text` added to the end of its
    body after a blank line (or as the body, when there is none), every other field carried over.
    The joined body must fit the node body limit (8000), else the item fails `invalid` at `text`.
    It is checked like a node update: the permissions table (83), `base` (30), and the retry key
    (29), which a retry with the same text answers `replayed`. The result has `n`, `ver` and
    `title`, as a node's. The ledger gains no event type; only `write-item.schema.json`, the MCP
    tool and the `vb` command (generated) change. `reply` stays the answer to one of the person's
    notes.
96. **Conditions rows** (88): `proposal.open`, about a card, for the person, on the card and the
    strip: a proposal not yet answered on an undecided item, made on the card's latest version;
    `proposal.stale`, the same once the card has a newer version (it ends on a reject or a
    decision on the card); `item.awaiting`, about a card, for both, on the card: an item in Later
    with no park after its "later" (the same helper as `item.owed`'s "later", so it is checked in
    one place). `item.unseen` is now for both and shown on the card; the page reads it as `ver >
    max(seen, 1)`, so a card at version 1 carries no "updates" tab. The agent's reading
    (`list_open`'s `unseen`) is unchanged.

## NEW cards and what clears a label (stage5-follow-ups BE_01, D-033)

97. **`item.new`**, about a card, for the person, on the card (its NEW tab): an undecided item the
    agent first drew in the board's latest round, with no `seen` at any version: NEW only on a card
    the agent adds after the person has already opened the board and after its first drawing. A round starts at the first
    agent drawing line after a Send that came after the previous round's start; before any, at the
    later of the `head` of the person's first board seen on that board (87) and, when the board had
    no card then, the end of the agent's first drawing with a card (the run its first card came in;
    FIX_01 ruling 7). So whatever was drawn when they first opened it, by any number of agents, is
    never NEW; a board opened while empty shows no NEW on its first drawing, even with a Send (a
    chat message) before it, and no Send starts a round before the board's first card; with no
    board seen no card on it is (`packages/actions/src/rounds.ts`; the fold's `rounds`,
    `firstDrawn`, `firstCards` and `firstSeenBoards`, beside `seenBoards`). It ends when the
    person selects the card (its `seen`), acts on it (94), decides it, or the next round starts
    (a Send, then the agent drawing again). The page leaves a NEW card out of `item.unseen` (NEW
    only, no "N updates" tab); `list_open`'s `unseen` is unchanged, and agents are not told
    `item.new`. **`clearedBy`.** Every conditions row names what the person does that clears it:
    `select`, `act` or `round`, on a row shown on a card, else none. `item.new` is cleared by all
    three, `item.unseen` by `select` and `act`, the rest by none of them. The page reads it
    (`clearsOnSelect(kind)`) to know which labels selecting a card ends, so it sends that card's
    `seen`; a test checks each row's `clearedBy` against the fold. No contract change.

## The chat panel (chat-panel BE_01, D-036, D-037)

98. **The chat's own contract.** A chat event belongs to the chat package, not the ledger:
    `packages/chat/schema/chat-event.schema.json`, `$id` `.../schema/chat/1/chat-event.schema.json`,
    versioned in its path like the ledger's. It references nothing in `packages/format` (D-037), so
    it moves into nclite whole. The server's schema registry (`allSchemaFiles` in
    `apps/board/server/schema.ts`) and the generators (`SCHEMA_DIRS` in `scripts/gen-api.mjs`) load
    it beside the format's, and `openapi.json` references it by `$id` (`chatEvent`, `approvalFacts`,
    `approvalAnswer`, `approvalOutcome`). `info.version` becomes 1.10.0. The ledger format does not
    change: nothing about a chat is written to the ledger; the CLI's own transcript is the record.
99. **Events** are `{ kind, at, session, seq, ... }`, closed, discriminated on `kind`. nclite's
    kinds: `message_in` (`text`, `chips?` of `{ kind: note | card, ref, label }`), `message_out`
    (`text`, and `interim: true` only for a finished block of text mid-turn; absent means the reply
    the turn ended on, nclite's rule), `approval_request` (`approvalId`, `facts`, `expiresAt`),
    `approval_result` (`approvalId`, `approved`, `status`, `scope?`) and `system` (`text`, and
    `turn` of `done`, `stopped` or `error` when the line ends the agent's turn). New:
    `tool_activity`, with the call's id (`call`), the tool's short name (`tool`), `state`
    (`running`, `done`, `failed`) and, for a board write, `board`, `cards` and `head`. A tool's raw
    input or output is never a field, and the schema refuses one. `seq` numbers a session's events
    from 1; the host stamps `at`, `session` and `seq`.
100. **Approvals** follow nclite (`container/approval-ask.ts`, `engine/approvals/facts.ts`): facts,
    never a sentence. `write { op, path, preview? }`, `op` one of `create`, `replace`, `edit`,
    `append`, with a preview of the change of up to 2000 characters; or `command { command, risks,
    paths }`, where `risks` and `paths` may be empty (no risk patterns are matched yet). A path
    holds no control, line-break or text-direction character. The person's answer is `{ approved,
    scope? }`, `scope` `once` (the default) or `session` (that kind of change, for the rest of the
    session). The gate is told `{ approved, status, approvalId?, scope?, asked? }`: `status` is
    `approved`, `denied`, `expired` (nobody answered by `expiresAt`) or `released` (a Stop or a new
    message ended the wait), `approved` is true exactly when `status` is `approved`, only a yes has
    a `scope`, and `asked: false` means an answer kept for the session decided.
101. **Sessions** (`start_chat`, `list_chats`): a session is `{ session, board, agent, model?,
    created }`, `agent` `claude` or `kiro`. One per board is in use, the newest; starting one is
    the person's click, so it grants the board to the session's agent. **Messages** (`send_chat`):
    `{ text, notes?, cards? }`, notes by `seq` and cards by number, answered 202 with the
    `message_in` event, or `conflict` while the agent is still answering. `stop_chat` answers `{
    stopped }`. `answer_approval`: the first answer wins, and a settled approval is a `conflict`.
    **The stream** (`watch_chat`) is `text/event-stream` of `chat` events
    (`api/sse-chat.schema.json`), each with its `seq` as the event `id`: every event after `after`
    (default 0, the whole session), then each new one, like `watch_project` (78).
102. **Who.** Every chat route is the person's: `x-agent: false` and the `vb_person` cookie, refused
    to an agent as in 20. The one exception is `ask_approval`, `POST /api/run/approvals` (nclite's
    run door): only a running session's gate hook calls it, with that session's run token as
    `Authorization: Bearer <token>` (the `runToken` scheme; `auth: 'run'` in the route table; `gate`
    in the table above). The caller check refuses the person cookie there (`forbidden`) and a call
    without a Bearer token (`not-authenticated`); the handler checks that the token names a running
    session.
103. *(Done by 105-107.)* **Until the server runs sessions** (chat-panel BE_03), `apps/board/server/chat.ts` answers every
    chat route `not-found` and the gate `not-authenticated`, so the contract, the route table and
    the caller checks come first (rule 6).
104. How the chat pattern is built and how another host uses it: [chat.md](./chat.md).
105. **The server's sessions** (chat-panel BE_03). `apps/board/server/chat-sessions.ts` is the only
    thing that starts a CLI. Its index, `.visionboard/chat-sessions.json` (`chat-index.ts`, checked
    on read and write, git-ignored, readable by this user only), keeps every session started, oldest
    first: the session as `list_chats` shows it plus `agentId`, the board agent the server joined for
    it (never a secret). A session not loaded since the server started is loaded on first use of any
    of its routes, and its CLI resumes its own transcript. Events are kept in memory only and
    numbered from 1 at each server start, so an `after` past the latest event starts the stream over.
    A session loaded again after a restart starts with one `system` line (no `turn`): "Earlier
    messages aren't shown after a restart; the agent still remembers them." (FIX_01 ruling 4).
106. **The agent's board access** (`chat-access.ts`). On `start_chat` the server joins an agent
    labelled `<CLI> chat <the session id's first 8 characters>`, appends its `grant-request` for the
    board and the person's `grant` of it. The secret goes only into the vb MCP server's environment
    (`VB_AGENT_SECRET`); with it set, the MCP instructions say not to join and to leave `secret`
    out. Secrets are never stored: after a restart the same agent gets a fresh one (one more hash
    in `agents.json`). The agent may call the vb tools, `ToolSearch`, `Read`, `Glob`, `Grep` and the
    gated tools, which the gate asks about; its instructions are `skills/vision-board/SKILL.md`.
107. **Turns and approvals** (`chat-session.ts`, `chat-approvals.ts`). `send_chat` records the
    board's Send (`act` `send`) only once the message is accepted and its turn started; a message to
    a session while a new one is starting on its board is a `conflict` (FIX_01 ruling 1), and the
    page holds a message sent then until the new session has started and sends it there. The prompt is the text, then "Attached from
    the board:" with each note's words and the cards it is on and each card's number and title,
    then `Board: <id>`. A message while the turn runs releases its waiting approvals and is a
    `conflict`. The run token (32 random bytes, per session and server start) opens `ask_approval`
    only while a turn runs. An approval waits 120 seconds (`expired`); a yes for the `session` is
    kept per kind of facts (`write` or `command`) while the session stays loaded. Stop, a new
    session on the board and the server closing release the approvals and stop the CLI.
108. **Kiro** (chat-panel BE_04). `start_chat` with `agent: 'kiro'` runs `kiro-cli acp` (engine v2, the
    CLI's default) through `packages/agent/src/kiro.ts`; its session id is Kiro's own UUID, and the
    CLI process stays up between turns (Stop sends `session/cancel` and kills it after 3 s only if
    it ignores that; a new session on the board and the server closing end it). Kiro's permission requests become the
    same `approval_request`/`answer_approval` flow: the `vb` tools and reading go unasked, a file
    change or a command is asked, anything else is refused; a "for this session" yes is kept by the
    server (Kiro is always answered with its one-time option). No model list is offered for Kiro
    (`--model` is passed when a model is given). Usage is not reported by Kiro's ACP v2. A board
    write's cards and head come from the tool call's `rawOutput` (kiro-cli 2.28.0 sends an MCP tool's
    result there, `{ items: [{ Json: { content } }] }`, and no `content`), so its change chip zooms.

## Opening a folder from the board (open-folder task, U12, D-038 proposed)

109. **The open folder.** The server has one folder open at a time, and every other operation
    reads and writes its ledger, `<folder>/.visionboard/ledger.jsonl` (D-017). `get_project` shows
    it: `path` (absolute), `name` (`~/...` under the home folder, else the absolute path), `found`
    (it has a ledger) and `boards` (how many, when found). `openapi.json` `info.version` becomes
    1.11.0. All three routes are the person's: `x-agent: false` and the `vb_person` cookie, refused
    to an agent or a run token as in 20. The ledger format does not change.
110. **Folders, under home only** (`list_folders`, `apps/board/server/folders.ts`). `path` (default:
    the home folder) is resolved with `realpath` and must be the home folder or under it, so neither
    `..` nor a link leads out; it must be a folder, and no part of it under home may be hidden (a
    name starting with a dot) or `node_modules`. Outside: `forbidden`; not there or not a folder:
    `not-found`. The answer is that folder (`found`, `boards`, `parent` but for home itself), the
    folders in it by name (at most 500, then `more`), each with `hasBoard`, and `recent`. Hidden
    folders, `node_modules` and links are left out. Folder names only: never a file's name or
    contents. A folder the server may not read is `forbidden`, saying macOS may need Files and
    Folders access for the app that started the board. **Cloud storage** (folder-links-cloud task,
    `openapi.json` 1.14.0): the home folder's listing adds `places`, the real folders in
    `~/Library/CloudStorage` (where macOS keeps Dropbox and the like; home only holds links to them,
    and links are not listed), at most 20, by their own names, each passing the checks above (one
    that is a link, hidden, or leads out of home is left out). Only on the home listing and only
    when that folder exists, so other systems get none. A place is just a folder under home: its
    path, display name (`~/Library/CloudStorage/...`), recent entry, lock and open folder are its
    real path, and an agent working through home's link matches it (114). **Recent** is `~/.visionboard/recent.json` (`server/recent.ts`): `{ folders }`, newest
    first, at most 10, written atomically and readable by this user only. It is checked on read; a
    bad file is ignored (an empty list), never fatal. Listed, each entry must still be a folder under
    home. It is a per-person setting, so it lives in home, not in a repo.
111. **Switching** (`open_project { path, create? }`, `server/project.ts`). The same checks as 110,
    then, in order: take the new folder's lock (`conflict` with the holder message when another
    server holds it; nothing changed); without `create`, a folder with no ledger is `not-found`
    before any lock is taken; with it, `.visionboard/` (its `.gitignore` names `lock`, as at start)
    and an empty ledger are made; open its ledger (a failure lets go of the new lock: `conflict`,
    nothing changed); stop every chat (its CLI works in the old folder); end every live stream
    (`watch_project`, `watch_board`, `watch_chat`) and every held `check_responses`, so pages
    reconnect and reload; let go of the old lock; swap the ledger, its agents and its chats; keep
    the old folder (when under home) and the new one in recent. Opening the folder already open
    changes nothing. Agents follow the open folder: each folder keeps its own `agents.json`, so an
    agent's old secret is not known in the new folder; it gets `wrong-folder` naming both folders
    (115), or `not-authenticated` (22) when the old folder is not in recent. The person's
    cookie stays valid: it belongs to the server, not the folder. The chat panel's agent works in
    the open folder (`chat-sessions.ts` `cwd`).
112. **At start** (`apps/board/server.ts`, `startFolder`): `VB_PROJECT` wins; else the newest
    recent folder, if it is still a folder under home; else this repo. Start-up never writes
    `recent.json`: only `open_project` does. Tests pass their own home folder
    (`createBoardServer({ home })`), so no test reads or writes the real one.
113. **The page** (`openFolder` flag, on by default). The "⋯" menu's last row, "Open folder…",
    opens the folder picker (`shell/FolderDialog.svelte`); the page title and the row's tooltip name
    the open folder. The page keeps its last board per folder (`vb.lastBoard:<path>`, falling back to
    `vb.lastBoard`). When the live stream opens again it asks `get_project`, and a different folder
    reloads the page (without its board hash). Off, the page never calls these routes.

## An agent from another folder (folder-mismatch task, U12)

114. **The caller's folder** (`apps/board/server/caller-folder.ts`). Every agent operation
    (`x-agent: true`) takes an optional `VB-Project` header: the folder the agent works in, an
    absolute path percent-encoded as `encodeURI` does it (`project.schema.json` `folderHeader`;
    anything else is `bad-request`). Before the caller check, the dispatcher compares its real path
    with the open folder's: the open folder or a folder inside it matches; anything else is
    `wrong-folder` (409), and nothing is read or written. No header, nothing is checked (an agent
    started outside any project). Person routes and the page never send it and are never checked.
    `openapi.json` `info.version` becomes 1.12.0.
115. **A secret from a folder left behind.** A Bearer secret the open folder's agents do not know is
    looked for in the recent folders' `agents.json` (hashes only, read, never written) before the
    generic answer. Found: `wrong-folder`, never "join again". Both refusals say the same: "The
    board has switched to `~/projects/b`. Your work is in `~/projects/a`. Ask the person to open it
    again; don't join here."
116. **The `vb` MCP server and the `vb` CLI name their folder** (`packages/client/src/project.ts` `projectOf`), worked out
    once at start: `VB_PROJECT` when set, else the nearest folder at or above its working folder
    with `.visionboard/ledger.jsonl` (a home folder that only keeps `recent.json` is no project),
    else none. `packages/client` sends it as `VB-Project` on every call (`project` option). The
    instructions (`INSTRUCTIONS`, `INSTRUCTIONS_JOINED`) and the skill say: on `wrong-folder`, stop,
    tell the person, and do not join.
117. **Answers name the open folder.** `join` and `list_boards` answer `project`, the open folder's
    display name (`~/projects/example`), so an agent can check where it is. The chat panel's CLI runs
    in the open folder and its `vb` MCP gets `VB_PROJECT` set to it (`chat-access.ts` `vbServer`),
    so it always matches; a switch stops its chats (111).

## Ledger v11: the kind decides (every-node BE_01, D-040 proposed)

118. **The kind decides.** `LEDGER_FORMAT` becomes 11 and every ledger `$id` moves to
    `.../schema/ledger/11/`; `openapi.json` `info.version` becomes 1.13.0. The first format that
    takes something away (11): a node names no `item`. A v11 stored line, or a sent node item,
    naming `item` (true or false) is refused with one problem at `/node/item` saying what replaced
    it (`ITEM_REMOVED`; the node schema's `noItem`, which a test keeps equal to it). Lines from v2
    to v10 that carry `item` stay valid (the node schema's `rules`, `if` on `v`), and every reader
    ignores it: `boardView`, `show_node`'s versions, the card's change chips (`versionChanges`),
    and an `append`, which carries no `item` onto the new line. `NODE_TYPES[kind].answer` is true
    for `question`, `decision` and `action`: they offer `ANSWER_ACTIONS` (ack, drop, comment,
    context, later); every other kind offers `NOTE_ACTIONS` (comment, context, later) and never
    blocks. The act rules (`validateAct`) check an act on a card against its kind's list only: a
    note on a group (63) takes any cards of any kinds, and Later (66) takes any card.
119. **Every node carries its number.** The View sets `n` on every node (`boardView`), and the
    view schema requires it. Counts (`counts`) are over the cards that need an answer; the numbered
    reply (`replyText`) has a line for any card the person answered and lists as still open only
    cards that need an answer. The action layer's other readers follow in 120; the page's `isItem`
    still reads `n`, so every card shows its number and its kind's buttons (every-node FE_01).

## Every card in the conversation (every-node BE_02, D-040 proposed)

120. **Decided, owed and open, by kind.** `DECIDED` is ✓, ✗ or a comment (`acknowledged`,
    `dropped`, `commented`), and only a card that needs an answer is ever decided (`isDecided`);
    more context keeps it open. `CLOSED` is ✓ or ✗: nothing is owed on a closed card and its
    proposals end, so a comment that decides a card is still owed a `reply` or an `append`
    (ruling 5). On every card of every kind: `item.owed` (a comment or more context with no answer,
    or a Later with no park), `item.new`, `item.unseen` and `item.awaiting`; so `pending` on a
    write answer and the NEW and updates tabs cover every card. `proposal.open` and
    `proposal.stale` stand on a card that needs an answer until ✓ or ✗; an old board's proposal on
    another kind never shows, and a new `propose` on one fails `invalid` at `/items/{i}/n`
    (`proposeProblem`). `list_open` lists every question, decision and action not decided plus
    every card of any kind owed an answer or a handover. `show_node` and `show_container` give
    every card its `status` (required). `check_responses` sorts each batch, the acts up to and
    ending with a Send, by card number (`inCardOrder`): an act at its lowest card (a note on a
    group at the lowest of its cards), a note on, a place for or the layout (`mode`) of a whole
    container at the lowest card in it now, or first when it holds none, a grant answer or a revoke
    after the cards; acts at one place keep the order made, and the ledger keeps the order of the
    clicks. `limit` cuts in ledger order before the sort (`responsesPage`), so with `more: true`
    the next page is `after` the highest `seq` in `responses` (`head` is past what was cut). A
    container note's act carries no `nodes`: the agent reads its cards with `show_container`.

## The chat panel: Send hands over the answers, first board from the chat (panel-send BE_01)

121. **Send hands over the answers, in plain words.** `info.version` becomes 1.15.0. What ✓ and ✗
    mean on a kind is one table, `packages/actions/src/action-words.ts` (`MEANINGS`, moved from
    `packages/ui`): `yes` and `no` on a question, `done` for ✓ on an action, nothing elsewhere. The
    agent reads it three ways (ruling 4): `check_responses` reports a ✓ or ✗ with `means` when its
    card's kind (now) gives it a word (the response schema's `reported` act, never stored in the
    ledger); the numbered reply (`replyText`) puts each card's kind and its word on its line, "2
    (question): no", "5, 7 (finding, risk): comment: ...", "6 (finding): saved for later" (Later's
    reply word is now "saved for later"); and the Send message. **The Send message** (ruling 1):
    when the board has a chat session (`current`, the newest on it), an `act` `send` also hands that
    session's agent one message, which is both its prompt and its `message_in`: "The person updated
    the board:", the numbered reply limited to the cards and containers answered after the last one
    it was told (`replyScope`: ✓, ✗, a note, Later, Reopen, a note changed or removed, a proposal
    turned down; only the notes made since; "Still open" is the whole board's), then "These are the
    person's answers up to head N. To read anything newer, call check_responses on board "b" with
    after N." (`chat-round.ts`). "The last one it was told" is kept in memory per session; after a
    restart it is the Send before. While a turn runs the message waits (one at most; the `system`
    line "Your answers go to the agent when it finishes this turn." says so once) and goes when the
    turn ends, however it ends, its text made then, so a second Send meanwhile is covered by the
    same message. The `act` answer is not held for it; a session that can't be loaded leaves the Send
    as it was. A board with no session: nothing changes. `send_chat` still records the Send
    without this message (its own text is the prompt).
122. **A session in the folder** (ruling 2). `start_folder_chat` (`POST /api/chats`) starts a
    session with no board; `list_folder_chats` (`GET /api/chats`) lists the sessions on no board,
    newest first, the first in use (one in use in the folder, as on a board). `board` is optional
    in `chat-session.schema.json`. The server joins its agent and grants nothing. Its messages take
    no chips (`invalid` at `/notes/i`, `/cards/i`), record no Send, and end "No board is open in this
    folder yet. If drawing would help, create one with write_board; the person's page opens it." in
    place of `Board: <id>`. When its agent creates a board (a `board` line by that agent, which is
    the board's creator), the session moves to it: the index entry gets `board`
    (`chat-index.ts` `attach`, once), it leaves `list_folder_chats` and is the one in use in
    `list_chats` on that board; the creator needs no grant. The page follows the same session id;
    the board write's `tool_activity` names the board to open.

## Field report, batch 1 (2026-10-11)

123. **Nothing new to send** (ruling 1, tracker N33). A person row in the conditions table,
    `board.unsent` (shown on Send to agent, `shows: ['send']`): the open board has an answer of the
    person's since its last Send that the Send message carries (`registry.ts` `isAnswer`, the same
    test `replyScope` uses: ✓, ✗, a note, More context, Later, Reopen, a proposal turned down, a note
    on a whole container). A move into or out of Later counts through the Later or Reopen written
    with it; a pin, a size, a mode or a move between containers alone does not; a note written and
    removed before Send leaves nothing. The fold keeps, per board, the lines since its last Send
    (`unsent.ts`, `LedgerState.unsent`), so the row reads an index and walks no events. While it does
    not hold, Send to agent is disabled: quiet, `aria-disabled`, still focusable, its title (and so
    its description) "Nothing new to send"; a click or Enter records nothing. No contract change:
    the server still records any `send` it is sent (`send_chat` and agents' reads are unchanged).
124. **Join again after a folder switch** (ruling 2). When an agent's `VB-Project` header names the
    open folder (or a folder inside it) but its secret is known only to a recent folder it joined
    before (115), the answer is `not-authenticated` (401, with `WWW-Authenticate`), not
    `wrong-folder`: "This board now has your folder open (`~/projects/b`). Your secret is from
    `~/projects/a` — call join again." Its folder is open now, so joining here is right; the MCP
    instructions already say to join again on `not-authenticated`. Without a header the answer is
    `wrong-folder` as before (115), and a header naming another folder is refused first (114).

## Ledger v12: board numbers, retire, the flag, column and row (field-report batch 2 BE_01, D-041 proposed)

125. **Each board numbers its cards from 1** (ruling 2, D-041 proposed). `LEDGER_FORMAT` becomes 12
    and every ledger `$id` moves to `.../schema/ledger/12/`; `openapi.json` `info.version` becomes
    1.16.0. A card has two numbers, never mixed. Its **identity** is its ledger number, given once
    per project and never reused (D-017): the file writes it `n`, on every line from v2 on, and code
    calls it `id` (`fromLine` turns a line into the event code reads, `toLine` back; nothing else
    renames). Its **board number** `n` is 1, 2, 3... in the order its board's cards were first drawn:
    it is never stored, but worked out on read (`LedgerIndex.cards` and `LedgerBoard.cards`, a
    board's identities in drawing order, card `n` at `n - 1`; `boardNumber`, `cardId`), so old
    lines get theirs the same way (numbers written inside old notes won't match; accepted). Cards
    never change board, so the pair is fixed for ever and every folded index stays keyed by
    identity. **Every request and answer speaks board numbers**, on the board the operation names:
    `n` in a path (`show_node`), every `n`, `from`, `to`, `nodes` and `region.center` in a body
    (write items, `act`, `mark_seen`, `send_chat`'s `cards`), and every card in an answer (the
    View's node ids, `n`, links and centre; `get_board`'s `state` and `versions` keys; `openItem`,
    `pending`, notes' `nodes`, proposals, links, node detail, write results, `check_responses`'
    acts). The server translates at its edge, in through `cardId(ix, board, n)` (a number the board
    has not given fails `invalid` at its pointer: "board b has no card 9"), out through
    `boardNumber`; problems an agent or the person reads name a card by its board number
    (`contextProblems`' `name`). A `{ "key": … }` still names a card made earlier. Links join cards
    on the write's board; an old line linking two boards is drawn on neither, as before. The schemas
    say it once: ledger `nodeNumber` (both meanings, by where it is), API `cardNumber` and
    `cardNumbers` (`api/common.schema.json`), which every API body and answer uses.
126. **`retire`** (ruling 1, assumptions B and C), a new write item and agent event. Sent:
    `{ type: 'retire', n }` (a number or a key) or `{ type: 'retire', region }`, never both, `key`
    as on any item. Stored: `{ board, cards, region?, key? }`: `cards` = the identities it took
    off, which the server fills in: the card named, or every card in the container now (the
    person's moves count: a card moved in goes, one moved out or into Later stays). Checked like a
    node update: the permissions table (83, the container the card is in now, or the one named),
    the retry key (29, `replayed`). **Refused** (`invalid` at `/items/{i}/n` or `/items/{i}/region`)
    while any card it would take still owes the person something: a comment or More context with no
    `reply` or `append` after it, or a Later with no `park` (`item.owed`, the same helper): "card 4
    has a comment you haven't answered: answer it with a reply or an append first". A container
    also waits while its own latest note has no `reply` naming it (BE_02: nothing the person asked
    for goes missing, assumption B). The ledger
    refuses (context): a card on another board, or already retired; an unknown container, or
    `later` (no container to retire); a retire with neither a container nor a card. The answer is
    `{ ok, seq, retired }`, `retired` the board numbers it took (none for an empty container).
127. **What retiring changes.** A retired card leaves the board: the View, `get_board`'s `state`
    and `versions`, counts, `list_open`, `pending`, every condition and every list; its proposals
    end (`closed`). It keeps its versions, notes, replies and number: the board's version history
    shows it, and `show_node` still answers, with `retired` (the retire line's `seq`). A retired
    container leaves the board with its cards; `show_container` still answers, with `retired`, and
    lists the cards that left with it. No
    number is given twice (C): the board's `cards` keeps retired identities. The ledger refuses
    (context) every later line naming a retired card (a node version: "card 5 is retired; draw a
    new card instead", a link, a reply, a proposal, a park, the person's act or seen; an `unlink`
    still goes), a region line reusing a retired container's id ("pick another id"), and a node or
    a move into a retired container. The page shows "N cards retired" on a container that is on the
    board, for the cards retired one by one while in it (where they were at their retire line),
    opening the board version just before (`seq - 1`) (FE_01). `retire` is an agent drawing line
    (`DRAWING_EVENTS`): a version of the board.
128. **The flag** (ruling 3, assumption A): person acts `flag { n }` and `unflag { n }`, one card,
    any kind, no `ver` (it stays through a redraw), no group, no container; the act rules refuse it
    on a retired card. **No agent ever reads one** (`PRIVATE_ACTIONS`, `isPrivateAct`):
    `check_responses` (and its `wait`, which a flag never wakes), the Send message and `replyText`,
    `show_node`, `show_container`, `get_board`, `list_open` and `pending` leave flags out; a flag is
    not an answer for `board.unsent` (123), is not seeing the card (94), and moves no board head,
    drawn head or agent head (`list_boards`' `seq` included). Only the person's page reads it, from
    `read_ledger` (130), and folds it with the action layer.
129. **Modes.** `MODES` is `grid`, `flow`, `lanes`, `radial`, `column`, `row`. `list` is renamed
    `column` (cards top to bottom in card order); a line from v11 or older naming `list` stays
    valid and reads as `column` (`fromLine`, `RENAMED_MODES`); a v12 line or a sent item naming it
    is refused with one problem saying so (`LIST_RENAMED`; the common schema's `notList`, a test
    keeps them equal), on a region and on a `mode` act alike. `row` lays a container's cards left to
    right in card order with no links needed (`packages/layout`, BE_02); `flow` keeps its name and
    means "follow the links".
130. **`read_ledger` is the page's** (x-agent false, the person's cookie, no `VB-Project`):
    its lines are as the file holds them, cards by identity and flags included, so no agent reads
    it; the MCP tool and the `vb` command are gone. An agent reads `check_responses`, `get_board`,
    `show_node`, `show_container` and `list_open`, which speak board numbers and show no flag.

## The chat carries the board (chat-board-context, 2026-10-11)

131. **One message carries the board** (rulings 1-5). `info.version` becomes 1.17.0. On a board
    session, `send_chat` builds one message (`chat-prompt.ts` `promptFor`, the one builder; the
    board's Send uses it too): the person's words (`text`, now optional: left out when they wrote
    nothing), then "Attached from the board:" with each note and card, then the Send message of 121
    for what the session's agent was not yet told (`chat-round.ts` `roundOf`, left out when there
    is nothing), then `Board: <id>`. Its `message_in` shows the words and the answers, with the
    chips; with neither, "Attached from the board.". It is recorded as the board's Send when it
    goes, so 121's "send_chat records the Send without this message" no longer holds. Nothing at
    all to send (no words, no chips, nothing new for this agent) is `invalid` at `/text`; a folder
    session still takes words only. While a turn runs, words alone are still a `conflict` (107);
    a message with chips or new answers waits instead (202 with the `system` line "Your message
    goes to the agent when it finishes this turn.", or 121's line with no words), one per session:
    a second message meanwhile joins it (both messages' words, every chip), and it is built when
    the turn ends, so it carries every answer up to then. The board's Send (`act` `send`) with a
    session hands over only when there is something new for its agent (no "Still open" message on
    its own) and joins a message waiting. Sessions now show `agentId` (`chat-session.schema.json`,
    required), the agent id the session's agent writes as, never a secret, so the page can show
    the same answer lines the message carries (`replyScope` with that agent, 41).
    A note is sent once (chat-no-double-note): a note chip whose note is among the answers the
    message carries (`chat-round.ts` `roundOf`, whose `notes` are the ones `replyLines` wrote) is
    still checked (`invalid` when it is not on the board) but left out of "Attached" and of the
    `message_in` chips; a note the agent is told no answer for stays attached. A card stays
    attached as `- Card n: title` even when answered, with nothing of its answer. The page no
    longer offers unsent notes as chips (the answers chip stands for them).
    The selection has its own heading (composer-one-chip ruling 3): after the words comes "The
    person selected these cards:" with a `- Card n: title` line per card, so "these" means the
    selection, then any note an older client still names under "Attached from the board:", then the
    answers, then `Board: <id>`. What a message carries from the board is written once, by
    packages/actions `boardBlocks` (the selection, then the notes, then `roundOf`, which moved there
    from `chat-round.ts`): the server's prompt and the page's preview of it (the composer's one chip,
    "3 answers · 2 selected", ruling 2) read the same function. No route or schema changes.
