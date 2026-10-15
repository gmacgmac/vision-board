# The answer model: ✓ and ✗ are tools, a note never answers - Plan

> **Status Doc**: [TASK-STATUS.md](./TASK-STATUS.md)
> **Created**: 2026-10-15
> **From**: maintainer, 2026-10-15, reviewing the multi-bot build board (another project) with
> the agent that drew it (chat 18-45; go to plan: "45 ok, include 41A"; answers 50-53) · **Go to build**: given 2026-10-15 ("just start building")

---

## Problem Statement

What the person's clicks mean is muddled. A note that was really a question closed a decision
(cards 23 and 68 on that board). A finding reads "Open" with nothing the person can do about it
(card 25). ✗ is called "Drop" and strikes the card through, as if it were thrown away. More
context is a second way of writing a note. A card stayed ticked after the agent answered a question
on it, so the new ask had nowhere to go (card 20). And the agent reads every click: ✓ followed by a reopen two
seconds later (cards 40 and 75) reached it as indecision.

---

## Current State

- **A note answers a card.** `DECIDED` = acknowledged, dropped, commented
  (`packages/actions/src/registry.ts` `DECIDED`); `NodeType.answer` says "✓, ✗ or a comment
  decides it" (`packages/format/src/node-types.ts`). Accepted in D-040.
- **✗ is "Drop".** Label `Drop`, status `dropped`, reply word `drop` (`registry.ts` `ACTIONS.drop`).
  The agent reads a plain "no" only on a question (`action-words.ts` `MEANINGS`); an action's ✓ reads
  "done". The card fades to 0.55 and its title is struck through (`packages/ui/src/node/node.css`,
  `vb-node[data-status='dropped']`).
- **Every numbered card shows a status word.** `isItem(n)` is "has a number"
  (`packages/ui/src/node/node-core.ts` `isItem`), and since D-040 every card has one, so `statusWord`
  reads "Open" on a finding. The header count already filters by kind (`board-state.ts` `counts`
  uses `NODE_TYPES[kind].answer`); whether card 25 was in the header's "1 open" is not established.
- **Five buttons on a card that asks**: `ANSWER_ACTIONS` = ack, drop, comment, context, later; three
  on the rest, `NOTE_ACTIONS` = comment, context, later (`node-types.ts`).
- **Pressing the lit button already clears it**: `apps/board/src/board/item-acts.ts`
  (`createItemActs`) records `reopen` when the pressed action matches the status. That is 41A
  already, and the likely source of the two accidental reopens (a double press).
- **The agent reads every act.** `check_responses` shows each act "as written, once"
  (`packages/actions/src/pending.ts` `asReported`), sorted by card but keeping click order
  (`response-order.ts`: "Acts at one place stay in the order made"). Note edits are already folded
  into their note, the precedent for folding decisions. The Send carries every answer line since the
  last Send (`unsent.ts` `foldUnsent`).
- **After the agent answers a note, the card keeps its old ✓ or ✗.** Status comes from the person's
  acts only (`notes.ts` `itemOf`: last action wins); an agent's `reply` or `append` never changes it.
  So a card ticked, then questioned, then answered still reads ticked: card 20 (maintainer, 50).

---

## Rulings (maintainer; do not reopen)

1. **✓ and ✗ are tools, not meanings** (maintainer, 51: "we're just giving the tools"). The board
   never says what they mean; the agent decides from the card it wrote (agents already write
   "✓ keep · ✗ rename it now"). The person reads "Check" and "Cross" as the buttons' names and
   tooltips; the card shows the lit ✓ or ✗ in its state colour and no status word; the accessible
   name says "checked" or "crossed". The agent reads `action: "check" | "cross"` in
   `check_responses`, mapped at the API edge, and `12 (decision): ✓` in the numbered reply and Send
   message. `MEANINGS`, `means` and the words yes, no, done, acknowledge and drop go from everything
   a person or agent reads. The stored names `ack`, `drop`, `acknowledged` and `dropped` stay
   internal: no ledger change, no migration.
2. **The board says "answered", never "decided".** Header: "N open · N answered · N later";
   "Hide decided" becomes "Hide answered"; `counts` returns `answered`.
3. **✗ no longer fades or strikes a card through.** It looks like ✓: the lit mark in its state
   colour. Remove both `data-status='dropped'` rules in `node.css`.
4. **Cards that only inform** (finding, risk, topic, note) show no status word, carry none in
   their accessible name, and never count. `statusWord` and `nodeLabel` read
   `NODE_TYPES[kind].answer`, not `isItem`. A unit test proves `counts` leaves a finding out.
5. **One way to write back: a note.** The More context button and its key `m` go from cards,
   containers and the selection bar. `ANSWER_ACTIONS` becomes ack, drop, comment, later;
   `NOTE_ACTIONS` becomes comment, later. `context` stays in the format, so old lines still read and
   validate, and the page stops writing it. The server keeps accepting it, so no ledger version
   changes. An old `context` note reads as a note everywhere.
6. **A note never answers a card; only ✓ or ✗ does.** `DECIDED` and `CLOSED` become the same set:
   acknowledged, dropped. A card with a note is still open and still owed. No migration work for old
   boards (maintainer, 52: "not worried about old cards"): the rule is simply read on every line.
7. **The agent's answer clears the card** (maintainer, 50: "then it's a fresh thing"). When the
   agent answers the person's latest note on a card (a `reply` naming it, or an `append` after it),
   any ✓, ✗ or Later made before that note no longer counts: the card is open, unmarked, and shows as
   updated until the person has looked at it. Worked out in the fold from the agent's line; nothing
   is written for the person. Reuse the attention marker a new version already gets; add no new
   pattern. While a note waits for the agent, the footer says "Commented" as now. A unit test with
   card 20's sequence (✓, note, agent reply) comes first.
8. **Pressing a lit ✓ or ✗ clears it** and the card is open again (today's `reopen`, kept). The
   toast says "12 cleared". Pressing ✗ while ✓ is lit switches straight to ✗. A second press of the
   same button within 400 ms is ignored, which stops a double click from undoing itself.
9. **The agent gets each card's current answer, not every click.** `check_responses` and the Send
   message report, per card, only its latest ✓, ✗, clear or Later after the cursor, folded the way
   note edits are folded now (`pending.ts` `asReported`). When that leaves the card as it was at the
   cursor (✓ then cleared, both after it), nothing is reported for it. `foldUnsent` does the same: ✓
   then cleared before a Send leaves nothing to send. Notes are still reported one by one. The ledger
   keeps every click (D-017 unchanged).
10. **The skill** teaches: ✓ and ✗ are the person's two marks on a card that asks, read in the light
    of what the card asks; the skill does not require spelling out their meaning on each card
    (maintainer, 2026-10-15: "we would be able to infer"; how much to say is settled in T_01); your answer to a note clears the card, so ask again in it when you
    still need a ✓ or ✗; a note may be a question, so answer it
    with a `reply` or `append` and leave the card open; a note never settles a card; one decision per
    card; say where a card applies (page, screen, file) when the context needs it; no rule on card
    length (maintainer, 34/44: "we'll deal with that on an agent project basis").
11. **Consolidating a container** (43A, skill only): when every card that asks in a container is
    answered, the agent may draw one `decision` card proposing to consolidate it. On ✓ it writes one
    summary card (the problem, what was decided, where it landed) and retires the cards it replaces.
    Retired cards stay reachable through the container's "N cards retired" marker, which opens the
    version where they last appeared (`apps/board/src/board/retired.ts`, retiredMarker flag; 43B).
    The skill rule "Consolidation is the person's call. Never distil, merge or retire cards on your
    own" becomes "only after the person's ✓ on your proposal".
12. **Contract and record.** OpenAPI version bump, minor or major by `api.md`'s rule (`action` now
    reads `check` / `cross`; `means` goes) (`packages/format/schema/openapi.json`); the MCP
    instructions (`packages/mcp/src/info.ts`) and tool descriptions regenerated (`npm run gen`); a new
    `api.md` section; D-045 appended (approved, 53; text below).

### Answered at plan review (maintainer, 50-53)

- Card 20: the agent's answer clears the card (ruling 7). No ledger path needed.
- No meaning on ✓ and ✗ (ruling 1), replacing my "Yes"/"No" pick.
- Old boards: no migration work (ruling 6).
- D-045's text: approved (53), as amended below for 50-52.

### D-045, approved text (appended to `docs/decisions.md` by BE_01)

```
## D-045 ✓ and ✗ are tools, and only they answer a card
- **Date**: 2026-10-15 · **Status**: Accepted · **From**: maintainer (chat 18-53)
- **Decision**: On a card that asks, ✓ and ✗ are the only answers, and the board gives them no
  meaning: the card the agent wrote says what each one means. The board says "answered", never
  "decided". A note never answers a card, and the More context button is removed: a note can ask.
  The agent's answer to a note clears the card's earlier ✓ or ✗. Pressing a lit ✓ or ✗ again clears
  it. An agent reads each card's current answer, not every click; the ledger keeps every click.
  Supersedes the part of D-040 that let a comment decide and gave every card that asks a More
  context button.
- **Why**: notes that were questions closed decisions; ✗ read as "thrown away"; a ticked card stayed
  ticked after the agent changed what it asked; a finding read
  "Open" with nothing to do; an agent read a quick ✓ and clear as indecision.
- **Rejected**: treating a note that ends in "?" as More context, a guess the person can't see.
- **Task**: cortex-tasks/board/2026-10-15_board-actions_answer-model/PLAN.md
```

---

## Proposed Solution

One contract change in the action layer, then the page and the skill in parallel against it.

### Key Changes

1. **Action layer and contract (BE_01)**: rulings 1, 2, 4 (the count test), 5, 6, 7 (the derived
   state), 9, 12, and D-045. Ledger unchanged.
2. **Page (FE_01)**: rulings 1-5, 7 (the display), 8, with gallery entries and page tests.
3. **Skill (T_01)**: rulings 10 and 11, tested against the scenarios before release (rule 17).
4. **By hand (VERIFY_01)**: Claude Code and Kiro each run one round on a scratch project.

---

## Dependencies

- BE_01 first: FE_01 and T_01 read what it changes (shared foundations in TASK-STATUS.md).
- FE_01 and T_01 touch separate files and run in parallel.
- No new packages.

---

## Out of Scope

- Images on cards (maintainer: after everything else).
- The "what's new" navigation (chat 1-3, 28) and the visual polish (chat 4-10, 33): their own tasks.
- Board support for consolidating beyond the skill rule (a proposal kind, a container history view).
- Renaming the stored action ids or statuses (a ledger migration for words nobody sees).

---

## Risks & Considerations

| Risk | Mitigation |
|------|------------|
| Ruling 6 reopens cards on existing boards | Accepted (52); nothing is lost |
| Ruling 7 clears a ✓ the person still meant | The agent asks again in its answer (skill, ruling 10); one press sets it back |
| Folding answers hides a change the agent had already read | Fold only acts after the cursor; compare with the card's status at the cursor (ruling 9) |
| Agents built on the old words (`ack`, `drop`, `means`) | The version bump and regenerated tool descriptions; the MCP instructions say it once |
| The 400 ms guard swallows a real second press | Same button only; ✗ after ✓ always goes through |

---

## References

- `docs/decisions.md` D-017, D-040, D-044
- `docs/specification/api.md` (sections "Ledger v11: the kind decides", "A note locks once it is answered")
- `packages/actions/src/registry.ts`, `notes.ts`, `pending.ts`, `unsent.ts`, `action-words.ts`, `board-state.ts`
- `packages/format/src/node-types.ts`
- `packages/ui/src/node/node-core.ts`, `node.css`, `node-template.ts`
- `apps/board/src/board/item-acts.ts`, `toolbar-counts.ts`, `key-help.ts`, `retired.ts`
- `skills/vision-board/SKILL.md`
