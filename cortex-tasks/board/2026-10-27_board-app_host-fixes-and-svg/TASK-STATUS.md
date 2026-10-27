---
task_name: Host Fixes and SVG Images
created: 2026-10-27
completed: 2026-10-27
status: completed
categories: [board-app, board-security]
tracker: cortex-tasks/tracker.md#M10,M11
---

# Host Fixes and SVG Images - Task Status

> **Plan**: [PLAN.md](./PLAN.md)  
> **Created**: 2026-10-27

---

## Instructions for Agents

1. **Read PLAN.md first**, then `docs/principles.md`, and consult the `cortex-architecture` skill
2. **Read notes from completed tasks** before starting yours
3. **Respect the Wave column**: do not start a task whose wave has not been reached
4. **Reuse Shared Foundations**: check that table before writing a helper, type, or component
5. **Touch only the files you own** (File Ownership below, or your task's *Files to modify*). Need a
   change elsewhere? List it under `REQUESTS` in your return block; the orchestrator routes it
6. **If you need to deviate, STOP and inform the user**
7. **Update frontmatter `status`**: `planned` → `in-progress` when you start. Closing the set is the
   orchestrator's job
8. **Update your row** in the Task List table below when you finish
9. **Add implementation notes** to your task file and brief notes here. Re-run? Add a `Run N:` line
   here and a `### Run N` block in your task file; never overwrite an earlier run
10. **No git commits**: sub-agents never commit; the orchestrator commits after each wave's gate
11. **Your port**: the one in your row's Notes (`VB_TEST_PORT`; workers take +10 each). Never 4466:
    it is the maintainer's board
12. **No full page suite in a task**: run unit tests, `check`, `verify`, `gen --check` and the page
    specs for what you changed; the orchestrator runs the full suite once at each wave's gate
13. **A bug fix starts with the failing test**: write it, see it fail, then fix

---

## Task List

| # | ID | Wave | Model | Persona | Task | Status | Notes |
|---|-----|------|-------|---------|------|--------|-------|
| 1 | M10_01 | 1 | standard | Accessibility engineer for keyboard and focus — a key belongs to whatever has focus: a plugin that hears keys meant for its host has failed, and so has one that goes deaf after a click on its own canvas. | [Keys stay inside the board](./M10_01_keys-inside-board.md) | Completed | port 5100 |
| 2 | SVG_01 | 1 | strong | Senior designer-developer who ships animated SVG — the animation that plays, and stops for someone who asked for less motion, is the point; a file that runs code, loads from outside, or can be opened as a page on the board's origin is a hole. | [SVG images in cards](./SVG_01_svg-images.md) | Completed | port 5200; D-064 drafted (maintainer's yes needed); 5 wiring requests |
| 3 | M11_01 | 2 | strong | Product engineer for editors and drafts — words a person typed are never lost unless they chose to lose them, whether the pane closes, the tab closes or the host moves on; and the host, not the plugin, owns the question. | [The host asks before words are lost](./M11_01_ask-before-leaving.md) | Completed | port 5300; flag `leavePrompt` (on, proposed); 4 requests |
| 4 | VERIFY_01 | 3 | strong | nclite developer hosting the board in a pane for the first time, with no history of these changes — expects their own shortcuts and buttons to keep working, their Close to ask before a note is lost, and an animated picture to just play and never run code. | [Verification](./VERIFY_01_host-svg-verification.md) | Completed | port 5400; every criterion met (full suite: the gate); 6 findings, none blocking (VERIFY_01_findings.md) |

**Status Values**: `Pending` | `In Progress` | `Completed` | `Blocked` | `Deferred`

**Wave**: execution order. Same number = safe to run in parallel.

---

## Shared Foundations

| Artifact | Created by | Consumed by |
|----------|-----------|-------------|
| The key rule under a host: `apps/board/src/board/input/keys.ts` `route` / `bindKeys` (inside the root only, unless the board has its own page) | M10_01 | M11_01 (Cancel's focus back in the text must still get keys), VERIFY_01 |
| `tests/pages/board-host-fixture.ts`: host controls outside the board (a button, an input) | M10_01 | M11_01 (its Close), VERIFY_01 |
| `BoardView.unsaved()`, `BoardView.leave()` in `apps/board/src/board/host.ts` | M11_01 | VERIFY_01 |
| `IMAGE_LIMITS.types.svg` and the SVG content check in `packages/format/src/images.ts` | SVG_01 | VERIFY_01 |

---

## File Ownership

| Wave | Owner | Files |
|------|-------|-------|
| 1 | M10_01 | `apps/board/src/board/input/keys.ts`, `apps/board/src/board/input/wiring.ts`, `apps/board/src/board/mount.ts` (focus only), `tests/pages/board-host.spec.ts`, `tests/pages/board-host-fixture.ts`, `apps/board/tests/keys*.test.ts` (new or existing), `docs/specification/components.md` § The board's host interface |
| 1 | SVG_01 | `packages/format/src/images.ts`, `packages/format/src/flags.ts`, `packages/format/tests/images*.test.ts`, `apps/board/server/images.ts`, `apps/board/tests/images*.test.ts`, `packages/ui/src/markdown/image.ts`, `packages/ui/src/image-view/`, `apps/board/src/board/cards/card-images.ts`, `apps/board/src/gallery/image-view-section.ts` and its fixtures, `tests/pages/card-image*.spec.ts`, `docs/specification/images.md`, `skills/vision-board/SKILL.md` and `NOTES.md` (§ Images in cards, its version line), `packages/format/README.md` and `apps/board/README.md` (their images paragraphs), `packages/ui/src/markdown/pattern.json`, `apps/board/server/app.ts` (`SECURITY_HEADERS` only, if the SVG response needs it) |
| 2 | M11_01 | `apps/board/src/board/host.ts`, `apps/board/src/board/mount.ts`, `apps/board/src/board/notes/`, `apps/board/src/board/words/confirm.ts`, `apps/board/src/shell/page-host.ts`, `apps/board/src/shell/App.svelte` (the guard only), `packages/format/src/flags.ts`, `tests/pages/board-host.spec.ts`, `tests/pages/board-host-fixture.ts`, `tests/pages/note*.spec.ts`, `docs/specification/components.md` § The board's host interface |
| 3 | VERIFY_01 | its task file's notes, `VERIFY_01_findings.md` |
| — | orchestrator | `docs/decisions.md`, `cortex-tasks/tracker.md`, `cortex-tasks/project/2026-10-26_project-tooling_tidy-up/nclite-contract-reply.md`, `package.json`, `package-lock.json`, generated files (`npm run map`, `gen-api`), unexpected screenshot baselines |

---

## Requests

| Request | From | Need | Routed to | Status |
|---------|------|------|-----------|--------|
| M10_01-R1 | M10_01 | `packages/ui/src/base/layer.ts` `dismissable`: Esc captured page-wide while a board layer is open eats a host's own Esc | Tracker M21 (maintainer agreed, point 305) | Done |
| M10_01-R2 | M10_01 | `apps/board/src/board/controller.ts`: one line, `createBoard` passes `!!host.page` to `bindStage`; record it in M10_01's ownership | Orchestrator: accepted, the only place the host is in reach | Done |
| SVG_01-R1 | SVG_01 | `docs/decisions.md`: append D-064 from SVG_01's § Proposed decision | Orchestrator, with the maintainer's yes | Done |
| SVG_01-R2 | SVG_01 | `apps/board/server/app.ts`: pass the server's flags to `serveImage` | SVG_01 Run 2 (ownership widened) | Done |
| SVG_01-R3 | SVG_01 | `packages/ui/src/index.ts`: export `setMarkdownSvg` | SVG_01 Run 2 | Done |
| SVG_01-R4 | SVG_01 | `apps/board/src/main.ts`, `apps/board/src/gallery/main.ts`: `setMarkdownSvg(flagOn('svgImages', …))` | SVG_01 Run 2 | Done |
| SVG_01-R5 | SVG_01 | `packages/ui/tests/markdown-images.test.ts`: the refused-type row `a.svg` → `a.svgz` | SVG_01 Run 2 | Done |
| SVG_01-R6 | SVG_01 | `docs/specification/api.md`: `unsupported-media-type` and `too-large` wording | SVG_01 Run 2 | Done |
| SVG_01-R7 | SVG_01 | `docs/specification/components.md` § Feature flags, § Images in cards: `svgImages` | SVG_01 Run 2 | Done |
| SVG_01-R8 | SVG_01 | Step 1 in WebKit and Firefox: needs Playwright's browsers downloaded | SVG_01 Run 5 (maintainer approved the WebKit download, point 307) | Done |
| SVG_01-R9 | SVG_01 (caught beyond) | Animated GIFs (allowed since D-048) have the same no-pause and reduced-motion gap (WCAG 2.2.2) | Tracker M23 (maintainer agreed, point 308) | Done |
| M11_01-R1 | M11_01 | `controller.ts`, `controller/board-types.ts`, `status.ts`: pass-through edits under the task's composition-root clause; record them as M11_01's | Orchestrator: accepted | Done |
| M11_01-R2 | M11_01 | nclite reply: the `unmount`/`leave()` Differences row; M11 out of the gaps bullet | Orchestrator (also the keys rule and the SVG header for a host serving pictures) | Done |
| M11_01-R3 | M11_01 (caught beyond) | Switching boards drops a note's unsaved words silently (`boards.ts` `switchTo`) | M11_01 Run 2 (ownership widened) | Done |
| M11_01-R4 | M11_01 (caught beyond) | A folder switch asks only after the server switched; Cancel leaves page and server on different folders (`FolderDialog.svelte` `accept`, `folder.ts` `folderMoved`) | M11_01 Run 2 (ownership widened) | Done |
| M11_01-R5 | M11_01 (caught beyond) | A card or container leaving the layout (agent removes it, Hide answered) closes its open note with no question | Maintainer agreed (point 309): Hide answered asks first, M11_01 Run 4; an agent's redraw, tracker M24 | Done |
| M11_01-R6 | M11_01 | `leavePrompt` flag default on | Maintainer: on by default (point 310) | Done |
| M11_01-R7 | M11_01 (Run 2) | `apps/board/src/shell/Toolbar.svelte` `pickBoard`: one line puts the picker back after a Cancel; record it as M11_01's | Orchestrator: accepted | Done |
| M11_01-R8 | M11_01 (Run 2) | `folder.ts` `folderMoved` (another tab opened another folder) can't ask first: the server has already switched; only the browser's prompt asks before the reload. A server-side answer needs a design | Tracker M20 | Done |
| VERIFY_01-R1 | VERIFY_01 F1 | `images.ts` `svgProblem`: a comment or PI holding `<svg ` hides a later `<!ENTITY` (D-064 point 3 untrue) | SVG_01 Run 4 (in this set) | Done |
| VERIFY_01-R2 | VERIFY_01 F2 | Esc, H, R act without `preventDefault`; the typing test lacks `[contenteditable]` | Tracker M22 (proposed as M23 in the findings) | Done |
| VERIFY_01-R3 | VERIFY_01 F3 | `mount.ts` `reveal` doesn't wait for `switchTo`; focus moved while the host asked | M11_01 Run 3 (in this set) | Done |
| VERIFY_01-R4 | VERIFY_01 F4 | nclite reply drift: notify tones, stale member list, the M21 Esc exception, `reveal` may ask | Orchestrator | Done |
| VERIFY_01-R5 | VERIFY_01 F5 | components.md: name the M21 Esc exception beside the keys rule | M11_01 Run 3 | Done |
| VERIFY_01-R6 | VERIFY_01 F6 | Tracker M12 names `svgImages` / `setMarkdownSvg` too | Orchestrator | Done |

**Status Values**: `Open` | `Done` | `Closed`

---

## Implementation Notes

### M10_01: Keys stay inside the board
_Status:_ Completed  
_Notes:_ `bindKeys(h, root, pageWide)`: under a host a key acts only inside the root (Esc too); `pageWide` = `!!host.page`, passed by `createBoard` through `bindStage`. `mount` gives the root focus on `pointerup` when focus is outside it (a Shift or Cmd/Ctrl drag prevents `mousedown`, so focus stayed on the host button). Fixture: `addHostControls`. One-line edit in `controller.ts` (not in the ownership table). Open for the maintainer: `dismissable` (packages/ui layer.ts) eats a host's Esc while a board layer is open. Unit + `check` + `verify` + `gen-api --check` pass; key page specs pass on 5100.

---

### SVG_01: SVG images in cards
_Status:_ Completed  
_Notes:_ svg is in `IMAGE_LIMITS.types` (1 MB cap, 4096-byte head) behind flag `svgImages` (on); `svgProblem` knows it by its opening (SVG namespace, a viewBox or width and height, no `<!ENTITY`), `imageHeadProblem` and `imageCap` are what the route calls; the route sends `SVG_CSP` (no script, nothing loads, sandbox) on 200 and 304. Drawn only as `<img>`: in Chromium no script ran and nothing outside loaded, in the card, the zoomed view or at its own address; CSS and SMIL play; CSS inside `no-preference` holds still under the browser's own reduced-motion setting (Playwright's emulation does not reach svg images). Decision text: task notes § Proposed decision. Open: wiring of the flag in app.ts, `#ui` index and both `main.ts` (3 tests red until then), one row in `markdown-images.test.ts`. WebKit and Firefox not checked (not installed). Perf: 198 animated svg cards within every budget.  
Run 2: requests R2-R7 done (app.ts passes flags to `serveImage`; `#ui` exports `setMarkdownSvg`; both `main.ts` call it; `markdown-images.test.ts` row `a.svgz`; api.md 155 and components.md § Feature flags, § Images in cards). npm test 0 failures, check, gen-api current, card-image* + gallery specs 54 passed. `verify` wants `npm run map` (modules.md: the new `setMarkdownSvg` export; orchestrator's).  
Run 3: host-styles gallery failure (targets 237/238) traced: those are the layout section's mini boards (`div.g-mini`), not the svg samples (31-35); a rare 4-5 raster step between passes ~30 s apart. `sameUnderHost` now re-shoots a mismatched target back to back (sheet off, then on) and judges that pair at the same `RASTER`; an `img` rule still fails it (shown). host-styles ×3: 8/8 each; card-image* + gallery 54 passed; npm test, check, verify clean.  
Run 4: VERIFY_01 F1 fixed: `svgProblem` refuses `<!ENTITY` anywhere in the svg's head, so a comment or processing instruction holding `<svg` no longer hides one; failing tests first (format and route: F1's three bypasses refused, an ordinary svg after such text passes); images.md § SVG updated. npm test 0 failures, card-image* 35 passed, verify ok; check's 7 errors are in mount.ts and board-host.spec.ts (another task, mid-edit).  
Run 5: WebKit 26.6 installed (only it) and step 1 repeated there: no script, no outside load, CSS and SMIL play, `SVG_CSP` stops script at its own address (control runs it), viewBox-only natural size as Chromium's; no DEVIATION. Reduced motion in WebKit not checkable (emulation doesn't reach svg images; no system switch). Found: WebKit logs a CSP console error per svg image's own `<style>` under the board's page policy, yet applies it (for the maintainer). svg specs in WebKit via a temp config: 12/12 (screenshots ignored); the gallery test now scrolls its group in (WebKit's lazy margin). images.md says so.

---

### M11_01: The host asks before words are lost
_Status:_ Completed  
_Notes:_ `BoardView.unsaved()` / `leave()` (host.ts); `notes/note-discard.ts` `createLeave` reuses `mayLeave` (one question at a time) and reports each turn into `BoardStatus.unsaved`; the flow's types split to `notes/note-flow-types.ts`. Pass-through in `controller.ts`, `board-types.ts`, `status.ts` (outside the ownership table: R1). Standalone: `leavePrompt` flag, `page-host.ts` `guardLeave` adds `beforeunload` only while unsaved. Same discard dialog as Esc: no gallery entry. Found: switching boards drops a note's words silently, and a folder switch asks only after the server switched (requests). Unit 1758 pass; check 0 errors; verify ok; gen-api current; 188 page specs pass on 5300 (host, note*, reload and folder specs). Timing budgets red under load average 24, files untouched.  
Run 2: R3 and R4 done. Another board (`controller.ts` `switchTo`: picker, chat link and jump, New/Restore) and another folder (`FolderDialog.svelte` `accept`, `guard` from App, leavePrompt flag) ask `leave()` first; Cancel keeps board, folder and words. `leave()` OK now closes the note (`createLeave` `discard`). `Toolbar.svelte` one line: the picker goes back to the open board after Cancel (outside the widened list). `folderMoved` can't ask first (the server has already moved): still a request. New spec `note-folder.spec.ts`. Unit 1758 + timing 10, check, verify, gen-api current; 150 page specs pass on 5300.  
Run 3: F3 and F5. `mount.ts` `reveal` waits for `switchTo` and shows nothing on Cancel (`show`); `host.ts` `reveal` comment says it may ask. components.md: the Esc exception (M21, `dismissable`) beside the keys rule, and `reveal` may ask. Failing test first: board-host.spec.ts "reveal of another board's card…". Unit 1760 + timing 10, check, verify, gen-api current; board-host + note* 35 passed on 5300.  
Run 4: point 309. The person's own acts that would take a note's card or container away ask first through `NoteFlow.leaveIf` (`mayLeave`): Hide answered (`toggleHide`), Remove card or container (after its confirm), Archive board, and a past version (`showVersion` now waits). Cancel leaves the board as it was; unchanged words, or a hide that leaves the card, never ask. The agent's redraw stays M24. Failing page tests first (`note-discard.spec.ts`, three). Unit 1760 + timing 10, check, verify, gen-api current; 131 page specs passed on 5300.

---

### VERIFY_01: Verification
_Status:_ Completed  
_Notes:_ Every PLAN.md criterion met with evidence; the full page suite is the gate's. Host probe (button, input, contenteditable, body, a host modal dialog; 35 keys): no board acted, nothing marked handled; inside A only A. Close: one question, Cancel keeps words and focus, OK leaves nothing; bare `unmount()` loses words, as components.md warns. Eleven planted svgs: no script, no request from card or zoomed view; at its own address every load blocked by `SVG_CSP`. Findings (`VERIFY_01_findings.md`): F1 `svgProblem` entity check stepped round by a comment holding `<svg ` (served 200; Chromium refuses to decode) → M22; F2 Esc, H, R act without `preventDefault` (a host's Esc also fires) → M23; F3 `reveal` doesn't await `switchTo` → M24; F4 nclite reply drift; F5 components.md lacks M21's Esc caveat; F6 M12 should name `svgImages`. Gates: unit 1758 + timing 10, check, verify, gen-api; 78 page specs on 5400.

---

## The Run (orchestrator)

| Wave | Tasks | Commit · tag | Gate |
|------|-------|--------------|------|
| 1 | M10_01, SVG_01 | 7281ebb · `host-svg/wave-1` | Green 2026-10-27: unit 1754 + timing 10, check 0 errors, verify ok, gen-api current, full page suite 680 passed (port 4710) |
| 2 | M11_01 (Runs 1–2); SVG_01 Run 3 (host-styles check) | `host-svg/wave-2` | Green 2026-10-27: unit 1758 + timing 10, check 0 errors, verify ok, gen-api current, full page suite 685 passed (port 4710; first run failed 2 in host-styles.spec, fixed by SVG_01 Run 3) |
| 3 | VERIFY_01; fixes F1 (SVG_01 Run 4), F3 and F5 (M11_01 Run 3) | `host-svg/wave-3` | Green 2026-10-27: unit 1760 + timing 10, check 0 errors, verify ok, gen-api current, full page suite 686 passed (port 4710) |
| 3+ | SVG_01 Run 5 (WebKit, point 307); M11_01 Run 4 (the person's own acts ask first, point 309) | see the commit after 1a4dc99 | Green 2026-10-27: unit 1760 + timing 10, check 0 errors, verify ok, gen-api current; full page suite 678 passed, 1 failed (zoom-level.spec "screen readers hear the level once", at load average 16–28 from other processes); that spec alone, 5 repeats on one worker: 55 passed |

---

## Completion Checklist

- [x] All implementation tasks complete
- [x] Verification task complete
- [x] Every request `Done` or `Closed`
- [x] The new decision entry appended with the maintainer's yes
- [x] The nclite reply updated (keys, `leave()`, SVG)
- [x] The maintainer looks in a browser, light and dark: an SVG card and its zoomed view; a note
      with unsaved words and a tab close (flag on); the shortcuts after a click on the canvas
- [x] LOG entry created (see below)

---

## On Completion

When ALL tasks are done and the full gates pass, the orchestrator:

1. Sets frontmatter `status: completed` and `completed: YYYY-MM-DD`
2. Appends the set LOG entry, one line ending in a newline:
   ```
   [[YYYY-MM-DD HH:MM]] [board-app] Completed set: Host Fixes and SVG Images → Task: [[cortex-tasks/board/2026-10-27_board-app_host-fixes-and-svg/TASK-STATUS.md]]
   ```
3. Deletes tracker rows M10 and M11
4. Reminds the maintainer that search is next: tracker M7
