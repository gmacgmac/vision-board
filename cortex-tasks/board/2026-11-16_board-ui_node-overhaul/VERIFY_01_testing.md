# VERIFY_01_testing: Final Verification

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Check, with fresh eyes and with the flags both off and on, that the set does what PLAN.md § Success Criteria says,
and report what is wrong. You report; you do not fix.

---

## Context

You did not build this. Use the board as a person would before reading how it was built: open it, read a board,
answer it, comment, ask now, bookmark, zoom, select, switch skin, turn a flow down. Then check it against the designs
(`design/mockups/node-skins/`, `design/mockups/node-states/`) and the decisions (PLAN.md § Decisions).

**Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: none in `apps/` or `packages/`. You may add `temp/` files and write your report in this
  task's notes
- **Files to reference**: PLAN.md; every task's notes in TASK-STATUS.md; `docs/specification/`
- **Skills**: `cortex-docs` (the doc audit), `design:accessibility-review`, `design:design-critique`

---

## Steps

1. [ ] **Flags off**: `npm run verify`, `npm run check`, `npm test`, `npm run gen -- --check`, the full
       `npm run test:pages` (`VB_TEST_WORKERS=3`, `nice -n 15`, 25-minute limit) and `npm run test:plugin`. Every
       one passes with no new baseline beyond those the tasks listed.
2. [ ] **Flags on** (`?flags=nodeEdges,skins,layoutControl,flowDirection,appWindow,appStage` and BE_01's flag): run
       the specs the set added. Then use a real board (seed one in `temp/` from `packages/format/fixtures/`; add a
       board with 30 nodes, built-in and library icons, palette tones and hues, a `flow` container and an app) in a
       browser, in both skins, light and dark, at 20%, 40%, 100%
       and 250% zoom. Walk every row of decision 2 by its mark, its key and right-click. Then the new records, each
       read back from the ledger: Ask now on one node while other answers wait (one `ask` line with its `lines` and
       `context`; the others still unsent; the agent's reply lands in that node's box); a skin change and a rename
       (the skin stays); a flow's Across, Down and Auto, for a container and for the board; a click inside a
       container (its pill clears on screen, no line is written, and it shows again on the container's next change;
       point 308); an icon added
       through `add_icon` and used on two boards; a hostile SVG offered to `add_icon` and one dropped into
       `.visionboard/icons/` by hand (neither is drawn).
3. [ ] **Keyboard only**, then with a screen reader's names (the accessibility tree): every mark, menu and box.
       Run axe on the board and the gallery.
4. [ ] **Migration**: in `temp/`, copy BE_02's mixed-format ledger (formats 7 to 19, shaped like the maintainer's)
       and a format-19 ledger with flags, notes, answers and saved-for-later cards; never the maintainer's own
       `.visionboard/`. Open each read-only first (nothing written, same board), then for editing: every line is
       there, in order, with its `seq`; a backup sits in `backups/`; nothing is lost and the flags are bookmarks;
       opening again writes nothing; `npm run ledger:migrate -- <folder> --check` says nothing is left and
       `--undo` puts the backup back. Hand-edit one line to a format above the build's: the ledger opens read-only
       and says why.
5. [ ] **Hosted**: `npm run build:plugin` and the plugin tests; in the fake host, host colours and font still win
       over a skin.
6. [ ] **Contrast and weight**: the contrast tests list every new pair; the page weight is within budget; fonts
       load only for the skin in use; no request leaves the machine.
7. [ ] **Docs** (`cortex-docs` audit): `components.md`, `api.md` (its § Migration and the one-format points among
       them), `apps.md`, `plugin.md`, `words.md`,
       `dependencies.md` and each `pattern.json` say what the code does. List every untrue sentence.
8. [ ] **Design critique** of both skins against the mockups: what differs, what is misaligned, what is hard to
       hit or read. Screenshots in `temp/`.
9. [ ] **For the maintainer**: write, in your notes, how to turn the flags on for his own board and a five-minute
       tour of what to try.

---

## Validation

- [ ] Your report ranks findings (blocking, should fix, note), each with where you saw it and how to see it again
- [ ] Every check in step 1 has its result and time in your notes
- [ ] Nothing in `apps/`, `packages/`, `docs/` or `skills/` was changed by this task

---

## Constraints

- If you need to deviate, stop and tell the maintainer; no breaking change is made silently.
- No PII in examples. Interim files in `temp/`. Writes over 50 lines in chunks.
- No git command that changes state; the orchestrator commits.
- Every flag this set adds stays off by default; existing tests and screenshots pass with them off.
- A problem outside this task is reported (`REQUESTS`, `NOTES`), never fixed here.

---

## Implementation Notes

_To be completed by agent after task completion._
_Re-run? Add a `### Run N` block below the last one; never overwrite an earlier run._

**Status**: Completed  
**Completed**: 2026-11-17 21:25  

### Run 1 (Opus 5.5, 2026-11-17)

Nothing in `apps/`, `packages/`, `docs/` or `skills/` changed. Own boards on 7477/7478/7479 (`temp/verify01/proj`, seeded
from `packages/format/fixtures/roadmap.ledger.jsonl`, HOME in `temp/verify01/home`), all stopped. Probes, logs, shots:
`temp/verify01/` (`shots/`, `diffs/`, `*.log`, `*.mjs`). The ops board: 30 nodes (a `flow` drawn `down` with 10 icons incl.
library `x-stage` and 8 tone names + hues 200, 30; a grid of 18 kinds with hues and `alert` icons; the calculator app).

#### Step 1: checks (flags off)

| Check | Time | Result |
|---|---|---|
| `npm run verify` | 20:27 | ok, 46 warnings; page 213,859 B gzip (208.8 KB of the temporary 210) |
| `npm run check` | 20:27, 7 s | 0 errors |
| `npm run gen -- --check` | 20:27, 1 s | current |
| `npm test` (+ timing) | 20:52, 17 s + 3 s | 2,642 pass + 14 pass, 0 fail |
| `npm run test:pages` (3 workers, nice 15) | 20:27:39 to 20:40:27 (12.8 min) | 1,045 passed, **67 failed**, 2 skipped, 18 did not run |
| rerun of `bookmark-retire`, `person-remove`, `host-styles` | 20:41 to 20:47 | 19 passed, 13 failed (all in the first two files) |
| `perf.spec.ts --no-deps` (the 18 that did not run: `budgets` waits for a green `chromium`) | 20:47, 1.4 min | 11 passed |
| `npm run test:plugin` (builds the plugin first) | 20:52, 20 s | 116 passed (a first run at 20:48 failed 37 on EADDRINUSE: my own board sat on 7410, the plugin suite's port; moved to 7477) |
| plugin budgets (`plugin-build.test.ts`) | in `npm test` | `view/board.js` 201,229 of 202,000; `view/board.css` 27,174 of 27,500 gzip |

The 67 failures, classified (`temp/verify01/pages.log`):
- **59 sub-pixel**: gallery section screenshots (access-by-bot, app-fit, app-gallery, big-titles, bookmark-retire gallery,
  card-updates, chat-alongside, chat-attach-gallery, chat-folder, chat, current-folder, fresh-cards, gallery sections,
  go-to-card, header-tiers gallery, key-bubble, ledgers, lock-board, open-folder, open-list, parking-replies,
  person-remove gallery, picker-archive, proposals-review, proposals, read-only-toggle, read-only, search, send-access,
  size, toolbar, versions, wires): ratio 0.01 to 0.02, many 1 px taller or shorter. Looked at
  `temp/verify01/diffs/size-dark-diff.png` (size.spec, Node size, dark): every glyph edge differs, nothing moved or
  changed; shifting the actual 1 px up cuts the sampled mismatch from 18,325 to 4,267: a fractional vertical offset of
  the section, no content change. Not renewed (T_04).
- **1 flaky**: `host-styles.spec.ts:163` (dark), "target 245 (div g-mini vb-ground) changed under the host's element
  rules" (6 px, allowed 2); passed on the rerun.
- **7 real, test harness (not flaky)**: `bookmark-retire.spec.ts` (52, 112, 157, 206) and `person-remove.spec.ts` (152,
  183, 205) fail on `GET /app-panels/calculator (net::ERR_ABORTED)`; the rerun failed 13, every test in both files
  that opens a page. Both `beforeEach` go to `/gallery.html`, whose first section (App frame) loads the calculator
  panel; the next `goto` aborts it, and `tests/pages/helpers.ts` forgives ERR_ABORTED only for an `eventsource`. Seen
  twice out of twice, so it is not the occasional app-panels flake other tasks named.

#### Blocking: must fix before T_04

1. **The page suite is not green on its own**: the 7 (13 on a rerun) ERR_ABORTED failures above. See it:
   `VB_TEST_PORT=7410 npx playwright test --config tests/pages/playwright.config.ts bookmark-retire.spec.ts`. The
   `beforeEach` should wait for the gallery to settle, or the request guard should forgive an aborted panel document on
   navigation.
2. **axe `target-size` with `nodeEdges` on.** The board opens at Fit (about 24% here): default-skin marks grow to 14 px,
   Command Lens plate marks do not grow, and the page tests' own axe set (`wcag22aa`, helpers.ts) fails: 26 targets
   (default) and 47 (Command Lens) on the ops board, 14 to 44 with a menu or box open. At 100% the default skin still
   fails one: `button[aria-label="Bookmark item 24 (B)"]`; Command Lens at 100% and 60% is clean. Today
   `hideControlsZoomedOut` hides the controls far out so this passes; edge marks stay. When T_04 turns the flags on,
   every board axe check at Fit fails. Needs a ruling: excuse target-size for marks below `FAR_K` (as
   `board.spec.ts` does for `-hideControlsZoomedOut`), or make marks inert far out, or larger hit areas. Probe:
   `node temp/verify01/a11y.ts`, `node temp/verify01/a11y100.ts`.
3. **The header's tiers were measured without Flows** (`header-tier.ts` `FULL_MIN`, `HALF_MIN`; Flows is not a
   `HeaderControl`, so it never moves into "⋯"). With `flowDirection` on, the board name loses about 36 px at every
   tier: 1300 px 142 (176 off), 620 px 80 (97 off), 400 px 200 (236 off), on a quiet board. The spec's crowded case
   (floors 206 folder+name at 1300, 80 at half) [INFERENCE] will fall under its floors once the flag is on; I did not
   run header-tiers with the flag. Remeasure, or put Flows in "⋯" at half and third. No overflow at any of the ten
   widths, in either theme (`temp/verify01/shots/header-*`).
4. **For T_04's list**: an app window still goes to Later by **L** and by the selection bar's "Save the selected nodes
   for later · Shift+L" (ledger: `act move later`, `act later` on the app). Right-click offers only comment, bookmark,
   history. Drop `later` from `NODE_TYPES.app.actions` (FE_08's note): confirmed.

#### Should fix

5. **20% zoom**: grown marks overlap each other and the container title: kind words read "ESTI", "CTIO", "ECISI", the
   number covers the kind tab, the disc covers its right end, and "PRODUCTION DESK" collides with the first row's
   marks (`temp/verify01/shots/crop-20-desk.png`). At 40% they read well.
6. **Command Lens marks never grow** (FE_04's open call, no ruling recorded): at 40% the number and notes button are
   about 5 to 10 px (`shots/zoom-command-lens-dark-40.png`), unlike the default skin and D-101.
7. **A box near the window's bottom** (node 25, 100%, light, two notes): the conversation box opened 48 px below the
   node's top and ran past the window (bottom 977 of 900): the reply field, Ask now and Add note were off screen and
   nothing panned them in (`shots/box-25-c.png`). Nodes 13 and 15 at 100% and 40%: right, top aligned, 296 to 298 px.
8. **H does two things by focus**: History when a node has focus, Hide answered otherwise ("⋯" and key help still say
   "Hide answered H"; `input/keys.ts`). A click selects and focuses the node, so a mouse user mostly gets History, but a
   click on the background then H hides the answered cards.
9. **Command Lens boxes** (history, conversation) wear the default box and a heavy white ring
   (`shots/act-command-lens-dark-key-h.png`); FE_04's request (plate as header, glass tokens) is still open.
10. **The app's title bar** at 360 px cuts "Calcu…" and "Not allowe…" (`shots/app-window-dark.png`): the app's name and
    state are what the bar is for.
11. **Flows menu**: choosing the option already chosen leaves the menu open; the button reads "Flows: Auto" but
    "Flows across" (no colon); icon-only even at full width, where every neighbour has words.
12. **A locked press reports twice**: the toast "This board is locked. Locked: unlock to change it." and the mark's
    "Board is locked" popover (both skins). FE_02 noted the same for a failed write.
13. **Plugin bot's `node.icon` input** (`packages/format/schema/events/node.schema.json` `icon` description) still
    says "Call list_icons first; reuse before you add one with add_icon"; `apps/board/server/words/plugin-tools.ts`
    has no `inputEdits` row for it: still wrong (T_03's note). Needs `npm run eval:bot` when changed.
14. Escape from a mark's menu or box returns focus to the node, not to the mark that opened it.
15. With `nodeEdges` on, 30 gallery sections still draw the old footer (Board node, App frame, An app card in every
    state, Note bubble, The conversation box, Selection bar and lasso, Node size, …): T_04's gallery work.
16. `TASK-STATUS.md`: the Shared Foundations rows for tokens, the icon check and the direction control, and the
    File Ownership rows of wave 3, hold task notes where the owner and files belong; the Implementation Notes for
    T_02, BE_03, BE_04, FE_04, BE_01 and FE_08 still say Pending.

#### Fine (checked, with what was seen)

- **The six actions** (decision 2), default and Command Lens, dark and light, at 100% (`temp/verify01/actions.mjs`):
  click selects and writes `seen`; the disc opens Tick/Cross beside it (`ack`), the Command Lens half answers at once
  and the lit half clears (`reopen`); X crosses, X again clears; the number bookmarks (`bookmark`), B unbookmarks;
  holding the number opens Bookmark B / Save for later L; right-click lists Tick A, Cross X, Comment C, Bookmark B,
  Save for later L, History H; H opens history; C opens the conversation box; L writes `move later` + `later`. A risk
  that only tells has no disc and no switch.
- **Rows and boxes**: grid and a down flow leave room for the edge marks from 40% to 250%; conversation and history
  boxes are one style, right of the node, top aligned, about its width (13 and 15 at 100%, 15 at 40%; but see 7);
  history box as designed. No old footer, footer button or bottom tab on the board with the flags on.
- **Tone (point 366)**: on a toned node the tab or grip, the hover border and the selected border take its hue
  (node 11, hue 0: `oklch(0.72 0.12 0)` selected; node 3, violet: grip and borders hue 295), both skins, both themes;
  Command Lens tints a telling plate. Fixed.
- **Flows**: board-wide Across, then Auto (the agent's down returns); a container's Across beats the board's Down;
  the container's Auto then follows the board; every choice is one `direction` act, `region` only for the container.
  The header button is in the bar at all ten tier widths, both themes, nothing overflows (but see 3 and 11).
- **Ask now**: with other answers waiting (a cross, an Added note), Ask now on node 25 wrote the note and one
  `ask` with `lines: [113]`, `context: "board"`, no `send`. `vb check-responses --wait 40` (the MCP tool's command)
  returned at once on Cmd+Enter with the note and its `ask`. The agent's `reply` landed in node 25's box under "Your
  note 1 · Asked now", the notes mark filled ("agent replied") until read. With no agent joined (second board on 7478):
  the press says "No agent is listening: your note waits for the board's Send", keeps the note, writes no `ask`. In the
  chat panel: `chat-ask.spec.ts` (fake claude) passed in the full run.
- **Skin and rename**: "Command Lens skin" in "⋯" wrote `act skin command-lens` for `ops`; the person's rename
  (`put_board`) kept it (`list_boards`: `skin: command-lens`), and a reload too.
- **Point 308**: a click in the gap between two cards cleared the container's "1 updated" pill, wrote nothing, and
  the next agent change showed "2 updated".
- **Icons**: `add_icon x-stage` 201, again 200 `replayed`; a drawing with `<script>` and `onload` refused (422); files
  dropped by hand with `foreignObject` and `onload` listed under `problems` and refused when a node names them; one
  `icon` line with the hash; `x-stage` reused on a second board (`ops2`).
- **Focus and tips**: no ring after a click or after Shift (the node's look is pixel-identical, though `:focus-visible`
  matches); after Tab the ring shows (default `#8b9bb8`-ish, Command Lens light grey) and the tip at once; hovering a
  mark shows nothing at 0.8 s and its tip by 2.3 s. Locked board: no lock at rest; a press shows the lock and "Board is
  locked", gone after about 3 s; both skins.
- **Keyboard and names**: Tab goes node → number "Bookmark item N (B)" → answer "Answer item N, crossed (A tick, X
  cross)" → notes "No notes on item N (C)" → next node; Shift+F10 opens the actions with focus on the first row;
  Enter on notes opens the box with focus in the reply field.
- **Migration** (`temp/verify01/mig.sh`, copies only): a format-19 ledger made from BE_02's mixed fixture through the
  chain (251 lines, 1 flag, 35 notes, 7 ticks, 3 Laters) and the mixed 7-to-19 file itself. Read-only open: nothing
  written (same SHA-256), no backup. Editable open: 251 lines, all v20, `seq` order and types unchanged, `flag` →
  `bookmark`, one backup `backups/ledger.f7-19.251.<time>.jsonl`; every board read the same as read-only (only
  `readOnly` differs). Both files migrate to the same bytes. Second open: nothing written. `--check`: "already in the
  current format". `--undo`: the original bytes back. A line hand-set to v21: the terminal says "1 line(s) from line
  251 on were written by a newer Vision Board; the ledger is read-only here"; an act and Edit answer "This ledger was
  written by a newer Vision Board. It opens read-only; update the board to edit it."; nothing written.
- **Hosted**: the plugin builds; `token-contrast.spec.ts` (every new pair, all 360 hues and names, both skins) and
  "a skin's values reach the board's root, and a host's colours and faces win over them" pass.
- **Fonts and network**: default skin loads Figtree and Bricolage only, Command Lens JetBrains Mono and Space Grotesk
  only, flags off none; no request left 127.0.0.1/localhost.

#### Design critique (both skins against `design/mockups/node-skins/`)

- Default skin at 40% to 250% matches artboard 9: number top left, kind tab or grip top centre, disc top right, badge
  bottom left, notes bottom right on the disc's line; icon tile at the body's right with the kind word above the title.
  At 20% it does not (5). Decision's fuchsia selected border sits close to the pink Add note and field in light.
- A hue of 0 on a question makes its tab, border and tile read as Cross red (`shots/act-default-light-context.png`,
  node 11): T_02's sweep passes contrast, but meaning collides; the skill could keep tones off 0 to 20 and 340 to 359.
- Command Lens light matches its artboard: a dark plate and a switch for asking nodes, a light plate for telling ones.
  In dark the two plates differ little, as in the mockup itself. Its boxes are the default skin's (9).
- Screenshots: `temp/verify01/shots/` (zoom-<skin>-<theme>-<20|40|100|250>.png, act-*, box-*, header-*, reply-*).

#### Not done or not re-checked

- Docs audit (step 7) is a spot check, not a sentence-by-sentence audit: `components.md` § zoom table (14 px minimum,
  box 0.75, plate marks not scaled) and `api.md` § Migration 176 to 179 match what I saw; `chat.md` point 7 and the
  format README (BE_03's notes) are fixed. Untrue, older than this set: `write_board`'s description "Only a board's
  creator writes its `board` item again" (openapi.json), while `ledger-index.ts` refuses any agent `board` line for a
  board that exists ("already exists", seen when the creating agent renamed `ops`).
- Not re-checked: BE_02's note that the page's paused controls on a newer-format ledger say "Read-only: switch to
  Editing"; WebKit; a long press on touch; the selection's Ask now; the Command Lens proposal chip (FE_04's request).
- The live bot eval (not mine).

#### For the maintainer: turning it on, and five minutes to try

Open your board with every flag of the set:
`http://localhost:6511/?flags=nodeEdges,skins,layoutControl,flowDirection,flowBranches,appWindow,appStage` (on your
test board; the flags are the page's and are not stored). Then:

1. Zoom with Cmd+scroll from 250% down to 20%: the edge marks stay readable, then crowd at 20% (5).
2. Click a question's disc: Tick and Cross open beside it. Press X, then X again to clear it.
3. Click a number to bookmark it; hold it for Save for later; right-click any node for all six actions with keys.
4. Press C on a node, type, Add note; on another node type and press Cmd+Enter (Ask now): that one goes at once, the
   rest wait for Send.
5. "⋯" → Command Lens skin; answer with the Tick | Cross switch; press the lit half to clear. Switch back.
6. Header "Flows" button: Down, then Auto; on a flow container's layout button, Across beats the board's choice.
7. Press H on a node for its history; Tab through a node to see the keyboard rings and tips.

---

## On Completion

1. Fill in Implementation Notes above; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append **your own** LOG entry to `cortex/LOG.md` — one line, terminated with a newline, append-only:

   ```
   [[YYYY-MM-DD HH:MM]] [board-ui] VERIFY_01: [what you did] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/VERIFY_01_testing.md]]
   ```

   Cite files by path + symbol, never by line number. Never write the set's entry or to `AUDITED.md`.
