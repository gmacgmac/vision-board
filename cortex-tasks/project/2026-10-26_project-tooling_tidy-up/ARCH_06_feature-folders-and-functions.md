# ARCH_06_feature-folders-and-functions: Feature Folders And Short Functions

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

`apps/board/src/board/` is organised by feature, each folder with one public file; no function runs far
past ~50 lines; small helpers have one home.

## Context

Review §10 and §11. `apps/board/src/board/` is flat (76 files, ~8,100 lines). Closure factories hide long
functions: `createBoard` 222, `createChatPanel` 221, `createNoteFlow` 215, ui `bindNoteParts` 199,
`bindModeRow` 196, `bindPointer` 179, `createCardSet` 154, server `openChats` ~155, `createSupervisor`
~145 (re-measure: earlier waves moved code). `io.ts` (301) does six jobs; `write-board.ts` two. Copied
helpers: `isRec` ×9 (`packages/mcp` exports `isRecord`), plural `n === 1 ? '' : 's'` ×10, the server's
`real()` ×2, the 32-byte token ×3, the constant-time compare ×2, raw `localStorage` in
`shell/Toolbar.svelte` and `flags.ts` instead of `shell/kept.ts`.

## Inputs

- **Files to modify**: `apps/board/src/board/**` (moved into folders), the long functions' files,
  `apps/board/src/board/io.ts`, `apps/board/server/write-board.ts`, the helper copies, `scripts/verify.mjs`
  (the function-length warning), their tests; `apps/board/README.md` (§ layout, via `cortex-docs`).
- **Shared artifacts to reuse**: everything earlier waves built (TASK-STATUS Shared Foundations).
- **Skills**: `cortex-architecture` (rules 2, 3), `cortex-docs`.

## Steps

1. [ ] **Feature folders**: `canvas/`, `cards/`, `notes/`, `selection/`, `links/`, `apps/` (adjust to
   what the code shows; say why), each with a public file; outside code imports only that. The board's
   `mount` (ARCH_03) stays the one way in from a host; the standalone host's own parts (its chat panel,
   folder switching) sit apart from the board's. The server's `engine/` (ENGINE_01) keeps its public file.
2. [ ] **Split** each long factory at its seams into named functions or modules; `io.ts` into `io/`
   behind `io.ts` (skill rule 3); `write-board.ts`'s retry-key replay into its own file.
3. [ ] **Helpers**: one home each (`packages/format` for `isRecord` and plural; the server's in one
   server util module); `localStorage` only through `kept.ts`. Where D-037 allows a copy across a hard
   boundary, a parity test instead.
4. [ ] **Verify**: warn on a function over ~50 lines (count factory closures' inner functions on their
   own), with the same `long-file` style escape; tests for it.

## Validation

- [ ] No function over ~80 lines without a reason in its header; the warning list recorded
- [ ] No screenshot changes; `npm test`, `npm run verify`, `npm run check`; the full page specs on your port

---

## Implementation Notes

_To be completed by agent after task completion. Re-run? Add a `### Run N` block; never overwrite._

**Status**: Completed  
**Completed**: 2026-10-27 08:30  

### Changes Made
- **Requests routed here**
  - UI_01-R7: `history-flow.ts` imports `menuKeydown` from `#ui`; `board/menu-keys.ts` deleted; the two `components.md` mentions repointed.
  - UI_01-R8: `ReplyPanel`, `BoardAgents` and `GoToCard` take `.vb-surface-panel` (the first two) and `.vb-surface-pop` (Go to card). Their rules lose the border, radius, background and shadow the recipes give (`board.css`, `access.css`, `go-to-card.css`). Same values, so no picture moved (checked on the reply, agents and go-to-card specs).
  - ARCH_04-R2: `CardStep = UnseenStep` and `CardProposal = Omit<ProposalRow, 'n'>` (`node-updates.ts`, `node-core.ts`).
  - ENGINE_01-R3: `#format` `readLine(index, line)` (new `ledger-read.ts`, with `readLedger` and `validateLedger` moved beside it from `ledger-index.ts`); `readLedger` and `ledger.ts` `takeLine` both run it. Test in `ledger-context.test.ts`.
  - ARCH_05-R6: `board/words/` stays under `board/`; the codemod rewrote every moved file's `words/` import (`../words/x.ts`). `words.test.mjs` green.
- **Step 1, feature folders** (`apps/board/src/board/`): 70 files moved by a codemod (imports, test imports, page specs, comments, docs paths).
  - `canvas/` (viewport, draw, render, layout-cache, offscreen, focus, pointer-focus, places)
  - `links/` (wires, link-labels, link-marks)
  - `cards/` (cards, card-images, size, item-acts, flag-flow, history-flow, update-flow, parking, proposals, proposal-flow, attention, remove-flow)
  - `notes/` (10 files), `selection/` (6)
  - `input/` (pointer, wiring, keys, commands, key-help)
  - `find/` (finder, go-to-card)
  - `boards/` (boards, board-edit, start-board, kept-view, versions, lock-flow)
  - `access/` (2), `apps/` (app-cards, app-state, panel-states)
  - `controller.ts` (+ `controller/`), `mount.ts`, `host.ts`, `status.ts`, `io.ts` (+ `io/`), `live.ts`, `sender.ts`, `work.ts`, `card-numbers.ts`, `board-data.ts`, `chat-side.ts`, `toolbar-counts.ts`, `mount-ids.ts` stay at the root.
  - Each folder has one `index.ts` holding only what code outside it uses (shell, gallery, controller).
  - Why these folders: the task's list adjusted to the import graph. `apps/`, `find/`, `access/`, `boards/` and `input/` were added; the value imports between folders form no cycle. Two cycles were cut by moving `readingOrder` from `render.ts` to `card-numbers.ts` and by importing `versionTime` from `#ui` (its re-export in `versions.ts` is gone).
  - `verify`: `checkFeatureFolders` (`scripts/verify.mjs`, test in `verify.test.mjs`) fails any import from outside a folder that is not its `index.ts`, or a split file's parts from outside the file (`io.ts`/`io/`). `words/` and unit tests are free.
- **Step 2, splits**
  - `createBoard` (controller.ts): the stage input table is `controller/stage-handlers.ts`, the held state `controller/board-state.ts`, the `Board` and `BoardDeps` types `controller/board-types.ts`. 339 lines became 261. It still runs 124 lines of its own, one statement per module wired, and carries `verify: long-function` with that reason.
  - `io.ts` into `io.ts` (85 lines, `createIo`) + `io/errors.ts`, `io/acts.ts`, `io/image.ts`; `verify-style.mjs` treats `io/` as the same network layer (test added).
  - `write-board.ts` into `write-board.ts` (198), `write-replay.ts` (the retry key's replay), `write-result.ts`.
  - Long inner functions cut: `keys.ts` `onKey` (60, now `route`, `nudged`, `onCard`, `onCommand`), `wires.ts` `draw` (61, now `fitSize`, `dropGone`, `paint`), `ledger-index.ts` `contextProblems` (64, now `nodeContext`, `proposalContext`), `chat-panel.ts` (`reveal`, `boardSend` and `panelState` out of the factory's literal; `panelState` in `chat-rules.ts`).
- **Step 3, helpers**
  - `isRecord`: `#format` `records.ts`, used by the format files, `#actions` `numbers.ts`, the five server copies (`write-refs`, `write-board`, `ledger`, `tool-checks`, `child`) and `packages/mcp` (its own export is gone). `packages/agent/src/record.ts` is the module's one copy (it imports nothing from this repo, D-037) with a parity test on the same table as `packages/format/tests/records.test.ts`.
  - Token and compare: `server/secrets.ts` `newToken`, `sameText` (agents, callers, chat-session, chat-access, engine/writes, app); test `secrets.test.ts`. The agent store's `timingSafeEqual` compares two fixed-length digests, so it stays.
  - `realPath` in `server/folders.ts` (project.ts, caller-folder.ts). `recent.ts` and `manifest.ts` differ (one throws, one returns undefined) and stay.
  - `localStorage` only through `shell/kept.ts`: `Toolbar.svelte`, `gallery/main.ts` and `flags.ts` now use `kept`/`keep`. `sessionStorage` (kept-view, page-io) is left: the task names localStorage.
  - Plural copies: **not made a helper.** They are 10 one-liners inside words files (`n === 1 ? '' : 's'`), the words-file design (D-063, words.md: plural and branch logic inside a words file), and the words test forbids a words file importing anything but other words files. `packages/chat` `feed-core.ts` keeps its own (chat imports nothing).
- **Step 4, `verify`**: `scripts/verify-functions.mjs` `checkFunctionLength`, a small scanner (masks comments, strings, regexes and template text; pairs braces; finds `=>`, `function` and method bodies; no dependency). Tests: `verify-functions.test.mjs` (6). A function warns over 50 lines of its own: a factory's inner functions count on their own and are left out of the factory's count, and blank lines do not count. Escape: `verify: long-function <reason>` in the header. Tests, generated files and non-code are not scanned. The page-weight check moved to `verify-weight.mjs` to keep `verify.mjs` under 300.
- Docs (cortex-docs): `apps/board/README.md` (the folders; moved file names), `components.md` (folders, the new checks), path mentions in `apps.md`, `performance.md`, `words.md`, pattern.json (node), flags descriptions, comments.

### Issues & Resolutions
- **The warning list**, from `npm run verify`: one function warning, `createBoard` (124 lines, with its reason). Everything else is a file-length warning, none new: `fold.ts` 306, `api-types.generated.ts` (generated), `chat.css` (the chat's palette, out of scope), eight page specs and the calculator `panel.html`. `controller.ts` (was 339) is under 300. Nothing else is over 50 lines of its own, and nothing is over 80 without a reason.
- **Not split into modules (judgement):** the other closure factories the task names (`createNoteFlow`, `createCardImages`, `createCardSet`, `bindNoteParts`, `bindModeRow`, `openChats`, `createSupervisor`) are 130-190 lines in all but each is a row of named inner functions of 37 lines at most (own lines 15-33), so with inner functions counted on their own none warns. A module split would pass each one's closure state around for no shorter function. Say if you want them split anyway.
- A changed picture: the image-view pattern's `whenToUse` names `apps/board/src/board/card-images.ts` and shows in the gallery's image section, so my path fix changed `gallery-images-{light,dark}.png` by that line. Reverted: the text still names the old path (REQUEST below).
- One `npm test` run hung with no CPU for 5 minutes (the known intermittent hang, ARCH_03-R7; an older run from 03:15 is still hung and not mine). Stopped mine and re-ran: 1735 pass.
- Ran `npm run check` once from the wrong directory (the parent of the worktree, whose `package.json` is the main checkout's); it only read files and wrote nothing.

### Caught Beyond the Brief
- `docs/principles.md` § One job per file does not mention the function warning or the feature-folder rule (protected; REQUEST).
- `shell/chat-panel.ts` was exactly 300 lines; it is 298.
- `Toolbar.svelte` and `gallery/main.ts` each repeat the theme choice and its storage key (three copies of one 8-line block with `kept`); a shared `theme` helper is a candidate.

### Deviations from Plan
- None. Two readings, both in the Issues above: function length counts inner functions on their own (the task's wording), and the plural copies stay because they are words-file logic.

### Verification
- `npm test` 1735 + 10 timing, `npm run check` 0 errors (472 files), `node scripts/gen-api.mjs --check` current.
- `npm run verify`: 1 failure, `docs/specification/modules.md` out of date (`records.ts` joined the `#format` list: `npm run map`, orchestrator-owned); 13 warnings.
- Page specs on port 4900, 70 files in four groups (everything but `perf.spec.ts`, the budgets): 221 + 145 + 176 + 136 passed; the two image-view gallery screenshots in the third group failed on the path text above and passed after the revert (a re-run of the card-image, gallery and app-gallery specs, 42 tests); 88 chat, live-boards, send-access, board-host and last-board tests after the last splits. No screenshot changed.
- Not run: `perf.spec.ts` (the budgets, alone, at the gate).

---

## On Completion

1. Fill in Implementation Notes; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append your own LOG entry to `cortex/LOG.md` — one line ending in a newline, append-only:
   `[[YYYY-MM-DD HH:MM]] [board-app] ARCH_06: what you did → Task: [[cortex-tasks/project/2026-10-26_project-tooling_tidy-up/ARCH_06_feature-folders-and-functions.md]]`
4. Return the `cortex-task-exe` Return Contract, with `REQUESTS` for anything outside your files.
   Never write the set entry or `AUDITED.md`. No commits.
