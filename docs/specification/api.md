---
category: project-docs
type: specification
status: active
created: 2026-10-02
updated: 2026-10-08 (board access, ledger v8: 81-86; board seen and conditions: 87-89; the person's board, ledger v9: 90-92)
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
    `request_grant`, and the person must approve again. For MCP, `secret` is a tool argument;
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
| `read_ledger` | `GET /api/ledger` | anyone | Every ledger line after `after`, from anyone, oldest first; `board` filters (through a node's board for lines that name only a node); JSON, or `application/jsonl` |
| `join` | `POST /api/agents` | agent | Get an agent id and secret; grants nothing |
| `request_grant` | `POST /api/grants` | agent | Ask the person for write access to a board, or to one container on it (85) |
| `write_board` | `POST /api/boards/{board}/write` | agent | Items: `board`, `region`, `node`, `link`, `unlink`, `reply`, `propose`, `park`; per-item results |
| `act` | `POST /api/boards/{board}/act` | person | One action from the action registry (rule 8) |
| `mark_seen` | `POST /api/boards/{board}/seen` | person | `{ n, ver }`: the person has seen this version (D-018); or `{ board, head }`: the board up to that line (87) |
| `put_board` | `PUT /api/boards/{board}` | person | `{ title, summary? }`: create the board when the id is new, rename it when it exists (90) |
| `watch_board` | `GET /api/boards/{board}/events` | page | Server-sent events: `change` with data `{ seq }` per append |
| `watch_project` | `GET /api/events` | page | The same for the whole project, 200 on an empty one; in watch mode also `build` with data `{ build }` (78-80) |

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
    `grant.requested`, `board.drawn`, `board.new`, `board.changed`. `conditionsOf(state, { board,
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
