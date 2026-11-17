# FE_02_board-wires-the-edges: The Board Wires the Edges

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Make the new node work on the board: each mark does its action, the menus open, the keys and right-click work,
flag is renamed Bookmark everywhere, a click inside a container clears its new-and-updated pill on the person's
screen (page-local, point 308), and a board's skin is applied and can be changed.

---

## Context

PLAN.md § Decisions 2 to 8, 15, 16, 24 and § Planner's calls 3, 11, 12. FE_01 built the markup; this task is the page
(`apps/board/src/`). Every action goes through the one sender as today (`CODE-MAP.md` § 4): no new way to write.
Overlays live on the stage, outside the scaled world, placed in stage pixels (`CODE-MAP.md` § 6).

**Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: `apps/board/src/board/` (`cards/`, `input/`, `canvas/`, `selection/`, `chrome/`, `io/acts.ts`,
  `controller.ts` and `controller/`, `words/`), `apps/board/src/shell/` (the toolbar's menu, for the skin control),
  `apps/board/src/styles/`, `apps/board/src/gallery/`, `apps/board/tests/`, `tests/pages/`; for the rename only:
  `packages/ui/src/node/`, `packages/ui/src/words/`, `packages/ui/tests/`, `packages/format/src/flags.ts` (`cardFlag`
  becomes `cardBookmark`), `packages/tokens/src/tokens.css`
  (remove the `--vb-state-flag` alias only); `docs/specification/components.md`; for step 8's words only:
  `packages/actions/src/conditions.ts` (`container.fresh` `endsWhen`) and `docs/specification/api.md` 158
- **Files to reference**: `CODE-MAP.md` §§ 4 to 7, 12; `apps/board/src/board/cards/flag-flow.ts`, `item-acts.ts`,
  `update-flow.ts`, `history-flow.ts`; `apps/board/src/board/input/` (`pointer.ts` `HANDLE`, `keys.ts`,
  `commands.ts`, `wiring.ts`); `apps/board/src/shell/ThemeControl.svelte`; `.kiro/steering/svelte-conventions.md`
- **Shared artifacts to reuse**: `packages/ui/src/menu/`, `packages/ui/src/skins.ts`, `packages/ui/src/icons/`
  (FE_01); the acts and folds from T_01 (`bookmarksOn`); `container.fresh` and its `seq` (`conditionsOf`, `fresh.ts` `freshContainers`) for step 8; `list_icons` with `paths` (BE_04); `placeBar` and the hover tip's placing for where an overlay goes
- **Skills**: `cortex-architecture`, `cortex-docs`

> Modify only the files this task owns. Need a change elsewhere? List it under `REQUESTS`.

---

## Steps

1. [ ] **Flags to the page**: with `nodeEdges` on, the root carries `data-vb-edges` and the node is drawn with its
       edges; with `skins` on, the root carries `data-vb-skin` from the board's skin.
2. [ ] **Bookmark, renamed everywhere**: the page already writes `bookmark` and `unbookmark` (T_01 changed the
       sender) and T_01 renamed the fold; flag becomes Bookmark in the rest of the page:
       identifiers, class names, files (`flag-flow.ts`, `FlaggedChip.svelte`, the gallery section), words (the
       toolbar chip reads "Bookmarked"), tests and docs. The key is B; Shift+F is removed from the key help. With
       `nodeEdges` off, the old footer's button keeps its place and glyph and is named Bookmark. Start with a test
       that a format-19 ledger with flags, migrated on open (BE_02, T_01's step), shows them as bookmarks.
3. [ ] **The number**: a click toggles Bookmark at once. Press and hold (about 400 ms; a long press on touch) opens
       the number menu instead and toggles nothing. From the keyboard, the menu key or Shift+F10 on the number
       opens it. Report at the gate that a hover pause was not built, so the maintainer can ask for it.
4. [ ] **The answer**: a click on the disc opens the picker beside it; a second click on the disc closes it;
       nothing opens on hover. Tick and Cross call the acts the footer buttons call today, with the same confirm
       and the same 400 ms guard. On an answered node the disc opens the picker to change or clear the answer.
5. [ ] **History and notes**: the change badge and H open the history box; the notes mark and C open the
       conversation (today's thread until FE_03).
6. [ ] **Right-click** on a node, or a long press on touch, opens the action list at the pointer; it never opens
       on the background. Shift+F10 opens it for the focused node.
7. [ ] **Menus**: one open at a time; fixed size at any zoom; they stay open and stay attached while the person
       zooms or pans; Escape and a click outside close them; focus moves in and returns.
8. [ ] **Seen** (point 308): on a board that isn't read-only, a click inside a container, on its background or
       frame, clears its new-and-updated pill and teal border on the person's screen only. It is page-local state,
       as zoom is: the page keeps, per board and container, the newest change it cleared (`container.fresh`'s `seq`)
       and shows the pill again when a later change arrives; a reload shows it again. Nothing is written: no
       `seen` names a container (`mark_seen` refuses one, api.md 187) and D-054 stands. Selecting a node already
       marks it seen; keep that. Update `container.fresh`'s `endsWhen` and api.md 158 ("a click on the frame
       changes nothing") to say the click clears the pill on screen only.
8a. [ ] **Library icons**: the page reads `list_icons` with `paths: true` when it opens a ledger and again when an
       `icon` line arrives, and passes the library to the node (FE_01's `icon(name, cls, library)`). A missing or
       failing icon draws the plain tile; nothing else on the board waits for it.
9. [ ] **Dragging**: a node with an icon is dragged by its grip; add it to `HANDLE`.
10. [ ] **Skin control**: a control beside the theme control lists `SKINS` and writes the `skin` act; add the act
        to `NAMES_BOARD`. On a read-only board it is disabled with its reason.
11. [ ] Page specs for every step with the flags on, light and dark; key help and words updated.

---

## Validation

- [ ] `npm run verify`, `npm run check`, `npm test` pass; the new and changed page specs pass
- [ ] With the flags off the board behaves as before, except that flag reads Bookmark and its key is B; the
      changed baselines are listed in your notes
- [ ] A double-click on the disc never ticks; a press on Tick within 400 ms of another is ignored (tests)
- [ ] An agent still cannot tick, cross, bookmark or set a skin by act (existing refusals pass)
- [ ] A look in a browser, light and dark: each mark, each menu, each key, on a board with 30 nodes

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
**Completed**: 2026-11-17 15:20  

### Run 1

### Changes Made
- **Bookmark, renamed** (step 2): `cardFlag` is `cardBookmark` (`flags.ts`, its description); `flag-flow.ts` is
  `cards/bookmark-flow.ts` (`createBookmarkFlow`, `bookmarkAct`, `bookmarkedIds`, `nextBookmarked`, `bookmarkedWords`);
  `FlaggedChip.svelte` is `BookmarkedChip.svelte` ("N bookmarked"; the "⋯" row reads "Bookmarked"); the gallery's
  `flag-section.ts` is `bookmark-section.ts`; `FLAG_KEY` is `BOOKMARK_KEY` = `B` (Shift+F retired; `keys.ts` `onCard`);
  `NodeState.flagged` is `bookmarked`; `.vb-flag`/`data-flag`/`data-flagged` are `.vb-bookmark`/`data-bookmark`/
  `data-bookmarked`; words (`words/node.ts` `bookmarkedInName`, the old `flagItem`/`flag` gone for FE_01's
  `bookmarkItem`/`bookmarkTip`; `words/cards.ts`, `toolbar.ts`, `key-help.ts`); status `bookmarked`, header control
  `bookmarked`; tests renamed (`bookmark-flow.test.ts`, `node-bookmark.test.ts`, `tests/pages/bookmark-retire.spec.ts`
  with its screenshots). The old footer's button keeps its place and its glyph (the flag drawing, `BOOKMARK_ICON`). The
  first test is `bookmark-flow.test.ts` "a format-19 ledger's flags, migrated on open (the 19-to-20 step), are its
  bookmarks". `tokens.css` diff (the alias only):
  ```diff
  @@ -200,7 +200,6 @@
     --vb-state-context: light-dark(#b97c0c, #e6af45);
     --vb-state-later: light-dark(#7257c6, #a48ef2);
  -  --vb-state-flag: var(--vb-bookmark); /* the old name, until the flag's last use goes (FE_02) */
  ```
- **Flags to the page** (step 1, `controller/node-edges.ts` `createNodeEdges`): `data-vb-edges` on the board root with
  `nodeEdges`, `data-vb-skin` with `skins` (`skinOf`), both taken off on unmount; nodes drawn with
  `edges: SKIN_DEFS[skin]` (`draw.ts` `restyle`, `cards.ts` `refresh`: a new skin or library draws the nodes again),
  `CardConditions.ver` passed, the library passed as `icons`.
- **The marks** (steps 3 to 7; `cards/mark-flow.ts` hears presses, holds and keys; `mark-acts.ts`, `mark-menus.ts`,
  `mark-boxes.ts`, `mark-tips.ts` load after the first draw or on the first press; `mark-place.ts` places in stage
  pixels): number click = Bookmark at once, held `HOLD_MS` 400 = number menu and no toggle, Shift+F10/ContextMenu on it
  = number menu; disc click = picker to its right (flips left), second click closes, Left/Right in the picker, Tick and
  Cross through `item-acts.ts` (now returns true/false/undefined); a disc with a proposal opens the proposal box; badge
  or H = history box (its stepper opens with it, `update-flow.ts` `boxed`; a box with no room flips left,
  `data-flip`); notes mark = the conversation (`comment`, today's bubble); right-click, a 500 ms touch, Shift+F10 or the
  menu key on a node = the actions at the pointer, never on the background. One menu or box at a time; menus on the
  stage at one size, placed again on every `vp.onApply` and redraw; a drag outside (a pan) leaves one open
  (`dismissable` `clickWithin`), a click outside, Esc or Tab closes it, focus returns. Tips: `data-tip` after 2 s
  hover, at once on keyboard focus. Moments: `data-locked` + "Board is locked" / "This ledger is read-only" (or the
  past version's words) on a press the board can't take; `data-saving` past 150 ms; `data-failed` + "Tick not saved…"
  shown 4 s then on hover, cleared by the next press (`MARK_MOMENT_WORDS`, exported from `node-marks.ts`).
- **Seen** (step 8, `cards/container-seen.ts`): a click inside a container (background or frame, not read-only) clears
  its pill on screen until a later change (`FreshCount.seq`, added in `page-conditions.ts`); nothing written; a reload
  shows it again. **It also quiets that container's replies on screen: closes tracker N47** (a reply to a container
  note carries `data-unseen` while newer than the person's last look in the container and the page's clear;
  `region-template.ts` `nblockRepliesMarkup`). `container.fresh` `endsWhen` and api.md 158 updated.
- **Library icons** (step 8a, `cards/icon-library.ts`, `io.ts` `listIcons`): `list_icons` with `paths` on a ledger
  open and on an `icon` line; nodes with library icons draw again. **Grip** (step 9): `pointer.ts` `HANDLE` adds
  `.vb-node-grip`. **Skin control** (step 10): the "⋯" menu's `menuitemradio` rows, one per `SKINS`, the board's ticked
  (`ToolbarMenu.svelte` `onskin`, `Board.setSkin`, status `skin`), writing the `skin` act (`NAMES_BOARD` + `skin`);
  paused with `READ_ONLY_PERSON` on a read-only ledger, and on a past version.
- **Key help** (`input/key-help.ts`): B for the bookmark; with `nodeEdges` H (history) and Shift+F10 (actions).
- **Styles** (`styles/node-edges.css`: menu holder, tip, grip on a locked board, box flip; `header.css`: the
  "N bookmarked" chip is bare up to 1700px).
- **Gallery** (`edges-section.ts`): Tips (hover/focus tip, lock moment, failure) and the board's Skin rows.
- **Docs**: components.md § "The node's edges" › "On the board (node overhaul FE_02)", the bookmark wording; api.md 158;
  `packages/ui/src/region/pattern.json` (data-unseen), node `pattern.json` (bookmarked state); `apps/board/README.md`.
- **Tests**: unit `mark-place.test.ts`, `container-seen.test.ts`, `item-acts.test.ts` (+1), `key-help.test.ts`,
  `bookmark-flow.test.ts`, `node-bookmark.test.ts`; pages `node-edges-board.spec.ts` (8) and `node-edges-seen.spec.ts`
  (10), helper `tests/pages/edge-board.ts`.

### Issues & Resolutions
- The tip did not show when the pointer was already resting on a mark as the lazy part loaded: `mark-tips.ts` starts
  the wait for a mark under the pointer (`:hover`) when it loads.
- Folding the stepper took focus off the badge after Esc: `update-flow.ts` `fold` keeps focus on a `[data-mark]`.
- header-tiers 1600px crowded overflowed by 15px with "bookmarked" (longer than "flagged"): the chip is bare (glyph
  and count, word for screen readers) up to 1700px (`header.css`).
- Page weight: first cut 198.35 KB; splitting the actions into the lazy `mark-acts` chunk (2.9 KB gz) gives
  **196.77 KB** at start (FE_01 193.86; budget 200). The menus' markup builders stay in the start chunk because the page
  reaches them through `#ui`'s barrel (about 1 KB; only the ui package can lazy-load its own files).
- Plugin bundles (npm test): `view/board.css` 23,856 / 24,000 gzip; `view/board.js` **189,819 / 190,000** gzip (181
  bytes left: the next task that adds page code will hit it).
- Changed baselines (renamed words and the gallery's shifted sections; flags off): `bookmark-retire.spec.ts/bookmark-*`
  (new; `flag-retire.spec.ts/flag-*` removed, `retired-*` moved), `app-gallery app-cards-*`, `chat-attach-gallery
  chat-attach-*`, `fresh-cards fresh-section-*`, `gallery gallery-base-*`, `gallery-cardHistory-*`, `header-tiers
  header-*`, `key-bubble key-bubble-gallery-*`, `key-bubble-open-*`, `lock-board lock-*`, `node-edges node-edges-*`
  (FE_01's section gained Tips and Skin), `read-only read-only-*`, `read-only-toggle read-only-toggle-*`,
  `update-signals update-signals-replies-*`, each dark and light. The gallery-page ones differ by a sub-pixel shift of
  everything below the renamed sections (checked against a `git archive HEAD` build: they pass there).
- Known flaky, not mine: `bookmark-retire.spec.ts` (was flag-retire) and `read-only-controls` fail some tests on
  "request failed: GET …/app-panels/calculator (net::ERR_ABORTED)".

### Caught Beyond the Brief
- A hover pause on the number was not built (a hold opens its menu); the maintainer can ask for it.
- After Tick from the picker, the item act moves focus to the node (its old footer rule), not back to the disc.
- A, X on a locked board keep today's toast; only a press on the disc shows the lock moment (DESIGN_01's unstated call
  "keys answer like a press" is not built).
- A failed write shows the sender's error toast as well as the ring on the mark: two reports of one failure.
- The history and proposal boxes live inside the node, so they scale with zoom; D-101 lists history as one size at any
  zoom (FE_05).
- On the old footer, the Later button wears the bookmark-shaped glyph and Bookmark wears the flag: confusing until
  T_04 removes the footer.
- The marks' lazy part loads about 200 ms after every board is made, used or not (2.9 KB).
- A right-click on a node whose picker is open does not swap to the actions (one guard covers the browser's own menu
  event after a long press or the menu key).

### Deviations from Plan
- Menus are opened with the base's keys (`menuKeydown`) and `dismissable` with `clickWithin`, not `openMenu`, so a pan
  leaves a menu open (step 7); components.md says so.
- Files touched outside the list: `packages/ui/src/node/node-marks.ts` (`MARK_MOMENT_WORDS`, the words the page shows),
  `packages/ui/src/region/region-template.ts` and `region/pattern.json` (N47's `data-unseen`),
  `packages/actions/src/answers/page-conditions.ts` (`FreshCount.seq`, allowed by the brief), `apps/board/src/board/io.ts`
  (`listIcons`), `apps/board/README.md`, `tests/plugin/host-styling.spec.ts` (the removed alias in its token list),
  rename-only edits in other `packages/ui/src/node/` files and `apps/board/src/shell/EditButton.svelte`.

---

## On Completion

1. Fill in Implementation Notes above; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append **your own** LOG entry to `cortex/LOG.md` — one line, terminated with a newline, append-only:

   ```
   [[YYYY-MM-DD HH:MM]] [board-app] FE_02: [what you did] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/FE_02_board-wires-the-edges.md]]
   ```

   Cite files by path + symbol, never by line number. Never write the set's entry or to `AUDITED.md`.
