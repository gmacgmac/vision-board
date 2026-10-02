---
category: board-format
type: plan
status: approved
tracker: cortex-tasks/tracker.md#U3
created: 2026-10-02
scope: Node identity, lifecycle, the board API and parking — how agents and people share one board over a long conversation
---

# Node ledger and board API: plan

> **Status Doc**: [TASK-STATUS.md](./TASK-STATUS.md)
> **Created**: 2026-10-02 · Design agreed in chat (maintainer, 2026-10-02, points 1–66 and the
> "seen" follow-up). Not yet built. Decisions D-017 to D-021 accepted 2026-10-02.

---

## Problem Statement

Chat is linear and the board is not. A person refers to "47" hundreds of thousands of tokens
later, in another chat, or after a compaction, and the agent must know exactly which item that
is, what state it is in, and what it still owes. Today nothing makes the agent respond to every
item the person flagged, and nothing carries a parked item's context forward.

---

## Current State

- Item numbers are unique per board session only (`packages/format/src/view.ts`, `ViewNode.n`).
- The transcript records only the person's actions (`packages/format/src/transcript.ts`,
  `ACTION_IDS`); there is no record of the agent's response to an item.
- `replyText` (`packages/actions/src/reply.ts`) writes "N word: note" plus "Still open".
- The agent writes whole view files by hand; there is no API, no lookup by number, no check
  that every flagged item was answered, and no parking bundle.

---

## Proposed Solution

One project ledger holds every node's identity and history. One API, used by people, agents
and the chat alike, reads and writes it, and answers every write node by node.

### Key Changes

1. **Identity (D-017).** Numbers are per project and never reused. A project is any folder
   holding a `.visionboard/` data folder; git is not required. The server assigns numbers, so
   several agents never both pick 47. The container is a property of the node, never part of
   its ID, because cards move between containers (D-011) and an ID never changes (rule 10).
2. **Ledger (D-017).** An append-only JSON Lines file, one readable event per line, written only
   through the single I/O layer (rule 7). Current state is folded from it on load. The server
   applies writes one at a time, so many agents can share a board. SQLite stays a swap behind
   the same module if size ever demands it.
3. **Versions (D-018).** Every agent update to a node is a new version. Nothing is overwritten.
4. **Lifecycle (D-018).** Closing states (acknowledged, dropped, decided) are set only by a
   person's click (rule 8). Pending states (commented, needs context, parked) mean the agent
   owes a response. Accepted items leave the board's open set but stay queryable.
5. **Proposals (D-018).** An agent may propose a change ("drop 47: client declined"), for example
   from an email pasted into chat. The node shows a proposal marker (a token) with a one-line
   reason. The person accepts all, rejects all, or decides node by node, using the existing ack
   and drop actions. Accept all shows the count and list first. A proposal made against an older
   version is marked out of date and cannot be accepted. The record keeps who proposed, the
   source, and who approved.
6. **Seen (D-018).** Each node tracks the latest version the person has seen. Interacting with a
   node marks it seen. A node updated since the person last saw it shows an "N updates" badge;
   clicking it steps through each unseen version, with its changes highlighted, ending on the
   latest and marking it seen. `open` reports updated-but-unseen nodes so the agent never
   assumes the person read a change. This absorbs the Changed/New badges in tracker M1.
7. **Board API (D-019).** One API, three ways in: HTTP on the local server (where the data
   lives), an MCP server wrapping it so any agent with tools can use it, and the `vb` command.
   Every call names the calling agent, so an orchestrator and its sub-agents can share a board.
   Calls:
   - `check`: the person's new responses since the last check, as number, state and note.
   - `write`: create or update nodes, singly or streamed. Each node is validated and answered on
     its own ("47 ok, 52 rejected: no title"); one bad node never rejects the rest.
   - `show N [--linked]`: every version of N, the person's notes, the agent's replies, its
     container, and with `--linked` the nodes it links to, by number.
   - `open`: everything still pending or unseen. The first call after a compaction.
   - `propose`, `park`: points 5 and 9.
8. **Reaction check (D-019).** Every `write` ends with the pending items the agent has not yet
   responded to ("you didn't respond to 52, 58"). It informs, it never fails the write. The
   agent may also update nodes the person did not flag, but never close or reopen one.
9. **Parking bundle (D-020).** Parking an item obliges the agent to write a handover bundle so it
   can be picked up a week later in a new chat: situation, background, assessment,
   recommendation (the hospital handover shape), plus sources. The item stays pending until the
   bundle is written. **Branch from N** starts a new board or chat seeded with N's bundle and its
   linked nodes' bundles only, not the whole conversation.
10. **Live drawing (D-019).** Each node appears as soon as it passes validation, so the person can
    review while the board is still being drawn. Layout gains an incremental mode: nodes
    already on screen keep their place as new ones arrive.
11. **Decision flow mode (D-021).** A layout mode that draws one item's history as a timeline:
    the request, the key points, each version, the person's decision with its time, the work
    the agent did, and short notes. It reads the ledger, so it needs no extra data.

---

## Drafted decisions (exact wording for the register, needs the maintainer's yes)

- **D-017 Project ledger and node identity.** Node numbers are assigned by the server, per
  project, once, and never reused. A project is any folder holding `.visionboard/`. The
  container is a node property. History is an append-only JSON Lines ledger behind the single
  I/O layer. *Why*: "47" must mean one thing across chats, compactions and agents. *Rejected*:
  container-prefixed IDs (break on every move); per-board numbers (renumbering later would
  repoint old references); SQLite now (not readable or diffable).
- **D-018 Versions, lifecycle, proposals and seen.** Every agent update is a new node version.
  Only a person's click closes an item; agents propose, people accept or reject. A node shows
  unseen versions until the person steps through them. *Why*: keeps rule 8 while letting the
  agent do the legwork, and the agent never assumes a change was read. *Rejected*: letting a
  chat instruction close items directly (an agent deciding for the person).
- **D-019 One board API.** HTTP, MCP and `vb` are three doors to one API. Writes are per node,
  streamable, answered per node, and end with the reaction check. Every call names its agent.
  *Why*: any agent, any tool, many agents at once, with feedback instead of silent file edits.
  *Rejected*: agents hand-editing JSON files; all-or-nothing writes.
- **D-020 Parking bundles and branching.** A parked item stays pending until its bundle is
  written. Branching carries only chosen bundles. *Why*: context survives a week and a new chat
  without forking a whole conversation. *Rejected*: forking the full conversation.
- **D-021 Decision flow layout mode.** Draws one item's ledger history as a timeline, behind a
  feature flag (rule 12). *Why*: a lasting, readable record of how a decision was reached.

---

## Build order (each step needs the maintainer's go)

1. Format first: ledger event schema and node versions, format version 2, fixtures and
   validator updated.
2. Ledger module in the I/O layer, with the fold, number assignment and serialised writes.
3. API over HTTP plus `vb check | write | show | open`. Replaces board v3 Stage 4's `vb wait`.
4. MCP wrapper over the same API.
5. Board UI, after `<vb-node>` exists: proposal markers and accept-all, the seen badge and
   stepper, the park form, branching.
6. Incremental layout and the decision flow mode.

Board v3 order becomes: this design accepted → step 1 here → `<vb-node>` (it draws the states
and actions D-018 defines) → the rest of board v3, with Stage 4 folded into steps 2–3.

---

## Open questions (settled 2026-10-02)

- **Board versions are positions in the ledger, not files.** Each event has a sequence number,
  so "version 5 of the board" is the ledger read up to a point, like a checkpoint. There are no
  separate stored `view-vN.json` files. Test fixtures (rule 11) are small ledger files in the
  same format. Forking a board is out of scope.
- **Seen: per person**, built for one person now. When there is only one person, the agent is
  told nothing about people (D-018, D-019: the agent-facing surface stays minimal).

---

## Out of Scope

- Global (cross-project) IDs; a display prefix can be added later without renumbering.
- Hosting and accounts (tracker L3).
- Building anything before the decisions are accepted.

---

## Risks & Considerations

| Risk | Mitigation |
|------|------------|
| The ledger grows without bound | Fold is milliseconds at thousands of events; snapshot or SQLite swap behind the I/O layer if ever needed |
| Two agents write at once | The server serialises every write; agents never touch the file |
| Accept all closes something unseen | Count and list before applying; out-of-date proposals cannot be accepted |
| Live drawing makes the board jump | Incremental layout keeps placed nodes still (step 6) |
| Rule 8 erodes through proposals | Only a person's ack, drop or decide closes an item |

---

## References

- `docs/decisions.md` (D-005, D-010, D-011, D-013, D-015, D-016)
- `.kiro/steering/vision-board-proj.md` (rules 7, 8, 9, 10, 12)
- `packages/format/src/view.ts`, `packages/format/src/transcript.ts`
- `packages/actions/src/reply.ts`, `packages/actions/src/reduce.ts`
- `cortex-tasks/board/2026-10-01_board-v3/PLAN.md`

---

## Success Criteria

- [ ] D-017 to D-021 accepted in the register
- [ ] "47" resolves to the same item from any chat, after compaction, and for any agent
- [ ] `check` returns every pending response; `write` answers per node and lists missed items
- [ ] A parked item can be resumed in a new chat from its bundle alone
- [ ] Unseen updates are visible on the node and steppable
- [ ] `npm test`, `npm run verify` and `npm run check` pass
