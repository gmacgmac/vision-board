# 1_BE_02_actions-v3: Action registry, rules and fold for ledger v3

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (step 1) ·
> **Decisions**: D-018, D-020, D-027, D-030 · **Contract**: `docs/specification/api.md` points
> 16, 19-26, 36, 41 · **Model**: Opus 5.5

## Objective

The action layer understands ledger v3: every action, for people and agents, is in the registry
(rule 8); the new person actions are checked; and the fold works out containers' holders, grant
requests, sizes, Send, retry keys and the pending and unseen sets. All of it is pure and tested,
so the server tasks (2_BE_04, 2_BE_05) only call it.

## Context

- Repo `/Users/dev/Dropbox (Personal)/Developer/web-apps/vision-board`, branch `board-v3`; Node
  22.23.1 via nvm. 1_BE_01 is committed (`9464ec5`): v3 types in `packages/format/src/ledger.ts`,
  the grant/holder index in `ledger-index.ts`, schemas in `packages/format/schema/`.
- Read first: `docs/specification/api.md` (all of it), `packages/actions/src/*.ts`,
  `packages/format/src/ledger-index.ts` (what 1_BE_01 already indexes; reuse it, never fold the
  same thing twice), `packages/format/src/board-view.ts`, and D-018 to D-020 in `docs/decisions.md`.
- Layers (D-016): `actions` may import only `format`, through its front door.
- Out of scope: routes, HTTP, the page, layout's size tier (U7).

## Steps

1. **Registry** (`registry.ts`): one entry per thing a person or an agent can do. Replace
   `personOnly` with `by: 'person' | 'agent'`, and add `needsConfirmation: boolean` (true for
   ack, drop, later, grant, deny, revoke: decisions only a person's click makes, rule 8). Person
   actions are the `ActionId`s (`comment` and `context` become person-only). Agent actions get
   their own id type, `AgentActionId` = `reply` | `propose` | `park` | `request_grant`, with
   label and inputs named; they are records, not `act` events. Give `grant`, `deny`, `revoke`,
   `size` and `send` clear labels (`Allow`, `Refuse`, `Remove access`, `Card size`,
   `Send to agent`); no keyboard keys yet. Update every reader of `personOnly`.
2. **Rules** (`act.ts` `validateAct`): an agent may never write an `act`. `grant`/`deny`:
   `request` is an open grant request on this board. `revoke`: the holder holds that container
   and is not its creator (a creator cannot be removed; say so). `size`: node exists on this
   board; `auto` clears. `send`: the board exists. Messages are plain English an agent can act on.
3. **Fold** (`fold.ts`, plus new files where a job is its own, about 300 lines each at most):
   - `agents`: id → label (from `join`).
   - `holders(state, board, region)`: creator plus granted minus revoked; v2 regions have none.
   - `grantRequests`: each with its `seq`, agent, container, reason, and its answer if any.
   - `sizes` per board: `n` → `s` | `m` | `l` (from `size` acts; `auto` deletes).
   - `lastSend` per board: the `seq` of the latest `send`.
   - `keys`: agent → key → `seq` of the event that carried it (across the project, point 29).
   - `ViewNode` gains `size` (the agent's suggestion), passed through by `boardView`; the
     `BoardState` returned to the page gains `sizes`.
4. **Write check** (`grants.ts`): `canWrite(state, agent, item)` returns `ok` or the
   `{ board, region }` the agent needs, exactly per point 24 (new board, new region, existing
   region, new node, new version including a move, link from-node, reply/propose/park by holder
   or by the latest version's author). Pure; the item is a resolved sent item.
5. **Owed answers** (`pending.ts`): `pendingItems(state, board, agent?)` per point 36 (latest
   comment or needs-context with no reply naming it and no newer version; or moved to Later with no
   park after), scoped to the agent's containers when an agent is given (point 41).
   `unseenItems(state, board)`: items whose latest version is newer than the person's last
   `seen`. `responsesAfter(state, board, after, agent?)`: the person's acts after `after`, plus
   answers to that agent's grant requests (for `check_responses`).
6. `replyText` (`reply.ts`) keeps working; `send`, `size`, `grant`, `deny` and `revoke` do not
   appear in the numbered reply.

## Tests (write them first)

In `packages/actions/tests/`: every rule in steps 2-5 as its own case, including each row of
point 24 allowed and refused, a moved node needing both containers, an author parking a node
moved into Later, revoke of a creator refused, a second open request (the fold keeps one), pending
before and after a reply and after a new version, agent scoping, unseen after `seen`, and
`responsesAfter` with grant answers. Existing tests keep passing; list any you change and why.

## Done when

- `npm test`, `npm run check`, `npm run verify`, `npm run test:pages` all exit 0 (read the exit
  status).
- Report: files added and changed, every existing test changed and why, anything in api.md you
  found unclear or wrong. Do not commit. Do not edit `docs/decisions.md`, steering, `AGENTS.md`,
  `CLAUDE.md`, `docs/principles.md` or `packages/tokens`.
- Files over 50 lines: create with the first section, then append in chunks.
