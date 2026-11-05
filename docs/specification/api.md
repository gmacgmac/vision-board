---
category: project-docs
type: specification
status: active
created: 2026-10-02
updated: 2026-11-05 (read-only words name Editing, the toggle's state: FIX_02); 2026-11-05 (a node item's `insert`: a card into a flow in one write, `inserted` in its result: 174); 2026-11-03 (ledgers and read-only fixes: chat sessions per ledger, reads refused elsewhere, a watcher follows a move, the person's Edit words: FIX_01); 2026-11-03 (data-folder paths from one module, `data-folder.ts`: 161); 2026-11-03 (the tools keep a bot's rules, the reads give it the facts, `x-hosts` on an input: 171); 2026-11-02 (a Send whose chat can't be reached is a 409 saying why: 170); 2026-10-31 (the engine's seam: `route` with a context, `tools` in MCP's shapes, two live chips, the chat reads through `resolve`: 131, 159, 162, 163; a picture's cap, measured, and a blank page in its name: 168); 2026-10-30 (a PDF's pages and a fitted copy, `of`: 168; read_attachment: 167, attachedFile widened: 165; attached files: 164; a file's label: 165; D-069: 164-166); 2026-10-27 (the board's engine part, HTTP-free, the standalone server one host of it: 159-163; the chat prompt from chips: 131); 2026-10-25 (the tool list trimmed: no output schemas, no examples in descriptions, a size budget, the server named `vision-board`: 45, 47, 48, 106, 108, 116, 117; worked examples: refusals carry the item's: 39); 2026-10-19 (an app card's saved panel state, get_panel_state and put_panel_state: 157; ledger v18: the person's hidden notes on a card: 156); 2026-10-18 (images in cards: the route is not an operation: 154-155); 2026-10-17 (ledger v17: app cards, list_apps and call_app_tool: 150-153); 2026-10-12 (ledger v15: lock a board, read-only for everyone: 138-140; ledger v14: archive a board, gone for agents: 135-137); 2026-10-11 (ledger v13: card widths, show_layout, alignment per viewer: 132-134; the chat carries the board: 131, a note sent once, the selection's heading and one writer; ledger v12: board numbers, retire, the flag, column and row: 125-130); 2026-10-08 (board access, ledger v8: 81-86; board seen and conditions: 87-89; the person's board, ledger v9: 90-92; the chat panel: 98-104)
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
    carries `board` and `region`; `invalid` can carry `example`, a worked request that fits. A
    refused write item names a known `type`: its `example` is that form's `examples[0]` from the
    write-item schema (`itemExample`, `apps/board/server/examples.ts`; `write-examples.test.ts`); a
    missing or unknown `type` lists the ten types in `detail` and has no `example`; a refused body
    carries the operation's request example (`bodyExample`, held by the same test). A 401 sends `WWW-Authenticate: Bearer realm="vision-board"`; a
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
| `too-large` | 413 | Body or batch over the limit; an app tool's answer over its limit (153); a panel's state over its limit (157) |
| `unsupported-media-type` | 415 | Not JSON |
| `depends-on-failed` | 422 | The item depends on an item that failed (per item) |
| `invalid` | 422 | Fails the schema or a context rule |
| `server-error` | 500 | Anything unexpected; details go to the server log, not the answer |
| `wrong-folder` | 409 | The board has another folder open: an agent call's `VB-Project` names another folder, or its secret is an agent's of a folder opened before (114, 115) |
| `locked` | 423 | The person locked the board: every write on it is refused, whole, until they unlock it (139) |
| `read-only` | 409 | The ledger is open read-only: every write is refused before anything is written, until the person makes it editable (173) |
| `needs-approval` | 403 | An app's tool was called before the person allowed this version of the app's code (151, 153) |
| `app-not-found` | 404 | No app with this id in the project's `.visionboard/apps/` (153) |
| `app-invalid` | 422 | The app's manifest or files have problems; `list_apps` lists them (152, 153) |
| `app-failed` | 502 | The app's tool crashed, gave an answer that doesn't fit its `outputSchema`, or the app is broken after crashing too often (153) |
| `app-busy` | 503 | The app has as many calls running and waiting as it may have (153) |
| `app-timeout` | 504 | The app's tool ran past its time limit and was stopped (153) |

## Operations

The `operationId` is snake_case and is also the MCP tool name; the `vb` command is the same name
with hyphens (`show_node` → `vb show-node`). `x-agent: true` marks the operations agents get.

| operationId | Method and path | Who | Does |
|---|---|---|---|
| `list_boards` | `GET /api/boards` | anyone | `{ boards: [{ board, title, seq, locked? }], head }`; `seq` is that board's own last line; `locked` on a locked board (139); `ledger` reads another ledger of the folder (113b) |
| `get_board` | `GET /api/boards/{board}` | anyone | The board now: view, every node's state and version, `head`; with agents, the open grant requests and each region's holders (both left out when empty); `locked` on a locked board (139); `ledger` reads another ledger (113b) |
| `show_node` | `GET /api/boards/{board}/nodes/{n}` | anyone | Every version of node `n`, its notes, replies, proposals, park bundle, links, container and size; `linked=true` adds linked nodes; `ledger` reads another ledger (113b) |
| `show_container` | `GET /api/boards/{board}/regions/{region}` | anyone | One container's full history: the region, its holders, every node it has held with every version and note |
| `show_layout` | `GET /api/boards/{board}/regions/{region}/layout` | anyone | How the board arranges one container, structure only: mode and widths in effect, each card's lane, column and row, how many links cross, how many cells are empty (133) |
| `list_open` | `GET /api/boards/{board}/open` | anyone | Items not yet decided, with `pending` (36) and `unseen` (a newer version than the person last saw) |
| `check_responses` | `GET /api/boards/{board}/responses` | anyone | The person's actions after `after`, and answers to the caller's grant requests; `wait` (0-60 s) holds the call until the person presses Send or answers a request; a timed-out wait returns `{ responses: [], head }` |
| `read_ledger` | `GET /api/ledger` | person | Every ledger line after `after`, from anyone, oldest first, as the file holds it (cards by ledger number, flags included: 125, 128); `board` filters (through a node's board for lines that name only a node); JSON, or `application/jsonl` |
| `join` | `POST /api/agents` | agent | Get an agent id and secret; grants nothing |
| `request_grant` | `POST /api/grants` | agent | Ask the person for write access to a board, or to one container on it (85) |
| `write_board` | `POST /api/boards/{board}/write` | agent | Items: `board`, `region`, `node`, `link`, `unlink`, `reply`, `propose`, `park`, `append`, `retire` (126); per-item results |
| `act` | `POST /api/boards/{board}/act` | person | One action from the action registry (rule 8); a `send` also hands the board's chat session the answers (121) |
| `mark_seen` | `POST /api/boards/{board}/seen` | person | `{ n, ver }`: the person has seen this version (D-018); or `{ board, head }`: the board up to that line (87) |
| `put_board` | `PUT /api/boards/{board}` | person | `{ title, summary? }`: create the board when the id is new, rename it when it exists (90) |
| `retire_cards` | `POST /api/boards/{board}/retire` | person | `{ cards }` or `{ region }`: the person removes cards, or a container and its cards, with the same `retire` line an agent writes (141) |
| `watch_board` | `GET /api/boards/{board}/events` | page | Server-sent events: `change` with data `{ seq }` per append |
| `watch_project` | `GET /api/events` | page | The same for the whole project, 200 on an empty one; in watch mode also `build` with data `{ build }` (78-80) |
| `start_chat` | `POST /api/boards/{board}/chats` | person | `{ agent, model? }`: a new chat session on the board, replacing its current one (101) |
| `list_chats` | `GET /api/boards/{board}/chats` | person | `{ sessions }`, newest first; the first is the one in use (101) |
| `start_folder_chat` | `POST /api/chats` | person | `{ agent, model? }`: a new chat session in the folder, on no board until its agent creates one (122) |
| `list_folder_chats` | `GET /api/chats` | person | `{ sessions }` on no board yet, newest first; the first is the one in use (122) |
| `send_chat` | `POST /api/chats/{session}/messages` | person | `{ text?, notes?, cards?, files? }`: the person's message, chips, attached files and the board's new answers as one message; 202 with its `message_in` event, or the wait's `system` line (101, 131, 164) |
| `stop_chat` | `POST /api/chats/{session}/stop` | person | Stop the agent's turn; `{ stopped }` (101) |
| `answer_approval` | `POST /api/chats/{session}/approvals/{approval}` | person | `{ approved, scope? }`: allow or deny what the agent waits on, `once`, for the `session` or the `folder` as the request offers; the `approval_result` event (100, 101) |
| `watch_chat` | `GET /api/chats/{session}/events` | person | Server-sent `chat` events after `after`, each with its `seq` as the id (101) |
| `ask_approval` | `POST /api/run/approvals` | gate | Approval facts from a chat session's gate hook, with its run token; the access rules first, then a kept yes, else waits for the answer (102, 107) |
| `list_permissions` | `GET /api/permissions` | person | `{ permissions }`: the yeses kept for this folder ("Allow for this folder"), oldest first (100, 107) |
| `forget_permission` | `POST /api/permissions/forget` | person | `{ id }`: forget one kept yes; the agent asks again; the ones left (100, 107) |
| `attach_chat_file` | `POST /api/chat/files` | person | `{ name, type, data, of? }`: save one file the person attaches to a message, or with `of` a picture the page made of one; 201 with `{ file }` (164, 168) |
| `read_attachment` | `POST /api/chat/files/read` | agent | `{ path, sheet?, range? }`: read an attached Word or Excel file, or expand a zip; 200 with `{ kind, untrusted, ... }` (167) |
| `get_project` | `GET /api/project` | person | The open folder: `{ path, name, found, boards? }`; with read-only opening `readOnly?`, `editing?` (109, 173) |
| `edit_ledger` | `POST /api/project/edit` | person | Edit: take the open ledger's lock now, or `conflict` naming who holds it; the open folder (173) |
| `stop_editing` | `DELETE /api/project/edit` | person | Stop editing: let the lock go; the ledger is read-only; the open folder (173) |
| `list_folders` | `GET /api/folders` | person | One folder under home (`path`, default home): found or not, its folders marked `hasBoard`, and `recent` (109, 110) |
| `open_project` | `POST /api/project` | person | `{ path, create? }`: open another folder under home in place of this one; the folder now open (111) |
| `list_apps` | `GET /api/apps` | agent | `{ apps }`: every app in the folder and every app a card names, each with its state, tools, hash and whether the person allowed it; an agent's secret or the person's cookie (152) |
| `call_app_tool` | `POST /api/apps/{app}/calls` | person | `{ tool, arguments? }`: run one of an app's tools for its panel; MCP's tool result (153) |
| `get_panel_state` | `GET /api/boards/{board}/nodes/{n}/panel-state` | person | `{ state? }`: the value app card `n`'s panel last saved, left out when none (157) |
| `put_panel_state` | `PUT /api/boards/{board}/nodes/{n}/panel-state` | person | `{ state }`: keep the panel's value for app card `n`, in place of the one before; `{ bytes }` (157) |

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

45. Our own stdio server (D-028), calling the HTTP API through `packages/client`, configured in
    every client under the name `vision-board` (`packages/mcp/README.md`; the chat panel's
    `chat-access.ts` `MCP_NAME`, held by `api-chat-kiro.test.ts`). It speaks MCP
    2026-07-28 and answers the 2025-11-25 handshake for clients that have not moved yet:
    - modern: `server/discover` (supported versions both, capabilities, `serverInfo`, and
      `instructions`: join once, save the secret, write with keys, then `check_responses`; a host's tools that carry
      their own `instructions` get those, 171);
      `tools/list` with `ttlMs` and `cacheScope`; `tools/call`; version and capabilities read
      from each request's `_meta`; an unknown version gets `UnsupportedProtocolVersionError`
      (-32022); every result carries `resultType: "complete"` and `serverInfo` in its `_meta`
    - legacy: `initialize`, `notifications/initialized`, `ping`, answering `2025-11-25`
    - logs go to stderr; no `notifications/message` unless the request set a log level
46. The tool list is generated from the `x-agent` operations into
    `packages/mcp/src/tools.generated.json`; a test regenerates it and fails on any difference.
    Each of them also says who gives it, `x-hosts` beside `x-agent` (M15; `scripts/gen-api.mjs`
    `toolTableWithHosts`, which stops the build without one), into the tool table's `hosts`: `standalone`,
    the standalone app over `vb-mcp`, gives every tool; `plugin`, any host of the plugin from the engine's
    `tools` (159), gives what a plugin bot gets, which leaves out `join` (the host says who is calling; no
    secret to mint, no second identity for a bot), `read_attachment` (the chat's, beside its files, D-068)
    and `list_apps` (the app host's, which stays with the standalone host, 161). `request_grant` stays for
    both: a board a person made, or another agent's, answers `needs-grant` under any host, and a request
    only asks, for the person's click (`gen-tools.test.mjs` "x-hosts says").
47. Each tool's input is the operation's path, query and body inputs merged into one plain
    object. The generator inlines every referenced schema (no `$ref` at all, for clients that do
    not resolve refs), flattens composed objects into `properties` plus
    `additionalProperties: false`, puts no `oneOf` at the root, and strips `$id`, `$schema`,
    `discriminator` and `x-*`. A test checks none remain and that no two merged inputs share a
    name. The server still checks every call with the strict schemas. Examples are part of the
    contract: each write item form's `sent` schema carries an `examples` entry (an annotation, so
    what the schema accepts does not change; they stay in the tool's `inputSchema`), and a refused
    item or body carries one (39). A tool description carries none (`describe` in
    `scripts/gen-mcp.mjs`; held by `tools.test.ts`); the worked example is the skill's
    (`skills/vision-board/SKILL.md` § Writing cards). Descriptions are written for a model reader:
    what the tool does, what it needs, what it refuses, what comes back. A size budget holds the
    whole `tools/list` and each tool, as compact JSON, under the caps `LIST_CAP` and `TOOL_CAPS` in
    `packages/mcp/tests/tools.test.ts`.
48. A tool declares no `outputSchema` (MCP allows that): its description says in a few words what
    comes back, and the operation's success response in `openapi.json` stays the contract, which
    `session.test.ts` holds every `structuredContent` to. A call returns the answer as
    `structuredContent` plus the same JSON as text. A whole-call problem returns `isError: true` with
    the problem as text only (`detail`, each pointer error and, when it has one, `Example:`). Per-item failures return `isError: false`, unless every item failed.
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
    (a `send` on its board after it) or answered (143), was removed, is on another node, or is
    another person's.
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
    `/note`) when it was sent or answered (143), was removed, is on another container or another
    card, or is another person's. A sent note is history. A container note changes no item's status. What the agent
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
    board request as "<agent> wants to draw on this board", with the same Allow and Refuse. With
    the accessByBot flag (search-and-finding rulings 320, 321) the strip groups the requests by the
    asking agent's id (`agent` on each, stamped by the server, 21): one group per bot, headed by its
    `label` ("<label> asks for access to 3 containers", or "to draw on this board"), its rows under
    it, and one Allow all for a bot with more than one request (one `grant` act per request, one
    toast); the strip's heading counts bots, and two bots with one label are numbered, never shown
    by id. A bot's label is its working folder's name: the skill tells an MCP bot to `join` with it
    (not a path), and the side panel's chat joins as the board's folder name. The
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
    `grant.requested`, `board.drawn`, `board.new`, `board.changed` (and later rows: `board.unsent`, 123; `container.fresh`, 158). `conditionsOf(state, { board,
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
    drops, through a proposal or not, and for every open proposal on a card that is retired (127).
    The page shows no proposal on a card the board has no version for, and never sends an accept
    without one; a refused answer makes the bar work its rows out again. `show_node`'s proposals carry both, or neither while open.
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
    `proposal.stale`, the same once the card has a newer version (it ends on a reject, a
    decision on the card, or the card's retire); `item.awaiting`, about a card, for both, on the card: an item in Later
    with no park after its "later" (the same helper as `item.owed`'s "later", so it is checked in
    one place). `item.unseen` is now for both and shown on the card; the page reads it as `ver >
    max(seen, 1)`, so a card at version 1 carries no "updates" tab. The agent's reading
    (`list_open`'s `unseen`) is unchanged.

## NEW cards and what clears a label (stage5-follow-ups BE_01, D-033)

97. **`item.new`**, about a card, for the person, on the card (its NEW tab): an undecided item the
    agent first drew after the person first opened the board, with no `seen` at any version: NEW
    only on a card the agent adds after the person has already opened the board and after its first
    drawing. Cards are new from the later of the `head` of the person's first board seen on that
    board (87) and, when the board had no card then, the end of the agent's first drawing with a
    card (the run its first card came in; FIX_01 ruling 7). So whatever was drawn when they first
    opened it, by any number of agents, is never NEW; a board opened while empty shows no NEW on its
    first drawing, even with a Send (a chat message) before it; with no board seen no card on it is
    (`packages/actions/src/rounds.ts` `newFrom`; the fold's `firstDrawn`, `firstCards` and
    `firstSeenBoards`, beside `seenBoards`). It ends when the person selects the card (its `seen`),
    acts on it (94) or decides it, and only then: a Send and the agent drawing again end nothing
    (new-and-updated Design 2, which ended the rounds that used to; `rounds.test.ts` "item.new
    ends"). The page leaves a NEW card out of `item.unseen` (NEW only, no "N updates" tab);
    `list_open`'s `unseen` is unchanged, and agents are not told `item.new`. **`clearedBy`.** Every
    conditions row names what the person does that clears it: `select` or `act`, on a row shown on a
    card or a container (158), else none. `item.new` and `item.unseen` are cleared by both, the rest
    by none of them. The page reads it
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
    `append`, with a preview of the change of up to 2000 characters; `command { command, risks,
    paths }`, where `risks` and `paths` may be empty (no risk patterns are matched yet); or `read {
    path, recursive? }` (a file, or with `recursive` every file under a folder: a search; D-066). A path
    holds no control, line-break or text-direction character. The request carries `scopes`, the scopes
    its yes may have: `once` always, `session` unless the call can't be remembered (an interpreter, a
    script by its path, a command that isn't plain; a second name for a file), `folder` only inside
    the board's folder and with `agentAccessRules` on. The person's answer is `{ approved, scope? }`,
    `scope` `once` (the default), `session` or `folder`, one the request offered (else `invalid`). The
    gate is told `{ approved, status, approvalId?, scope?, asked? }`: `status` is `approved`, `denied`,
    `expired` (nobody answered by `expiresAt`) or `released` (a Stop or a new message ended the wait),
    `approved` is true exactly when `status` is `approved`, only a yes has a `scope`, and `asked:
    false` means nobody was asked: the access rules decided (allowed, or denied whatever the answer)
    or a kept yes did.
101. **Sessions** (`start_chat`, `list_chats`): a session is `{ session, board, agent, model?,
    created }`, `agent` `claude` or `kiro`. One per board is in use, the newest; starting one is
    the person's click, so it grants the board to the session's agent. **Messages** (`send_chat`):
    `{ text, notes?, cards?, files? }`, notes by `seq`, cards by number and files by path (165), answered 202 with the
    `message_in` event, or while the agent is still answering with the wait's `system` line: it goes
    when the turn ends (point 328). `stop_chat` answers `{
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
    it (never a secret). With ledger folders each entry names its `ledger` (left out, the old layout's one ledger,
    `main` once moved): the index is opened for the open ledger (`openChatIndex`), so a board lists, resumes and
    answers through only its own ledger's sessions, and another ledger's session is `not-found` by its id
    (`api-chat-ledgers.test.ts`). A session not loaded since the server started is loaded on first use of any
    of its routes, and its CLI resumes its own transcript. Events are kept in memory only and
    numbered from 1 at each server start, so an `after` past the latest event starts the stream over.
    A session loaded again after a restart starts with one `system` line (no `turn`): "Earlier
    messages aren't shown after a restart; the agent still remembers them." (FIX_01 ruling 4).
106. **The agent's board access** (`chat-access.ts`). On `start_chat` the server joins an agent
    labelled `<CLI> chat <the session id's first 8 characters>`, appends its `grant-request` for the
    board and the person's `grant` of it. The secret goes only into the board's MCP server's environment
    (`VB_AGENT_SECRET`); with it set, the MCP instructions say not to join and to leave `secret`
    out. Secrets are never stored: after a restart the same agent gets a fresh one (one more hash
    in `agents.json`). The agent may call the `vision-board` tools (`CHAT_TOOLS`), `ToolSearch` and the
    gated tools (`Read`, `Glob`, `Grep` among them), which the gate decides by the access rules and asks
    about when they ask (D-066, 107); its instructions are `skills/vision-board/SKILL.md`.
107. **Turns and approvals** (`chat-session.ts`, `chat-approvals.ts`). `send_chat` records the
    board's Send (`act` `send`) only once the message is accepted and its turn started; a message to
    a session while a new one is starting on its board is a `conflict` (FIX_01 ruling 1), and the
    page holds a message sent then until the new session has started and sends it there. The prompt is the text, then "Attached from
    the board:" with each note's words and the cards it is on and each card's number and title,
    then `Board: <id>`. A message while the turn runs releases its waiting approvals and waits, joined
    with any other waiting, until the turn ends (words alone too, point 328); a message refused (nothing
    to send) releases nothing. The run token (32 random bytes, per session and server start) opens
    `ask_approval` only while a turn runs. **The agent's access** (D-066): every ask is decided first by
    the access rules of the board's folder (`policy`, `packages/agent/src/access-rules.ts`; a command's words from
    `commandFacts.cwd`, the shell's folder, which the gate sends when it is not the board's), whatever
    the gate decided and whatever was answered before: a refused path is denied and an allowed one
    approved, unasked. Then a kept yes answers what it covers (`coverOf`): a write's yes covers writes in
    that file's folder (not its subfolders), a read's yes covers that file only, a search's yes searches of that folder, a
    command's yes that command's first words (`rememberedHead`; never a row of `NEVER_REMEMBERED`: an
    interpreter, a launcher, a script by its path, a command acting on whatever it targets such as `rm`,
    `mv`, `cp`, nor `curl`/`wget`; a command naming a path outside the folder is offered `once` only);
    for the rest of the `session` (in memory), or for the `folder`, kept in
    `.visionboard/permissions.json` (`chat-permissions.ts`; written by the server only, atomically,
    readable by this user only, git-ignored; a refused path for the agent; a damaged file keeps nothing),
    listed by `list_permissions` and forgotten by `forget_permission`. Git is the person's (points 345, 346, D-067
    proposed): `.git` in any folder and every git command are refused, as are `.envrc`, `.npmrc` and
    `.visionboard/app-state/**`. With `agentAccessRules` off nothing
    goes unasked and nothing kept for the folder is offered or used. **Timing**: with `approvalHold` (on
    by default, `VB_FLAGS`) a question waits with no limit until the person answers, presses Stop or sends
    a new message, and carries no `expiresAt`; the agent's turn clock pauses meanwhile; off, it waits 120
    seconds (`expired`). Stop, a new session on the board and the server closing release the approvals
    and stop the CLI. `openapi.json` `info.version` becomes 1.31.0 (`list_permissions`, `forget_permission`;
    the chat schema's `read` facts and the request's `scopes`).
108. **Kiro** (chat-panel BE_04). `start_chat` with `agent: 'kiro'` runs `kiro-cli acp` (engine v2, the
    CLI's default) through `packages/agent/src/kiro.ts`; its session id is Kiro's own UUID, and the
    CLI process stays up between turns (Stop sends `session/cancel` and kills it after 3 s only if
    it ignores that; a new session on the board and the server closing end it). Kiro's permission requests become the
    same `approval_request`/`answer_approval` flow: the `vision-board` tools go unasked; a read, a search,
    a file change or a command is decided by the same access rules (`verdictFor`, every path the call
    names), asked only when they ask; anything else is refused; a kept yes is the server's (Kiro is always
    answered with its one-time option). Kiro's agent file makes reads and commands ask (engine V3) and denies
    the closed files itself (`kiroAccess`); on CLI 2.x, which trusts reads in its working folder, a read inside
    the folder does not reach `verdictFor`, and only the closed files are stopped, by Kiro's own
    `deniedPaths` (chat.md § The agent's access). No model list is offered for Kiro
    (`--model` is passed when a model is given). Usage is not reported by Kiro's ACP v2. A board
    write's cards and head come from the tool call's `rawOutput` (kiro-cli 2.28.0 sends an MCP tool's
    result there, `{ items: [{ Json: { content } }] }`, and no `content`), so its change chip zooms.

## Opening a folder from the board (open-folder task, U12, D-038 proposed)

109. **The open folder.** The server has one folder open at a time, and every other operation
    reads and writes its ledger, `<folder>/.visionboard/ledger.jsonl` (D-017; with ledger folders, the
    open ledger's, `<folder>/.visionboard/<ledger>/ledger.jsonl`, 113a). `get_project` shows
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
    real path, and an agent working through home's link matches it (114). **Recent** is `~/.visionboard/recent.json` (`server/recent.ts`): `{ folders }` (and, with ledger folders, `ledgers`, 113a), newest
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
    the open folder (`chat-sessions.ts` `cwd`). With ledger folders a switch also names the
    ledger (113a).
112. **At start** (`apps/board/server.ts`, `startFolder`): `VB_PROJECT` wins; else the newest
    recent folder, if it is still a folder under home; else this repo. With ledger folders, that
    folder's last ledger, else `main` (113a). Start-up never writes
    `recent.json`: only `open_project` does. Tests pass their own home folder
    (`createBoardServer({ home })`), so no test reads or writes the real one.
113. **The page** (`openFolder` flag, on by default). The "⋯" menu's last row, "Open folder…",
    opens the folder picker (`shell/FolderDialog.svelte`); the page title and the row's tooltip name
    the open folder. The page keeps its last board per folder (`vb.lastBoard:<path>`, falling back to
    `vb.lastBoard`). When the live stream opens again it asks `get_project`, and a different folder
    reloads the page (without its board hash). Off, the page never calls these routes.
113a. **Ledgers** (`ledgerFolders` flag; D-084; LEDGERS_01). A project
    holds one folder per ledger in `.visionboard/` (`.visionboard/<ledger>/`, `main` first), each a
    whole data folder for the engine: its ledger, agents, lock, images, apps and app state. The
    repo-wide files (chat sessions, attachments, permissions) stay at `.visionboard/`. Every path
    comes from `packages/format/src/data-folder.ts` (`ledgerFolder(project, ledger)`, `ledgerFiles`,
    `projectFiles`, `projectOfLedger`, either layout). A ledger's name passes `ledgerNameProblem`:
    an id like a board id, at most `LEDGER_NAME_MAX` characters, never a data-folder name
    (`DATA_FOLDER_NAMES`). Held by `packages/format/tests/data-folder.test.ts` ("ledgerNameProblem:
    an id like a board id, at most 40 characters, never a data-folder name", "projectOfLedger
    inverts ledgerFolder in the new layout too").
    - **Reads.** `get_project` and `open_project` answer `ledger` (the open one) and `ledgers`, each
      `{ name, boards, keptOutOfGit }` (`server/ledgers.ts` `ledgerEntries`); `list_boards` and
      `join` answer `ledger` beside `project` (`engine/operations.ts` `whereAnswer`), so an agent
      knows which ledger it joined. `found` and `hasBoard` see a ledger in either layout
      (`ledgers.ts` `hasLedger`): a home folder holding only `recent.json` has none. Tests:
      `apps/board/tests/api-ledgers.test.ts` ("open a new-layout folder…", "list_boards and join
      answer the ledger beside the project").
    - **Opening and switching** (`open_project { path, ledger?, create?, keepOutOfGit? }`,
      `server/project.ts` `openLedgerOf`). Without `ledger`, the one open there last
      (`recent.json` `ledgers`, by folder: `recent.ts` `lastLedger`; a file without it still reads),
      else `main` (`ledgers.ts` `chooseLedger`). Switching ledgers is opening the same folder with
      another `ledger`, in the order of 111: the new ledger's lock first, then the old one's chats,
      streams and lock end. A ledger that is not there is `not-found` without `create`; with it, its
      folder, an empty ledger and its own `.gitignore` are made (`ledgers.ts` `makeLedger`:
      `agents.json`, `lock`, `app-state/`; with `keepOutOfGit`, the one line `*`, after which
      `agents.ts` `ignoreInGit` adds nothing). A name the schema refuses, or a data-folder name, is
      `invalid` at `/ledger` in plain words; nothing is made. Tests: "switch to another ledger of
      the folder…", "the last ledger…", "create a ledger…", "a bad ledger name is invalid at
      /ledger…".
    - **The lock is the ledger folder's** (`ledgerFiles(ledgerFolder(project, ledger)).lock`): two
      servers may hold two ledgers of one folder, never one ledger. Test: "the lock is the ledger
      folder's…".
    - **The move** (`server/ledger-move.ts` `moveIntoMain`). A folder still in the old layout is
      moved into `main/` when it is opened, or at start (`server.ts`), with the flag on: the old
      folder's lock first (a live lock anywhere refuses with `holderMessage`); refused when `main/`
      already has a ledger, or an entry is in both places; then each per-ledger entry that exists is
      renamed into `main/` (agents, images, apps, app state, the ledger file last), the
      `.gitignore` split (per-ledger lines go with the ledger); `main/`'s lock taken, the old one let
      go. Nothing is copied, rewritten or deleted. A failure part-way leaves each entry whole in one
      place, says which, and the next open (or Edit) finishes the move; its words offer the undo only once it has
      finished. The reverse, `npm run ledgers:undo --
      <folder>` (`apps/board/bin/ledgers-undo.ts`, `undoMove`), runs only while `main` is the only
      ledger and no server holds either folder; then turn the flag off. Tests:
      `apps/board/tests/ledger-move.test.ts` (every byte the same after the move and after the undo;
      a live lock stops both; a second move refused; a move stopped part-way), `api-ledgers.test.ts`
      ("an old-layout folder moves into main/ when opened…").
    - **The agent's file rules** stay their own table (`packages/agent` `ACCESS_RULES`, D-037), held
      equal to the paths module by `apps/board/tests/access-layout.test.ts`.
    - **A watcher follows a move** (`project.ts` `followMove`, `ledgers.ts` `movedLedger`): a server that opened the old
      layout read-only, when another server's Edit moves it into `main/` (or `ledgers:undo` moves it back), opens it
      again where it is, read-only, on its next request or Edit, its streams ended as on a switch. Its Edit then takes
      `main/`'s lock or is refused. A ledger whose file held lines and has gone appends nothing until it is back
      (`ledger.ts` `checkWritable`, `conflict`), so no second ledger starts in the old place; a `join` asks it before
      storing the agent's hash, so none is left behind. An agent's secret is checked against the file as it is now
      (`callers.ts` looks again first), so its first call after the file is back goes. Tests:
      `api-ledger-moved.test.ts`, `api-ledger-gone.test.ts`, `ledger-replace.test.ts` ("a file that held lines and is
      gone…").
    - **Off**: no `ledger` or `ledgers` in any answer, `ledger` and `keepOutOfGit` in a request are
      ignored, and a folder opens in place. A folder already in ledger folders is refused with `conflict` naming the
      flag, at start (`server.ts`) and on a switch, before anything is written (`ledgers.ts` `refuseLedgerFolders`):
      it would start an empty ledger beside `main/`. A checkout from before ledger folders has no such check, so it
      must not open a moved folder. Tests: "ledgerFolders off…".
113b. **Reading another ledger** (`ledgerFolders` flag; D-084 8; CONSOLIDATE_01). `list_boards`, `get_board` and
    `show_node` take an optional `ledger` (`openapi.json` parameter `otherLedger`, `x-hosts: standalone`): another
    ledger of the open folder, read instead of the open one, so an agent can draw a summary of a throwaway ledger's
    work on the open ledger. These three are enough to summarise a board: the boards, a board whole (its cards, notes
    and answers) and one card's versions and replies; the reads about the caller's own conversation (`list_open`,
    `check_responses`) and the arrangement (`show_layout`) do not take it, nor does any write.
    - **Read-only, opened by the host** (`server/project.ts` `otherLedgers`): on its first read the ledger is opened
      with `openLedger(…, { readOnly })` (no lock, no agents file, nothing appended), kept while the folder is open,
      read again on every read (the engine's `refresh`, so another writer's lines and a replaced file are followed),
      and let go with the folder (a switch, a ledger switch). Only a ledger `ledgers.ts` `listLedgers` lists is
      opened.
    - **An unmarked read** (`engine/engine.ts` `namedLedger`, `EngineOptions.otherLedger`): the operation runs on the
      other ledger with no caller, so nothing about the caller is marked (`owed`, `held`; D-083 rule 4): agents are per
      ledger, and the caller has no identity there. The answer says `ledger` (its name) and `readOnly: true`
      (`common.schema.json` `readOnly`); `project` stays the folder. Naming the open ledger reads it as usual.
    - **Names**: one the schema refuses is `bad-request`; one the folder doesn't have (a data-folder name included) is
      `not-found`, naming the folder's ledgers (`words/server-folders.ts` `noLedgerToRead`).
    - **Off, or a host with one ledger** (the plugin: no `otherLedger`): `ledger` is `bad-request` (`words/http.ts`
      `oneLedgerHere`). With `botToolRules` on, a host's bot is not given the input, and one sent is refused with
      `words/plugin-tools.ts` `inputRefusals`.
    - Held by `apps/board/tests/api-read-ledger.test.ts`: the three reads named, read-only and unmarked with every file
      of the other ledger's folder the same byte for byte; another writer's line followed; the names; no write takes
      it; an MCP agent joined on `main` reads `scratch` and draws a summary on `main`; with the open ledger read-only
      too; after a ledger switch; flag off; a host's engine.

## An agent from another folder or ledger (folder-mismatch task, U12; LEDGERS_02, D-084)

114. **The caller's folder** (`apps/board/server/caller-folder.ts`). Every agent operation
    (`x-agent: true`) takes an optional `VB-Project` header: the folder the agent works in, an
    absolute path percent-encoded as `encodeURI` does it (`project.schema.json` `folderHeader`;
    anything else is `bad-request`). Before the caller check, the dispatcher compares its real path
    with the open folder's: the open folder or a folder inside it matches; anything else is
    `wrong-folder` (409), and nothing is read or written. No header, nothing is checked (an agent
    started outside any project). Person routes and the page never send it and are never checked.
    `openapi.json` `info.version` becomes 1.12.0.
115. **A secret from a folder left behind.** A Bearer secret the open ledger's agents do not know is
    looked for in the recent folders' `agents.json`, every ledger of each in either layout (hashes
    only, read, never written; `caller-folder.ts` `secretElsewhere`) before the generic answer.
    Found: `wrong-folder`, never "join again". Both refusals say the same: "The
    board has switched to `~/projects/b`. Your work is in `~/projects/a`. Ask the person to open it
    again; don't join here." Proven by `apps/board/tests/api-folder-mismatch.test.ts` (old layout) and
    `api-folder-mismatch-ledgers.test.ts` (a recent folder's other ledger).
115a. **A secret from another ledger of the open folder** (ledger folders, D-084 3). Agents are per
    ledger, so an agent that joined ledger `ui` and calls while the board has `main` of the same folder
    open is found in `ui`'s `agents.json` and refused with `wrong-folder` (409), whatever its
    `VB-Project` header, before anything is read or written (`caller-folder.ts` `wrongLedger`, words
    `words/http.ts` `theBoardHasLedgerOpen`): "The board has ledger "main" of `~/projects/b` open. Your
    work is in ledger "ui". Stop and tell the person: they can switch the board back to "ui". Don't join
    here." It reuses the problem the instructions already stop on. A secret no ledger of the open or a
    recent folder knows is still `not-authenticated`. Reads too: a read that sends such a secret is refused the
    same way (`callers.ts` `refuseElsewhere`), so an agent never takes the open ledger's boards for its own; a read
    with no secret, or one no ledger knows, answers as before. Proven by `api-folder-mismatch-ledgers.test.ts`
    ("its reads too…").
116. **The board's MCP server and the `vb` CLI name their folder** (`packages/client/src/project.ts` `projectOf`), worked out
    once at start: `VB_PROJECT` when set, else the nearest folder at or above its working folder
    with a Vision Board in either layout, `.visionboard/ledger.jsonl` or a ledger folder's
    `.visionboard/<ledger>/ledger.jsonl` (`ledgersIn`; a home folder that only keeps `recent.json` is no
    project), else none. `ledgersIn` is the one rule: the server's `ledgers.ts` (`isOldLayout`,
    `listLedgers`, `ledgerFoldersIn`) asks it too (LEDGERS_02-R1). `packages/client` sends it as `VB-Project` on every call (`project` option). The
    instructions (`INSTRUCTIONS`, `INSTRUCTIONS_JOINED`) and the skill say: on `wrong-folder`, stop,
    tell the person, and do not join.
117. **Answers name the open folder.** `join` and `list_boards` answer `project`, the open folder's
    display name (`~/projects/example`), and with ledger folders `ledger`, the open ledger, so an agent
    can check where it is; `vb` prints them as it prints any answer (`packages/cli/tests/run.test.ts`).
    The chat panel's CLI runs in the open folder (the project, never a ledger folder) and its MCP server
    gets `VB_PROJECT` set to it (`chat-access.ts` `boardMcpServer`), so it always matches; a switch of
    folder or ledger stops its chats (111). No ledger is sent: its secret is the open ledger's, so after a
    ledger switch its next call meets 115a rather than the other ledger (`api-folder-mismatch-ledgers.test.ts`).

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
    same message. The `act` answer is not held for the turn; a session that can't be loaded is a `conflict` that says why
    (since 170 the Send is recorded once the message went, and one that can't go is refused and recorded as nothing). A board
    with no session: nothing changes. `send_chat` still records the Send
    without this message (its own text is the prompt).
122. **A session in the folder** (ruling 2). `start_folder_chat` (`POST /api/chats`) starts a
    session with no board; `list_folder_chats` (`GET /api/chats`) lists the sessions on no board,
    newest first, the first in use (one in use in the folder, as on a board). `board` is optional
    in `chat-session.schema.json`. The server joins its agent and grants nothing. Its messages take
    no chips (`invalid` at `/notes/i`, `/cards/i`), record no Send, and end "No board is open in this folder yet. When there is something to draw, suggest its structure first; once the person agrees, create a board with write_board and the person's page opens it." in
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
    `wrong-folder` as before (115), and a header naming another folder is refused first (114). A
    secret from another ledger of the open folder is never told to join again, header or not (115a).

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
    nothing), then the attached files' block (165), then "Attached from the board:" with each note and card, then the Send message of 121
    for what the session's agent was not yet told (the answers chip as the engine's `resolve` says it, from the last Send,
    `chat-round.ts` `previousSend`; left out when there is nothing), then `Board: <id>`. Its `message_in` shows the words and the answers, with the
    chips; with neither, "Attached from the board.". It is recorded as the board's Send when it
    goes, so 121's "send_chat records the Send without this message" no longer holds. Nothing at
    all to send (no words, no chips, no files, nothing new for this agent) is `invalid` at `/text`; a folder
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
    message carries (the answers chip's `notes`, the ones `replyLines` wrote) is
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
    Each card and note is made a chip and read back through the engine's `resolve` (`chat-prompt.ts`
    `promptFor` over packages/actions `cardChip`, `noteChip`; `chat-sessions.ts` `ChatOptions.resolve`), and
    the answers too (`unsaid`, D-074 rule 6), the path any host takes: a card
    or note the chip refuses is `invalid` at its pointer with the chip's reason, so a removed card, a
    note on a removed card or container, and a hidden note are refused, not sent. Held by
    `apps/board/tests/api-chat-context.test.ts` (a `resolve` given to a session is what it reads, word
    for word) and `api-chat-sessions.test.ts`.

## Ledger v13: card widths, `show_layout` (field-report batch 3 BE_01)

132. **Card widths** (ruling 5). `LEDGER_FORMAT` becomes 13 and every ledger `$id` moves to
    `.../schema/ledger/13/`; `openapi.json` `info.version` becomes 1.18.0. Only adds: v2 to v12
    lines stay valid. A container's cards are `match` (every card in a column as wide as that
    column's widest card) or `own` (each card its own width): common `widths`, `WIDTHS`. The agent
    may set `widths` on a region item (the region schema, `Region.widths`, the View's region); the
    person sets it from the container's toolbar with the act `widths { board, region, widths }`,
    shaped and checked like `mode` (both fields required, the container must exist on the board,
    `ledger-index.ts` `actContext`; registry `widths`, person, no confirmation, not an answer;
    scope the container, `references.ts`). What is in effect: the person's latest choice, else the
    region's, else the default of the mode the board shows (`DEFAULT_WIDTHS`, the one place:
    `match` for `grid` and `column`, `own` for `flow`, `row`, `lanes` and `radial`; `widthsOf(mode,
    own?, chosen?)`). So a person who changes the mode and never chose widths gets the new mode's
    default. `get_board`'s `state.widths` is region id to the person's choice, left out when none.
    `check_responses` reports a `widths` act as it reports `mode` (a container act, sorted at the
    lowest card in it), to the agents that may answer in that container.
133. **`show_layout`** (ruling 6), `GET /api/boards/{board}/regions/{region}/layout`, `x-agent`,
    read-only (MCP tool `show_layout`, `vb show-layout`): how the board arranges one container,
    structure only, no pixel sizes and no pins. The answer (`show-layout-response.schema.json`):
    `head`, `board`, `region`, `mode` (the person's choice, else the container's), `widths` (as 132),
    `lanes` (in `lanes` mode), `columns` (rings in `radial`), `cards` (every card in the container
    now, the person's moves counting and retired cards left out, in card-number order, each
    `{ n, lane?, column, row }`, from 1 at the left and top; in `lanes`, `row` is the card's place
    in its lane's stack in that column; in `radial`, `column` is the ring, the centre 1, and `row`
    the place around it), `links` (links joining two of those cards), `crossing` (how many of them
    cross at least one other link) and `empty` (cells with no card inside the columns and rows used;
    a cell is a column and row, in `lanes` a lane and column; 0 in `radial`). The server works it out
    with the layout package from the same cards, links and mode the page draws
    (`packages/layout` `structureOf`, `LayoutStructure`, `CardCell`: node ids there, board numbers in
    the answer), taking every card at one size (280 by 120), so `crossing` is the arrangement's,
    routed as the page routes it, not one viewer's measured picture.
    Not in `write_board`'s answer. The same refusals as `show_container`: an unknown board or
    container, or `later`, is `not-found`; a retired container is `not-found` too (nothing is
    arranged). The skill calls it once after the first draw of a `flow` or `lanes` container,
    never after every write.
134. **Alignment is per viewer** (ruling 4): top-aligned horizontal layouts and left-aligned vertical
    ones by default, set in the page's "⋯" menu and kept in that browser. It is never written to
    the ledger and no agent reads it, so the contract does not change; `show_layout` is the same
    whatever a viewer chose.

## Ledger v14: archive a board (N39, 2026-10-12)

135. **Archive and restore** (rulings 1-2). `LEDGER_FORMAT` becomes 14 and every ledger `$id` moves
    to `.../schema/ledger/14/`; `openapi.json` `info.version` becomes 1.19.0. Only adds: v2 to v13
    lines stay valid. Two person acts on a whole board, `archive { board }` and `restore { board }`,
    through `act` (no new operation: it is the person's route already, refuses every agent with
    `forbidden`, and records the line like `mode`); each names its `board` and nothing else (no `n`,
    `ver`, `region` or `nodes`; schema and `eventProblems` alike), the board must exist (context),
    `archive` one not archived and `restore` one that is (`validateAct`, packages/actions
    `archive.ts`). Registry: `archive` "Archive board" needs confirmation, `restore` "Restore" does
    not; neither is an answer. Both are the person's own marks (`PRIVATE_ACTIONS`, with the flag;
    `BOARD_MARKS`): the fold keeps only the archived set (`LedgerState.archived`); they move no head,
    no date, see no card, and no agent read reports them (`check_responses` included). Archiving
    removes nothing: the ledger keeps every line (D-017); deleting is a later item (N14, N24).
136. **Gone for agents, as if it never existed** (rulings 3, 7, 9). One check,
    `boardVisibility(s, board)` (`visible`, `archived` or `unknown`; `visibleToAgents`), in the
    action layer, behind every agent read and write: the server's `requireBoard`
    (`apps/board/server/visibility.ts`, the only server module that asks) answers an archived board
    exactly as an unknown one (`not-found`, the same words) for `get_board`, `show_node`,
    `show_container`, `show_layout`, `list_open`, `check_responses` (also when it is archived while
    the call waits), `request_grant`, `write_board` without a `board` item, and `watch_board`, which
    takes no credentials. `list_boards`, the conditions (picker marks included) and `show_node`'s
    linked cards leave it out; `join`'s answer, the MCP instructions and tool descriptions never
    mention archiving. A `write_board` batch whose `board` item would make a board with an archived
    board's id is refused as a whole, `invalid` with "That board id isn't available; choose another
    id." (`UNAVAILABLE`, pointer at the `board` item), saying nothing of the board; nothing is
    written. The ledger module also refuses any agent line on an archived board with those words
    (`archivedProblem`, whatever route it came by). A retry key stored on a line agents don't see is
    free again, and a `{ "key": … }` naming a card there names nothing. A test walks every `x-agent`
    operation in `openapi.json` and asserts each answers as it did before the board existed
    (`apps/board/tests/api-archive.test.ts`).
137. **The person's side** (rulings 2, 4-6). While a board is archived the person's other acts on it,
    a rename (`put_board`) and a new chat (`start_chat`) are refused (`invalid`, "board: "b" is
    archived; restore it from the board picker first"), and its chat session can't take a message
    (`send_chat`, `conflict`); a seen still goes, and `read_ledger`, `list_chats` and `mark_seen`
    answer as before. Restore brings every answer back as it was. The page hides it from the picker
    and never opens it by default; the fold's `dates` (each board's first and own last line) give the
    confirm's and the Archived list's days (`archivedBoards`; components.md § Archive a board).

## Ledger v15: lock a board (N40, 2026-10-12)

138. **Lock and unlock** (rulings 1-2, 5). `LEDGER_FORMAT` becomes 15 and every ledger `$id` moves to
    `.../schema/ledger/15/`; `openapi.json` `info.version` becomes 1.20.0. Only adds: v2 to v14 lines
    stay valid. Two person acts on a whole board, `lock { board }` and `unlock { board }`, through
    `act`, like `archive` and `restore` (135): each names its `board` and nothing else, the board must
    exist, `lock` one not locked and `unlock` one that is (`validateAct`, packages/actions `lock.ts`
    `lockRules`). Registry: `lock` "Lock board", `unlock` "Unlock board", neither asks first, neither
    is an answer. Both are the person's own marks (`BOARD_MARKS`, `PRIVATE_ACTIONS`): the fold keeps
    only the locked set (`LedgerState.locked`); they move no head, no date, see no card, and no
    agent read reports the line (`check_responses` included); agents learn of a lock only as
    `locked`. **Archive implies lock** (ruling 5): `boardLocked` counts an archived board as locked,
    and since nothing acts on an archived board but `restore` (a lock or unlock there is refused like
    any act, 137), restoring returns the board to the lock it had.
139. **Read-only for everyone** (rulings 1, 3, 7). One check in the action layer, beside the
    visibility check: `writeProblem(s, e)` (lock.ts), archived first (`archivedProblem`, 136), then
    locked (`lockedProblem`), which the ledger module asks of every line it appends, whoever writes
    it: on a locked board only the person's own marks (flag, unflag, notes-hide, notes-show, archive, restore, lock, unlock;
    `passesLock`) and a seen go; every other line is refused with `locked`, **423** (RFC 4918's
    Locked, in the IANA registry; not 409, which on agent operations means `wrong-folder` only (114),
    so a client tells a lock from every other refusal by status alone). Words: to an agent "This
    board is locked; ask the person to unlock it." (`LOCKED`), to the person "Locked: unlock to
    change it" (`LOCKED_PERSON`). The routes refuse up front, before anything is answered or written
    (`apps/board/server/visibility.ts`, the only server module that asks: `requireUnlocked`,
    `refuseLocked`, `isLocked`): `write_board` refuses the whole batch, `request_grant` refuses
    before it would say `held` or `replayed`; `act` and `put_board` are refused by the ledger module;
    `start_chat` is refused (its grant can't be written). Reads answer as usual and say so:
    `get_board` and each `list_boards` row carry `locked: true` while it stands (left out otherwise).
    A test walks every agent operation in `openapi.json` that writes (any method but GET) and asserts
    each answers 423 with those words and writes nothing, and every read answers 200
    (`apps/board/tests/api-lock.test.ts`); another walks every act in the registry.
140. **The chat panel** (ruling 7). A running session's messages still go: they are chat, not board
    writes. On a locked board `send_chat` hands the agent the words and chips only: no round of
    answers and no Send recorded, which wait for the unlock. The agent's own board writes are refused
    with `locked`, and the skill (`skills/vision-board/SKILL.md` v3.3, Access) tells it to say so in
    one line and stop. The page: components.md § Lock a board.

## Ledger v16: the person removes cards and containers (N24, 2026-10-12)

141. **The person's retire** (rulings 1-2). `LEDGER_FORMAT` becomes 16 and every ledger `$id` moves
    to `.../schema/ledger/16/`; `openapi.json` `info.version` becomes 1.21.0. Only adds: v2 to v15
    lines stay valid. The person writes **the same `retire` line** an agent's item writes (126), not a
    new act: the stored `retire` schema takes `by: person` from v16 only (`$defs/rules`; the hand twin
    is `PERSON_TOO`, as for the person's `board` line, 90); the server writes no `agent` and no `key` on it. Why not an
    act: ruling 2 wants one path, and the `retire` line already carries everything every reader needs
    (`cards`, `region`), so the fold, the reads, the ledger's context rules, `show_node`'s and
    `show_container`'s `retired` and the page's "N cards retired" marker read a person's line exactly
    as an agent's, with no second fold to keep in step. Through a new person operation,
    **`retire_cards`**, `POST /api/boards/{board}/retire` (`x-agent: false`, the person cookie, 20),
    body `{ cards }` (board numbers on the path's board, one or more, each once) or `{ region }`, never
    both (`api/retire-request.schema.json`); `cards` are turned into identities at the edge (`cardsIn`,
    a number the board has not given: `invalid` at `/cards/{i}`); a container's `cards` are every card
    whose place now is it (`retireCards`: the person's moves count). One line takes every card of a
    selection. Answer 201: the stored line, its cards by board number (`eventOut`). The ledger's context
    refuses as for an agent (126): a card already retired (`/cards`), an unknown container, `later`; an
    agent calling it is `forbidden`. A registry entry for each (`RETIRE_ACTIONS`: `remove-cards`,
    `remove-container`, `needsConfirmation`).
142. **What differs from an agent's retire** (rulings 3-5). No owed check: the person may remove a
    card still owed an answer, or a container whose note is unanswered (the page warns first,
    `owedNotice`); agents keep their refusal (126). After it nothing on those cards is owed (they leave
    every condition, `pending` and `list_open`), and an answer of the person's on them, or a note on
    the container, waits for no Send (`unsent.ts` `dropRetired`, for an agent's retire too: the Send
    message reads the board as it is). The person's line is no agent drawing (like their `board`
    line, 92): it moves the board's own head but makes no version, no `board.drawn` and no
    `board.changed`; the board's version history shows the cards in the versions before it. Agents
    read the removal as a retire: the cards are gone from every read, `show_node` and `show_container`
    answer with `retired`, and a later line naming them is refused (127). A locked board refuses it
    (423 `locked`, the person's words) and an archived one (`invalid`, "restore it from the board picker
    first"), through the one write check (`writeProblem`, 139). The page: components.md § Remove cards
    and containers.

## A note locks once it is answered (popovers-larger-thread ruling 5)

143. **A note is history at whichever comes first:** a `send` on its board after it (`sent`), or the
    agent answering it: a `reply` naming it in `to` (on any of its cards; for a container note, on
    any node), or a newer version of one of its cards than when it was made, such as an `append`
    (what answers an ask, 36). From then `note-edit` and `note-remove` are refused (`invalid`,
    pointer `/note`): "note N was answered by the agent, and an answered note is history; write a
    new note instead" (or the sent wording, 60). A locked note is no longer the card's or
    container's note not yet sent (59, 73), so a new note may start. Every read marks it
    `locked: true` (and `sent: true` only after a Send). One derived state, `lockOf`
    (`packages/actions/src/note-lock.ts`), serves the server's check and every read, and the page
    reads `locked` from the same reads to choose between editing a note and showing it. Only adds: `openapi.json` `info.version` becomes 1.22.0.

## The answer model (answer-model BE_01, D-045)

144. **✓ and ✗ are tools, and only they answer a card.** `openapi.json` `info.version` becomes
    1.23.0; the ledger format does not change, and nothing is migrated: the stored `ack`, `drop`,
    `acknowledged` and `dropped` stay internal. Supersedes the parts of 118, 120, 121 and 123 that
    let a comment decide a card, gave ✓ and ✗ a meaning, and offered More context.
    **The action lists.** `ANSWER_ACTIONS` is ack, drop, comment, later; `NOTE_ACTIONS` is comment,
    later (`node-types.ts`). `context` stays in the format and the registry, so old lines read and
    validate and the server still takes one (`ITEM_ACTIONS` no longer lists it, so no kind check
    refuses it), but no card offers it and no key presses it; an old `context` note reads as a note
    everywhere (status `commented`, reply word `comment`). The registry names ✓ "Check" and ✗
    "Cross", with reply words ✓ and ✗. **Answered.** `DECIDED` and `CLOSED` are one set,
    `acknowledged` and `dropped`, and `isDecided` holds only on a card that asks. `counts` returns
    `{ total, answered, later, open }` ("N open · N answered · N later"); a card that only informs
    never counts. A note never answers a card: `commented` says a note waits and the card is open,
    and the numbered reply's "Still open" lists every card that asks with no ✓, ✗ or Later, notes or
    not (since 149, only those that need the person; the cards with the agent have their own line). `item.owed`: a card's latest note is owed unless a ✓ or ✗ came after it (one before it
    leaves the note owed), until a reply naming it or a newer version.
145. **The agent's answer clears a card** (`packages/actions/src/clears.ts`). When an agent line
    answers a card's latest note, a `reply` naming it in `to` (on every card of a group note whose
    latest note it is) or a newer version of the card such as an `append`, the fold records a clear
    (`LedgerState.clears`: the note's `pos`, the line's `seq`), and `itemOf` counts nothing at or
    before that note: the card is open and unmarked (its ✓, ✗ or Later before the note, and the
    note's own `commented`, no longer count). A reply to an older note clears nothing; a ✓ made after
    the note, before or after the answer, counts as usual. Until the person looks at the card (a
    card `seen` line, or any act naming it, after the agent's line: `LedgerState.looked`),
    `unseenAnswer` holds: `boardState` sets `unseenAnswer: true` on the item (`get_board`'s
    `itemState`) and `item.unseen` holds for the card, so the page shows the marker a new version
    gets and `list_open` marks it `unseen`. Nothing is written for the person.
146. **The agent reads each card's current answer, not every click.** `check_responses` names ✓
    `check` and ✗ `cross` (`registry.ts` `ACTION_OUT`, applied at the edge in `responsesPage`; the
    response schema's `mark` branch) and carries no `means` (gone with `action-words.ts`). Each
    card's ✓, ✗, Later and clear (`MARK_ACTIONS`) after the cursor fold to its latest (`pending.ts`
    `latestMarks`), reported only when it leaves the card otherwise than at the cursor, both read
    with the agent's latest clear applied, so a mark the agent's own answer voided is never
    reported: ✓ then cleared after the cursor reports nothing, ✓ then ✗ reports ✗, a clear of a ✓
    read before the cursor reports the clear, and a ✓ made again after the agent's answer reports
    the ✓. Notes still come one by one. The Send message (`replyScope`) follows `check_responses`,
    and `board.unsent` (`unsent.ts` `foldUnsent`) folds the same way against the last Send, so ✓
    then cleared before a Send leaves nothing to send. The ledger keeps every click (D-017). The
    numbered reply and the Send message write the mark, "12 (decision): ✓"; the MCP instructions
    (`packages/mcp/src/info.ts`) say ✓ reads `check` and ✗ `cross`, that a note never answers a card,
    and no longer mention more context.
147. **Check and cross in every agent read and write** (answer-model BE_02). `openapi.json`
    `info.version` becomes 1.24.0. Every read an agent makes names a card's ✓ `checked` and its ✗
    `crossed` (`registry.ts` `STATUS_OUT`, `statusOut`, beside `ACTION_OUT`): `get_board`'s
    `state.items` (`reads.ts` `itemsOut`), `show_node` and `show_container` (`nodeDetail`),
    `list_open` and `write_board`'s `pending` (`openItems`); the `itemStatus` enum is `open`,
    `checked`, `crossed`, `commented`, `context`, `later`. A proposal in `show_node` names its action
    `check` or `cross` (`numbers.ts` `proposalOut`, `actionOut`). The agent's `propose` sends
    `check` or `cross` (the write-item schema's own `propose` branch); the server stores it as `ack`
    or `drop` (`actionIn`, `ACTION_OUT` read the other way), so a retry with the same key replays.
    A `propose` with `ack` or `drop` is refused `invalid` before the schema, pointer
    `/items/N/action`: "Propose ✓ as `check` and ✗ as `cross`: send action "check", not "ack"."
    The ledger, `read_ledger`, the person's `act` and what the page folds (`boardState`, `statusOf`)
    keep `ack`, `drop`, `acknowledged` and `dropped`; a test holds the page's board equal to
    `get_board` with the same `itemsOut` applied.
148. **A note puts a card with the agent** (with-agent-state task, D-046). `openapi.json`
    `info.version` becomes 1.25.0; the ledger does not change. A card that asks is open (it needs
    the person), with the agent (the person's latest note on it is owed an answer), answered (✓ or
    ✗) or later. One rule, the note half of `item.owed`: `conditions.ts` `owedNote` (`owedOn` is it,
    else the owed park), and `cardStatus` gives every read a card's status: its ✓, ✗ or Later, else
    `commented` while `owedNote` holds, else `open`. The fold's status (`notes.ts` `itemOf`) now holds
    the marks alone (`markOf`), so a note sets no status there. `boardState` (the page), `nodeDetail`
    and `openItems` read `cardStatus`; ✓, ✗ and Later win over an owed note (a ✓ then a note stays
    answered until the agent's answer clears it, 145), and a ✓ cleared after a note leaves the note
    owed, so the card is with the agent again. `counts` returns `{ total, open, withAgent, answered,
    later }`: the header reads "N open · N with agent · N answered · N later", the with agent chip
    only above 0; the container's "N of M answered" and Hide answered are unchanged. The card's
    footer and name say "With agent". Every agent read says `with-agent` (`registry.ts`
    `STATUS_OUT`, beside `checked` and `crossed`): the `itemStatus` enum is `open`, `checked`,
    `crossed`, `with-agent`, `context`, `later`. The page, `read_ledger` and the stored names keep
    `commented`. The person's word on the page is now "Replied" ("N replied" in the header; replied-word
    task, components.md § The answer model item 8); agents still read `with-agent`.
149. **"Still open" is the person's; any reply is an update** (review polish round 2 rulings 3 and 4).
    `openapi.json` `info.version` becomes 1.26.0; the ledger does not change. The numbered reply and
    the Send message (`reply.ts` `replyLines`, so `replyText`, `boardBlocks` and `roundOf` too) end in
    "Still open: …", listing only the cards that need the person (status `open`), then on a line of
    its own "Waiting for your reply: …", the cards with the agent (`commented`, D-046; an old
    `context` too); each line only when it lists a card, and "Nothing left open." only when both are
    empty. A card that only informs is in neither. The agent's reply on a card is an update the person
    has not seen whether or not it answers a note or clears anything: `clears.ts` `unseenReply` (the
    card's latest reply, or the reply to a group's note that cleared it, after the person last looked)
    joins `item.unseen`, so the page shows "1 update" with the reply as its step until the card is
    seen (a selection, stepping past it, or any act naming it) and `list_open`'s `unseen` holds
    meanwhile (its description says so). `unseenAnswer` (`get_board`'s `itemState`) still means a
    clear only (145).

## Ledger v17: app cards (app-cards BE_01, D-047)

The contract for apps themselves (the folder, the manifest, the panel protocol, the tools module,
limits and states) is [apps.md](./apps.md); this section is what the ledger and the API add.

150. **The app card and the person's allow** (rulings 3, 7, 11, 13). `LEDGER_FORMAT` becomes 17 and
    every ledger `$id` moves to `.../schema/ledger/17/`; `openapi.json` `info.version` becomes 1.27.0.
    Only adds: v2 to v16 lines stay valid. A new kind, `app` (`KINDS`; `NODE_TYPES.app` tells: a note
    and Later, a number, no status word), whose node carries `app: { id, w?, h? }` (`NodeBody.app`,
    `ViewNode.app`; common.schema.json `appRef`, its sizes `appWidth` and `appHeight` from
    `APP_SIZE`). An app card must name `app` and takes no `size` word; no other kind may name `app`
    (node.schema.json `appRule`, in the sent form and in `rules`; the hand twin is `app-shape.ts`
    `appNodeRules`). The rule holds on every line, since no line before v17 names either. The person's
    `size` act on an app card is refused (`validateAct`: its panel's size is the agent's). Two person
    acts, both `needsConfirmation` and `onItem: false` (registry "Allow app" and "Stop app"):
    `app-allow { app, hash }` (common.schema.json `appHash`, 64 lowercase hex) and
    `app-revoke { app }`, each naming nothing else (`APP_ACTIONS`; act.schema.json `rules`,
    `app-shape.ts` `appActRules`). They are on the app, not on a board or a card (`ACT_SCOPES` give
    no board and no cards): sent to any board's `act`, they move no head, answer nothing, never reach
    `check_responses`, and pass a lock (`passesLock`). Their context rules (`apps.ts` `appRules`):
    allowing a hash already allowed, or stopping an app not allowed, is refused. The fold keeps one
    allowed hash per app (`LedgerState.appAllowed`, `foldAppAct`): a newer allow replaces it, a stop
    removes it, and retiring a card leaves it. The references table gains `app`
    (`REFERENCES.app.lookup`: the cards on a board now that name it; `namedApps`, every named app in
    one pass, which the app host uses for `missing`). Flag `appCards`, on.
151. **Approval** (ruling 7). The version the person allows is the SHA-256 of `app.json` followed by
    the tools file: a change to either asks again. So that this covers all of an app's code, a tools
    module imports Node's built-in modules only (apps.md § The tools module). The app host compares
    `appAllowed` with the hash it works out now; that comparison is the only place "allowed" is
    decided (152).
152. **`list_apps`** (rulings 11, 12), `GET /api/apps`, `x-agent: true`, with the `VB-Project` header
    (`wrong-folder`, 114) like every agent operation. Its `security` names either an agent's secret or
    the person's cookie: `agent-or-person` in the route table (`scripts/gen-api.mjs` `authOf`). The
    caller check (`callers.ts` `callerOf`): a Bearer header names an agent (unknown: 401); else the
    person's cookie (stale: `forbidden`, so the page reloads, 20); neither: 401 `not-authenticated`.
    It answers `{ apps }` (`api/list-apps-response.schema.json`, `AppInfo`): every app folder, and every
    app a card on a board names that has no folder (`missing`), each with `id`, `state`
    (`APP_STATES`), the manifest's `title`, `version` and `size`, its `tools` by name (known once the
    person allowed this version and its tools first ran: nothing runs before), `hash`,
    `allowed`, `changed` (an earlier version was allowed) and `problems` (`{ file, pointer?, detail }`).
    The state is worked out fresh by one function in the app host; the page and agents read it,
    never a copy of their own. It becomes the MCP tool `list_apps` and `vb list-apps` by generation.
    No agent calls an app's tools through the board: there is no MCP tool for `call_app_tool`.
153. **`call_app_tool`** (ruling 6), `POST /api/apps/{app}/calls`, `x-agent: false`, the person's
    cookie (an agent: `forbidden`), JSON only. `{app}` is checked against the id pattern before any
    path is built (a bad one: `bad-request`). Body `{ tool, arguments? }`
    (`api/app-call-request.schema.json`); answer 200 in MCP's tool-result shape
    `{ content, structuredContent?, isError }` (`api/app-call-response.schema.json`,
    `AppToolResult`), `isError` when the tool threw. Problems: `invalid` (arguments that don't fit
    the tool's `inputSchema`), `needs-approval`, `app-not-found` (or `not-found` with the `appCards`
    flag off), `app-invalid`, `app-failed`, `app-busy`, `app-timeout`, and `too-large` for an answer
    over its limit (apps.md § Limits). The board page calls it through its one I/O layer when a panel
    sends `tools/call`. The handlers are the app host's (`apps/board/server/apps.ts`
    `APP_HANDLERS`; apps.md § Kept true by names its tests).

## Images in cards (app-cards BE_03, D-048)

The contract for the images themselves (the folder, the path rules, types and limits, the route's
headers and answers) is [images.md](./images.md); this section is what the API says about the route.

154. **The image route is not an operation.** `GET /board-images/<path>`, and `HEAD`, serves a
    picture to the `<img>` a card's Markdown draws (`IMAGE_ROUTE`; `serveImage`, called from
    `createBoardServer` before the page's own files, after `/api`). It sits outside `/api`, like an
    app's panel: the answer is a picture, not JSON, and an `<img>` sends no header of its own, so
    there is nothing for a security requirement to describe. It is therefore not in `openapi.json`,
    `OPERATIONS`, the MCP tools or the `vb` commands, and the route table has no row for it. Agents
    do not call it: they save files in `.visionboard/images/` (images.md § The folder) and write
    `![alt](path)`. The Host check applies; no cookie is needed or set. Another host serves it at an
    address of its own (`BoardHost.imageRoute`, components.md § The board's host interface), answered by
    the engine's `image` (159), which holds a picture to the same checks (`images.ts` `openImage`).
155. **Its refusals are problems** with the codes of the Errors table (40): `not-found` (a refused
    path, a missing file, a link out of the folder), `unsupported-media-type` (an extension that is not
    png, jpeg, webp, gif or svg (svg with the svgImages flag, D-064), bytes that are not the type the
    extension says, or an svg's opening refused: images.md § SVG), `too-large` (over its type's cap), `method-not-allowed` (`Allow: GET, HEAD`) and `forbidden` (the Host). Their `detail` is
    one of the short plain phrases in images.md § Reasons, which the page shows as they are, not the
    sentence that point 40 asks of an agent's problems. The route answers `ETag` and `Cache-Control:
    no-cache`, and 304 to a matching `If-None-Match`, so the page can ask again cheaply when a card
    is selected or an image opened (images.md § Updates).

## Ledger v18: hidden notes on a card (card-polish BE_01)

156. **The person puts a card's notes away.** `LEDGER_FORMAT` becomes 18 and every ledger `$id` moves
    to `.../schema/ledger/18/`; `openapi.json` `info.version` becomes 1.28.0. Only adds: v2 to v17
    lines stay valid (schema.test.ts "v17 lines still read"). Two person acts, built line for line
    like the flag (128): `notes-hide { n }` and `notes-show { n }`, one card, any kind, no `ver` (the
    mark stays through a redraw), no group, no container (act.schema.json `rules`; `eventProblems`,
    `CARD_MARKS`; schema-cases.ts `BROKEN`). The latest of a card's two decides, and a card has them
    only while it is on the board (`foldNotesHidden`, `LedgerState.notesHidden`; `notesHiddenOn`;
    `BoardState.notesHidden`, left out while no card has its notes hidden; card-notes-hidden.test.ts).
    Registry "Hide notes" and "Show notes", person only, `onItem: false`, no key. **No agent ever
    reads one** (`PRIVATE_ACTIONS`, `isPrivateAct`): `check_responses`, the Send message, `show_node`,
    `show_container`, `get_board`, `list_open` and `list_boards` leave them out, and they are no
    answer, not seeing the card and move no head, as the flag (128); `api-flag.test.ts` holds the whole
    of every agent read against both words. Only the page's `read_ledger` (130) serves the lines, by
    identity. A locked board still takes them (`passesLock`, 139; lock.test.ts, api-lock-person.test.ts).
    The page's reply to a note (`CardReply`) now carries `at`, the time of the agent's reply line, filled
    in `parking.ts` `createParking` from the reply event (parking.test.ts "every reply carries the time
    of its ledger line"); the ledger line already held it, so the format does not change for that.

## An app card's saved panel state (app-state-kept BE_01, D-050)

157. **The panel's state, the person's alone.** Two operations on one path, both `x-agent: false` and
    the person's cookie (an agent: `forbidden`), so no MCP tool or `vb` command is generated for them:
    `get_panel_state` (`GET /api/boards/{board}/nodes/{n}/panel-state`) answers `{ state }`, or `{}`
    when nothing is saved; `put_panel_state` (`PUT`, JSON only) takes `{ state }`, any JSON value, and
    answers `{ bytes }`, its size. The shapes are `app/panel-state.schema.json` `$defs/read`, `save`
    and `written`, the same `save` a panel sends with `vision-board/save-state` (apps.md § Saving the
    panel's state); `openapi.json` `info.version` becomes 1.29.0. The card is named by its number on
    the path's board and kept by its identity (125): `.visionboard/app-state/<identity>.json`,
    `{ v, app, state }` (the schema's root, `AppStateFile`), written whole by a rename
    (`apps/board/server/atomic-file.ts` `writeFileAtomic`) and read only by
    `apps/board/server/apps/panel-state.ts`, which checks the file against the schema and the size
    again when it reads it: a file that doesn't fit, is too big or is a link reads as nothing saved,
    and so does one saved for another app than the card names now. Its refusals: `too-large` for a
    value over `APP_LIMITS.stateBytes` bytes of compact UTF-8 JSON (`appStateProblem`, in plain
    words) or a body over twice that; `invalid` for a body that doesn't fit; `bad-request` and
    `unsupported-media-type` as every route; `not-found` for an unknown board or card, a removed
    card, a card that is not an app card, and app cards off. A locked or archived board still takes
    a save: the value is the person's, not the board's. No ledger line is written, so no agent read
    and no `check_responses` wait ever carries or moves for it, and a removed card's file stays.
    The page calls both through its one I/O layer (`apps/board/src/board/io.ts` `panelState`,
    `savePanelState`). Held by `apps/board/tests/api-panel-state.test.ts`, `schema-apps.test.ts`,
    `openapi.test.ts`, `route-table.test.ts` and `atomic-file.test.ts`.

## New and updated cards at board scale (new-and-updated, 2026-10-25)

158. **`container.fresh`**, about a container, for the person, on the container: it holds a card that
    `item.new` or `item.unseen` holds for, as its tab shows it (NEW, or "N updates": past version 1, or
    an agent reply not looked at since; `packages/actions/src/fresh.ts` `showsUpdates`), whose newest
    change (the agent's latest version or reply on it, the card's times) is after the person's latest
    card `seen` or act naming any card now in the container (`LedgerState.looked`). So selecting one
    new or updated card in it, or acting on any of its cards, ends it for the whole container until
    the agent changes one of its cards again; nothing is stored, a Send ends nothing, and a click on
    the frame's empty space changes nothing. `clearedBy` is `select` and `act`. `freshCards(state,
    board)` (conditions.ts) is the one list behind it, the toolbar's "N new" chip and each container's
    "3 new · 1 updated" pill: every card either row holds for that shows its tab, in board order, with
    its container and whether it is updated; a card both rows hold for is new only. Agents are never
    told. No contract change. Held by `packages/actions/tests/fresh.test.ts`, `conditions.test.ts`
    and `rounds.test.ts`; the page by `tests/pages/fresh-cards.spec.ts` (freshCards flag).

## The board's engine part (ENGINE_01, 2026-10-27)

159. **One HTTP-free engine** (`apps/board/server/engine/index.ts` `createEngine`, the module's
    front door; docs/principles.md § The board is a plugin; nclite's draft contract,
    `~/ai/nclite/docs/plugins.md` § Where each part runs). Its host gives it the board's data folder
    (`dir`) and passes the caller with every call; it opens no socket, reads no environment and
    looks for no folder. It gives `route(req, { caller, signal })` (`req`: method, the path relative to
    the API prefix, query, body; a reply of status, body and a problem's headers, or null for a path that
    is not the engine's), `resolve(kind, ref)` (`resolveChip`: a card, a note, a board, ref
    `{ board, head }`, refused when gone or archived, never as changed; `selection`, ref `{ board, cards }`,
    refused when a card is gone; `answers`, ref `{ board, since, agent? }`, the person's answers since that
    line as that agent may read them, with `count` and `notes`, its text '' when there are none or the
    board is locked), `tools` (`engine/tools.ts` `EngineTools`, in MCP's shapes: `list()` gives one
    `{ name, title, description, inputSchema }` per tool the generated table marks `plugin` (46);
    `call(name, input, { caller, signal })` checks the input against that table's JSON Schema and gives MCP's
    `CallToolResult`, its text the operation's JSON; a problem, an input that does not fit or a tool it has not
    is `isError` with words, and never throws; a board write adds `_meta` `TOOL_CHANGE`, `vb/change`,
    `{ board, cards, head }`, what a change chip needs), `image({ method, path, ifNoneMatch })` (the image
    route's answer, 154: its status, headers and bytes, a problem as a reply; only `dir`'s images folder) and
    `watch(onChange)` (`{ board, head }` for every ledger change, this engine's or another writer's on `dir`). A
    host registers its bot once by `route`'s `join` and passes its id as the caller; `join` is no tool. It
    serves `list_boards`, `get_board`, `show_node`, `show_container`, `show_layout`, `list_open`,
    `check_responses`, `read_ledger`, `act`, `mark_seen`, `put_board`, `retire_cards`, `join`,
    `request_grant` and `write_board` (`ENGINE_OPERATIONS`); a caller the operation does not take
    is refused (`operations.ts` `checkCaller`). Held by `apps/board/tests/engine.test.ts`.
160. **What the host supplies.** `dir`; optionally the ledger already opened in it (the standalone
    server opens it under its lock, `lock.ts`), the folder's name as the person reads it
    (`list_boards` and `join` answer it as `project`), `onSend` (given the person's Send to record, 170), the flags
    it reads itself (`svgImages`, for `image`) and where warnings go. The plugin folder's `createEngine` takes `dir`, `name`,
    `warn` and `flags` (`apps/board/plugin/engine.ts`, plugin.md): the opened ledger and `onSend` are the standalone server's. The ledger's appends by another writer are read in before every operation
    and append, and polled while anyone watches (`ledger.ts` `refresh`, `follow`), so two engines on
    one folder never repeat a `seq`. Held by `engine.test.ts` (watch: the event, the fold, the next `seq`).
161. **The standalone server is one host.** `dispatch.ts` keeps the HTTP edge: Host and Origin
    (`guard.ts`), the route table and parameters (the engine's `matchRoute`, `readParams`), the
    folder header (114), the person cookie and agent secrets turned into a caller (`callers.ts`),
    body limits (`body.ts` `readJson`, the operation's limit asked by the engine), and the change
    streams (`streams.ts`, from `watch`). The engine's operations go through `route`
    (`handlers.ts` `viaEngine`, which sends `read_ledger` as JSON Lines when asked, 44); the chat
    server, the app host (`list_apps` stays there, so it is no engine tool) and folder switching
    stay in the standalone host (`project.ts`: one engine per open folder, its ledger folder
    `ledgerFolder(<folder>)`, today `<folder>/.visionboard`; every data-folder name and path comes from the one paths
    module, `packages/format/src/data-folder.ts`, and `npm run verify` refuses one built anywhere else). No answer changed: every API test passes unchanged.
162. **The MCP server stays a relay** to the standalone host over `packages/client` (45): it runs in
    the agent's process, and an engine there would be a second writer on a folder the standalone
    server holds the lock for, found by the MCP's upward search. Its tool list and the engine's
    `tools` come from the one table (`TOOLS_FILE`), so they name the same tools with the same input.
    `createMcpServer` serves any `ToolHost` (`packages/mcp/src/call-tool.ts`): its own `httpTools`, or a
    host's, the engine's `tools` as they are with the caller added, so another host's MCP server is one
    line (`engine.test.ts` "the MCP server serves the engine's tools"). A CLI's stream carries only a tool's
    text, so the agent adapters read a change from it (`#agent` `boardWriteSummary`), the same facts as `vb/change`.
163. **Where the engine differs from nclite's draft (v0.1)**, asked of nclite: tool inputs are full
    JSON Schema (`write_board` takes a list of items); `route` and the tools return promises (a body
    read, `check_responses` waiting up to 60 s) and take a signal; a reply carries a problem's
    headers; a tool answers MCP's `CallToolResult` where the draft has a summary and a ref; the
    person's answers since the bot's last message are a chip the view attaches and `resolve` says, with no
    hook of their own (D-074 rule 6); a chip's `ref` is JSON and a refusal is
    `{ refused, reason }`; the watch event is `{ board, head }`; and the host passes the caller.

## Attached files (chat-attachments FILES_01, D-068)

164. **`attach_chat_file`**, `POST /api/chat/files`, `x-agent: false`, the person's cookie only.
    `openapi.json` `info.version` becomes 1.32.0; the chat schema's `message_in` gains `files` (additive,
    `$id` stays chat/1). The body is `{ name, type, data }`, `data` standard base64 (padded). The file is
    saved at `.visionboard/attachments/<YYYY-MM-DD>/<n>-<name>`, the day in UTC and `<n>` one more than
    the day's highest (or the highest this server has taken, so a number stays taken once its file is deleted: `nextNumber`),
    readable by this user only, and `attachments/` is added to `.visionboard/.gitignore` (`ignoreInGit`, D-069 ruling 3); the answer is 201 with `{ file: { name, path, size } }`,
    `path` relative to the folder. `name` is what the server made of the one given
    (`chat-files.ts` `attachmentName`): the last path part, accents folded, anything but letters, digits,
    `.`, `-` and `_` made `_`, no leading dot, at most 80 characters with the extension kept, `file` when
    nothing is left. `type` is taken and not used: any type is saved. **Refusals**: over 10 MB,
    `too-large` in the file's words, whether the body limit (`ATTACHMENT_BODY_BYTES`) or the decoded size
    (`ATTACHMENT_BYTES`) found it; not base64, `bad-request`; the attachments folder or the day's folder
    not a plain folder (a link), `conflict`, with nothing written through it; the `chatAttachments` flag
    off, `not-found`. The path answers no other method: the board never serves these files. Held by
    `apps/board/tests/chat-files.test.ts` and `api-chat-files.test.ts`.
165. **`send_chat` `files`**: at most 10 items `{ path, label? }`, each `path` one `attach_chat_file` answered.
    `attachedFile` (`chat-files.ts`, the one check) takes a path only in the exact saved shape, or inside a folder
    `saveBeside` made (167), with a plain folder at each step and a plain file at the end, within 10 MB for a message; any other, one since deleted, or one named twice in the
    message, is `invalid` at `/files/<i>`, and nothing is sent. `label` is the name the person's file has
    (1-200 characters, no control, line-break or text-direction character, and at least one that shows; `$defs/fileLabel`, point 356):
    display only, kept on `message_in.files` to show on the message, never in the prompt, and nothing is
    believed from it. With the flag off any `files` is `invalid` at `/files`. The prompt (`chat-prompt.ts`
    `promptFor`) gets one block after the words and before the board's: "The person attached these files:"
    and one path a line. `message_in.files` carries each `{ name, path, size, label? }`; a message of files alone
    reads "Attached files.". A message waiting for a turn to end is joined with the next, each file once
    (so a joined message may carry more than 10); its files are checked again when it goes (`chat-files.ts` `checked`), and
    one deleted meanwhile is left out of the prompt and of `message_in.files`, the text and the prompt saying which
    (`fileGoneForThePerson`, `fileGoneForTheAgent`). `send_chat` keeps no record of what was saved (D-069 ruling 4). Held by
    `apps/board/tests/api-chat-files.test.ts` and `chat-files.test.ts`.
166. **The agent** may read an attached file, and its file tools may not change it: `ACCESS_RULES` row
    `.visionboard/attachments/**` (`theirAttachments`), so Claude's deny rules and Kiro's agent carry it. A command the
    rules can't judge asks (`unknownCommand`), once only; one known to change a file is refused (`knownChanges`, D-069
    rulings 1, 2; chat.md § What the person attached).
    Held by `packages/agent/tests/policy-attachments.test.ts`, `policy.test.ts`, `policy-command.test.ts`, `claude-args.test.ts`,
    `kiro-turn.test.ts`.
167. **`read_attachment`**, `POST /api/chat/files/read`, `x-agent: true`, an agent's secret only (D-071). `openapi.json`
    `info.version` becomes 1.33.0. The standalone
    server's, beside the chat, not the engine's: attachments are its host's (D-068 ruling 6). `path` must pass
    `attachedFile` (165), which also takes a file inside a plain folder of the saved shape, each further step a name with no
    leading dot and no link at any step (`INSIDE`); only `saveBeside` and `saveCopy` make such folders, unless the person says yes to a command the rules can't judge (`mkdir`, `unzip -o -d`): the agent's file tools can't write there, and a link is refused either way. The
    kind goes by the file's extension (`KINDS`), and then the reader checks what it really is. **Answers**, each with
    `untrusted` (`attachedFilesAreUntrusted`): `workbook`, `sheet`, `document`, `folder`
    (`api/read-attachment-response`). Anything saved goes in a new folder beside the file, by `mkdir`, so nothing is
    written over or through, and every step's name is the board's own (`attachmentName`), a taken one numbered.
    `info.version` becomes 1.36.0 (VERIFY_01 F2-F9). **What it reaches**: Word's numbers from `w:start`, `w:numFmt` and `w:lvlText`, headings too
    (`docx-numbering.ts` `readNumbering`); a drawing stands as a marker with its words, links, titles and stored figures (`ooxml-drawing.ts`), an EMF or an
    embedded object named as not seen, and `note` says each kind (`foundNotes`). Excel's defined names and external links come with the list, a sheet's pictures
    saved by the list, its comments and drawings with a range (`xlsx-parts.ts`). **Size**: one answer is held to `LIMITS.answerChars`: a Word file's rest goes
    in `document.md` beside it (`wholeText`), and `cut.next` (with `cut.then` when it only finishes a row) always moves on (`goingOn`). A sheet's XML is read as a
    stream, so a big one can't hide the list; `scanBytes` says how much is counted for it, and a sheet past that has `counted: false`.
    **Refusals**: `invalid` at `/path`, `/sheet` or `/range`, in `refusedBecause`'s words, with no text from the file, and
    nothing is left; too many reads at once (`READS_AT_ONCE`), `conflict`; the flag off, `not-found`. The reader runs in a
    worker (`chat-read.ts` `inWorker`) with no environment, stopped at `READ_DEADLINE_MS` or when the caller goes
    away. Held by `apps/board/tests/chat-read.test.ts`, `api-read-attachment.test.ts`, `packages/documents/tests/`.
168. **`attach_chat_file` `of`** (D-071): a picture the page made of a file already attached. `openapi.json` `info.version` becomes
    1.34.0, and with `blank` 1.35.0. `{ path, page, pages, blank? }` for a PDF's page, `{ path }` for a picture's fitted copy; `name` and `type` are not used. The server
    (`chat-files.ts` `saveCopy`) names it, `<n>-<stem>-pages/page-001-of-040.png` (`page-003-of-040-blank.png` when it has text and drew nothing) or `<n>-<stem>-fitted/fitted.png|jpg`,
    beside the file, by a plain `mkdir` and `wx`. **Refusals**: `of.path` not itself an attached file (not one inside a folder), `invalid` at `/of/path`; a page past
    `pages`, at `/of/page`; not a PNG (a page) or a PNG or JPEG (a copy), at `/data`; over `PICTURE_BYTES` (`#format`, 3.5 MB, measured live on Kiro: a 4.3 MB PNG rejected, a 3.5 MB one seen), `too-large`; saved already, or a link where its folder goes,
    `conflict`; the `readAttachment` flag off, `not-found`. A copy takes no place among a message's 10 files: `send_chat` names only the original, and when the message goes
    `checked` reads what is beside each file (`besideOf`), so the prompt (`filesBlock`) says only what is saved: one line a file, `Its pages as pictures, 30 of 40: <folder>/page-001-of-040.png to page-030-of-040.png`, with `pagesDrewNothing` under it for any `-blank` page,
    or `A copy that fits: <path>`, then `openThesePictures`, then the untrusted line. **The frame**: `GET /pdf-frame` (`pdf-frame.ts`), not an operation: the built script inside the page, its policy naming it by hash,
    `sandbox allow-scripts`, `default-src 'none'`, `connect-src 'none'`, `wasm-unsafe-eval` for the image decoders inside it, no `unsafe-eval`; 404 with the flag off, with that policy's shape. Held by `apps/board/tests/chat-files.test.ts`, `api-chat-files.test.ts`, `pdf-pages.test.ts`, and `tests/pages/chat-attach-pages.spec.ts` on the headless shell, its `@full-build` tests also on each full build found.

## Ledger v19: a Send counts only what went (point 377, 2026-11-02)

169. **A Send says how far its answers were read.** `LEDGER_FORMAT` becomes 19 and every ledger `$id` moves to
    `.../schema/ledger/19/`; `openapi.json` `info.version` becomes 1.37.0. Only adds: v2 to v18 lines stay valid
    (`schema-v19.test.ts` "old ledgers read unchanged"). A `send` act may carry `head`, an integer from 0: the ledger line its
    answers were read through (`resolve('answers')` answers it, `#actions` `AnswersText.head`). Only the answers up to it
    count as sent; a later one is the next Send's. Left out, the Send covers every answer up to its own line, as every
    Send before v19 did and as a Send no chat carried still does. `head` on any other action is refused, as is one past
    the ledger's last line, in the `seen` head's words (`ledger-index.ts`; `schema-v19.test.ts` "a send may carry head",
    "a head past the ledger's last line"). The fold keeps the highest per board, never lowered (`LedgerState.sentHead`,
    beside `lastSend`, the latest Send line): the answers chip, `board.unsent` and a note's history (`note-lock.ts`
    `sentAfter`) count from it, and a Send whose `head` is below its own line folds the answers after it again
    (`unsent.ts`; `send-head.test.ts`). The standalone server reads a message's answers and records its Send in one step,
    so it writes `head` as the line it read (`chat-sessions.ts` `deliver`; `api-chat-send.test.ts` "one path"); a host
    passes `record` what `resolve` read (plugin.md § The chat). Behind the `sendCountsWhatWent` flag, page and server;
    off, no `head` is written. An agent sees `head` on a `send` in `check_responses`.
170. **The board's Send is recorded once its answers went; Send lights for the chat's agent** (points 383, 384). No
    contract shape changes: `act` `send` still answers its stored line; its one new answer is 409 `conflict` (point 386,
    below; `info.version` 1.38.0). The engine's
    `onSend` is given the Send to record (`operations.ts` `SendHook`, default: at once). With a chat session on the
    board and something new for its agent, the standalone server hands the answers over and records the Send in the
    same step, with `head` the line the message read (`chat-sessions.ts` `send`, `deliver`), as a message's Send is
    (169); a failure before that records nothing as sent, so the answers go with the next Send: a duplicate at worst,
    never a loss. While the agent's turn runs, an `act` `send` records the press with `head` the board's watermark
    (acknowledging nothing new) and the Send through what was read when the message goes. The standalone page doesn't
    use `act` then: with a session in use its Send is a message (`chat-panel.ts` `boardSend`), queued while the turn
    runs and recorded once, when it goes (point 389, the Claude Code live test; D-075). A session that can't be loaded
    is answered to the person (point 386): `act` `send` is a 409 `conflict` whose detail says the chat could not be reached
    and why ("Send did not go: the chat could not be reached (Claude Code could not be started: …). Your answers are
    still unsent; press Send to try again.", `words/server-chat.ts` `theChatCouldNotBeReached`), and nothing is recorded,
    so the answers stay unsent and Send stays lit. The page shows it as it shows any failed act (the error toast, the
    Send button's error state and tip: `sender.ts` `attempt`, `SendButton.svelte`). The flag-off path is as before (the
    Send is recorded, the error logged). The `act` answer waits for a
    session to load and its message to go, never for the turn. No session, or nothing new for its agent: recorded at
    once, as before. Held by `api-chat-send.test.ts` ("with a session", "while a turn runs", "a hand-over that
    fails" is now "a chat that cannot be reached answers the Send with why, records nothing, …" and
    `tests/pages/chat-send-error.spec.ts`). `board.unsent` takes `sendTo` (`ConditionContext`), the agent of the person's chat on the board: only the
    lines it may read count (`unsent.ts` `unsentOn`, by `permissions.ts` `concerns`, the test `check_responses` uses);
    the page passes `BoardChat.status.agent` and reads again when it changes (`attention.ts`); with no agent, every
    answer, as before. The other agents read theirs with `check_responses`. Held by `unsent.test.ts` ("with the chat's
    agent") and `tests/pages/chat-send-scope.spec.ts`. Both behind `sendCountsWhatWent`; off, as before.
171. **The tools keep a bot's rules; the reads give it the facts** (bot-quality TOOLS_01, points 393, 394; the plugin skill
    live run's findings 1, 4 and 6a). `info.version` 1.39.0, adds only. Behind the `botToolRules` flag (on; the engine reads
    it from its `flags`, and the standalone server passes `VB_FLAGS`); off, every part is as before
    (`apps/board/tests/bot-tool-rules.test.ts`, each "flag off" test).
    - *An input may say who gives it*: `x-hosts` on a parameter, as on an operation (46). The tool table carries it as the
      row's `inputHosts` (`gen-tools.mjs`; `gen-api.mjs` `toolTableWithHosts` stops the build on an unknown host;
      `gen-tools.test.mjs` "x-hosts on an input"). `check_responses`'s `wait` is `standalone`'s alone: the engine's
      `tools` list it without `wait`, its words lose the offer (`words/plugin-tools.ts` `ruleEdits`), and a `wait` sent
      anyway is refused at once, `invalid` with a `/wait` pointer, saying the person's Send brings the answers and to end
      the turn (`inputRefusals`). Refused, not answered at once: the bot's schema has no `wait`, as with any input outside
      a schema, and an answer that looks like a wait that ended invites a poll loop. `vb-mcp` and `route` keep `wait`.
    - *Instructions per host*: `#mcp` `ToolHost` may carry `instructions`, and `createMcpServer({ tools })` sends them
      (else `INSTRUCTIONS_JOINED`, as before). The engine's `tools.instructions` are `INSTRUCTIONS_JOINED` less `join`,
      the secret, `wait` and the folder header (`instructionEdits`). The instructions moved to their own file
      (`packages/mcp/src/instructions.ts`), so the engine bundle takes their words and none of the server's paths.
    - *Reads mark what is true for the caller*, an agent's read only: a note it owes is `owed` (`common.schema.json`
      `note`; in `get_board`'s `state.items` and `state.containerNotes`, `show_node` and its `linked`, `show_container`),
      from the condition rows `list_open`'s `pending` and `containers` read (`item.owed`, `container.owed`), and a board
      it holds is `held` (`list_boards`, `get_board`), by the test `request_grant` answers `held` by
      (`apps/board/server/engine/caller-marks.ts`). The page's fold is unchanged: no person read is marked
      (`board-data.test.ts`).
    - *A key conflict says what the key holds*: a card by number, title and version (with how to change it: its `n`
      and a new key), or the line's kind and `seq`, and a free key, the first `<key>-<i>` this agent has not used
      (`write-replay.ts` `conflictWords`). The same key with the same content stays a quiet replay (29): a key names one
      line for good (D-017), so other content under it stays a conflict rather than a success that drops it.
172. **A read says what answered a note** (bot-quality TOOLS_02, SKILL_01's request 1). `info.version` 1.41.0 (1.40.0 added `answered`; 1.41.0 takes the reply's `text` out of it: its words are on the board, and the card is one `show_node` away);
    behind `botToolRules`, as 171. On an agent's read, a note not `owed` that something answered carries `answered`
    (`common.schema.json` `noteAnswer`): `{ kind: "reply", seq }` for a reply naming it (its line),
    `{ kind: "version", ver }` for the card's first version after it, or `{ kind: "check" | "cross", seq }` for the
    person's ✓ or ✗ on the card after it while it stands; never a reply's words, which the board already holds; the reply first, then the version, then the mark. One rule:
    `#actions` `noteAnswer` (`packages/actions/src/note-answer.ts`) is what ends owing, so `owedNote` (`item.owed`) and
    `container.owed` owe the latest note it finds nothing for, and `caller-marks.ts` names what it found. A note with
    neither mark is not the caller's to answer: on a card it may not answer, or an earlier note on a card whose latest
    note carries the mark. A person's read and the page's fold stay unmarked (`apps/board/tests/bot-tool-rules.test.ts`
    "reads say what answered a note", "reads, flag off").

## Read-only and Edit (READONLY_01, D-085)

173. **A ledger opens read-only** (`readOnlyStart` flag, server and page; off by default until the set closes). With it
    on, opening a ledger takes no lock and writes nothing into its folder: at start (`apps/board/server.ts`
    `startReadOnly`: no lock, no move of an old layout, no `VB_SEED`, no exit when another server holds the ledger; the
    terminal says who), on a switch (`server/project.ts` `openOne`, `openLedgerOf`: the lock held before is let go,
    the next ledger is only read), and for `create` (the new ledger is made under its lock, which is let go at once).
    `npm run board -- --edit` or `VB_EDIT=1` opens every ledger for editing as before (`BoardServerOptions.edit`);
    the tests' servers do too (`startTestBoard`'s `edit`, default true), unless a test is about read-only. Held by
    `apps/board/tests/api-read-only-open.test.ts`.
    - **Edit** (`edit_ledger`, `POST /api/project/edit`, the person's) takes the open ledger's lock now (`lock.ts`
      `takeLock` as it stands): a live lock of another server refuses with `conflict` in the person's words
      (`words/server-folders.ts` `editRefused`: the computer, process, port and since when; "Try again once it stops
      editing"), and the ledger stays read-only. A folder this computer can't write is refused with `conflict`
      in words (`cannotBeWritten`), never a server error. A folder still in the old layout (ledger folders on) is moved into
      `main/` first, so it opens again there and its streams end, as on a switch. **Stop editing** (`stop_editing`,
      `DELETE /api/project/edit`) lets the lock go. Both answer the open folder, as `get_project` does; an agent is
      `forbidden`. With the flag off, Stop editing still works (the ledger is then read-only until Edit); nothing in
      the page offers it.
    - **The state** has one home per open folder, `server/editing.ts` (`createEditing`): `readOnly()` is what the
      ledger (`ledger.ts` `gate`), the engine (`EngineOptions.readOnly`) and the agents store (`openAgents`) ask.
      With the flag on, a lock this server no longer holds (another computer took a stale one over) reads as
      read-only (`Lock.held`), so a writer stops before its next line. The heartbeat beats only a lock held, and a
      holder whose own last beat is 2 minutes old (`STALE_MS`, after a sleep) never beats or removes it again: its copy
      may not show another computer's takeover yet (`lock.test.ts` "a holder waking…"). Each beat also looks again
      (`Editing.look`): this server's lock lost, or another computer starting or stopping, sends `editing`; what it
      compares with is also what a page was last told (`Editing.info`, `get_project`), so a change before the first beat
      is told on it (`editing.test.ts`).
    - **Reads say it** (`common.schema.json` `readOnly`, only when true, like `locked`): `get_board`, `list_boards`
      and `read_ledger` carry `readOnly: true` (`engine/operations.ts` `readOnlyMark`). With the flag on, `get_project`
      (and `open_project`, `edit_ledger`, `stop_editing`) answer `readOnly` and `editing`: `{ here: true }` while
      this server may write, else `{ host, since }` from another server's live lock (`lock.ts` `lockHolder`), else
      nothing. With it off, those answers are as before.
    - **Writes are refused before anything is written** (problem `read-only`, 409, `problem.schema.json`): the engine
      refuses every operation that is not a GET before its body is read (`engine.ts` `run`), `join` too, since it would
      write `agents.json`; the ledger refuses any line handed to it, from any route (`ledger.ts` `append`, before
      `stamp`), and the agents store any hash (`agents.ts` `add`). An agent reads `READ_ONLY` ("…until they make it editable…"), the
      person `READ_ONLY_PERSON` ("Read-only: switch to Editing to change it"; `#actions` `read-only.ts`). The person's
      `put_panel_state` is refused the same way. Not D-043's lock: a read-only ledger takes no flag either, and a
      locked board answers `locked` as before in edit mode. Held by `apps/board/tests/api-read-only.test.ts`, the
      contract walk of `api-lock.test.ts` for read-only: every agent write 409 with nothing written (the ledger
      file's bytes, `agents.json` and the ledger folder's listing), every read as before plus `readOnly`, every person
      write either refused or named with why it still goes, Edit refused by another computer's live lock, a lock
      taken over stopping the next line, D-043 unchanged in edit mode.
    - **The chat's own files** (`chat-sessions.ts` `openLedger`, `packages/agent` `OpenLedger`): a chat writes only the
      open ledger's `images/` and `apps/`, and only while it may be written, asked at each question (the server's
      approvals), so Stop editing or a lost lock holds at once; the CLI's hook can't tell, so it asks the board
      (`chat-approvals.test.ts` "the open ledger, asked…").
    - **The chat** (`chat-sessions.ts`). A start, or a session resumed after a restart (a fresh secret), would write
      the ledger's `agents.json`: refused with `read-only` (`noChatWhileReadOnly`) before any CLI starts. A session
      already running still takes messages: as on a locked board, the words go alone, with no answers and no Send
      recorded (`deliver`). The repo-wide chat files (sessions, attachments, permissions) are the person's
      conversation, not the ledger, and are still written. Held by `api-read-only.test.ts` ("a chat running when the
      person stops editing…").
    - **A replaced file** (`ledger.ts` `refresh`): another inode, a shorter file, or other first bytes (a digest of
      the first 4 KB) mean the file was replaced (a git pull, a sync, a copy dropped in), not grown; the ledger reads
      it again from the start, taking whole lines only (a last line still being written waits), and tells its reset
      listeners (`onReset`). The streams then send `reset { seq }` (`streams.ts`), and `editing { readOnly }` after
      Edit or Stop editing (`sse-reset.schema.json`, `sse-editing.schema.json`). Held by
      `apps/board/tests/ledger-replace.test.ts` (grown; replaced longer, shorter, in place, half-written; made after
      it was opened) and `api-read-only.test.ts` ("a replaced ledger file…").
    - **The page** learns read-only from its reads (`live.ts` `readOnly`, from `read_ledger`), so any host's board
      does with no seam change; an `editing` event makes it read again, and `reset` (the host's change with head 0,
      `page-host.ts`) reads the whole ledger again. The past version's read-only path is widened to "past version or
      read-only ledger" (`controller.ts`: the sender's refusal, proposals, parking, the chat side); `lock-flow.ts`
      `paused` gives the read-only reason, so the stage's acting handlers, the note bubble and the selection bar's
      acting commands stop as on a locked board, the flag too. No board seen and no card seen mark is written; a card
      seen is kept in the page (`attention.ts`, `update-flow.ts` `quiet`). `BoardState.readOnly` is set from the reads
      for the elements. The chat panel blocks a message only when no session is in use (`chat-rules.ts`
      `blockedReason`), since a new one would have to join. Held by `apps/board/tests/live-read-only.test.ts` and
      `tests/pages/read-only-writes.spec.ts`. The header's Edit control is READONLY_UI_01's.

## Insert a card into a flow (insert-markdown-signals ACT_01, point 424)

174. **A node item may carry `insert: { after, before }`** (`insertBetween` flag, on; `node.schema.json` `$defs/sent`,
    never the stored line). `after` and `before` name two cards as `n` does (a number, or `{ key }`, 35). The item puts
    its card, new or an existing one (`n`, with `base` as 30), between them in one write: the node line, then an
    `unlink` of `after`→`before` and two `link` lines, `after`→card and card→`before`, both with the old link's label
    (`write-insert.ts` `insertLines`). The three lines carry no key of their own; the item's key is on the node line.
    The card's other links stay. Ledger format unchanged: the ledger holds only lines it already knew.
    - **All or nothing.** Everything the three lines need is checked before the node line is appended
      (`checkInsert`, after the item's `base`, board and proposal checks, before its grant, `write-board.ts`
      `writeOne`); the grant is the node's plus the old link's (its `after` card's container, 82). Refused with
      `invalid` and a pointer into `insert` (or `node/region`, or `n`), in the words of `words/writes.ts`
      § write-insert.ts, when: `after` and `before` are one card; either is the card this item writes; either is
      retired or on another board; there is no link `after`→`before` (when the link runs the other way, the words
      say to swap them); the two sit in different containers; that container does not lay out by its links (the
      person's mode wins, as `show_layout` reads it: `flow` and `lanes` do, `grid`, `column`, `row`, `radial` and Later
      do not); the item's `region` names another container; or the person moved the existing card elsewhere (their
      move wins, 66). A schema refusal of a node item with `insert` carries the node example that shows it
      (`examples.ts` `itemExample`).
    - **Result.** As a node item's (34), plus `inserted: { after, before }` by board number (`write-result.schema.json`
      `written`; `write-result.ts` `written`).
    - **Retry** (29). The same item under its key replays with `inserted`; the key with another `insert` is a
      `conflict`. What an insert wrote is read back from the three lines after its node line (`insertedBy`).
    - **Flag off.** `insert` is refused as an unknown field, exactly as before (`write-board.ts` `itemProblems`).
      The engine passes the flag to `writeItems` as its `insert` argument (`engine/writes.ts` `writeBoard`).
    - Held by `apps/board/tests/api-insert.test.ts`: a new card between linked flow cards (the four lines, the label
      on both links, no `insert` on the stored line), `show_layout` placing it between its neighbours, an existing card
      by `n` and `base`, cards by key in a `lanes` container, the retry and the conflict, each refusal writing nothing,
      a grant, a failed key, the example, and the flag off (through `writeItems` and through the server).
