# FE_02_changed-cards: Changed cards and seen

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (rulings 6, 7,
> 9) · **Mockup**: `03-proposals-and-seen.html` Part B, Option B · **Model**: Opus 5.5 · **Needs**:
> BE_01, FE_01 (bottom-edge tab slot)

## Objective

A card the agent changed since the person last looked says so, lets them step through each
change, and stops saying so once they select or touch it.

## Rulings (do not reopen)

1. **N UPDATES tab** in FE_01's bottom-edge slot, from the `item.unseen` condition, shown only
   when the latest version is above `max(seen, 1)`: "1 update", "3 updates". Colour as the
   mockup (`--warn` family).
2. **Seen on select.** Selecting a card (click, keyboard, lasso; the selection module,
   `selection.ts`) sends `mark_seen { n, ver }` for its latest version when that is unseen.
   Acts on a card already count (BE_01 fold), so send nothing extra for them. Hover and tabbing
   past send nothing. A lasso of many cards sends one call per unseen card through the sender,
   in order. Never in a past version.
3. **The stepper** (Option B): clicking the tab (not a selection) expands the card in place by
   one section for the first unseen version: "v5 · Wed 30 Sep, 15:40 · <agent label>", change
   chips, and for a text field what was added or changed (short; body changes as the added text
   for an append, else "body rewritten"). The footer becomes "Update 2 of 3 · Back · Next". Each
   step shown marks that version seen. After the last: "You're up to date", which fades, and the
   tab goes. Esc collapses. The card is measured again only when it expands or collapses
   (rule 15: one card, nothing else rebuilt).
4. **`versionChanges(prev, next)`** in `packages/actions/src/changes.ts`, pure, unit-tested: per
   field (title, body, tags, kind, item, size, container) `added`, `changed` or `removed`, and a
   body that starts with the previous body is `added` with the added text. Chips read it.
5. Flag `cardUpdates` (on). Off: no tab, no seen on select.

## Steps

1. [x] Failing tests first: `versionChanges` cases; node-core state (`updates`); page tests
   (`tests/pages/card-updates.spec.ts`): an agent `append` makes "1 update" appear live; stepping
   shows "+ body" and the added text; the tab goes at the end; selecting a changed card clears it;
   a version-1 card has no tab; Send leaves tabs; keyboard only; axe light and dark.
2. [x] Build the tab, seen on select, the stepper section, gallery entry, flag.

## Validation

- [x] The five gates exit 0. Look at a card mid-step, light and dark.

## Constraints

- If deviation is needed, stop and say so; no silent breaking changes. No PII in examples.
- No git commits or stash. Scratch in the system temp folder. Stop only your own processes.
- Fill Implementation Notes below, your row in TASK-STATUS.md, and your own LOG line.

## Implementation Notes

**Status**: Completed 2026-10-08

**Changes (`packages/actions`).** `changes.ts` `versionChanges(prev, next)` (front door): per field in
a fixed order (title, body, tags, kind, item, size, container) `added`, `changed` or `removed`; a body
that starts with the previous one is `added` with the added text; the title carries what it now reads.

**Card (`packages/ui/src/node`).** `CardConditions.updates` (`CardUpdates`: `count`, and while open
`steps` + `at`); `CardStep` (ver, when, agent, changes); `updatesView` gives the tab ("3 updates",
"... since you last looked. Show them / Hide them"), the step (section name "Update 2 of 3, v5", head
"v5 · when · agent", chips "+ body" / "~ title" / "- tags", lines: "Title: ...", the added body cut at
160, "Body rewritten", or "Drawn again with no change") and "You're up to date" (tab gone). Card name
adds ", 3 unseen updates" or ", showing update 2 of 3". Template: the updates tab after the popover tabs
in `bottomTabs` (aria-expanded, aria-controls the section), `.vb-node-steps` in the content under the
tags (role region, aria-live polite), `.vb-node-stepnav` in the footer (count, Back, Next as
`vb-pop-btn`); `stepMarkup`. `VbNode.updateSteps` (section rebuilt only when its step changed;
`data-stepping` swaps the footer for the stepper; Back aria-disabled on step 1). Styles in
`node-steps.css` (imported by the board and the gallery). `pattern.json`: states updates, stepping,
up to date; parts, attribute, event, accessibility.

**Page.** `pageConditions` gains `unseen` (`item.unseen`); `attention.unseen()`. `updates.ts` (pure:
`unseenCount` past `max(seen, 1)`, `unseenSteps`, `seenMarks`). `update-flow.ts`: counts before each
draw (`refresh`), card facts merged with the proposals' in `controller.ts` (`facts`), its own stage
click (tab, Back, Next) and Esc listeners (Esc in an open card folds it and stops keys.ts clearing the
selection), seen on select through `selection.onChange` plus `pick` (a click on a card already
selected), each step shown marks its version seen, the stepper keeps the steps it opened with (the
count holds while the condition ends), "You're up to date" then folds after `UP_TO_DATE_MS` (2.2 s; CSS
fades it unless reduced motion). Nothing while a past version shows (open steppers are dropped).
`io.ts` `markCardSeen`; `sender.ts` `seen(marks)` sends in order and draws once (shares `held` with
`run`). Flag `cardUpdates` (on). `controller.ts` 300 lines.

**Interpretation, for the maintainer to confirm.** Seen on select follows the condition `item.unseen`
literally (latest > seen), so selecting a never-seen version-1 card also sends its seen line (the tab
itself shows only past version 1). This keeps the agents' `item.unseen` true to ruling 7. The
containers page test that said a lasso "writes nothing" now allows the card seen lines it sends.

**Two bottom tabs (small layout change in FE_01's slot, `node-popover.css`).** With a proposal tab and
"N updates" on one card the second tab reaches under the footer's buttons, and axe's target-size
(WCAG 2.5.8) failed in FE_01's own axe test. With two tabs or more the footer's buttons rise 3px to its
top and the tab row drops 2px (tab centre 13px from the buttons, measured), so the card keeps its size
and the row stays clear of the card below (GAP 24). Hanging the row lower alone would have touched the
next card's number tab.

**Measured once per card, per step.** Opening, each step and folding go through the usual draw: only
that card's state changes, so only it is updated and measured, and only its container is laid out
again (and only when its height changed). A step's height can differ, so it is measured per step too.

**Contrast (APCA-W3 0.0.98G-4g, by script, light / dark).** Tab `--vb-state-context` on its soft 53.5 /
59.8 (label); chips: added `--vb-state-ack` on its soft 58.0 / 55.0, changed 53.5 / 59.8, removed
`--vb-state-drop-fill` on `--vb-state-drop-soft` 61.1 / 57.6 (plain `--vb-state-drop` is 44.6 in dark,
so the fill is used); step text `--vb-ink` on the step box 89.1 / 70.1 (reading); "Update 2 of 3"
`--vb-state-context` on the card 62.6 / 62.9; "You're up to date" `--vb-state-ack` on the card 67.7 /
57.7 (label). No new token.

**Tests.** `packages/actions/tests/changes.test.ts`, `packages/ui/tests/node-updates.test.ts`,
`apps/board/tests/updates.test.ts`, a changed-cards case in `gallery-fixture.test.ts`;
`tests/pages/card-updates.spec.ts` (13: live append, stepping with seen lines and fold, select clears,
lasso, Send and tabbing leave tabs, keyboard only, past version, flag off, axe light/dark, gallery,
screenshots). Changed: `node-template.test.ts` and `node-proposal.test.ts` regexes (the slot and
footer hold the new parts), `containers.spec.ts` (above). Gallery: board `updates` (seq 213-227; three
changed cards, one with an out-of-date proposal), `updates-section.ts`.

**Screenshots.** New: `card-updates-{light,dark}`. Updated on purpose: `gallery-{light,dark}` (only the
node section's states line, now ending "updates, stepping, up to date"); the full-page gallery
screenshot runs with `-cardUpdates` too.

**Gates (all exit 0):** `npm test` (703 + 6); `npm run check`; `npm run verify` (0 warnings, map
regenerated); `npm run gen -- --check`; `npm run test:pages` (211 passed).

## On Completion

Fill in notes, update your row, append your own LOG line (`[board-app] FE_02: …`).
