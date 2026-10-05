# 2_BE_05_identity-writes: Agent identity, the person cookie, grants and write_board

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (step 2) ·
> **Decisions**: D-018, D-019, D-027 · **Contract**: `docs/specification/api.md` points 13-16,
> 20-41 · **Model**: Opus 5.5

## Objective

Agents can join, ask for a container, and write to the board with per-item answers; the board
page writes as the person with a cookie only it receives; every write is checked against the
grants. After this task an agent can do everything the contract promises over HTTP.

## Context

- Repo `/Users/dev/Dropbox (Personal)/Developer/web-apps/vision-board`, branch `board-v3`; Node
  22.23.1 via nvm. Done: ledger v3 + schemas (1_BE_01), action layer with `canWrite`,
  `pendingItems`, `responsesAfter`, `holders` (1_BE_02), `openapi.json` + route table (1_BE_03),
  `packages/client`, the dispatcher, problem errors and every read (2_BE_04).
- Read first: `docs/specification/api.md` (points 13-41 are this task), `openapi.json` operations
  `join`, `request_grant`, `write_board`, `act`, `mark_seen`; the server modules 2_BE_04 wrote;
  `packages/actions/src/grants.ts`, `pending.ts`, `act.ts`; `packages/format/src/ledger-index.ts`.
- Out of scope: the page's grant and Send UI (2_FE_01), `vb` (3_BE_06), MCP (4_BE_07).

## Steps

1. **Ledger follow-ups from 1_BE_02**: the format context check refuses revoking a container's
   creator (fix the `ledger-context.test.ts` case that expects it to work) and refuses a second
   open `grant-request` from the same agent for the same container; `join` loses `key` (schema,
   types, hand validator, tests); the server passes the path's board to `validateAct`.
2. **Agents** (the I/O layer only, rule 7): `join` mints `a-` + 8 lowercase letters/digits and a
   32-byte base64url secret; writes the SHA-256 to `.visionboard/agents.json` first, then appends
   the `join` event; writes `.visionboard/.gitignore` with `agents.json` if missing; returns
   `{ agent, label, secret }` once (201). Lookup by `timingSafeEqual` over hashes; hashes with no
   `join` event are ignored. `join` is the one credential-free write (4 KiB body).
3. **Callers** (point 20-22, 28): Bearer → agent; unknown secret → 401 `not-authenticated` with
   `WWW-Authenticate: Bearer realm="vision-board"` and the re-join detail. The page's cookie
   `vb_person` (`HttpOnly; SameSite=Strict; Path=/api`, minted at start) is set when the server
   serves the page. `act` and `mark_seen` need the cookie and refuse `Authorization`; agent
   routes refuse the cookie; refusals use the wording of point 20 and never name the cookie. A write
   with neither is refused. Origin, if present, must be this server. Scoped reads (point 41) use
   the Bearer when given.
4. **`request_grant`** (points 25-26): holder → 200 `{ held: true }`; an open request from the same
   agent for the container → 200 with that request and `replayed: true`; else append and 201.
5. **`write_board`** (points 24-25, 29-37): parse `{ items }`; validate each item against
   `write-item`; resolve keys (`{ key }` from earlier in the batch or from the agent's stored
   keys), retry keys (look up before grants; same content by canonical hash → first result with
   `replayed: true`; different → `conflict`), `base` (`conflict` with current `ver`), `canWrite`,
   then stamp and append one at a time through the ledger module; `depends-on-failed` for items
   naming a failed key, transitively. Answer 200 `{ results, head, pending }` (pending scoped to
   the agent). Item problems omit `status`.
6. **Person routes**: `act` accepts every action in the registry for people, including `grant`,
   `deny`, `revoke`, `size` and `send`; `mark_seen` appends `seen`.
7. The page sends the cookie automatically (same origin) and, on a `forbidden` answer to a person
   route, reloads once to pick up a fresh cookie after a server restart. No other page change.

## Tests (write them first)

API tests through `packages/client` against a temporary project, each response checked against
`openapi.json` (status, body, headers): join and secret storage (hash only, `.gitignore` written);
401 with the header; an agent calling `act` refused, the person calling `write_board` refused;
every row of point 24 allowed and refused over HTTP; a moved node needing both grants; request,
repeat, grant by the person, then the resent batch succeeds with the same keys; replay and key
conflict; `base` conflict; key references inside a batch and across calls; `depends-on-failed`
transitive; pending scoped; revoke of a creator refused; a v2 region needing a grant; `size` and
`send` acts; `mark_seen`; `check_responses` with `wait` returning on the grant answer.

## Done when

- `npm test`, `npm run check`, `npm run verify`, `npm run test:pages` all exit 0 (read the exit
  status).
- Report: files added and changed, every existing test changed and why, anything unclear in
  api.md or openapi.json. Do not commit. Do not edit `docs/decisions.md`, steering, `AGENTS.md`,
  `CLAUDE.md`, `docs/principles.md` or `packages/tokens`. Files over 50 lines: create with the
  first section, then append in chunks.
