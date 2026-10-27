# VERIFY_01 findings: the tidy-up against `docs/principles.md`

> **Task**: [VERIFY_01](./VERIFY_01_tidy-verification.md) · **Tree**: `refactor/tidy` at 28f0890
> (`tidy/wave-7`) · **Date**: 2026-10-27 · **Reviewer stance**: hosting the board in nclite, no history;
> a rule counts as met when the code shows it.

Classification: GROUNDED. Every claim cites a file and symbol, a command, or a test. Inferences are
marked `[INFERENCE]`.

## Summary

- **Gates** (step 4): `npm test` 1735 + 10 timing pass (unit 12.9 s, timing 1.4 s, 15 s wall);
  `npm run verify` ok, 13 warnings (<1 s); `npm run check` 0 errors (4 s);
  `node scripts/gen-api.mjs --check` current (<1 s). Load average 5.4 to 7.7 throughout; no timing
  test failed, so none needed a rerun alone. Page specs run: `board-host.spec.ts` and
  `host-styles.spec.ts`, 9 passed on `VB_TEST_PORT=5000` (2.0 min). The full page suite was not run
  (rule 12): the orchestrator runs it at the gate.
- **Back doors** (step 2): one of each kind planted in a scratch copy; every one caught (§ Step 2).
- **The board as a plugin** (steps 3, 3b): the fake host, the engine and the hostile host sheet all
  hold. Six gaps against nclite's contract are new (F1 to F6); two of them (F1, F2) break the
  contract's "a view stays inside its root" and "`unmount()` saves anything being written".
- **The person's board** (step 6): pixel-identical to the pre-tidy tree (da59607) in 12 views.
- **Open**: 16 findings (F1 to F16), none blocking the set's close; F1 and F2 block the plugin stage.

## Success criteria (PLAN.md)

| Criterion | Result | Evidence |
|---|---|---|
| Every confirmed review finding §1-§5, §7-§11 closed or tracked | Met, with rows to add | § Review re-run; open items F7 to F11, F14 need tracker rows |
| `verify` fails on a deep import, CSS back door, colour literal, I/O outside its layer; warns on a long function | Met | § Step 2: 7 failures and 1 warning from 8 plants |
| The board mounts with a fake host, no Svelte, twice; `unmount` leaves no listener and an empty root | Met, with F1, F2 | `tests/pages/board-host.spec.ts` passed; scratch round (§ Step 3) |
| The engine runs with no HTTP: a route, a chip resolve, each tool, a watch event | Met | `apps/board/tests/engine.test.ts` 7/7; engine reach scan; probe (§ Step 3) |
| The board draws unchanged under a host's element rules and at ~550 px | Met | `tests/pages/host-styles.spec.ts` 8/8, light and dark |
| Full page suite passes on more than one worker, three runs in a row | Not checked here (rule 12) | Orchestrator, at the Wave 8 gate. Earlier: TEST_01 notes (3 workers twice, 5 workers once), Waves 5 to 7 gates |
| No screenshot changed except where a task fixed a known failure | Met for the person's screens; wording not met for 8 gallery baselines | F16 |
| All tests pass; `verify`, `check`, `gen --check` clean | Met | § Summary |

## Review re-run (step 1), finding by finding

| § | Finding | Status | Evidence |
|---|---|---|---|
| 1 | Deep paths into packages; CSS, HTML and `new URL` back doors; verify blind to them | Closed | `grep` for `../packages/` in apps, packages, scripts, tests, skills: only `scripts/verify.test.mjs` fixtures; `index.html`, `gallery.html` link no package file; `package.json` `imports` names every door; `scripts/verify.mjs` `checkReferences` fails each kind (§ Step 2) |
| 2 | The canvas needs the Svelte shell; `io` and `flags` singletons | Closed, with F1 to F4 | No `apps/board/src/board/` file imports `shell`, Svelte or `flags` (`verify.mjs` `checkBoardHost`); `io.ts` `createIo` per mount; `board/host.ts` `BoardHost`; `board/mount.ts` `mount` |
| 3 | Contracts with several sources | Closed, F11 left | `#client` `call<Id extends OperationId>` (`packages/client/src/client.ts`), no `call<T>` left; one `ProblemError` (`server/problem.ts`); `PROBLEMS`, `PROBLEM_BASE` only in the generator (`scripts/gen-contract.mjs`); `ENV` in `packages/format/src/constants.ts`, no `4466` outside comments and a gallery sample; card fields `#format` `cardFields`. Chat shapes (`chat-index.ts` `'claude' \| 'kiro'`) are out of scope (PLAN) |
| 4 | Menus, dismiss layers and dialogs written several times; app CSS styling ui | Closed, F8 left | Every menu calls `#ui` `openMenu` (`move-menu.ts`, `app-cards.ts`, `ToolbarMenu.svelte`, `region-row.ts`); `showModal` only in `base/dialog.ts` and the image view; one focus ring (`base/a11y.css`); bare `z-index` 1 (a `-1`), 44 by token |
| 5 | Pure ledger queries in the app | Closed | `packages/actions/src/answers/`; the app keeps `board-data.ts` (16 lines, the page's two rules) and `card-numbers.ts` (39 lines, the page's number/id table), as ARCH_04 decided |
| 6 | Server pieces tied to board types | Out of scope (PLAN) | Still: SSE framing twice (`server/streams.ts`, `server/chat.ts` `text/event-stream`); `static.ts` has no `realpath` |
| 7 | Box geometry twice | Closed | One `clamp`, `overlaps`, `touches`, `Box` (`packages/format/src/geometry.ts`); `note-bubble-core.ts` `StageBox = Box` |
| 8 | Second palette; missing scales; unused tokens; doc drift on verify | Partly closed: F8, F9 | Scales added (`--vb-z-*`, `--vb-control-*`, `--vb-focus-offset*`); verify checks colours and I/O (`scripts/verify-style.mjs`). Chat palette out of scope (verify warns). Still unused: `--vb-agent`, `--vb-state-open`, `--vb-brand` (0 `var()` uses each) |
| 9 | Tests: no shared helpers, wrong package, order-dependent | Closed, F14 left | `#format/testing`, `#board/testing`; no "Runs after" in `tests/pages`; gallery ledger in `packages/format/fixtures/`. Format's schema tests still in the app (F14). 8 `mkdtempSync` copies left (agent tests, chat server, two scripts tests) |
| 10 | Long factories; flat board folder; `io.ts` and `write-board.ts` two jobs each | Closed | Ten feature folders under `apps/board/src/board/`; `verify` warns only on `createBoard` (124 own lines, reason given); `io/`, `write-replay.ts`, `write-result.ts`. Svelte scripts are not checked by `checkFunctionLength`, but none runs long (scanned) |
| 11 | Small helpers copied | Closed by decision | `isRecord` in `#format` and agent with a parity test (`packages/agent/tests/record.test.ts`); plural stays in words files (D-063); `secrets.ts` `newToken`, `sameText`; `esc` in ui and chat has no parity test (chat out of scope) |
| 12 | `packages/actions` is the ledger domain | Closed by decision | ARCH_04-R7: not now |
| 13 | Gallery in the app | Open, not in criteria | Imports the board only through feature-folder doors and `card-numbers.ts` |
| 14 | Generic controls in the Svelte shell | Open, tracked | Tracker M8 (ARCH_03-R8) |
| 15, 16 | Busy decided twice; `previousSend` scans acts | Out of scope (chat) | |
| 17 | `bin/reply.ts` | Open | Still reads the ledger directly (`apps/board/bin/reply.ts`) |
| 18 | Popover surfaces | Closed by decision | UI_01 notes, decided by eye |
| 19 | `temp/` leftovers | Open: F13 | |

## Step 2: back doors planted

In a scratch copy outside the worktree (`rsync` of the tree, `node_modules` linked). One of each kind,
then `node scripts/verify.mjs` and `node --test scripts/words.test.mjs`:

| Plant | Caught by | Message (abridged) |
|---|---|---|
| `board/planted-deep.ts` imports `../../../../packages/format/src/index.ts` | verify FAIL | back door into packages/format: reach it by its name, #format |
| `main.ts` imports `../../../packages/ui/src/node/node.css` | verify FAIL | back door into packages/ui |
| `node.css` gains `color: #ff0033` | verify FAIL | a colour literal outside the tokens |
| `board/cards/planted-io.ts` calls `fetch` | verify FAIL | a network call outside the I/O layer |
| `packages/ui/src/node/planted-fs.ts` imports `node:fs` | verify FAIL | file, socket or process access outside the Node-side layers |
| `board/planted-shell.ts` imports `../shell/page-host.ts` | verify FAIL | imports its host |
| `board/planted-feature.ts` imports `./cards/card-images.ts` | verify FAIL | reaches into board/cards/ |
| `board/notes/planted-words.ts` notifies a literal sentence | `words.test.mjs` FAIL | no sentence … stands outside a words file |
| `board/cards/planted-long.ts`, a 124-line function | verify warn | runs 124 lines (aim for about 50) |

The copy was reset afterwards (`diff -rq` against the worktree: clean); `git status` of the worktree
shows only this task's files (§ Files).

## Step 3: the board with a fake host, the engine with no HTTP

- **Fake host** (`tests/pages/board-host.spec.ts`, passed): two boards on one page, draw, Send to the
  fake chat (`addToChat` gets a `card` chip, then `POST boards/roadmap/act`), a refusal shown through
  `notify`, Delete asks `confirm`, a change event redraws, no id twice, `unmount` leaves both roots
  empty and the document/window listener count at its baseline.
- **The round that spec does not walk**, a scratch spec in the scratch copy (the fixture's `api`
  taught to record bodies): A on card 1 sends `POST boards/roadmap/act {"action":"ack","n":1,"ver":1}`
  at once; C then typing opens a note bubble (dirty, focus in its textarea). Two results are new:
  - With focus on a host button outside both roots, **H hid answered cards on both boards** (F1).
  - `unmount` of a board holding a dirty note sent nothing and asked nothing (F2).
- **Engine** (`apps/board/tests/engine.test.ts`, 7/7 in `npm test`): a read and a write route, chip
  resolve with `changed` and `gone` refusals, `turn`, every tool in the table but `list_apps`, a watch
  event from another engine on the same folder, a held `check_responses` ended by the host's signal.
- **Engine reach scan** (scratch script, following relative imports from
  `apps/board/server/engine/index.ts`): 25 files reachable; none touches `process.env`, `process.cwd`,
  `process.argv`, `homedir`, `node:http`/`https`/`net`, `createServer` or `listen`, nor
  `recent.ts`, `open-folder.ts`, `caller-folder.ts`. It opens no socket and finds no folder.
- **Engine probe** (scratch): an agent caller's `ack` and `drop` and a caller-less `ack` are each `403
  forbidden`; a `write_board` item of type `act` is `422`; board ids `%2e%2e` and `CON` are `400`,
  `../etc` and `a/b` match no route.

## Step 3b: against nclite's contract (`~/ai/nclite/docs/plugins.md`, draft v0.1, read only)

| Contract row (PLAN § The Plugin Contract) | Met by the code? | Evidence |
|---|---|---|
| View: `mount(root, host)` → `{ unmount, pageChip, reveal }`; stays inside its root | Partly | `board/mount.ts` `mount`, `board/host.ts` `BoardView`. Not inside its root: keys from anywhere on the page (F1); `unmount` drops unsaved words (F2); the zoomed image view sits on `document.body` until unmount (`cards/card-images.ts` `open`, documented); page storage of its own (F4) |
| `PluginHost`: `api`, `events`, `addToChat`, `settings`, `notify` (+ `confirm`) | Yes, F3 | `BoardHost`; but card Markdown images follow a page-wide module flag, not `settings` (F3) |
| Engine part: `createEngine` → `route`, `resolve`, `tools`, `watch` | Yes, F6 | `apps/board/server/engine/index.ts`; `tools` holds `join` and `request_grant`, and the table holds `list_apps` the engine leaves out (F6) |
| Data in the bot's `plugins/board/` | Yes | `createEngine({ dir })`; the reach scan finds no folder lookup. Pictures are not in the engine (F15) |
| Chips `{ plugin, kind, ref, label, detail }`, resolved on send | Yes | `#actions` `cardChip`, `noteChip`, `boardChip`, `resolveChip`; `engine.resolve` |
| Routes relative, through `host.api` | Yes, but pictures | `#client` `Transport`; `io/image.ts` `imageVersion` fetches `IMAGE_ROUTE` from the page's origin (F15) |
| Tools declared with input schemas | Yes, F6 | `packages/format/src/tools.generated.json` (from `openapi.json`, `gen-tools.mjs`) |
| Styles under the root; host element rules reach in | Yes, F10 | `host-styles.spec.ts` 8/8 at 1600 px, 550 px and a 550 px pane in a 1600 px page, light and dark |
| Words in the plugin's words file | Yes for the board, F7 | six words homes (`docs/specification/words.md`); `packages/client/src` unscanned and unlisted |

**Differences for the handover reply.** Already in `nclite-contract-reply.md`: full JSON Schema tool
inputs; routes and tools may return a promise; `turn(since)`; `confirm`; `vb-` selectors count as
scoped; opaque JSON `ref`; refusal codes; tool answers `{ ok, result }`; `route` takes the caller and a
signal; `createEngine({ dir, … })`; `notify` tone; `api` resolves to a `Response`; the optional `page`
part; pictures outside `api`. **New, to list once each:**

1. **Which tools a bot gets** (F6): the board's tool table has `list_apps`, which the engine does not
   serve, and the engine serves `join` and `request_grant`, which the reply says a bot in nclite does
   without. nclite leaves out a plugin whose engine and manifest disagree, so the board must say which
   tools are the bot's. Reason: a manifest generated from the table would be refused.
2. **`unmount` and unsaved words** (F2): the contract says `unmount()` saves anything being written; the
   board's rule is that changed words are never lost silently (`notes/note-discard.ts`). The board
   needs a way to keep a draft note on `unmount` (save it, or let the host ask first). Reason: a
   closed pane would lose the person's words.
3. **Keys** (F1): the board listens for its shortcuts on the document. Under a host it should take only
   keys pressed inside its root; nclite should not expect page-wide shortcuts from a plugin. Reason: H,
   J, K, F… pressed on nclite's own controls reach every board on the page.
4. **Theme** (F12): app frames read the theme from `document.documentElement` `data-theme` and
   `prefers-color-scheme`. nclite should say how a plugin learns the app's theme.

**Under the hostile host sheet and at 550 px:** `host-styles.spec.ts` passed in both themes (the board
at 1600 and 550 px, the 550 px pane inside a 1600 px page, every gallery sample).

## Step 5: doc audit (cortex-docs)

Scope: `apps/board/README.md`, every `packages/*/README.md`, `docs/specification/*.md`,
`docs/principles.md`. Two scratch checks over the tracked tree:

- **Every file a doc names exists**: 909 backticked or linked paths; all resolve except names outside
  this repo (nclite's `command-approval.ts`, Studio's `rationale.md`), runtime files (`.visionboard/…`),
  `#` names, and history notes (`action-words.ts`, retired by D-045). One real miss: principles
  `primitives.css` (F9).
- **Every `file` + `symbol` claim holds**: 179 claims; 1 stale, `components.md` (§ app cards, the card
  set never moves a card) names `render.ts` `readingOrder`; the tidy moved it to
  `apps/board/src/board/card-numbers.ts` `readingOrder` (pre-tidy it was in `render.ts`) (F9).
- **Claims made untrue by behaviour**: `components.md` § The board's host interface says "a key belongs
  to the board whose root it is pressed in": true inside a root, untrue outside every root (F1). The
  same section lists what is not covered but not F2, F3, F4.

## Step 6: the board in a browser

Two board servers started for this check and stopped after: this tree on port 5090, and the pre-tidy
tree (`git archive da59607`, built with this checkout's `node_modules`) on 5091, each seeded with
`packages/format/fixtures/roadmap.ledger.jsonl` (byte-identical in both) into a folder of the same
name. Playwright (Chromium, reduced motion) took each at 1600 and 768 px, light and dark, at three
zooms (fit 47 % / 44 %, zoomed in 81 % / 76 %, zoomed out 20 %), and compared them pixel by pixel:

- **12 of 12 views identical** (0 pixels differ); no console errors on either. A first run with
  differently named folders differed only in the folder chip's name.
- Looked at by eye: 1600 px light fit and 768 px dark zoomed in. Nothing changed for the person.

## Open findings

Each with a proposed tracker row (ID left for the orchestrator). None blocks closing the set; F1 and
F2 block the plugin stage.

**F1. Keys pressed anywhere on the page reach every board.** `apps/board/src/board/input/keys.ts`
`bindKeys` listens on `document`; `route` returns early only when the key's target is inside *another*
`.vb-board`. A target outside every board (a host button) passes, so every mounted board acts.
Shown: H with focus on a host button hid answered cards on both boards. Breaks the contract's "a view
stays inside its root".
Tracker row:
```
| M? | A board takes only the keys pressed inside it | **Problem:** under a host the board's shortcuts fire for keys pressed anywhere on the page. **Example:** in nclite, H on a sidebar button hides answered cards on every open board (VERIFY_01 F1). **Solution:** under a host, `bindKeys` takes a key only when its target is inside `root`; the standalone page opts in to page-wide keys through `host.page`; a case in board-host.spec. | VERIFY_01 |
```

**F2. `unmount` drops a note's unsaved words, silently.** `board/mount.ts` `unmount` calls `stop`
(`board.destroy()`), with no save and no ask. Shown: a dirty bubble, focus in its textarea, then
`unmount`: no call, no confirm. nclite's contract: "`unmount()` saves anything being written"; the
board's own rule (`notes/note-discard.ts`): changed words are never lost silently.
Tracker row:
```
| M? | Unmounting keeps the note being written | **Problem:** closing the board while a note has unsaved words loses them with no question. **Example:** closing the board's pane in nclite mid-note (VERIFY_01 F2). **Solution:** decide: `unmount` saves the draft as a note, or the view tells the host it holds unsaved words so the host asks first; a case in board-host.spec. | VERIFY_01 |
```

**F3. Card Markdown images follow a page-wide switch, not the host's settings.**
`packages/ui/src/markdown/render.ts` `setMarkdownImages` sets a module variable, called once by
`apps/board/src/main.ts` from `pageFlags()`. A host's `cardImages` setting never reaches it, and two
boards on a page cannot differ. Low.
Tracker row:
```
| M? | The board's flags all come from its host | **Problem:** Markdown images follow a module switch set by the standalone page, not `host.settings`. **Example:** nclite turns `cardImages` off; cards still draw images (VERIFY_01 F3). **Solution:** `renderMarkdown`'s `images` option from `flagOf(host, 'cardImages')` through the board's draw; drop `setMarkdownImages`. | VERIFY_01 |
```

**F4. The board keeps page storage of its own.** `board/boards/kept-view.ts` `createKeptView` writes
`sessionStorage` `vb.view.<board>` and listens for `pagehide`, outside `BoardHost`. Keyed by board id
only, so two bots' boards with the same id on one nclite page share a saved view `[INFERENCE: board
ids are per folder]`. Low.
Tracker row:
```
| M? | The board's saved view goes through its host | **Problem:** the board writes its zoom and position to sessionStorage itself, keyed only by board id. **Example:** two bots in nclite, each with a board "plans" (VERIFY_01 F4). **Solution:** keep it through the host (`page` part or a small store on `BoardHost`), keyed by the host. | VERIFY_01 |
```

**F5. The board view has no front door.** A host imports `apps/board/src/board/mount.ts`,
`apps/board/src/board/host.ts` and `apps/board/src/styles/board.css` by path, plus `#ui/styles.css` and
`#tokens/styles.css` in the right order (`tests/pages/board-host-fixture.ts` does exactly this).
Principles § Architecture we adopt, "One front door per module".
Tracker row:
```
| M? | A name for the board's view and its styles | **Problem:** a host reaches the board's mount and stylesheet by paths into apps/board. **Example:** tests/pages/board-host-fixture.ts; nclite will do the same (VERIFY_01 F5). **Solution:** `#board` (mount, BoardHost, BoardView) and `#board/styles.css` (tokens, ui, board, in order) in package.json imports, per D-060; the fixture uses them. | VERIFY_01 |
```

**F6. The bot's tools are not stated.** `tools.generated.json` lists 11 tools incl. `list_apps`;
`engine/tools.ts` leaves `list_apps` out and serves `join` and `request_grant`; the reply (§ Answers 3)
says a bot in nclite has no `join` or `request_grant`. nclite refuses a plugin whose engine and manifest
disagree (plugins.md § The manifest).
Tracker row:
```
| M? | Say which tools a plugin bot gets | **Problem:** the tool table, the engine's tools and the nclite reply disagree on list_apps, join and request_grant. **Example:** a manifest generated from the table declares list_apps, which the engine does not give (VERIFY_01 F6). **Solution:** a per-tool mark in openapi.json (`x-hosts`) read by gen-tools; `engine.tools` is the plugin's set; the reply updated. | VERIFY_01 |
```

**F7. Two holes in the words check.** `packages/client/src` is neither a part in
`scripts/words-homes.mjs` `PARTS` nor listed under words.md § Not scanned yet, yet `client.ts` (4)
and `problem.ts` (1) hold sentences an agent reads through the CLI and MCP ("The server answered … without
a problem document. Try again; if it keeps failing, tell the person."). And `packages/agent/src` is
unscanned as "protocol and process lines for developers, not a screen", but `gate.ts`,
`approvals.ts` and `kiro-permission.ts` send refusals the agent reads ("Denied: … Do not retry it, and
do not work around it.").
Tracker row:
```
| M? | The words check covers every part that speaks | **Problem:** packages/client is outside the words check and unlisted; packages/agent is excused as developer-only but sends refusals agents read. **Example:** client problem.ts's fallback sentence (VERIFY_01 F7). **Solution:** a client words file and a PARTS row; agent's refusals into a words file, or its reason in words.md corrected. | VERIFY_01 |
```

**F8. Recipes still copied in CSS.** The pressed offset `transform: translateY(1px)` is written 21 times in
15 sheets (UI_01 kept the pattern controls' presses as their own); buttons `.vb-pop-btn` (12 uses),
`.vb-nb-btn`, `.vb-sb-btn`, `.vb-act` compose no `.vb-btn`; 11 control sizes are still px literals
(22, 26, 28 px, e.g. `node.css`, `selection-bar.css`, `note-bubble.css`). Review §4 and §8. Low.
Tracker row:
```
| M? | One pressed state and one button recipe | **Problem:** the pressed offset is written 21 times and four pattern buttons keep their own recipe. **Example:** `translateY(1px)` in 15 sheets (VERIFY_01 F8). **Solution:** a `--vb-press-y` token (the maintainer's yes) read by every press; pattern buttons take `.vb-btn` plus their size. | VERIFY_01 |
```

**F9. Doc drift.** `docs/specification/components.md` (§ app cards) names `render.ts` `readingOrder`;
it is now `apps/board/src/board/card-numbers.ts` `readingOrder`. `docs/principles.md` § Design tokens
says colour literals live in `primitives.css`; there is no such file: they are in
`packages/tokens/src/tokens.css`, and verify allows any file under `packages/tokens`
(`scripts/verify-style.mjs` `checkColours`). Principles' "Where we are (2026-10-26)" is the set's
closing step. `components.md` § The board's host interface: the key claim (F1) and the gaps F2 to F4.
No tracker row: doc requests.

**F10. Unprefixed state hooks in pattern CSS.** Ancestor contexts `.gliding`, `.panning`,
`[data-dragging]`, `[data-zoom='far']`, `[data-narrow]`, `[data-fresh-cards]`, `[data-app-title]`
(`packages/ui/src/region/region.css`, `node/node-app.css`, `node/node-steps.css`,
`apps/board/src/styles/board.css`). The rules' targets are `vb-` names, so nothing leaks out; but a
host class or attribute of the same name on an ancestor restyles the board `[INFERENCE]`. Low.
Tracker row:
```
| M? | The board's state hooks carry its prefix | **Problem:** board rules key off generic ancestor names (.panning, [data-dragging], [data-zoom]). **Example:** a host that marks its page [data-dragging] while moving a pane (VERIFY_01 F10). **Solution:** `data-vb-*` / `vb-` names; verify's scope check holds context selectors too. | VERIFY_01 |
```

**F11. The ledger format version has a second copy.** `scripts/gen-contract.mjs` `LEDGER_EVENT_ID`
hard-codes `…/schema/ledger/18/…` beside `#format` `LEDGER_FORMAT = 18`. A bump fails loudly
(`cardFieldsOf` throws on a missing schema), so it is caught, not silent. Low; no tracker row:
derive it from `packages/format/src/ledger.ts` in the next change to the generator.

**F12. App frames read the page's theme.** `apps/board/src/board/apps/app-cards.ts` observes
`document.documentElement` `data-theme` and `matchMedia('(prefers-color-scheme: dark)')`. A host that
marks its theme differently gives frames the wrong theme `[INFERENCE]`. Low; listed for nclite (§ 3b).

**F13. `temp/` holds the set's leftovers.** 41 entries (`arch01/`, `arch03/`, `ui01/`, `words-*.log`,
`words-*.mjs`, `reverse.config.ts`), 3.9 MB; git-ignored (`.gitignore` `temp/`). Review §19, Cortex rule
8. For the orchestrator before the set closes; no tracker row.

**F14. Format's contract tests live in the app.** `apps/board/tests/schema.test.ts`,
`schema-v18.test.ts`, `schema-apps.test.ts`, `openapi.test.ts`, `route-table.test.ts`,
`chat-schema.test.ts` test `packages/format` schemas from the app, because ajv's one home is
`apps/board/server/schema.ts` (D-026). Review §9; TEST_01 did not move them.
Tracker row:
```
| M? | Format's schema tests sit with format | **Problem:** the schema and OpenAPI tests of packages/format live in apps/board/tests, because ajv's home is the server. **Example:** schema-v18.test.ts (VERIFY_01 F14). **Solution:** decide: a `#board/testing` export of the validator for format's tests, or a decision that the engine owns validation and its tests. | VERIFY_01 |
```

**F15. Pictures are outside the engine and outside `api`.** `apps/board/src/board/io/image.ts`
`imageVersion` fetches `IMAGE_ROUTE` + path from the page's origin (an absolute path, so not under
`/api/bots/{bot}/plugins/board/`), with a hand-written answer shape (`{ detail?: unknown }`); the
standalone server serves pictures (`apps/board/server/images.ts`, from the project folder and
`DATA_DIR`), and `createEngine({ dir })` has no picture route. The reply lists the route as a
difference; it does not say the engine leaves picture serving to the host. Already tracked as the
reply's ask; add to the reply.

**F16. Eight baselines changed, none for a known failure.** `git diff da59607 HEAD --
tests/pages/__screenshots__`: `gallery-{light,dark}` (Wave 3, the gallery's Base section),
`app-cards-{light,dark}` and `chat-{light,dark}` (Wave 6, one gallery text line), `gallery-images-{light,dark}`
(Wave 7, one path line). Each was approved at its gate and checked by eye; all are developer pages; the
person's board is pixel-identical (§ Step 6). The criterion's wording does not allow them: the
maintainer ratifies or the criterion is reworded. No tracker row.

## Caught beyond the brief

F1, F2, F3, F5, F6, F7 (client), F10 and F12 were not in the review: they show only when the board is
mounted beside other things on a page, or when its tool list meets nclite's manifest rule.

## Files

Written: this file; `VERIFY_01_tidy-verification.md` (notes); this task's row in `TASK-STATUS.md`; one
line in `cortex/LOG.md`. Scratch work (planted copy, the pre-tidy build, the screenshots, the probes)
lives in the session's scratchpad, outside the worktree.
