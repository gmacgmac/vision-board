---
category: board-app
status: completed
created: 2026-10-11
tracker: cortex-tasks/tracker.md#N33
---

# Field report, batch 1: Send disabled, join after a switch, a quieter badge, skill v2.2

> **From**: the first real use (nclite chat, board `multi-bot`, skill v2.1), agreed by the
> maintainer 2026-10-11 (chat 499, 508-512) · **Model**: Opus 5.5 · **Go**: given (512)
> · Batches 2 (retire, numbering, flag) and 3 (layout) follow as their own task sets.

## Rulings (maintainer; do not reopen)

1. **Send is disabled when there is nothing new to send** (tracker N33, 499): no person act on the
   open board since its last Send that the agent hasn't been sent (notes, ✓ ✗, more context,
   later, moves that count). Its tooltip says "Nothing new to send". Worked out as one row of the
   conditions table (D-033: `packages/actions/src/conditions.ts`, with `clearedBy`), never a local
   check in the page. Keyboard and screen readers get the same state (`aria-disabled` with the
   reason, still focusable).
2. **Join after a folder switch** (field point 11): when an agent's `VB-Project` folder IS the open
   folder but its secret belongs to a recent folder it joined earlier, the refusal says so and
   tells it to join again here ("This board now has your folder open (~/…). Your secret is from
   ~/… — call join again."). The other `wrong-folder` cases are unchanged
   (`apps/board/server/caller-folder.ts` `wrongFolder`, `callers.ts`).
3. **The "N updates" badge stays, smaller and quieter** (field point 6): smaller text and padding,
   a muted tone; still keyboard reachable, still opens the stepper; tokens only, APCA tiers (a
   status word: Lc 45; D-035). Screenshots updated after viewing the diffs.
4. **Skill v2.2** (`skills/vision-board/SKILL.md`; field points 12-15, 17, 18; rule 17):
   - How `lanes` places cards: a card's column is its link depth across the whole container, so
     cross-lane links draw long lines (12).
   - When to use lanes: a lane is one area or owner running its own sequence; links stay inside a
     lane; a cross-lane link is a rare handoff. When most links would cross lanes, group by phase
     in one `flow`, and write cross-lane needs in the card text ("needs card 5") (13).
   - Card numbers are the reading order: never put step numbers in titles (14).
   - Restructuring: when the direction changes, draw a new container (and, once `retire` exists,
     retire the old one); rewrite a card in place only when it is still the same subject (15).
   - Card sizes `s`, `m`, `l`: what each is for; the person's size wins (17).
   - Card numbers count across the whole project today, so a new board may start at 33: refer to
     cards by the numbers the board shows, never assume 1 (until batch 2 numbers each board from 1).
   - `scenarios.md`: a lanes-vs-flow scenario from the field report; NOTES.md: the field report's
     evidence, dated (18).

## Steps

1. [x] Failing tests first: the conditions row and Send's disabled state (unit and page, keyboard,
   axe light and dark); the join-again message (API test with a temp home); the badge (page).
2. [x] Build; gallery states for Send disabled and the quieter badge.
3. [x] Skill v2.2, scenarios, NOTES.
4. [x] `api.md` / `components.md` lines.

## Validation

- [x] The five gates exit 0, one after another.

## Constraints

- Project rules (`.kiro/steering/vision-board-proj.md`): patterns before new code; one job per
  file, about 300 lines (over 500 fails `verify`; split by a logical seam into a well-named file
  in the right folder); tests first; tokens only; every state; accessibility.
- If deviation is needed, stop and say so. No PII in examples. No git commits or stash.
- Protected files: propose wording, never edit. Scratch in the system temp folder; stop only your
  own processes; never touch `.visionboard/` or real home-folder files.
- Fill Implementation Notes below and append your own LOG line.

## Implementation Notes

**Status**: Completed 2026-10-11 (Opus 5.5). No ruling changed. Gates, one after another: `npm test`
0 (983 + 6 timing), `npm run check` 0, `npm run verify` 0 (0 warnings), `npm run gen -- --check` 0,
`npm run test:pages` 0 (331 passed).

### Ruling 1: Send disabled (one row of the conditions table)
- `packages/actions/src/registry.ts` `isAnswer(action)`: the one test for "an answer the Send
  message carries" (`ACTIONS[action].onItem`: ✓, ✗, a note, More context, Later, Reopen, a note
  changed or removed, a proposal turned down, a note on a whole container). `pending.ts`
  `replyScope` now reads it too, so the button and the message can't drift.
- New `packages/actions/src/unsent.ts` (`foldUnsent`, `unsentOn`), folded from `fold.ts`
  `applyEvent` into `LedgerState.unsent` (board -> the lines since its last Send): a Send empties
  it, an answer adds its line, a `note-remove` takes its note out, a `note-edit` adds nothing. So
  the row reads an index and walks no events (D-033; the conditions timing test still passes).
- `conditions.ts`: kind `board.unsent` (about `board`, audience `person`, `shows: ['send']`, a new
  `Shows` value; `clearedBy: []`), only for the open board (`ctx.board`), `seq` the latest unsent line.
- **"Moves that count"** read as: a move into Later counts through the `later` act written with it,
  a move out of Later through its `reopen`; a move between containers, a pin, a size or a mode
  alone does not (none is in the Send message). Say if a move between containers should count.
- Page: `board-data.ts` `pageConditions.unsent`; `attention.ts` copies it to `shell.unsent` after
  every batch and switch; `ToolbarEnd` passes it to `SendButton`, whose new `disabled` state shows
  when idle with nothing new (Sent, Waiting and Error still win). Disabled: a quiet outline
  (`--vb-surface-card`, `--vb-line-strong`, words `--vb-ink-subtle`; APCA light 76.2, dark 48.8,
  measured with APCA-W3 0.0.98G-4g at the label tier), no hover or press, `aria-disabled="true"`,
  in the tab order, title (so accessible description) "Nothing new to send"; click, Enter and Space
  do nothing. `access.css`: the progress cursor is now only for `sending`.
- Gallery: Send row gains "Disabled: nothing new to send".
- Tests: `packages/actions/tests/unsent.test.ts` (11: what counts, what doesn't, the open board
  only, never agents, note removed/edited, the agent's lines never count; and on every fixture
  ledger and board, unsent exactly when `replyScope` from the last Send is non-empty);
  `conditions.test.ts` row case; `apps/board/tests/board-data.test.ts` (`pageConditions.unsent`);
  new `tests/pages/send-nothing-new.spec.ts` (disabled with its reason and a click recording
  nothing; an answer enables it live, Send records it, then quiet again; a size alone doesn't, a
  container note does; keyboard: Tab reaches it disabled, Enter/Space do nothing, A then Enter
  sends; axe light and dark in both states). The unit tests were written and failed first; the
  page spec was written alongside the page change and passed on its first run (it was not seen
  failing).
- Existing page tests that pressed Send with nothing answered now answer first (a note that names
  no card where seen or NEW must stay untouched): `send-access.spec.ts` (two tests; after "Sent"
  the button now goes to `disabled`, not `idle`; the gallery's state list adds `disabled/`),
  `card-updates.spec.ts` "Send leaves the tabs", `new-cards.spec.ts` "after a Send and a new drawing".
- To keep `conditions.test.ts` under 300 lines, its "board seen in the fold" test moved unchanged
  to `heads.test.ts`; `fold.ts` stays at 300 (the `deny` case joined onto one line).

### Ruling 2: join again after a folder switch
- `apps/board/server/caller-folder.ts`: `checkFolder` now returns whether the `VB-Project` header
  named the open folder (or one inside it); `secretElsewhere(env, secret, here)` answers the new
  `joinAgain` refusal when `here`, else `wrongFolder` as before. `dispatch.ts` passes it through.
- **Problem code: `not-authenticated` (401, with `WWW-Authenticate`), not `wrong-folder`.** The
  ruling asks the refusal to tell the agent to join again, and the MCP instructions and the skill
  already say "on `not-authenticated`, join again" while "on `wrong-folder`, do not join"; keeping
  it `wrong-folder` would contradict them. The other `wrong-folder` cases are unchanged (no header;
  a header naming another folder). The words are the ruling's: "This board now has your folder open
  (~/projects/b). Your secret is from ~/projects/a — call join again." No contract change (401 is
  already on every agent operation).
- Test: `apps/board/tests/api-folder-mismatch.test.ts` (temp home): header = the open folder or a
  subfolder, old secret → 401 with the words and the realm header, on `write_board` and
  `list_open`; nothing written; a fresh `join` there works.

### Ruling 3: the "N updates" badge
- `packages/ui/src/node/node-steps.css`: lower case, medium weight, no tracking, 18px tall with
  `--vb-space-1` sides (other bottom tabs stay 20px uppercase; `align-self: center` and 1px block
  margins keep it centred on the edge beside them), `--vb-ink-subtle` on `--vb-surface-card` with a
  `--vb-line-strong` edge (status word, Lc 45: light 76.2, dark 48.8). Hovered or open: the edge
  `--vb-state-context`, the words `--vb-ink`. Still a button, 24px target (the `::after`), still
  opens the stepper (existing keyboard tests pass). Tokens only.
- Gallery caption updated (`updates-section.ts`); `pattern.json` describes it.
- Test: `card-updates.spec.ts` "the tab is small and quiet" (muted ink by a token probe, no
  uppercase, 18px, 24px target, changes on hover).

### Ruling 4: skill v2.2
- `skills/vision-board/SKILL.md` (status v2.2): lanes placement (one shared column grid, a card's
  column its link depth across the container, so cross-lane links draw long lines, checked against
  `packages/layout/src/modes/lanes.ts` `layersOf`); when to use lanes (one area or owner, links
  inside, cross-lane a rare handoff; otherwise one `flow` by phase, cross-lane needs in the text
  "needs card 5"); card numbers are the reading order, no step numbers in titles; restructuring
  (new container, retire once it exists, rewrite in place only for the same subject); sizes `s`,
  `m`, `l` and the person's size wins (D-030, components.md § Node size); numbers count across the
  project, so a board may start at 33.
- `scenarios.md` v2.2: scenario 14, lanes or flow (content made up). `NOTES.md`: dated lines citing
  the rulings (the field report itself is not in the repo, so nothing beyond the rulings is quoted).
- **Not run against a model** in this task (rule 17): scenario 14 is there for the maintainer's run.

### Docs
- `api.md` new § "Field report, batch 1": 123 (nothing new to send) and 124 (join again); 88 notes
  the later row. `components.md` § Awareness tables (Send as a place a row shows) and a new
  § "Field report, batch 1". `packages/actions/README.md` (unsent.ts, `isAnswer`).

### Screenshots updated (actual vs expected viewed first)
- `card-updates.spec.ts` light and dark: the "3 updates" tab smaller, lower case, muted; amber edge
  while open (the stepper card).
- `send-access.spec.ts` (agent-access) light and dark: the Send row gains the Disabled sample.
- No other screenshot changed.

### For the maintainer
1. A move between containers does not enable Send (only moves that write Later or Reopen do).
2. The join-again refusal is 401 `not-authenticated`, not `wrong-folder` (reason above).
3. The disabled Send's words are at the label tier (dark Lc 48.8), as D-035 allows for short muted
   text; WCAG exempts inactive controls. `--vb-ink` (dark Lc 71.6) is the alternative if it reads
   too faint.
4. Before the first batch arrives (and with no board open) Send shows disabled; a board whose
   answers were sent before the page opened shows it disabled at once.
5. No protected file needs a change; no decision entry proposed (the row follows D-033). Tracker
   N33 could be marked done (not edited here).
