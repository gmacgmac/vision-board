# FIX_01_verify-findings: What VERIFY_01 found

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) · **Findings**: [VERIFY_01_findings.md](./VERIFY_01_findings.md)

## Objective

Fix VERIFY_01's findings so a host gets what the spec promises. F1 and F2 block the set. The rest are fixed where the fix is small and safe; any left is stated in the spec or listed with its reason. Standalone doesn't change for a person.

## Steps

1. Each fix starts with a failing test, in `tests/plugin/` where a host sees it.
2. F1 and F2. Then F12 (a security line), F4, F5, F3, F6, F7, F10, F11, F13, F15. Then F8 and F9: fix by scoping if it moves no screenshot; otherwise narrow the spec's sentence to what is true.
3. F14: `:root`'s `color-scheme` is a rule reaching outside the root. If the plugin's sheet needn't carry it, move it to the standalone page's. `docs/principles.md` is protected: anything there is a proposal.

## Validation

- [ ] `npm run test:plugin` and `npm test` pass (the timing half of `npm test` didn't, see Run log); no screenshot changes; each finding has an outcome in the notes: fixed, stated in the spec, or left, with why

## Implementation Notes

**Status**: Completed · **Completed**: 2026-10-31

Port 7200. Bug fixes each started from a failing test in `tests/plugin/` (20 failed before, then none).

### Outcome of each finding

| Finding | Outcome | What |
|---|---|---|
| F1 Reply outside `root` | Fixed | `.vb-reply` is absolute in the root, `92cqw`; its place on the standalone page is the same, since the root fills the window there. `short-pane.spec.ts` |
| F2 `unmount` throws | Fixed, both ways | The spec says `settings.on` and `chat.status.on` return the unsubscribe; `teardown.ts` `finishAll` runs every step whatever one does (not a function: passed over; throws: `console.error`, the rest run). Used by `mount`, `controller`, `chat-side`, `boards` |
| F3 repo commands | Fixed | Board words are general ("Paste it into chat.", "Could not read the board."); the commands moved to `shell/words/page-help.ts`, through the new `BoardPage.help`, so standalone reads as before. `words.json` and `view/board.js` hold neither `npm run` nor `apps/board/bin`. Left: `theBoardServerIsNot`, "The board server is not reachable. Is it running?", names no command, and a host's person may read it |
| F4 no recovery | Fixed | A failed first read notifies once, says so over the stage and subscribes; the next `events` reads again, with no retry of its own. A later read that fails goes to `fail`, where it was an unhandled rejection. No raw `TypeError` |
| F5 `chat.send` rejects | Fixed | `mount.ts` `send` answers words (`theChatCouldNotSend`), so Send's error state and a host's own `view.send()` both get them; `console.error` keeps the cause. A send resolving undefined reads as null |
| F6 focus falls out | Fixed | Any draw that takes the focused card away (H, a bot's `retire`, an answer landing with Hide answered on): `controller.ts` `redraw`. Reply: `ReplyPanel.svelte`, by Esc or by ✕. All to the stage |
| F7 `reveal` | Fixed | `n` and `seq` not on the board, hidden or removed: `notify`, no field, no focus taken. `go.why`, `Board.revealCard`, `revealNote`. Standalone never calls `reveal` with `n` or `seq` (`chat-bridge.ts`), so nothing changes there |
| F8 ids | Fixed | Every id under a host carries a prefix, first mount `vb1-`; only the first mount with `host.page` stays bare. CSS on ids keeps its specificity through `:is(#board, [id$='-board'])`, which also fixes the second mount's picker width and arrowheads. `tests/pages` fake-host specs and `tests/plugin` updated |
| F9 element rules | Fixed, and the sentence narrowed to what's true | `base/root.css` takes back `span`, `div`, `a`, lists, tables, sectioning and more, and `svg`, `img`; the root sets the text properties it would inherit. `host.css` now carries those loud rules, so every plugin spec runs under them. Not `all: revert` for these: it put first draw of 1000 cards at 640 to 980 ms against 520 to 550 at HEAD. Named properties: about 570. The spec lists what doesn't hold |
| F10 window caps | Fixed; a modal stated as the exception | `.vb-access` `40cqh`; `.vb-tip` by the new `--vb-root-w`, because a tip sits in a container's frame, where `cqw` means the frame and would move screenshots. `.vb-dialog` and `.vb-archived-list` stay by the window, as a modal does; § Modals and § Size agree |
| F11 access strip | Fixed | Stacks under 560 of the root's width, for `data-placement='board'` only, so the gallery's screenshots stay |
| F12 agent with no id | Fixed | `engine.ts` `namedCaller`: no id, an empty one or a non-string is no caller, in `route` and `tools.call`. See below |
| F13 spec gaps | Stated, A to H | A, B, C, D, E, F, G, H are lines in `plugin.md`. C also a fix: a `body` function that throws is 400. G differs from VERIFY_01's wording: `agents.json` does hold the id with the hash, but no call gives it back, so the spec says that |
| F14 `color-scheme` | Fixed for the folder | The build takes it off `:root` and `[data-theme]` (`hostKeepsColorScheme`, three rules or the build stops); `plugin/color-scheme.css` puts it on the board's root. The tokens are untouched, so standalone is the same. Open point 8 reworded. A host's `<input>` stays its own |
| F15 small | `app` item fixed; rest left | `write_board`'s input no longer names `.visionboard` (`inputEdits`). `keepView`'s note is `flags.ts`: a request. The region-note observers: left, no real leak (VERIFY_01 measured) and the pattern has no teardown to hang it on. Bundle comments: left, not a fault |

### F12: what could have been written before the fix

Probed on the built engine at `b6228d5` (`temp/fix-01/f12.mjs`), caller `{ by: 'agent' }`:

- `write_board` with a `board` item on a board that didn't exist: a `board` line, `by: agent`, no `agent`. So a board nobody holds, which every agent then has to ask for.
- `request_grant`, on any board, the person's too: a `grant-request` line with no `agent`.
- Nothing else: `region` and `node` failed `needs-grant`, `propose` and `reply` found no card, a title on a person's board failed the ledger's own check, and `act` was refused 403. So no ✓, ✗ or approval, and no line was editable. Lines already written stay, the ledger being append-only; a host that lost its id before this fix may hold such lines.

### Decisions, for the maintainer

1. **F8**: `vb1-` under a host and bare only on the board's own page, by `host.page`. It changes every id a host could see, and `plugin.md` tells a host not to select by them.
2. **F3**: `BoardPage.help` is a new standalone-only member. Standalone's wording stays word for word.
3. **F14**: a build step editing the emitted sheet, because the tokens are protected and shared. If the maintainer would rather move `color-scheme` out of `tokens.css`, the step goes.
4. **F9**: named properties, not `all`, for cost. So an unusual property on `span` or `div` still reaches in, and the spec says so.
5. **F2**: a step that throws is reported on the console and `unmount` still returns. Rethrowing would stop a host's own teardown after it.
6. **Beyond the list**: `unmount` while the first read was on its way left a subscription: found while changing `boot`, fixed, `view-gives.spec.ts` "unmount while the first read". VERIFY_01 had this as safe.

### Two flakes that aren't this task's

Both reproduced on an export of `b6228d5`, or named at an earlier gate. Neither moved a screenshot.

- `host-styles.spec.ts` "the gallery's samples": target 190, a mini board, differs by 3 against a limit of 2. HEAD: 2 of 6 runs.
- `host-styles.spec.ts` "the board in a 550px pane": the zoom's hidden status text, seen or not yet (wave 3's gate has it). A timing of the test, not a layout.

### Run log

The machine sat at a load average of 50 to 58 for the whole run, from other sessions.

- `test:plugin`: 142 passed on `--repeat-each=2` (71 tests), on the final code.
- `verify` (30 warnings, none new), `check`, `gen-api --check`: clean.
- `npm test`: the unit half 2187 of 2187. **`test:timing` did not pass:** 3 of 14, then 5 of 14 on a rerun, a different set each time (server start, layout, Markdown, search). None of them is code this task touched. VERIFY_01 had it at 14 of 14: run it again on a quiet machine.
- Page specs, on the last CSS: every spec with a screenshot, plus `board-chrome`, `board-host`, `board-guest`, `host-styles`, `live-boards`, `toolbar`, `focus-ring`, `perf`: 477 passed, 3 failed, none on a screenshot. The two `host-styles` flakes above, and `perf.spec.ts` "first draw of 1000 cards" at 1305 ms.
- After `redraw` took on the focus: `focus-ring`, `select`, `board-host`, `board-chrome`, `board-guest`, `hide`, `toolbar`, `go-to-card`, `send-access`: 93 passed. The screenshot specs were not run again after that one change, which draws nothing.
- **The first-draw budget is load, by comparison:** back to back on an export of HEAD and this change, 948, 962, 1221 ms against 980, 1064, 1245 ms. In a lighter spell earlier, measured one after the other and not interleaved, 520 to 550 against about 570. About 3 to 9% slower, the cost of the element rules (F9). Under load both sides pass 1000 ms: the set gate should judge it on a quiet machine.
- `perf.spec.ts`' other 10 budgets passed.
- `git status`: no file under `__screenshots__` changed. Nothing re-baselined.
- A look in a browser, light and dark, in a 360 by 560 pane (`temp/fix-01/look-*.png`): the strip stacks, Reply sits in the pane, its hint reads "Paste it into chat." Not looked at under real standalone after the last CSS; the screenshot specs stand for it.

### Run 2

From the re-check at `85136aa` (`VERIFY_01_findings.md` § Re-check after FIX_01). Port 7400. Each bug fix started from a failing test in `tests/plugin/`: 5 failed, then none.

| Finding | Outcome | What |
|---|---|---|
| F4 | Fixed | `boards.ts` `failed`: one notice from the first failed read until one works, whichever way each fails, and a new outage is a new notice. A failure that isn't an `ApiError` reads "Could not read the board.", so a 200 of HTML shows no `TypeError` at any time. `live.watch(failed, worked)` says which. `view-hooks.spec.ts` "events: while reads keep failing", "events: a first read that fails, and later ones" |
| F7 | Fixed | `controller.ts` `zoomToCards` goes only to cards that are drawn. None drawn but on the board: `cardsAreHidden` through `notify`. None on the board: as before. Some drawn: zooms to those, silently, as it did for gone ones |
| F17 | Fixed | One helper, `teardown.ts` `hearUntilStopped`: every subscription to the host goes through it (`events`, `settings.on`, `chat.status.on`), and its stop silences the listener whatever the host's unsubscribe does. No check per listener. The view's own members go quiet by one `gone` in `mount.ts`: `send`, `reveal`, `pageChip`, `unsaved`, `leave`. A read on its way at `unmount` applies nothing (`S.stopped`, `onLines`), and gives no notice |
| F16 | Fixed in `root.css`, and the spec says so | See below |
| F18 | Stated | `plugin.md` § Styles names two-element rules and `*`; § The chat says `ref` compares by value. `spec-truth.test.ts` passes |
| F19 | Cause found: raster timing. The test changed | See below |

Accepted without change, as the coordinator said: F15's observers, and the "Is it running?" words.

**F16: why the fix and not the sentence.**

- **Reads truer:** `svg { fill: currentColor }` is a common rule, and a sentence would tell a host its icons turn solid. The fix leaves one thing less for a host to know.
- **The cost:** four small rules, two properties each, on the elements the existing `svg` and `img` rule already matches, about 20 declarations. Not measured: the load makes first draw unjudgeable, and you said not to judge timing. [INFERENCE] small, by count. Your quiet gate is the measure; if it shows a cost, the four rules can go and the sentence comes back.
- **Why not plain `revert`:** it would take away the `fill="none"` and `stroke="currentColor"` attributes of `AppIcon` and `ButtonIcon`, the only svgs carrying paint as attributes. So those two values are restated. The weakness: an svg with any other paint attribute isn't guarded. `guest.spec.ts` "a host's loud element rules" fails on one, since `host.css` now sets `fill` and `stroke` on `svg` for every plugin spec.
- **No screenshot moved.**

**F19: raster timing, not a real difference. Load makes it likelier [INFERENCE].**

- **It happens with no host rule.** With a comment-only sheet, and between two shots with no sheet at all, the same 8 pixels differ by the same 3 levels: box 475,60 to 481,61 of the sample.
- **What it is.** The glyph of a card's size control (`.vb-size-glyph`, in a `.vb-size-trig` at opacity 0.5), in the `widthsControl` section's mini board. Side by side, 14 times enlarged, with the difference beside them: `temp/fix-01/f19/compare.png`. The two read the same; only the rows of its two arrowheads move, and I can't see it at full size.
- **It goes by time and scroll, not by the sheet.** At one scroll position, in both themes: state A for the first shots after a far scroll, then state B and stable. Scrolled far away and back: A again, then B. Other scroll offsets give other hashes. So the test could shoot A, then B, inside its pair, with no rule involved.
- **Load.** Not tested apart: I never ran it on a quiet machine. [INFERENCE] the settling takes longer under load, so it falls inside the pair more often, which fits 3 of 3 here and 2 of 6 and 1 of 2 on older commits.
- **Not established:** why Chromium draws that glyph two ways. It may be the opacity group or a tile seam; I have no source for either.

**The test's change** (`tests/pages/host-styles.spec.ts` `sameUnderHost`), `RASTER` unchanged and nothing re-baselined. A target that differs on the first pass is now shot with the sheet off, on, off, and judged on the closer pair. A rule that reaches the board differs from both sides; a raster state that settles once can sit on one side only.

- **What it no longer catches:** a rule whose effect outlives the sheet, such as a size the board measured under the rule and kept, since the shot after then matches the host's. The old pair would have caught that, if the board measured in that moment. Nothing in the sheet-toggling path re-measures today, as far as I read, but I didn't prove that.
- **Also not closed:** two settlings inside the three shots would still fail. I saw at most one without a scroll, and no shot here scrolls.
- **Checked:** gallery test 6 of 6 (3 each theme) under the same load. A planted rule, `vb-node .vb-size-glyph { opacity: .4 }`, still fails it, at target 126, first pass 42 and 45; then removed.

**Run 2's tests** (load still high, no timing judged):

- `test:plugin` 74 passed.
- Unit half of `npm test` 2187 of 2187; `test:timing` not run.
- `verify`, `check`, `gen-api --check`: clean.
- Page specs: every spec with a screenshot, plus `board-chrome`, `board-host`, `board-guest`, `host-styles`, `live-boards`, `wires`: 454 passed, none failed. No file under `__screenshots__` changed.
- Full page suite and budgets: yours.
- `host-styles` "the board in a 550px pane" passed here, but its flake (the zoom's hidden status text) isn't touched by this run and may come back at your gate.

## On Completion

Notes; your row; one LOG line (`[board-app] FIX_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS`.
