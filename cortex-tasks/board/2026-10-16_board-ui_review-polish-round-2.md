---
category: board-ui
status: completed
completed: 2026-10-16
created: 2026-10-16
tracker: cortex-tasks/tracker.md#N13
---

# Review polish, round 2

> **From**: maintainer, 2026-10-16 (chat 179-197; go: "just proceed with the work") · **Model**: Opus 5.5 ·
> **Follows**: `cortex-tasks/board/2026-10-15_board-ui_review-polish/` (read PLAN.md, FE_01, FE_02,
> FIX_01 notes) and `2026-10-15_board-actions_with-agent-state.md`

## Rulings (maintainer; do not reopen)

1. **Narrow header (179 A + 188).** Words: "6 retired" (not "6 cards retired") and "1/1" (not "1 of 1
   answered"); full words stay in the accessible name and tooltip. When a header still has no room, the
   retired button shrinks to a small icon plus its number rather than being covered. Remove FIX_01's
   `test.fail` ("76% to 90%") in `tests/pages/container-polish.spec.ts`; the marker is whole and clear at
   every zoom where it shows.
2. **Card buttons down to 55% (189, closes tracker N13).** `FAR_K` in `apps/board/src/board/viewport.ts`
   0.75 → 0.55, and whatever reads it (container controls, the "N%" toolbar). Check container headers
   at 55-75% stay uncovered (ruling 1 covers the marker).
3. **"Still open" vs "waiting for your reply" (180, 190).** In the numbered reply / Send message
   (`packages/actions/src/reply.ts` `replyLines`), "Still open:" lists only cards that need the person
   (status open). Cards with the agent (D-046) get their own line, "Waiting for your reply: 7, 9",
   after it. "Nothing left open." only when both are empty. Docs: `docs/specification/chat.md` /
   `api.md` where the message is described.
4. **Any agent reply shows "1 update" (181, 191).** An agent `reply` on a card shows the "1 update"
   tab until the person has seen it, whether or not it answers a note or clears anything (today only a
   reply to the latest note does: `unseenAnswer`, `packages/actions/src/clears.ts`). Seeing the card
   (select, step past it) ends it, as now.
5. **Selected cards (194).** From today's full step (`--vb-select-lift` 50%) back to about two-thirds
   (about 35%), with a little more saturation. By eye; record the values and APCA Lc in the notes.
   Tokens approved for this change.
6. **⌘ shows a hand (195).** Holding ⌘ (Ctrl elsewhere) with the pointer over the board shows `grab`;
   during a ⌘ + drag pan, `grabbing`. A ⌘-click that does not move keeps today's meaning. Text fields
   keep their cursor. (Option may replace ⌘ later; keep the modifier in one place.)

## Steps

1. [x] Tests first for each ruling (unit where logic, page where visible), each seen failing.
2. [x] Build in ruling order; reuse what exists (FE_02's header line, FE_05's `pointer.ts`, the
   with-agent `cardStatus`), no second copies.
3. [x] Screenshots: view every diff before updating, light and dark; say which changed and why.
4. [x] Docs: `components.md`, `pattern.json` files, `chat.md`/`api.md` for ruling 3.

## Validation

- [x] The five gates exit 0, one after another (`npm run check`, `npm test`, `npm run verify`,
  `npm run gen`, `npm run test:pages`).

## Constraints

- Project rules (`.kiro/steering/vision-board-proj.md`). If deviation is needed, stop and say so. No git
  commits. Never touch `.visionboard/`; don't use the board on 4466. One page-test run at a time.
- Do not edit `cortex-tasks/tracker.md` (the orchestrator removes N13).

## Implementation Notes

**Status**: Completed (2026-10-16). All six rulings built; no deviation from them. Two calls the rulings
left open and one contract consequence are named below (items 2, 3, 9) for the maintainer.

1. **Ruling 1, narrow header.** The line shows "1/1" and "6 retired" always (read as the ruling's words,
   not only in narrow frames). `region-core.ts`: `RegionState.countText` is "1/1", new `countLabel` "1 of 1
   answered"; `RegionRetired` gains `count`, `text` is "6 retired", `label` keeps the full words. The count
   (`region-template.ts` `COUNT`, `vb-region.ts` `applyCount`) is "1/1" `aria-hidden` plus a visually hidden
   copy of the words, with the words as its `title` (a `span` cannot take `aria-label`); hidden with no
   items. The marker button keeps its full-word `aria-label` and `title`, and now holds an icon
   (`region-icons.ts` `RETIRED_ICON`, a clock turning back), the number and " retired".
   FIX_01's `test.fail` ("76% to 90%") is gone, replaced by a passing test (item 7).
2. **Interpretation: what else gives way.** With `FAR_K` at 55% a one-card frame's line is 166px on screen,
   and grip + title floor + marker icon + the collapsed row (115px) do not fit (measured), so the icon alone
   could not keep the marker uncovered. New file `packages/ui/src/region/region-narrow.css` (the existing
   collapsed-row block moved out of `region.css`, which would have passed 300 lines, plus two forms), on the
   line's on-screen width: under 290px the marker shows icon + number; under 226px (261px with a marker) the
   mode row keeps only the cog, and Comment while its badge shows (the others at zero width, still
   focusable, so hover or focus expands the row as before), and the holders leave the line whole (no "· C"
   stub, VERIFY_01 item 8). Measured on the gallery's 336px frame with "6 retired": 55% title 41px (its
   three-letter floor), count gives way, icon "6", cog only; 60-86% title 43-121px, "1/1" whole, icon;
   90% collapsed row, icon; 96% and up "6 retired". Nothing on the label side is covered at any zoom from
   55% to 250% (marked and unmarked frames). If the maintainer would rather lose the title than the
   row's current-mode icon at 55-86%, it is one query in `region-narrow.css`.
3. **Ruling 2, FAR_K 0.55** (`viewport.ts`; comments in `node.css`, `flags.ts` description, gallery
   "Zoomed out" text). Report: card buttons are 24x26 CSS px, so between 55% and 75% they draw about
   13-19px on screen. No page test runs axe in that band (axe's `target-size`, WCAG 2.2 AA, may excuse them
   by spacing or not; not established); the maintainer's pick, recorded here.
4. **Ruling 3** (`reply.ts` `replyLines`): "Still open:" lists cards with status `open` only; a second line
   "Waiting for your reply: 7, 9" lists cards that ask with status `commented` (or an old `context`);
   each line only when it lists a card; "Nothing left open." only when both are empty. The tail stays one
   string (two lines joined), so `replyText`, `boardBlocks` and the Send message follow. Expected test
   updates: `answer-model.test.ts` and `group-notes.test.ts` (their cards with an owed note now sit on the
   new line). The skill's wording is the next task's (`2026-10-16_board-agent_skill-say-what-marks-mean.md`
   ruling 2); `SKILL.md` not touched (rule 17).
5. **Ruling 4** (`clears.ts` `unseenReply`): the card's latest agent reply, or the group-note reply that
   cleared it, after the person last looked. `conditions.ts` `item.unseen` holds on it too (trueWhen and
   endsWhen updated); `updates.ts` `answerOf` and `seenDue` read it, so the "1 update" tab, its "Reply" step
   and the seen line on select all follow. `unseenAnswer` (and `get_board`'s `unseenAnswer`) still means a
   clear only. The conditions oracle test gained the same rule.
6. **Ruling 5** (tokens approved): `--vb-select-lift` 50% → 35%; new `--vb-select-chroma: 1.25`;
   `node.css` `--select: oklch(from color-mix(in srgb, var(--vb-ink-strong) var(--vb-select-lift),
   var(--kind)) l calc(c * var(--vb-select-chroma)) h)`. By eye: less deep than FE_01's full step, the
   hue clearly back (light risk and action no longer brown). APCA Lc on the canvas (repo `lc`
   arithmetic, magnitude; plain kind → FE_01 50% → now), light: question 66.7 → 86.3 → 80.6, finding
   60.7 → 83.6 → 76.6, decision 66.1 → 87.2 → 79.0, risk 58.8 → 83.3 → 76.6, action 57.3 → 82.2 → 75.2,
   topic 70.6 → 87.9 → 83.3, note 70.3 → 87.3 → 82.6; dark: question 52.8 → 72.3 → 66.4, finding 59.8 →
   75.7 → 71.2, decision 48.5 → 66.7 → 57.9, risk 53.3 → 72.1 → 65.5, action 64.5 → 79.0 → 73.9, topic
   48.8 → 70.4 → 63.4, note 49.6 → 71.8 → 65.0. OKLCH chroma, e.g. light question 0.160 plain, 0.091 at
   50%, 0.140 now. Values: light question `#1c509f`, risk `#a63105`; dark question `#95bffe`, decision
   `#ff81d5`. Every one stays above its plain kind colour (decoration tier 30 met throughout).
7. **Ruling 6** (`pointer.ts`): `panKey(e)` (Cmd or Ctrl) is the one place the modifier is named and the
   pan wrap reads it; `bindPanKey` sets `data-pan-key` on the stage on every keydown/keyup (capture, on
   the window), on `pointerover`, and drops it on window blur. `board.css`: `[data-pan-key]` → `grab` on
   the stage and everything in it but `input, textarea, select, [contenteditable]`; `.panning` →
   `grabbing` on everything (both `!important`, over each part's own cursor; the grab rule's `:not()` is
   in `:where()` so the pan's closed hand wins). A still Cmd click keeps its meaning (existing test).
8. **Tests, each seen failing first.** Unit: `with-agent.test.ts` (ruling 3), `updates.test.ts` (ruling
   4: a reply with no note, a reply to an older note that clears nothing; counts, step, seenDue,
   conditions), `region-core.test.ts` ("2/4" and words; "N retired"), `viewport-zoom.test.ts` (far at
   54%, not at 55/60/74%), `openapi.test.ts` (1.26.0). Page: `container-polish.spec.ts` (the gallery's
   narrow frame: "6 retired", "1/1", full words in name and title, count whole; and on a board of its
   own, marked and unmarked one-card frames from 55% to 250%: marker whole, nothing on the label side
   past the tools' left edge, title ≥ 36px, icon at 60%, words at 150%), `zoom-level.spec.ts`
   (`FAR_PERCENT` 55), `review-colours.spec.ts` (35%, 1.25, every kind's border and hairline),
   `answer-model.spec.ts` (ruling 4 live), `select.spec.ts` (ruling 6: grab with Meta and with Control over
   title, ✓, a note and the background, grabbing mid-pan, grab again after, the note field keeps its
   cursor). Expected updates: count and marker words in `answer-model`, `every-node`, `flag-retire`,
   `gallery`, `send-access`, `versions`, `person-remove` specs (the count is checked by its `title`).
9. **Contract (outside the listed docs, report).** Ruling 4 widens `list_open`'s `unseen` (the conditions
   row is shared by page and agents), so `common.schema.json` `unseen`'s description says "or you replied
   on it", `openapi.json` 1.25.0 → 1.26.0, `npm run gen` (tools.generated.json, api-reference.md), `npm
   run map` (modules.md: `unseenReply`). api.md item 149 records both rulings; item 144 points to it.
10. **Test fix outside the rulings.** `board.spec.ts` "each layout mode draws every region" failed at the
    new zoom (56%): after a mode pick the frame below moved a moment after `panTo` measured it, so the
    one wheel pan missed and the poll never converged (reproduced on a scratch server: world transform
    moved by the full wheel, the frame by 110px less). `panTo` now measures again and pans what is left
    until the target stays in the middle. The late frame move itself predates this task (not changed).
11. **Docs.** `components.md` (§ Notes beside cards item 4: FAR_K 55%; § Selecting and moving item 3: the
    hand, item 5: selected colour; § A container's top line: short words and the narrow forms, the open
    75-94% band removed; § The answer model items 2 and 5; "N retired" in § Navigation and § Remove),
    `chat.md` (item 5), `api.md` (149, 144), `packages/ui/src/region/pattern.json` (styles, retired,
    update, narrow), `packages/ui/src/node/pattern.json` (`data-selected`).
12. **Screenshots (18 files, each diff viewed light and dark before the update).** Changed by content only,
    no layout shift: `board-*` (container counts "0/3"; header "v153", "6 boards updated", one more board
    drawn earlier in the run by the new answer-model test), `retired-*` ("1/2 2 retired"; the narrow frame
    "ANNUA… 1/1 6 retired", count now whole), `gallery-*` (the "Selected, every kind" group and its
    description, the old "Selected" risk, the selection-bar section's selected topic: the new selected
    colour; region section counts "N/M"; the "Zoomed out" text "below 55%"), `card-widths-*`,
    `link-labels-*`, `lock-*`, `parking-replies-*`, `remove-*`, `agent-access-*` (counts "N/M", so titles
    and holders keep more letters). Baselines are the full update run's actual images.
13. **Gates**, one after another, final run: `npm run check` 0; `npm test` 0 (1290 + 7 timing); `npm run
    verify` 0 (0 warnings); `npm run gen` 0; `npm run test:pages` 0 (480 passed). Before it, `board.spec.ts`
    "each layout mode draws every region" timed out once at 30s (it takes about 30s at 56%), now
    `test.setTimeout(60_000)`.
14. **Process.** One scratch board server of my own on 4497 (temp project seeded from the roadmap fixture)
    for measuring; stopped. Port 4466 and `.visionboard/` untouched; one page-test run at a time.
15. **Security.** None: CSS, page input handling (a key listener that only toggles an attribute), a pure
    fold reader and wording; no I/O, server or route change.

## On Completion

1. Fill Implementation Notes; set `status: completed`.
2. Append one LOG line: `[[YYYY-MM-DD HH:MM]] [board-ui] Review polish round 2: <what you did> → Task: [[cortex-tasks/board/2026-10-16_board-ui_review-polish-round-2.md]]`
