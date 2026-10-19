---
task_name: Card Polish and Card History - App Card Layout, Hidden Notes, Note Times, History Box
created: 2026-10-19
completed: 2026-10-19
status: completed
categories: [board-ui, board-format, board-actions, board-app]
tracker:
---

# Card Polish and Card History - Task Status

> **Plan**: [PLAN.md](./PLAN.md)  
> **Created**: 2026-10-19 · **Go**: not yet given (maintainer: write up, don't execute)

---

## Instructions for Agents

1. **Read PLAN.md first** to understand full context
2. **Read notes from completed tasks** before starting yours
3. **Respect the Wave column** — do not start a task whose wave has not been reached
4. **Reuse Shared Foundations** — check that table before writing a helper, type, or component;
   if it is listed, import it, do not reinvent it
5. **If you need to deviate, STOP and inform the user**
6. **Update frontmatter `status`** per `cortex-task-exe`'s Task-Set Frontmatter Lifecycle:
   `planned` → `in-progress` when you start, → `completed` when the table below is all done
7. **Update your row** in the Task List table below when you finish
8. **Add implementation notes** to your task file and brief notes here
9. **No git commits** throughout these tasks
10. **The maintainer may have a board open** (`npm run board`): don't restart or stop their
    server; page tests use their own servers (`tests/pages/*-server.ts`)

---

## Task List

| # | ID | Wave | Model | Task | Status | Notes |
|---|-----|------|-------|------|--------|-------|
| 1 | BE_01 | 1 | standard | [Hide-notes marks and reply times in the format](./BE_01_notes-marks-format.md) | Completed | Format 18; `notesHiddenOn`, `BoardState.notesHidden?`, `CardReply.at` |
| 2 | FE_01 | 1 | strong | [App card: edge-to-edge panel, title, Allow in the footer, Z](./FE_01_app-card-layout.md) | Completed | Deviation: verify's page budget (+984 B gzip, 854 B over 150 KB) needs the maintainer |
| 3 | BE_02 | 2 | strong | [Card history model](./BE_02_card-history-model.md) | Completed | `cardHistory(events, id, labels?)` done and tested; step 3 resolved by the maintainer 2026-10-19 (point 20): no server read — the fold keeps each card's event times in memory, built in FE_03 |
| 4 | FE_02 | 2 | strong | [Hide notes and note times on cards](./FE_02_hide-notes-and-times.md) | Completed | One right-hand Hide/Show toggle (maintainer); `noteTime` in ui `node-time.ts`; `highlight` in `note-hide.ts`; 46 baselines updated |
| 5 | FE_03 | 3 | strong | [History button and box](./FE_03_history-box.md) | Completed | Per-card times in the fold (`card-times.ts`), ⓘ + box, flag `cardHistory`; +2,195 B gzip; appTitle axe finding left for FE_04 |
| 8 | AGENT_01 | 3 | standard | [Apps bring their own design](./AGENT_01_apps-own-design.md) | Completed | Skill v3.9; scenarios 29, 32; calculator ink fill and ring; dry run is a read-through only |
| 9 | FE_04 | 4 | strong | [App cards look like app windows; the name in the footer](./FE_04_app-card-window-look.md) | Completed | `appTitle` on by default; name in the bar (`node-app-apply.ts`); state view scrolls in the panel (FE_03's axe finding fixed); +459 B gzip; 46 baselines |
| 7 | FIX_01 | 3 | standard | [App panel focus ring only for keyboard](./FIX_01_app-frame-focus-ring.md) | Completed | Added 2026-10-19 (maintainer: pink border on click) |
| 6 | VERIFY_01 | 5 | standard | [Final verification and doc audit](./VERIFY_01_testing.md) | Completed | 7 of 8 PLAN criteria ticked; `test:pages` 560 pass, 1 fail (chat-context.spec.ts:139, race with the lazy-loaded chat; not this set), 6 serial tests after it did not run; board.spec screenshot failure is pre-existing; docs true; no pair under its APCA bar |

**Status Values**: `Pending` | `In Progress` | `Completed` | `Blocked` | `Deferred`

**Wave**: execution order, assigned by the planner. Same number = safe to run in parallel.
Waves run in ascending order; a wave completes before the next starts.

---

## Shared Foundations

| Artifact | Created by | Consumed by |
|----------|-----------|-------------|
| `notes-hide` / `notes-show` actions (`packages/format/src/ledger.ts` `CARD_MARKS`, `packages/actions/src/registry.ts`) and the fold of hidden cards (`packages/actions/src/card-flags.ts` or a sibling, exported from `packages/actions/src/index.ts`) | BE_01 | FE_02, BE_02 (excludes them) |
| `CardReply.at` (`packages/ui/src/node/node-core.ts`) filled from the reply event's `at` | BE_01 | FE_02 |
| Footer left-side slot for the app status (`footer()` in `packages/ui/src/node/node-template.ts`) | FE_01 | FE_03 (adds ⓘ on the right) |
| `noteTime(at, now)` time words (one helper, beside `versionTime` in `apps/board/src/board/versions.ts` or moved to a shared core file) | FE_02 | FE_03 |
| Note highlight: `data-note` / `data-reply` scroll-and-highlight on a card (`apps/board/src/board/notes.ts` or `note-views.ts`) | FE_02 | FE_03 |
| `cardHistory(events, n)` → `HistoryRow[]` (`packages/actions/src/card-history.ts`) | BE_02 | FE_03 |

---

## Implementation Notes

### BE_01: Hide-notes marks and reply times in the format
_Status:_ Completed  
_Notes:_ Ledger format 18, `notes-hide` / `notes-show` built as the flag is (`CARD_MARKS`, `PRIVATE_ACTIONS`, api.md 156). Fold: `foldNotesHidden` / `notesHiddenOn` in `packages/actions/src/card-notes-hidden.ts`, `LedgerState.notesHidden`, and `BoardState.notesHidden?: Set<string>` (board numbers, absent when none; read it as `s.notesHidden?.has(id)`). `CardReply.at` (ISO) is filled in `parking.ts`; `replyEntry` / `ReplyEntry` do not carry `at` yet (FE_02). Registry labels "Hide notes" / "Show notes", no key. Generated files regenerated (`npm run gen`, `npm run map`). `npm run verify` fails on the dist page-weight budget (sibling rebuilds), not on this task.

---

### FE_01: App card: edge-to-edge panel, title, Allow in the footer, Z
_Status:_ Completed (2026-10-19 12:20)  
_Notes:_ Footer slot for FE_03: `.vb-app-status` in `footer()` (`node-template.ts` `appStatus`), after the
state span, `flex: 1`; ⓘ goes on the right after `.vb-node-actions`. App cards now have a footer even
without a number. `AppCardView` is `control` / `reason` (no `ask` / `stop`). Menu: `app-cards.ts`
`createAppMenus` + `menu-keys.ts`. `APP_FIT` in `viewport.ts`. Flag `appTitle` (off) as `data-app-title`
on the world (`controller.ts`) and gallery `main`. **Deviation**: `npm run verify` page weight: HEAD had
130 B left; FE_01 adds 984 B gzip (154,454 B); maintainer to decide (raise `PAGE.budgetKb` / performance.md,
or savings). Gallery full-page screenshots were updated at 12:15 and include siblings' gallery state then.

---

### BE_02: Card history model
_Status:_ Blocked (model done; step 3 awaits the maintainer)  
_Notes:_ `cardHistory(events, id, labels?)` → `HistoryRow[]` in `packages/actions/src/card-history.ts`, exported with `HistoryKind` / `HISTORY_KINDS`. Takes the card's **identity** (FE_03: `idOf(s, board, n)`), not its board number, and `s.agents` as `labels`; any run of lines in order works (whole ledger or the card's own). `note` is set only while that note is still on the card; `reply` is the reply's `seq`. Numbers match the card's (`liveNotes`). Timing: 0.4 ms for a 1,001-line card (budget 50 ms, no history row in performance.md yet). Step 3: the page holds no lines and `read_ledger` filters by board only, so a card's lines can't be had in proportion; proposal A (card filter on `read_ledger`, contract first, sharing the model's match predicate) recommended, details in the task file. `npm test` passes; `npm run verify` fails only on dist page weight (siblings).

---

### FE_02: Hide notes and note times on cards
_Status:_ Completed (2026-10-19 14:10)  
_Notes:_ For FE_03: `noteTime(at, now)` and `fullTime(at)` (and `versionTime`, moved there; `versions.ts` re-exports it) in `packages/ui/src/node/node-time.ts`, from the ui front door. The highlight is `controller.ts` `noteHide.highlight(id, part)` (`apps/board/src/board/note-hide.ts` `createNoteHide`; `part` is `NotePart`, `{ note: seq }` or `{ reply: seq }`): `notes-show` first if put away, `vp.reveal` to the part, focus, `data-flash` ring for `FLASH_MS`; no page test until FE_03 calls it. Maintainer change mid-task: no pill; the head is the count (plain text, "2 notes · 1 new reply" while put away) and one toggle always on the right, Hide/Show (`button[data-notes]`). `BoardState.notesHidden` is now `Map<board number, seq of the hide>` (`.has` unchanged). Notes code split to `node-notes.ts` (node-core re-exports). `controller.ts` 303 lines (verify warns). Page weight: +1,285 B gzip at most (155,368 -> 156,653; the chat task built meanwhile); now 149,595 B with the chat lazy-loaded, verify ok. Baselines updated listed in the task file; chat.spec baselines left to the chat task.

---

### FE_03: History button and box
_Status:_ Completed (2026-10-19 14:55)  
_Notes:_ No server read: `packages/actions/src/card-times.ts` `foldCardTimes` (called at the end of `fold.ts` `applyEvent`) keeps `LedgerState.times`, per card `{ seq, at, kind, ver?, note?, cards?, agent? }` for `TIME_KINDS` only; `cardTimeRows(s, id)` words them with BE_02's `cardsAbout` / `saidOf` / `historyRow` (card-history.ts refactored to one matcher and one `SAY` table; its tests unchanged). ⓘ and box: `packages/ui/src/node/node-history.ts`, drawn by `footer()` with `NodeTemplateOptions.history` (flag `cardHistory`, on); the box is the card popover (`bindCardPopover(card, name, tabSel?)`, new `POPOVER_SHOW` / `POPOVER_CLOSE`), filled by `apps/board/src/board/history-flow.ts`. For FE_04: the ⓘ is `button.vb-act.vb-history`, last in the footer; footer fits on an S card and a 280 x 120 app card. Found: `app-states.spec.ts` appTitle test fails axe target-size (an invalid app card's "Check again" overflows the 160px panel into the footer under appTitle; the ⓘ moves Comment under it) — left for FE_04 / the maintainer. Baselines updated: card-image-{light,dark}, card-image-refused-{light,dark}, gallery-{light,dark}. Page weight +2,195 B gzip (152,031 B). controller.ts 305, fold.ts 308 lines (verify warns).

---

### AGENT_01: Apps bring their own design
_Status:_ Completed (2026-10-19 14:00)  
_Notes:_ Skill v3.9 (`SKILL.md` "Good to use"): neutral palette from the host, at most one accent of the app's own, never the board's accent (`--color-background-inverse`, `--color-ring-primary` are fallbacks), quiet hover and selection, `:focus-visible` only. `scenarios.md` 29 updated, 32 new; `NOTES.md` § Skill v3.9; `apps.md` § Host context. The calculator's main key and ring are now the ink (they took the board's accent); its copy `.visionboard/apps/calculator/panel.html` was synced (byte-equality test; not in the Allow hash). Dry run is a read-through, not live agents: run 29 and 32 with Claude Code and Kiro before relying on them. Kiro gets the text when the board next starts. `npm test` passes; `npm run verify` fails only on `modules.md` out of date (siblings; `npm run map`).

---

### FIX_01: App panel focus ring only for keyboard
_Status:_ Completed (2026-10-19 13:10)  
_Notes:_ A click in the panel draws no ring; Tab in does. `focusCame()` added beside `lastInput` in `apps/board/src/board/pointer-focus.ts` (`lastInput` is null by the time the frame's window blur is heard); passed to the frame by `wire({ focusCame })` in `app-cards.ts`; the frame sets `data-pointer-focus`, and both ring rules skip it (`app-frame.css`, `node-app.css`). Test: `app-cards.spec.ts` "the panel's focus ring". Page weight: about +0.3 KB gzip estimated (not built: shared dist); `npm run verify` still fails only on the 150 KB budget (151.9 KB with siblings).

---

### FE_04: App cards look like app windows; the name in the footer
_Status:_ Completed (2026-10-19 15:45)  
_Notes:_ Flag `appTitle` kept, now on by default (off: the old title, no name in the bar). Under it: no title drawn in any state (still in the card's name), the panel meets the top border (tabs draw over its top 9px), the footer is the window's bar (kind tint, hairline, border a step stronger; selection keeps its own border), and the app's name sits between `.vb-app-status` and the quick actions, cut with "…", whole in a hover/keyboard-focus tip (`bindAppNameTip`). App-card apply code moved out of `vb-node.ts` into `packages/ui/src/node/node-app-apply.ts` (`applyApp`, `applyPanelSize`). FE_03's appTitle axe finding: `.vb-app-state` scrolls inside the panel, never over the bar. Footer fits on one line at 282px with Allow, the cut name, Comment, Later, Flag, ⓘ. APCA: name on the bar 95.0 / 92.7. Page weight +459 B gzip (152,490 B). Specs now select an app card by its bar's name. 46 screenshot baselines updated (2 show the look, 44 a sub-pixel shift), listed in the task file. Found: grid columns stretch an app card but not its panel (pre-existing). Screenshots for VERIFY_01's eye check: `temp/fe04/`.

---

### VERIFY_01: Final Verification
_Status:_ Completed (2026-10-19 16:10)  
_Notes:_ Evidence per PLAN criterion (all on the working tree at HEAD b7a0296 plus today's changes; own scratch in `temp/v01/`, own server on port 4491, never 4466):
1. **Gates.** `npm test` exit 0 (1,525 + 10 timing, 0 fail); `npm run check` exit 0 (0 errors, 0 warnings; tsc clean); `npm run verify` ok, two length warnings (`controller.ts` 305, `fold.ts` 308), `modules.md` fresh (no `npm run map` needed); page weight at start 152,490 B (148.9 KB) against the 200 KB budget. `npm run test:pages` (full, under the lock, nothing else of mine running; the maintainer's `vite build --watch` and board on 4466 were left alone): **560 passed, 1 failed, 6 did not run** (13.5 min), log `temp/v01-pages.log`.
2. **The one failure: `chat-context.spec.ts:139` "a comment shows as one answers chip..."** (Test timeout waiting for `getByLabel('Note text')`; also fails alone: 3 of 4 isolated runs, the one pass was a run where the note editor won the race). Cause (probed): the spec's `open()` clicks `#chat-toggle`, then focuses card 2 and presses `c`; the chat's lazy chunk (lazy-load task) finishes drawing after that and focuses the composer, so `c` is typed into the composer (`.chat-cmp-text` value "c", active element the composer) and the note editor never opens. Passes on a clean checkout of HEAD (11 of 11, worktree under `temp/`, removed). So: **caused by the lazy-load task (`chat-lazy`), not by card-polish.** The 6 serial tests after it (`:159`..`:262`) did not run in the full run; in an isolated probe copy where the race was not hit all 11 passed. Not fixed (don't loosen tests). Suggested fix for the maintainer: `open()` waits for the composer focus (`expect(text(page)).toBeFocused()`), and/or the panel's load must not take the focus if the person moved it meanwhile (a real, small UX race for a slow chunk).
3. **`board.spec.ts` "screenshot (light/dark)": pre-existing, not caused here.** Run alone it fails identically on a clean checkout of HEAD (840 px dark, 822 px light) and on the working tree (same counts); the diff image shows only the toolbar's version chip and counts. In the full suite it passes (light and dark, run 50 and 53), because the baseline was captured after earlier specs wrote the test ledger. It depends on spec order, so a lone run fails; baseline not regenerated.
4. **Walk in a browser, light and dark** (`temp/v01/walk.ts`, screenshots `temp/v01/walk-*.png`, no console errors): panel gap to the card border 1.1 px each side (the border) and no `.vb-app-ask`, no "Nothing to allow"; Allow is the first footer control ("Allow app: Calculator. Not allowed yet"); Allow -> "Allowed ▾" -> Stop app (confirm) -> "Allow" -> Allow again, card height 528 px at every step; Z on the one app card fills 0.950 of the stage (1600x948), app + question 0.750; notes: Hide -> Show toggle, text gone, survives reload; the time chip is `display: none` idle and "Today 03:00 PM" on hover; history box lists "You sent note 1" and "Agent drew v1 · Verify walk", no note text, no flag word. Page tests that hold each: `app-cards.spec.ts` (end to end, Stop app, Z 95% / 75%, focus ring), `app-states.spec.ts` (every state, one size, edge to edge), `app-follow.spec.ts`, `notes.spec.ts` (Hide and Show, reload), `note-polish.spec.ts` (note time), `card-history.spec.ts`, `zoom-and-lasso.spec.ts`: all passed.
5. **Agent reads.** `api-flag.test.ts` (4 of 4) holds `get_board`, `show_node`, `show_container`, `list_open`, `list_boards`, `check_responses` against `notes-(hide|show)`; I added `temp/v01/agent-reads.test.ts` with a flag and notes-hide both in the ledger: the page's `read_ledger` shows ["flag", "notes-hide"], the five agent reads (2,627 B) match none of `flag`, `notes-hide`, `notes-show`, `notesHidden`. The history box page test (`card-history.spec.ts`) shows no note text and no flag.
6. **APCA (APCA-W3 0.0.98G-4g, `temp/v01/apca.ts`, colours read from the page, fills from screenshot pixels), re-measured light / dark**: Allow text on its fill 77.4 / 60.4 (tier 60); app name on the footer bar 95.0 / 92.7 (60); note time chip 94.3 / 71.6 (60); history row text 104.5 / 94.9 (60); history heading 74.8 / 49.8 (45); the (i) icon 66.7 / 46.6 (30). All match the tasks' numbers; none under its bar.
7. **FIX_01, AGENT_01, FE_04, the two single tasks.** FIX_01: `app-cards.spec.ts` "the panel's focus ring" passes (click no ring, Tab ring). AGENT_01: SKILL.md status v3.9 and its "Good to use" bullet say what `scenarios.md` 29 and 32 and `NOTES.md` § Skill v3.9 say (neutral host variables, one own accent, never the board's accent, `:focus-visible` only, restyle changes only `panel.html`'s style); the calculator's `panel.html` has no `:focus` rule and its copy in `.visionboard/apps/calculator/` is byte-identical (also a unit test); SKILL.md is 415 lines as NOTES says. Still only a read-through: scenarios 29 and 32 not run with live agents. FE_04: `app-states.spec.ts` "the window look" and "with the appTitle flag off" pass; screenshots of the wide and narrow app cards, light and dark, near and far: `temp/fe04/` (wide-*, narrow-*, narrow-tip-*, phone-*) plus `temp/v01/walk-*-1-needs-allow.png`; `appTitle` is on by default (`flags.ts`), the maintainer's call stands. Chat follow (`chat-follow.spec.ts`) and lazy chat (`chat-lazy.spec.ts`, `chat-panel`, `chat-send`) all pass; the lazy chat's chunks are not in the start page weight.
8. **Doc audit (cortex-docs)** over `components.md` (§ Notes beside cards item 8, § A card's history, the Z item, § App card incl. the window look, the states table, footer and popovers, the gallery list), `api.md` 156 and the 1124 lock line, `apps.md` § Host context, `chat.md` (follow, lazy load), `performance.md` (budget row, history paragraph), `packages/format/README.md` (format 18), `packages/actions/README.md`, `packages/chat/README.md`, `skills/vision-board/SKILL.md` v3.9: a script (`temp/v01/doc-claims.mjs`) checked every backticked symbol and path the day's added lines name against the source, and every quoted test title against the test files: nothing missing (the three it flagged are an escaped apostrophe, a prose fragment and a quote of the code's own string). LEDGER_FORMAT 18 and `LEDGER_FORMATS` to 18, openapi 1.28.0 (`openapi.test.ts`), flag defaults (`appTitle`, `cardHistory` on), registry labels, page budget 200 KB, no stale "Nothing to allow", `.vb-app-ask`, "N notes" pill, "format 17" or "75%" claim left in docs. No claim found untrue; no doc edited. Notes, not defects: `components.md` and `performance.md` carry no `updated` line (as before); `performance.md` names a date and who raised the budget (history, harmless).


---

## Completion Checklist

- [ ] All implementation tasks complete
- [ ] Verification task complete
- [ ] LOG entry created (see below)

---

## On Completion

When ALL tasks are done. This is the **orchestrator's** entry — the set. Each task already logged
itself on completion; do not restate those.

1. Update frontmatter: `status: completed` and `completed: YYYY-MM-DD`
2. Append the set LOG entry — one line, terminated with a newline, append-only:
   ```
   [[YYYY-MM-DD HH:MM]] [board-ui] Completed set: Card Polish and Card History → Task: [[cortex-tasks/board/2026-10-19_board-ui_card-polish-and-history/TASK-STATUS.md]]
   ```
3. `cortex-garden` picks the entries up from `LOG.md` later. Nothing here writes to `AUDITED.md`.
