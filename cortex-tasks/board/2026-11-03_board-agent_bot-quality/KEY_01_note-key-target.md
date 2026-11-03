# KEY_01: Which Card The Note Key Writes On

**Skills**: cortex-architecture · **Model**: standard · **Wave**: 1 · **Branch**: `feat/note-key`

## Objective

Point 394. In the live run, after a click on card 1's ✗, a script moved the keyboard focus to card 2 and
pressed `c`; the note went to card 1 (the selected card), not card 2 (the focused one). Find out whether that
is the board's rule, and make `c` act on the card a keyboard user is on.

## Steps

1. Find the rule: the `c` key's handler and its words (the keyboard help, `docs/specification/` on keys and
   selection), and what the board says `c` does. Read how focus and selection relate (does focusing a card by
   keyboard select it? should it?).
2. Reproduce in a page spec: click ✗ on card 1, Tab or arrow to card 2, press `c`. Record where the note box
   opens. Also: several cards selected and focus on one of them; focus on a card outside the selection.
3. Decide by the principles (keyboard users act where the focus is; a selection the person made on purpose
   still counts) and write the rule in one line in your notes; if the spec states a rule, follow it or say
   why it is wrong (STOP if it's a decision the maintainer must take).
4. Failing test first, then the fix; the help words if they change (words file). Behind a flag if behaviour
   changes. Look in a browser, light and dark.
5. Checks: unit, `verify`, `check`, the key and note page specs, `test:plugin` on 6310, pages on 6410.

## Notes

Constraints: worktree only, no commits, no LOG/AUDITED, never 4466. It may be by design: then say so with the
evidence, and suggest only what would make it visible to a keyboard user.

## Implementation Notes

**Finding (point 394).** The selection is not why the note went to card 1. Evidence (page probes on the
roadmap board, 6410): with card 1 selected by a click and focus moved to card 2, `C` already wrote on card 2
(`selection-flow.ts` `comment`: one selected is never the key's; it falls through to the focused card's
Comment). The real cause was a **focus steal**: `item-acts.ts` calls `focusCard(id)` after the ✓/✗ write
returns, unconditionally. A script (or a quick keyboard user: X, then J) that moves focus before the write
answers has focus pulled back to card 1, so `C` hits card 1. Probe: after ✗ on 1 and `focus()` on 2, the
active element was card 1 once the write settled.

**A second trap, same family.** With two or more selected and focus on a card outside them, `C` opened the
group note on the selection (probe: selected [1,3], focus 2, note on [1,3]). The ruling (3_FE_02 ruling 6,
"N or C with two or more selected") and 3_FE_01 ("keys keep acting on the focused card") do not say what
focus outside the selection means. Not a maintainer decision: it follows the task's own rule below.

**Rule (one line).** The keyboard focus decides where a key acts: `C` writes on the focused card, and is the
group note only while the focus is on one of two or more selected cards (or on no card); `N` and the bar's
Comment stay the selection's; a finished ✓/✗/Later press never takes focus back from where the person moved it.

**Changes, all behind one new flag `focusLeads` (on by default; `?flags=-focusLeads` is the revert).**
- `selection/comment-key.ts` (new, `commentOnSelection`): the pure rule; `selection-flow.ts` `comment` uses it,
  `command(id, key, focused)` and `SelectionFlowDeps.focusLeads` carry it; `input/keys.ts` passes the focused
  card id as the command's third argument (`KeyHandlers.command`); `controller/stage-handlers.ts` forwards it;
  `controller.ts` sets `focusLeads: on('focusLeads')`.
- `cards/item-acts.ts`: optional dep `focusLeft(id)`; the controller supplies it only with the flag on
  (focus is on something that is neither `body` nor inside the card: it stays there; lost to the redraw or still
  on the card: it returns as before, including the hide-answered "next card" step).
- `docs/specification/components.md` (note bubble item 2): one paragraph for the rule.
- No words changed: the key list has the same rows (Comment: N, C), no new sentence.

**Tests (failing first).** `apps/board/tests/comment-key.test.ts` (new), `item-acts.test.ts` and `keys.test.ts`
(added), `tests/pages/note-key-target.spec.ts` (new: flag on and off; one selected + focus elsewhere; two
selected with focus inside / outside, N unchanged; a delayed ✗ write answering after the focus moved; focus
stays after a plain ✗). The off group documents the old behaviour.

**Verification.** `npm run check` 0 errors; `npm run verify` ok (flags.ts now 327 lines, a warn); unit suite
2110 tests, only the 9 plugin-build/plugin-types failures below; pages (6410, 3 workers) select, key-bubble,
note-discard, go-to-card, every-node, board-host, containers, lock-board, focus-ring, answer-model and the
new spec: 122 passed; `test:plugin` (6310): 79 passed with the seam hash set to the new value, reverted after.
Light/dark look: no visual change (keyboard behaviour only, no style touched); axe/screenshot specs above pass.

**Merge request (not mine to edit).** A new flag name moves the seam types hash (`FlagName` is in
`plugin.d.ts`), so `plugin-build.test.ts` and `plugin-types.test.ts` fail until `SEAM_TYPES` in
`apps/board/plugin/seam.ts` is set again; the flag is an addition a host survives, so `SEAM` stays 1. Proved:
with `flags.ts` at HEAD both files pass; with my entry the new hash is
`51e46acd7b350fe95d37c8e7c35638e0f9d5d7178c3af51447dd9f0061726c6d`. TOOLS_01 adds a flag too, so the final hash
is computed after both branches merge (run `plugin-types.test.ts`, copy the hash it prints). I also touched
`packages/format/src/flags.ts` (TOOLS_01's file) with one entry, `focusLeads`, placed before `keyBubble`
to merge cleanly; the project rule is that new behaviour ships behind a flag there.

**Not done / left.** The key help does not say that C follows the focus (the row is "Comment: N, C"); no
sentence was needed. The remaining `C` case, focus on a card that offers no Comment, does nothing, as before.

```
TASK_ID: KEY_01
STATUS: DONE
FILES: apps/board/src/board/selection/comment-key.ts (new), selection/selection-flow.ts, input/keys.ts, controller/stage-handlers.ts, controller.ts, cards/item-acts.ts; apps/board/tests/comment-key.test.ts (new), item-acts.test.ts, keys.test.ts; tests/pages/note-key-target.spec.ts (new); docs/specification/components.md; packages/format/src/flags.ts (one entry, TOOLS_01's file)
VERIFICATION: check 0 errors; verify ok; unit 2101/2110 (9 = seam hash, see REQUESTS); pages 122 passed on 6410; test:plugin 79 passed on 6310 with the seam hash temporarily set
REQUESTS: after merging with TOOLS_01, set SEAM_TYPES in apps/board/plugin/seam.ts (SEAM stays 1); merge the flags.ts hunk
NOTES: the root cause of point 394 is a focus steal after the ✓/✗ write, not the selection; a second, related trap (C on a card outside a 2+ selection) is fixed too; revert is ?flags=-focusLeads
```
