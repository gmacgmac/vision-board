---
category: board-ui
status: completed
created: 2026-10-10
---

# FE_01 The page: every card numbered and answerable

> Plan: [PLAN.md](./PLAN.md) rulings 1-4, 6 · Model: Opus 5.5 · After BE_02

## Steps

1. [x] `node-core.ts` `offers` from the kind; the number on every card; ✓/✗ tooltips "Yes"/"No"
   on a question, "Done" on an action (assumption B); key help.
2. [x] Selection Comment (`selection-flow.ts` `comment`) on any selected cards, one or many; C on
   one card is its own comment as now.
3. [x] Counts in the toolbar from BE_02; card states for comment, context and later on plain cards
   (assumption C), tokens only, APCA tiers light and dark.
4. [x] Flag `everyNode` (on by default; off: numbers and buttons only on answer cards). Gallery: a
   plain card with its three actions, a group note over mixed kinds. Screenshots only after viewing
   the diffs.

## Validation

- [x] Failing page tests first (a plain card commented alone; three mixed cards lassoed and
   commented once; Yes/No tooltips; counts; keyboard; axe light and dark); the five gates exit 0.

## Constraints

- If deviation is needed, stop and say so. No PII in examples. No git commits or stash.
- Protected files (steering, `docs/decisions.md`, `tokens.css`): propose wording, never edit.
- Scratch in the system temp folder; stop only your own processes; never touch `.visionboard/`.
- One job per file, under 300 lines; tests first; fill Implementation Notes below and in
  TASK-STATUS, and append your own LOG line.

## Implementation Notes

**Status**: Completed 2026-10-10. The five gates exit 0: `npm test` (948 + 6 timing), `npm run check`,
`npm run verify` (after `npm run map`), `npm run gen -- --check`, `npm run test:pages` (314 passed).

**Built.**
- Numbers and buttons: `offers` already read the kind (BE_01), so `node-core.ts` is unchanged (it is at
  300 lines). New `packages/ui/src/node/action-words.ts` (`KIND_WORDS`, `actionWord`, `otherWords`):
  the button tooltip (`node-template.ts` `button`) reads "Yes · a" / "No · x" on a question and
  "Done · a" on an action; the accessible name keeps "Acknowledge item N (A)" and the tooltip becomes
  its description. Key help (`key-help.ts`): "Acknowledge (Yes, Done)", "Drop (No)".
- Selection Comment: already any numbered card; comments updated (`selection-flow.ts`).
- Counts: `region-core.ts` `regionState` counts only answer kinds (ruling 6); toolbar from BE_02's `counts`.
  Plain cards' comment / context / later use the existing state tokens: no new colour pair, so no new
  APCA pair (light and dark checked by eye in the gallery's tell matrix).
- Hide decided (orchestrator ruling): `pageConditions` collects `owedCards` (`item.owed`), attention
  exposes it, `decidedIds(d, owed)` keeps an owed decided card; it hides once the reply lands.
- Flag `everyNode` (`packages/format/src/flags.ts`, on): off, `numberedView` (`board-data.ts`) drops `n`
  from cards that need no answer, so they draw with no number, buttons or tabs and take no note.
  Applied in `controller.ts` `redraw` (still 299 lines).
- Gallery: `gallery.ledger.jsonl` rebuilt by kind class (cards 7, 9, 13 became topic/note samples,
  their ack/drop acts became comment/context; topic/note cells 104-108 appended; proposals 94/95 a
  decision and a question; updates 96/97 questions; "Topic: a heading for a group of cards", "Nothing
  to decide, so no count"). `node-section.ts` draws two matrices: cards that ask (3 x 6) and cards that
  tell (4 x 4); `proposals-section.ts` no longer needs a finding. Node `pattern.json` description.
- Docs: `components.md` § Every card in the conversation; node-type registry bullet names `answer`.

**Tests first.** `apps/board/tests/every-node-page.test.ts` (hide while owed, flag view),
`node-template.test.ts` (tooltips, `actionWord`), `region-core.test.ts` (count), `key-help.test.ts`,
`flags.test.ts`, `gallery-fixture.test.ts` (every kind once per reachable status), and
`tests/pages/every-node.spec.ts` (numbers and tooltips; a plain card commented by C, counted nowhere,
A and X do nothing on it; three mixed cards lassoed and commented once, one act with `nodes`; Hide
decided keeps a commented question until the agent's reply; flag off; axe light and dark).

**Existing page-test expectations changed (rulings changed the behaviour).**
- `board.spec.ts`: "16 open" -> "14 open" (ruling 6: finding 5, topic 7, risk 11 don't count);
  "2 decided" -> "3 decided" (ruling 3: the comment decides action 3).
- `move-and-later.spec.ts` :151: finding 5 in Later counts "0" later, not "1" (ruling 6).
- `proposals.spec.ts` :179: third card a decision, not a risk (proposals only on answer cards, BE_02).
- `gallery.spec.ts`: the kinds matrix test (ask/tell split, tooltips); topic and note now numbered with
  three buttons; Later sample "of 1 decided" (finding 2 counts nowhere); renamed frame title.
- The notes.spec / zoom-and-lasso / move-and-later failures BE_02 listed were a cascade of the :151
  failure leaving card 5 in Later; they pass unchanged.

**Screenshots updated (32 files, dark and light each), all viewed actual / expected / diff.**
- board: counts 14 open; region counts; finding 5 and risk 11 lose ✓ ✗; topic 7 numbered with its
  footer (taller, connectors move).
- gallery (full page): the two kind matrices, numbered topic/note, everything below moved.
- markdown, node-size, parking-replies: findings and risks lose ✓ ✗ (plus a sub-pixel move).
- card-updates: 96/97 now questions (their proposal shows), finding 98 loses ✓.
- proposals: cards 94/95 a decision and a question; reason "settle it".
- selection-pill, see-through: topic and note now numbered with their three buttons.
- key-bubble open and gallery: "Acknowledge (Yes, Done)", "Drop (No)".
- past-version: the banner names v250, the appended gallery samples' run.
- agent-access, chat, toolbar, folder-picker: content identical; the section sits at a new offset on
  the gallery page, so text renders a sub-pixel apart.

**For the maintainer.**
- With the flag off the board is not as before BE_01: findings and risks that the agent marked `item`
  now draw with no number (the contract dropped `item`); components.md § Feature flags says flag off
  means unchanged screenshots, which this flag can't meet.
- `.kiro/steering/vision-board-proj.md` terminology (protected) still says "Item: a node that needs a
  response; it has a stable number". Proposed: "**Item**: a card that needs an answer (a question,
  decision or action). Every node has a stable **number**."
