# FE_01_page: Page

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Show ✓ and ✗ as plain marks with no meaning (Check and Cross), without crossing anything out; take the More context button away; show
no status on cards that only inform; make a lit button clear cleanly; mark a card the agent's answer cleared.

## Context

PLAN.md rulings 1-5, 7 (display) and 8. BE_01 has landed: read its notes first, including the name of
the derived "answered by the agent, not yet seen" state.

## Inputs

- **Files to modify**: `packages/ui/src/node/node-core.ts` (`STATUS_LABEL` (no word for ✓ or ✗), `statusWord`,
  `nodeLabel`, `isItem` uses), `node-template.ts` (button names and tooltips), `node.css` (the
  `dropped` rules), `apps/board/src/board/item-acts.ts` (`createItemActs`: toast, 400 ms guard),
  `key-help.ts`, `toolbar-counts.ts`, the toolbar and "Hide decided" wording in `apps/board/src/shell/`,
  the selection bar and container note controls that offer More context, the gallery sections
  (`apps/board/src/gallery/node-section.ts`, `region-section.ts`).
- **Shared artifacts to reuse** (BE_01): `ANSWER_ACTIONS`, `NOTE_ACTIONS`, `DECIDED`,
  `counts().answered`, the derived answered-by-the-agent state. Button names come from the registry
  labels ("Check", "Cross"); never a second copy.
- **Patterns to follow**: the existing update marker for a changed card (`node-updates.ts`) for
  ruling 7; no new pattern.

## Steps

1. [x] **Tests first** (unit and page): a finding has no status word and no status in its name; a
   decision's buttons are named "Check" and "Cross" and no footer word follows a mark; the name says
   "checked" or "crossed"; ✗ leaves the card at full opacity, title not struck; no
   More context button or `m` key anywhere; pressing lit ✓ clears it and toasts "N cleared"; ✗ while
   ✓ is lit switches to ✗; a double click on ✓ leaves it ticked; the header reads "answered"; a
   card whose note the agent answered is unmarked, open, with the update marker until seen; keyboard and
   axe in light and dark.
2. [x] Build, in that order; gallery entries for ✓, ✗, a finding with no status, and a card the
   agent's answer cleared.
3. [x] Screenshots: view every diff before updating it; say which changed and why.
4. [x] Docs: `docs/specification/components.md` (node states), the node pattern's `pattern.json`.

## Validation

- [ ] The five gates exit 0, one after another (`npm run check`, `npm test`, `npm run verify`,
  `npm run gen`, `npm run test:pages`).
- [x] Looked at on the fixture boards (gallery and roadmap screenshots, light and dark).

## Constraints

- Project rules: tokens only (no token value changes in this task), every state, accessibility
  (WCAG 2 AA; labels and roles for Check and Cross), files about 300 lines.
- If deviation is needed, stop and say so. No git commits. Never touch `.visionboard/`; don't use the
  board on 4466. One page-test run at a time.
- Fill Implementation Notes below and append your own LOG line.

## Implementation Notes

**Status**: Completed (2026-10-15)

**What changed (page).**
- `packages/ui/src/node/node-core.ts`: `STATUS_LABEL` has no word for `acknowledged` / `dropped` (and an
  old `context` reads "Commented"); new `STATUS_NAME` ("checked", "crossed" in the name) and
  `asksAnswer(n)` (`NODE_TYPES[kind].answer`), which `statusWord` and `nodeLabel` read instead of
  `isItem`; an old More context note reads "Your note" (`KIND_WORD`). `node.css`: both
  `data-status='dropped'` rules and the `context` rules gone; the footer divider hides when no word
  follows it (`:has(+ .vb-node-status:empty)`).
- `node-updates.ts` `CardStep.reply`: the agent's reply that cleared a card (ruling 7) is one step of
  the existing "N updates" stepper ("Reply · when · who" and its words), no new pattern.
  `apps/board/src/board/updates.ts`: `unseenCount` / `unseenSteps` add that step when
  `unseenAnswer` holds and a reply (not a version) cleared the card; `seenDue` lets the card seen line
  go although that version was seen (update-flow.ts `send`), so selecting or stepping ends it.
- `item-acts.ts`: lit ✓/✗/Later pressed again records `reopen`, toast "12 cleared" (✓/✗ toasts read
  "12 ✓" / "12 ✗" from the registry reply words); ✗ while ✓ lit switches; `REPEAT_MS` 400 guard on the
  same button and card (the ignored press also restarts the window); an action the card does not
  offer (old `context`) does nothing.
- "answered" everywhere the page said "decided": toolbar chip (`shell.counts.answered`, tone
  `answered`), "Hide answered" (button, menu row, key help, toasts), container "N of M answered",
  "Everything here is answered.", `answeredIds` (was `decidedIds`). io.ts no longer lists `context` as a
  container act; note bubble: one placeholder, a new note always needs words.
- Gallery: node matrices have rows "✓ Checked", "✗ Crossed" and "Answered by the agent" (the
  fixture's 7 old `context` cards: 3 asks re-cut to ✓ + note + reply, 4 tells answered by a reply;
  `fixture.ts` `cleared`); cards that tell show no word; row gap widened so a bottom tab clears the
  next row; chat fixture words ✓ / "Still open: 2"; descriptions reworded.
- Docs: `docs/specification/components.md` § "The answer model" (and every-node items 1, 2, 4, 5);
  `packages/ui/src/node/pattern.json`, `region/pattern.json`.
- Tests: unit `node-core`, `node-updates`, `node-flag`, `node-proposal`, `node-new`, `region-core`,
  `region-template`, `note-bubble`, `apps/board` `item-acts` (new), `updates`, `every-node-page`,
  `gallery-fixture`, `key-help`, `proposals`, `flag-flow`; page `answer-model.spec.ts` (new) and every
  spec BE_01 listed. BE_01's five compile-only page edits are kept and owned.

**Decisions inside the rulings (for review).**
1. "Awaiting" (the handover still owed, FE_03) still shows on a card that only informs in Later: it is
   the agent's due, not the card's status. Say if ruling 4 should hide it too.
2. A reply to the latest note marks the card updated even when it cleared nothing (a Later made after
   the note): `unseenAnswer` is BE_01's, and the page shows it ("1 update").
3. Proposal names follow the registry labels: "Cross 47: …", "Accept: cross 47".

**Screenshots (48 baselines updated, every diff viewed light and dark).** Changed because: four
buttons, not five (every section with cards); no "Open"/"Commented"/"Saved for later" word on
finding, risk, topic, note cards; "decided" → "answered" (board header, container counts, menus, key
bubble); Check/Cross rows in the key list, no More context/M row; proposal words Check/Cross; the
node matrices' new rows and gap; chat fixture ✓. The remaining diffs in folder-picker, archive,
versions banner, agent access text lines are 1px sub-pixel text shifts from the gallery page's height
change above them, no content change.

**Not mine, reported:** `packages/actions/src/retire.ts` still says "still waits for the more context
you asked for" for an old `context` note (ruling 5: reads as a note). `npm run test:timing`
(server start, 100,000 events) runs 1.7-1.9 s against a 1,000 ms budget on this machine (load
average 7-9); the server path imports no page code. Measured: `foldLedger` on that ledger takes 143 ms
at HEAD and 1,470 ms with the action layer as BE_01 left it (same machine, same minute), so the
regression is in `packages/actions` (the new fold work), not the page.

**Gates.** `npm run check` 0; `npm test` 1 (1243 unit pass, 0 fail; `test:timing` fails only the
server-start budget above); `npm run verify` 0; `npm run gen` 0 (`--check`: current);
`npm run test:pages` 0 (432 passed, run again without `--update-snapshots`).

## On Completion

1. Fill Implementation Notes; set Status to `Completed`; update your row in TASK-STATUS.md.
2. Append your LOG line to `cortex/LOG.md` (one line, newline-terminated, append-only):
   `[[YYYY-MM-DD HH:MM]] [board-ui] FE_01: <what you did> → Task: [[cortex-tasks/board/2026-10-15_board-actions_answer-model/FE_01_page.md]]`
