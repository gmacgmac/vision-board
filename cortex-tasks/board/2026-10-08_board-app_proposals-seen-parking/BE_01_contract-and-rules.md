# BE_01_contract-and-rules: Contract and rules for proposals, seen, append

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (rulings 1, 3,
> 4, 7, 8, 9, 11) · **Decisions**: D-018, D-020, D-033 · **Model**: Opus 5.5

## Objective

Everything the page tasks need from the format, the action layer and the server, built contract
first: reject a proposal, the server's proposal checks, seen by touching a card, `append`, and
the conditions rows the page reads.

## Rulings (do not reopen)

1. **Reject (ledger v10).** A new person act `reject` with `proposal` (the propose line's `seq`)
   and `n`. Accept stays as today: the proposal's own action (`ack` or `drop`) with `proposal`.
   `reject` joins `ACTIONS` (`packages/actions/src/registry.ts`; `...person`, `onItem: true`, no
   status, no reply word). `LEDGER_FORMAT` 10, every ledger `$id` to `/ledger/10/`; readers keep
   accepting older `v`. OpenAPI 1.9.0; `npm run gen`.
2. **Proposal rules** in `packages/actions/src/act.ts` (a `proposalProblems` rule; the server and
   the page run the same `validateAct`). An act carrying `proposal`:
   - names a propose line on the same card (`n`) and board, else refused;
   - is refused when the proposal is already decided ("proposal 812 was already decided");
   - an accept (its action must equal the proposal's) is refused when the proposal's `ver` is
     older than the card's latest version ("47 changed after this was proposed; ask the agent to
     look again"); a `reject` of an out-of-date proposal is allowed.
3. **Fold** (`packages/actions/src/fold.ts`): a `reject` sets the proposal's `decidedBy` and a new
   `outcome: 'accepted' | 'rejected'`; an `ack` or `drop` on a card, with or without `proposal`,
   closes every open proposal on that card (`decidedBy` = that act; `outcome` 'accepted' for the
   named one, else 'closed'). Any person act that names a card (`n` or `nodes`, every action
   except `send`) also counts as the person seeing each named card's latest version at that line
   (`s.seen` raised, never lowered). A `reject` is not a decision on the item: status unchanged.
4. **`append` write item** `{ type: 'append', key?, n, text, base? }`: the server turns it into an
   ordinary stored `node` line, a new version of card `n` with `text` added to the end of its body
   (a blank line between, body limit as the node schema's), every other field carried over. Same
   checks as a node update (`canWrite`, `base`), same result shape (`n`, `ver`). The ledger gains no
   event type; only `write-item.schema.json`, the generated MCP tool and `vb` command, and api.md.
   Keep retries working: a replayed `append` with the same key answers `replayed`.
5. **Conditions rows** (`packages/actions/src/conditions.ts`, one test per row, the coverage
   test):
   - `proposal.open`, about `card`, audience `person`, shows `card` and `strip`: a proposal with
     no `decidedBy` on an undecided item whose version is the card's latest. `seq` = the proposal.
   - `proposal.stale`, about `card`, audience `person`, shows `card` and `strip`: the same but the
     card has a newer version. Ends on reject, or a decision on the card.
   - `item.awaiting`, about `card`, audience `both`, shows `card`: an item in Later with no park
     after its "later". Factor the check out of `owedOn` so both rows share one helper; it never
     goes in two places.
   - `item.unseen`: audience becomes `both`, shows `card`; its `trueWhen` says a version-1 card
     carries no tab on the page (PLAN ruling 6), which the page reads as `ver > max(seen, 1)`.
     Keep the agent's reading unchanged (`list_open` `unseen`).
   Add `proposal` to references (`references.ts`) if a new kind is needed; every new kind has a
   row (the type checks this).
6. api.md: points 93 on (reject and the proposal rules; implicit seen; `append`; the rows).
   Skill notes (`skills/vision-board/NOTES.md`): `append` to add to a card; a proposal made on an
   older version can't be accepted, so propose again after an edit.

## Steps

1. [x] Failing tests first: schema cases (v10 `reject`; `append` item valid and broken);
   `act.ts` cases (unknown proposal, wrong card, decided, out of date accept refused, out of date
   reject allowed, action mismatch); fold cases (closing on ack/drop, outcomes, implicit seen,
   `send` not counted); conditions rows; API (`append` writes a version with the joined body,
   `base` stale fails, no grant fails, replay; `act` reject over HTTP; stale accept refused 409/422
   as the existing person act problems do).
2. [x] Format and contract, `npm run gen`, fold, act rules, server `append` in
   `apps/board/server/write-board.ts` (224 lines; put the body join in packages/actions if it
   grows the file past 300), conditions, api.md, skill notes, `npm run map`.

## Validation

- [x] The five gates exit 0; `npm run gen -- --check` current.
- [x] Over real MCP (throwaway stdio caller in the system temp folder against a scratch project):
      `append` adds to a card; a stale accept is refused with the plain message.

## Constraints

- If deviation is needed, stop and say so; no silent breaking changes. No PII in examples.
- No git commits or stash. Scratch in the system temp folder. Stop only your own processes.
- Fill Implementation Notes below, your row in TASK-STATUS.md, and your own LOG line.

## Implementation Notes

**Status**: Completed 2026-10-08

**Format and contract (api.md 93-96).** Ledger v10: `LEDGER_FORMAT` 10, `LEDGER_FORMATS` adds 10,
every `$id` at `/ledger/10/`; `common.schema.json` `v` and `stampAgent` take 10. `reject` joins
`ACTION_IDS` and the act schema's enum; `$defs/rules` and the hand twin (`ledger-shape.ts`
`actRules`, `ON_NODE`) require `n` and `proposal`. `ledger-index.ts` `contextProblems` keeps refusing
an out-of-date accept but lets a `reject` through. API `proposal` gains `outcome` (`accepted`,
`rejected`, `closed`; `dependentRequired` with `decidedBy`). `write-item.schema.json` gains the
inline `append` branch (`n` nodeRef, `text` nodeBody, `base`, `key`). OpenAPI 1.9.0 (`write_board`
and `act` descriptions name `append` and reject); `npm run gen` run.

**Action layer.** `ACTIONS.reject` (person, `onItem`, no status, no reply word); `ACT_SCOPES.reject`
= `onCards`. New `packages/actions/src/proposals.ts` (internal): `endProposal`, `closeProposals`,
`standing` ('open' | 'stale' | undefined), shared by the fold, `act.ts` and `conditions.ts`.
`act.ts` `proposalProblems`: not on this card, already decided, action mismatch ("proposal 812 is to
drop; accept it with drop, or reject it"), stale accept; reject of a stale one allowed. Fold: `reject`
ends its proposal (`rejected`, status unchanged, not in the item log); `ack`/`drop` closes every open
proposal on the card (`accepted` for the named one, else `closed`); `seeCards` raises `seen` for every
card an act names (`n` or `nodes`), except `send` and container acts. `fold.ts` is 299 lines.

**Conditions.** `item.awaiting` (both, card; `awaitingPark`, which `owedOn` now calls),
`proposal.open` and `proposal.stale` (person, card + strip; `proposalsAt`), `item.unseen` now both,
shown on the card, `trueWhen` names the page's `ver > max(seen, 1)`; its derive is unchanged.

**Server.** `ledger.ts` `check` runs an act's rules before the context check, so the person gets the
plain words (the old index message stays as ledger integrity). `write-board.ts` `appended` turns an
`append` into the `node` line (latest version, or on a retry the version before the keyed line, so a
replay hashes the same; `invalid` at `/n` for an unknown node and at `/text` over 8000), then the usual
replay, `base`, board and grant checks; 242 lines.

**Tests.** New: `packages/actions/tests/proposals.test.ts` (act rules, fold outcomes, implicit seen),
`apps/board/tests/api-proposals.test.ts` (append joins/no body/replay/conflict/stale base/no
grant/unknown/too long; reject over HTTP; stale accept and decided refused 422 with the plain words).
Extended: schema cases (v10 lines, `reject` valid and four broken), api-schemas (`append` valid and
broken), conditions (three row cases), references (`act:reject`), format ledger (stale reject valid).
Changed expectations: v9 → v10 literals; `list_open` item `d` is no longer `unseen` (its `later` saw
it, api.md 94); ledger-store's stale accept now reads the plain message; openapi 1.9.0.

**Docs.** api.md 93-96; skill notes (`append`; propose again after an edit; reject); actions README.
`npm run map`: no change (proposals.ts is internal).

**Over real MCP** (stdio caller and scratch project in the session scratchpad, server on port 4793
stopped by PID): `append` gave ver 2 with "First finding.\n\nSecond finding.", its retry `replayed`;
after another append, accepting the ver-2 drop proposal answered 422 "proposal: 1 changed after this was
proposed; ask the agent to look again"; reject 201, `show_node` outcome `rejected`.

**Gates (all exit 0):** `npm test` (672 + 6 pass); `npm run check`; `npm run verify` (0 warnings);
`npm run gen -- --check`; `npm run test:pages` (185 passed, no screenshot changes).

## On Completion

Fill in notes, update your row, append your own LOG line (`[board-actions] BE_01: …`).
