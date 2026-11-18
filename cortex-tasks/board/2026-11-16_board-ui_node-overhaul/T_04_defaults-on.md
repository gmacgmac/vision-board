# T_04_defaults-on: Switch Over and Remove the Old

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

After the maintainer's yes, make the new node the only node: remove the flags this set added and every old code
path they kept alive, renew the screenshots once, and write the follow-up rows. The maintainer wants no legacy left
(kickoff, points 230-231).

---

## Context

Runs only after VERIFY_01's blocking findings are fixed and the maintainer has used the board with the flags on and
said yes (the orchestrator holds this gate). Until now every existing screenshot was unchanged; this task changes
most of them, once.

**Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: `packages/format/src/flags.ts` (defaults and descriptions), `packages/format/src/node-types.ts`
  (an app node offers no Save for later), `packages/tokens/src/tokens.css` (Decision's colour becomes the token's
  own value; the `[data-vb-edges]` scope goes), tests that assert a default, `tests/pages/__screenshots__/`,
  `tests/plugin/` baselines, `docs/specification/` where a doc says "behind a flag",
  `cortex-tasks/board/2026-11-11_board-ui_app-window-handover/design-decisions.md` (mark what is now built)
- **Files to reference**: VERIFY_01's report; each task's list of changed baselines
- **Skills**: `cortex-architecture`, `cortex-docs`

> Modify only the files this task owns. Need a change elsewhere? List it under `REQUESTS`.

---

## Steps

1. [ ] Remove `nodeEdges`, `skins`, `layoutControl`, `flowDirection`, `appWindow`, `appStage` and BE_01's flag
       (unless the maintainer held one back; the orchestrator says which), so the new behaviour is the only
       behaviour. Delete the old code paths they guarded, with their tests, gallery entries, words and doc lines: the
       old footer (`node-template.ts` `footer`, `bottomTabs`, `flagButton`, `sizeControl` and their CSS and
       handlers), the note bubble modes FE_03 replaced, the mode popover FE_07 replaced, and anything else a flag
       kept alive. Old ledger lines are handled by the ledger migration (BE_02, D-103), never by a second reader.
       A search for each removed symbol and flag name finds nothing outside `docs/decisions.md` and `cortex/`.
2. [ ] Make Decision's colour the token's value; remove the scoped rule. Put the `tokens.css` diff in your notes.
   - [ ] Restore the temporary size budgets (PLAN.md § House Rules, point 351) once the old code is gone: the page
         to 200 KB (`scripts/verify-weight.mjs` `PAGE`, `performance.md`), the plugin's `view/board.js` to 190,000
         and `view/board.css` to 22,000 gzip (`apps/board/tests/plugin-build.test.ts` `BUDGET`). If one can't be
         met, stop and report the figure.
3. [ ] `NODE_TYPES.app` no longer lists Save for later; an old ledger with a saved app card still opens.
4. [ ] Renew the page and plugin screenshots once (`--update-snapshots`), then look at a sample of at least 40
       across specs, light and dark, before accepting them; list any that look wrong and fix the cause, not the
       picture.
5. [ ] Run every check, the full page suite and the plugin suite.
6. [ ] Write the follow-up tracker rows as text in your return block for the orchestrator to add: fold the kind, action and mode icon records into the icon set; a hover pause on the number, if wanted; seen on a read-only board
       (DO-05); which layout modes to keep (U16's decision); anything VERIFY_01 left as "should fix".

---

## Validation

- [ ] `npm run verify`, `npm run check`, `npm test`, `npm run gen -- --check`, `npm run test:pages`,
      `npm run test:plugin` pass
- [ ] A board opened with no `?flags=` draws the new node in its skin
- [ ] No flag from this set and no old node code path remains; the removed symbols are listed in your notes

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
**Completed**: 2026-11-18 17:22

### Run 1 (Opus 5.5, 2026-11-18; the maintainer's yes, "we are good to go")

Worked in `.claude/worktrees/app-window` (`spike/stage-apps`), `VB_TEST_PORT` 7510 (forks of this run: 7560, 7580,
7610). Four forks of this agent did slices in parallel: layout flags; the `packages/ui` node pattern; the gallery; the
page specs; then the docs. Everything below is the run's whole result.

#### Changes Made

- **Flags removed (13)**: this set's `nodeEdges`, `skins`, `layoutControl`, `flowDirection`, `flowBranches`,
  `appWindow`, `appStage`; and five older flags that only gated what the old node drew, now dead: `layoutTooltip` (tips on
  the six layout icons), `oneChangeTab` (the bottom tab shared by updates and a proposal), `appTitle` (the old app
  footer's name), `notePreview` (note tips on the card), `cardHistory` (the ⓘ), `groupNoteOnce` (group pins). Their
  entries and `FLAG_DESCRIPTIONS` are gone from `packages/format/src/flags.ts`; descriptions that named the footer were
  rewritten (`nodeSize`, `hideControlsZoomedOut`, `focusLeads`, `proposals`, `cardUpdates`, `newCards`, `handover`,
  `cardReplies`, `toolbarMenu`, `everyNode`, `cardBookmark`, `freshCards`, `updateSignals`, `appCards`).
- **The node** (`packages/ui/src/node/`): `nodeTemplate` draws only `edgesMarkup` in the skin's row (default
  `SKIN_DEFS.default`) or, for an app with appCards on, `windowMarkup` (Open always drawn). Removed: `footer`, `button`,
  `tabs`, `bottomTabs`, `POPOVERS`, `bookmarkButton`, `sizeControl`, `SIZE_PICKS`, `appName`, `notesMarkup`,
  `notesHead`, `replyMarkup`, `timeMarkup`, `isAppSlot`, `NodeTemplateOptions.sizeControl|bookmark|history|appWindow|appStage`,
  `WindowParts.open`; in `node-core.ts` `STATUS_LABEL`, `BOOKMARK_KEY`, `bookmarkLabel`, `buttonLabel`, `SIZE_LETTER`,
  `sizeLabel`, `changeTab`, `AWAITING`, `CardConditions.oneTab|groupNotesApart`, `NodeState.statusWord|notes|pressed|
  oneTab|fresh|awaiting`, `SizeState.label|shown`, `ProposalsView.tab|stale|label|updated`, `HandoverView.label|box`;
  `bindCardPopover`, `HISTORY_TAB`, `historyButton`, `historyLabel`, `BOOKMARK_ICON`, `INFO_ICON`, `SIZE_ICON`,
  `bindNoteTip` (`node-note-tip.ts` deleted), `notesView`, `NotesView`, `groupMarkers`, `GroupMarker`, `groupAnchors`,
  `groupPinAt`, `GROUP_PIN`, `UpdatesView.label`; `vb-node.ts` lost the notes block, note tips, card popovers, status
  tip, size trigger, `placeSteps`, the tab halves of `updateProposal`, `updateSteps`, `updateHandover`. CSS: the footer,
  `.vb-act`, `.vb-bookmark`, `.vb-size*`, `.vb-node-pin`, `.vb-node-notes*` (`node-notes.css` deleted), `.vb-note-pin`,
  group pins, `.vb-node-reply`, `.vb-node-btab(s)`, `.vb-status-tip`, `.vb-history`, the one-tab and app-footer rules,
  and their `[data-zoom='far']` rules. Words nothing read any more were deleted (list in the slice reports: node,
  node-notes, node-updates, node-app, app-frame).
- **App windows**: `NODE_TYPES.app.actions` is `WINDOW_ACTIONS` (`['comment']`, `packages/format/src/node-types.ts`), so L,
  the selection bar's Save for later (`moves.ts` `laterTakes`) and the number menu (`node-menus.ts` `later`, now read
  from `NODE_TYPES`) no longer send an app window to Later; Bring back still shows for one a ledger saved before.
  VERIFY_01 finding 4 closed. `packages/actions/tests/apps.test.ts` holds that a ledger with a saved app still folds it
  into Later. `app-cards.ts`: no `staging` dep; a window always goes on stage whole; panel notes and replies always on.
  `vb-app-frame.ts` `stage(host)` requires the window. The bar's drawer arrow and Open hide with Allow when zoomed far
  (`node-app.css`).
- **The page** (`apps/board/src/board/`): `controller.ts` wires the edges, the conversation box (`box` now required in
  `NoteDeps`), the bar's extras (`SelectionFlowDeps.extras`, was the optional `edges`) and the marks unconditionally;
  `controller/node-edges.ts` has no `on`/`skins` and sets no `data-vb-edges`; `cards/icon-library.ts` no `on`.
  Deleted: `notes/group-pins.ts`, `notes/bubble-clear.ts` (`footersNear`), `notes/note-hide.ts` (`createNoteHide`,
  `notesAct`, `NotePart`, `highlight`), `cards/size.ts` `bindSizeControl`, `isSizePick`; `notes.ts` lost every card
  path but the box (`press(id)`, `group`, `show(id, part)`; `reply` gone), `wiring.ts` lost `showNote`, `showReply`,
  `setSize` and the clicks on `button[data-act]`, `button[data-bookmark]`, `.vb-node-note`, `.vb-node-reply`,
  `data-size-pick`; `versions.ts` `ACTING` lost them too. `history-flow.ts` opens the conversation at a note or reply
  row (`show`), was `highlight`. `update-flow.ts` lost the updates tab (`toggle` became `start`, from the history box);
  `proposal-flow.ts` reaches the proposal through `openerOf` (the disc or the switch's chip), was `tabOf`. Keys: H is a
  node's history, Shift+H Hide answered, always (`key-help.ts` `HIDE_KEY`, was `hideKey(edges)`; `keyGroups` lost
  `edges`); `commands.ts` `SELECTION_COMMANDS` holds Bookmark all, Save for later and Width (`EDGE_COMMANDS` gone;
  `EdgeButtons` is `BookmarkButtons`). `board.css` lost the old read-only footer rules; `pointer.ts` and
  `note-outside.ts` lost the old note selectors.
- **Layout and containers** (layout fork): `LayoutOptions.branching`, `ModeInput.branching`, `RegionOptions.branching`
  gone, branches on rows always; flow direction always read; the one layout button only (`modeButton`, `layoutTipId`,
  `bindLayoutTips`, `region-layout-tip.ts`, the radiogroup row and its tooltip gone); the header's Flows always there.
- **Tokens** (`packages/tokens/src/tokens.css`, decision 13): Decision's fuchsia is the token's own value and the
  `.vb-board[data-vb-edges]` rule is gone. Diff:
  ```
  -  --vb-kind-decision: var(--vb-board-accent);
  +  /* Decision is off the notes pink, fuchsia (D-100 4; DD-14), so pink means notes and buttons only. Lc 79.9 / 52.7 on
  +     the card. */
  +  --vb-kind-decision: light-dark(#a21caf, #e879f9);
  -/* Decision moves off the notes pink to fuchsia (D-100 4; DD-14), on a board drawing the new node
  -   (data-vb-edges, set with nodeEdges) until T_04 makes it the token's own value. Lc 79.9 / 52.7
  -   on the card. */
  -.vb-board[data-vb-edges] { --vb-kind-decision: light-dark(#a21caf, #e879f9); }
  ```
  plus three comments that named `nodeEdges`. `tests/plugin/token-contrast.spec.ts` `dress` no longer sets `vbEdges`.
- **Gallery** (gallery fork): no removed flag read; `one-tab-section.ts`, `group-notes-section.ts`, `layout-tip-section.ts`
  deleted; about 20 sections redrawn on the edged node (history, size, bookmark, lock, node, note bubble, parking,
  proposals, updates, update signals, app frame, app window, edges, Command Lens, selection bar, mini boards, flow).
  Feature ids `nodeEdges`, `skins`, `appWindow`, `cardHistory` became `node-edges`, `command-lens`, `app-window`,
  `card-history`. VERIFY_01 finding 15 closed.
- **Tests**: unit tests rewritten or deleted with the code (`node-change-tab`, `group-notes` deleted; key, command,
  node-types, apps, gallery-fixture and 14 ui node tests rewritten); page specs: `one-change-tab`, `tab-place`,
  `group-note`, `hover-tip`, `layout-tooltip` deleted, about 60 rewritten to drive the marks, the box, the badge and
  the history box; no `?flags=` names a removed flag.
- **Docs** (docs fork): `components.md`, `api.md` (97, 139, 148, 156, 158), `apps.md`, `plugin.md`, `performance.md`,
  `words.md`, `apps/board/README.md`, `packages/ui/src/note-bubble/pattern.json`, and the decisions draft
  (`2026-11-11_board-ui_app-window-handover/design-decisions.md`: each item marked "Built, T_04" with its file and
  symbol; DD-17, DO-04, DO-05 "Not built").
- **Budgets** (PLAN.md § House Rules, point 351): none could be restored. Measured after the removal: page 201.0 KB of
  200 (was 211.1), plugin `view/board.js` 195,372 of 190,000 (was 204,111), `view/board.css` 24,723 of 22,000 (was
  27,530). The new node's marks, menus, conversation box, skins and fonts' CSS outweigh the footer they replaced. Per
  the brief nothing was raised: the temporary figures were lowered to just over the measure (`verify-weight.mjs`
  `PAGE` 201.1, `plugin-build.test.ts` `BUDGET` 195,400 and 24,800, `performance.md`), and a size pass is a tracker
  row.

#### Verification

- `npm run check` 0 errors; `npm test` 2,624 + 14 pass, 0 fail; `npm run gen -- --check` current; `npm run verify` ok
  (42 warnings, none new in kind); page 200.95 KB.
- Full page suite (`VB_TEST_WORKERS=3`, `nice -n 15`): run 1 with `--update-snapshots=changed` 16:09-16:27, 1,039
  passed, 15 failed (all fixed above); final run 16:46-17:00 (13.7 min), 1,060 passed, 1 failed (`proposals.spec.ts`
  Accept all: the test pressed Esc before the lazily loaded box had opened; it now waits for the box, then passed 3 of 3
  with `--repeat-each=3`), 2 skipped, 10 `budgets` not run by the dependency, then run alone: 10 passed.
- Plugin suite (`VB_TEST_PORT=7590`): first run 94 passed, 22 failed (the plugin specs still pressed `button[data-act]`,
  the updates tab and H); rewritten through the marks (`tests/plugin/harness.ts` `answerNode`), Shift+H, the badge and
  the history box; then 116 passed.
- A search for each removed flag finds nothing outside `docs/decisions.md`, `cortex/`, task files and the bot eval's
  git-ignored reports (same-named symbols that are not the flags remain: `cardHistory` in `#actions`, the words key
  `flowDirection`, the region's `notePreview`). Removed class names survive only in six guard tests that assert their
  absence (`node-edges.test.ts`, `node-window.test.ts`, `node-template.test.ts`, `gallery.spec.ts`, `size.spec.ts`,
  `parking-replies.spec.ts`).

#### Issues & Resolutions

- Page bugs found once the old paths were gone, fixed with their causes: an Edit opened from the conversation box that
  removed its note closed everything (`notes.ts` `place`: back to the box); a history row's note opened nothing
  (`history-flow.ts` `show`, and its close event now bubbles); Accept or Reject left an empty proposal box open
  (`proposal-flow.ts`); on macOS a Ctrl+press on a node opened its actions list, breaking Ctrl+click selection and
  Ctrl+drag panning (`mark-flow.ts` `onMenu`: a Ctrl+press with the main button keeps the board's meaning); an app
  window's frame kept a stale pointer mark after Esc, so Tab back in drew no ring (`vb-app-frame.ts`: focus moves are
  read again on the page's `focusin`); the window bar's drawer arrow and Open drew under 24px far out (`node-app.css`);
  the selection pill sat 1.5px over a node's grown marks at 30% (`pillGap` takes the marks' rise, `markGrow`); the
  gallery's stacked open boxes overlapped the next (`gallery.css` `.g-tips-stack`).
- Specs that measured the header at 1300 or 1400px expected the full form; with Flows always in the bar it starts at
  1428px (FIX_01's `FLOWS_W`) and Edit shows from about 1513px: `read-only`, `read-only-toggle`, `current-folder`,
  `ledgers` now use those widths (`FULL_MIN + FLOWS_W`); `board.spec` hovers a short rail before its layout button.
- Screenshots renewed once (`--update-snapshots=changed`, one full run, then the shots of tests that failed before their
  screenshot and of the gallery's stacked boxes): 124 changed, 10 new (renamed gallery features), 4 removed
  (`gallery-cardHistory-*`, `gallery-groupNoteOnce-*`). Looked at 46 of them, light beside dark, in contact sheets
  (`temp/t04/look/`): board, bookmark, app window, big titles, changed cards, chat alongside, chat, Command Lens (two),
  node, node size, note bubble, region, selection bar, tool rail, node edges, folder picker, open list, parking, review
  list, proposals, card history, flow branching, layout control. Two looked wrong and were fixed at the cause (the
  stacked boxes above); two are older than this set and listed as rows (the flow sample's width, the selection bar's
  caption). The plugin suite has no screenshots.
- `packages/format/fixtures/gallery.ledger.jsonl` card bodies still describe the old node (pins, the diamond, Hide):
  they are in the frozen part `legacy-folds.test.ts` holds byte for byte, so they need a ruling (tracker row).

#### Caught Beyond the Brief

- Five older flags only kept old-node code alive (listed above); removed with it rather than left gating nothing.
- `notes-hide` / `notes-show` stay in the format but nothing on the page sends them now; the fold reads old lines.
- The gallery's app sample saved for later (`gallery-fixture.test.ts`) is the one act no type offers now: kept, as any
  older ledger keeps such a line, and named in the test.

#### Deviations from Plan

- Budgets not restored (above): figures reported, nothing raised, as the brief asked.
- Step 6's rows plus the run's own are in the return block, not in `cortex-tasks/tracker.md` (the orchestrator's).

---

## On Completion

1. Fill in Implementation Notes above; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append **your own** LOG entry to `cortex/LOG.md` — one line, terminated with a newline, append-only:

   ```
   [[YYYY-MM-DD HH:MM]] [board-ui] T_04: [what you did] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/T_04_defaults-on.md]]
   ```

   Cite files by path + symbol, never by line number. Never write the set's entry or to `AUDITED.md`.
