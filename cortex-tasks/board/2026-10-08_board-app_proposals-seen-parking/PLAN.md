# Proposals, seen, parking, append and replies on the board - Plan

> **Status Doc**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Created**: 2026-10-08 · **Tracker**: U1 (board-v3 PLAN item 5), U3 step 3 · **Mockup**:
> `prototypes/board-v3-design/mockups/03-proposals-and-seen.html` · **Decisions**: D-018, D-020,
> D-033, D-034 · **Agreed**: chat 218-235 (maintainer, 2026-10-08)

## Problem Statement

The ledger already records an agent's proposals, park bundles and replies, and the person's seen
marks, but the page shows none of them. A proposal can be accepted but not rejected, and nothing
stops accepting one made against an older version. An agent that wants to add to a card must
rewrite the whole card. A card the agent changed looks the same as one it didn't.

## Rulings (maintainer, 2026-10-08; do not reopen)

1. **Edits apply at once (D-018 unchanged).** An agent's edit to a card is a new version, shown
   straight away. Only closing a card (acknowledge or drop) is a proposal the person decides, e.g.
   the agent read an email and proposes "Drop 47: the client declined". Every version stays
   readable (the board's version dropdown, and each card's own steps, ruling 6).
2. **A proposal is a tab plus a box beside the card.** A PROPOSAL tab on the card's bottom edge;
   hovering or focusing it previews a box beside the card (the note preview's shape), clicking or
   Enter opens it with Reject and Accept. The card never changes size. Build the box as a general
   pattern: later it will carry content-change proposals and proposals from agents that may read a
   board but not write on it (new tracker row). Only acknowledge and drop are built now.
3. **Out of date.** A proposal made on version 3 of a card can't be accepted once the card is at
   version 4: the box says "47 changed after this was proposed. Ask the agent to look again." and
   Accept is `aria-disabled` with that reason. Reject still works (it clears it).
4. **The server checks again** (the page can be behind: two windows, two computers). Accepting
   an out-of-date proposal, or answering an already-decided one, is refused with a plain message.
   Acknowledge or drop on the card, through a proposal or not, closes every open proposal on it.
5. **The bar above the board** (the requests strip's place) counts open proposals on the open
   board: "3 proposals from the agent · 1 out of date", Review (focus the first) and Accept all,
   which first lists exactly what it will apply and names any it skips and why.
6. **Changed cards (mockup Part B, Option B).** A card whose latest version is newer than the one
   the person last saw, and is past version 1, carries an "N updates" tab. Clicking the tab expands
   the card in place by one section per step: version, when, who, and change chips (+ added,
   ~ changed, - removed, per field); Next steps on, each step marks that version seen, the last
   says "You're up to date" and the tab goes.
7. **Seen = selected or touched** (maintainer 232). Selecting a card (click, keyboard, lasso)
   marks its latest version seen. Any act on a card (note, acknowledge, drop, later, size, move,
   pin) counts as seeing it too. Tabbing past or hovering does not. Send does not clear the tabs.
   Never while a past version shows.
8. **Parking.** A card in Later whose handover is still owed says "Awaiting" in its footer; its
   hover tip says "Awaiting context". Once the agent writes the bundle, a Handover tab opens it in
   the same box beside the card: situation, background, assessment, recommendation, sources.
9. **Append** (maintainer 223). A new write item `append { n, text }` adds text to the end of the
   card's body as a new version, so an agent adds information without rewriting the card. It
   shows as "+ added" in the change chips. `reply` stays the answer to one of the person's notes.
10. **Replies on the page.** An agent's reply shows under the note it answers (`to`), on a card or
    on a container note; a reply with no `to` shows under the card's notes.
11. Every new check is a row in the conditions table (D-033); every new behaviour is behind a
    feature flag, on by default; contract first (rule 6).

## Solution Overview

- **BE_01, contract and rules (packages/format, packages/actions, server):** ledger v10 adds a
  person `reject` act naming a `proposal`; `validateAct` gains the proposal rules (ruling 4); the
  fold closes proposals on acknowledge or drop and counts any person act on a card as seeing its
  latest version (ruling 7); `append` write item (stored as an ordinary `node` version); new
  conditions rows; OpenAPI 1.9.0; `npm run gen`; api.md points 93 on.
- **FE_01, proposals on the page:** the card popover pattern (shared), the PROPOSAL tab, the
  proposals bar with Accept all.
- **FE_02, changed cards:** seen on select, the "N updates" tab, the in-place stepper with change
  chips (`versionChanges`, pure).
- **FE_03, parking and replies:** "Awaiting", the Handover tab and box, agent replies under notes.
- **VERIFY_01:** the orchestrator, by hand, over real MCP and the page.

## Key Changes

| Area | Change |
|---|---|
| Ledger | v10: `reject` act with `proposal` (accept stays the proposal's own action with `proposal`) |
| API | `append` write item; `act` takes `reject`; OpenAPI 1.9.0 |
| Actions | proposal rules in `act.ts`; fold: proposals closed by decisions, implicit seen; conditions rows `proposal.open`, `proposal.stale`, `item.awaiting`; `item.unseen` shown on the card |
| UI | card popover (`packages/ui/src/node/`), tabs on the bottom edge, stepper section, replies |
| Page | proposals bar, seen on select, flags `proposals`, `cardUpdates`, `handover`, `cardReplies` |

## Dependencies

None new. Page tests share ports, so the FE tasks run one after another.

## Out of scope (tracker)

- Content-change proposals and proposals from read-only agents (new tracker row, ruling 2).
- A NEW tab on a card the agent added after the board opened (cards at version 1 carry no tab;
  the "agent drew" toast announces them). Raise at VERIFY if missed in use.
- Branching from a parked item (D-020), rewind (N23), delete (N24).

## Success Criteria

- [ ] An agent's proposal shows on its card; Accept applies it, Reject clears it; out of date
      can't be accepted, on the page or by the server
- [ ] Accept all lists what it applies and skips
- [ ] A changed card shows "N updates", steps through them, and selecting it clears the tab
- [ ] A card in Later says "Awaiting" until the handover is written, then opens it
- [ ] `append` adds to a card's body; replies show under their notes
- [ ] The five gates exit 0
