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
