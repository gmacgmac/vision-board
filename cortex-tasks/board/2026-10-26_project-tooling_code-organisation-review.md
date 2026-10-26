---
task_name: Code Organisation Review
created: 2026-10-26
completed: 2026-10-26
status: completed
categories: [project-tooling]
type: research
skills: [cortex-architecture, cortex-research]
tracker:
---

# Code organisation review (before the move into the chat app)

Read-only review of branch `feat/tool-rail-and-examples` against `.kiro/steering/vision-board-proj.md`
(rules 1-20), `docs/principles.md`, the `cortex-architecture` skill (contracts, registries),
`docs/decisions.md` (D-005, D-016, D-026, D-029, D-037) and `docs/specification/modules.md`.
`npm run verify`: ok, 3 warnings (`controller.ts` 305, `io.ts` 301, `actions/src/fold.ts` 306).
Server, CSS and test areas were swept by three narrow sub-agents; five of their claims were
spot-checked and held. Anchors are file + symbol. Size: S < 1 day, M 1-3 days, L more.

**Clean (keep):** network I/O only in `apps/board/src/board/io.ts`; every TS cross-package import uses
a front door; `server/visibility.ts`, `write-board.ts` `checkGrant` and `ledger.ts` read the
`packages/actions` tables (no local re-derivation); no colour literals outside `tokens.css` except
the chat fallbacks and favicon; chat renders Markdown by injection (`packages/chat` `RenderText`).

## Confirmed — ranked by impact on the move

### 1. Packages are folders, not packages (blocks the move) — L, mechanical
- **What:** no `packages/*/package.json`, so no `@vision-board/*` name and no `exports`. 501 imports
  use `'../../../../packages/<x>/src/index.ts'`. `docs/principles.md` § Sharing with Uplynk Studio
  already says "package scope (`@vision-board/`)".
- **Also routed by path:** pattern CSS. `apps/board/src/main.ts` side-effect-imports 19 package CSS
  files by internal path, and `src/gallery/main.ts` repeats the list. `index.html` and
  `gallery.html` link `packages/tokens/src/tokens.css`. The server finds assets with
  `new URL('../../../…')`: `server/schema.ts` `SCHEMA_DIR`/`CHAT_SCHEMA_DIR`, `server/spec.ts`
  `OPENAPI_FILE`, `server/chat-access.ts` `VB_MCP`/`INSTRUCTIONS_FILE`.
- **Why:** rule 1, D-016 front doors. Every path breaks when the folder depth changes in the chat app.
- **Verify gaps:** `scripts/verify.mjs` `IMPORT` only matches `from`/`import()`. It misses
  side-effect `import '…css'`, `new URL(…)` and `require`, and `ROOTS` skips `tests/` and `skills/`.
  So the CSS back doors, `tests/pages` deep imports (`app-gallery.spec.ts` → `ui/src/node/node-app.ts`,
  `rail-board.ts` → `layout/src/types.ts`) and `packages/actions/tests` reading
  `apps/board/src/gallery/gallery.ledger.jsonl` all pass.
- **Fix:** a `package.json` per package (`name`, `exports`: `.` → `src/index.ts`, `./styles.css`
  (one CSS front door per package), `./schema/*`, asset paths as exported constants, like
  `packages/agent` `GATE_BIN`). Codemod the imports to bare specifiers. Extend verify: bare specifiers
  only, side-effect and `new URL` imports, `tests/` in `ROOTS`. Needs a decision entry (import style).

### 2. The board canvas is not a mountable, framework-free unit — M/L
- **What:** 11 canvas modules (`controller.ts`, `boards.ts`, `attention.ts`, `access*.ts`,
  `proposal-flow.ts`, `lock-flow.ts`, `versions.ts`, `remove-flow.ts`, `toolbar-counts.ts`, `folder.ts`)
  import `apps/board/src/shell/shell.svelte.ts`. It exports `shell`, a Svelte `$state` rune object,
  plus `toast` and `askConfirm`, so the canvas needs the Svelte compiler.
- **Hidden singletons:** `io.ts` (module-level `createClient()`), `flags.ts` `pageFlags` (reads
  `location` and `localStorage`).
- **Why:** D-005 and rule 16 ("the canvas stays framework-free"; shared things are web components).
  The chat app must embed a board beside its own shell, possibly twice.
- **Fix:** a `BoardHost` port that `createBoard(els, host)` takes: `io`, `notify`, `confirm`,
  `flags`, `store`, and a plain observable for shell state. The Svelte shell implements it. Later,
  `<vb-board>` wraps `createBoard` (rule 16). M for the port, L with the element.

### 3. Contracts with more than one source — M (each S-M)
- **Response and request types are hand-written:**
  - `packages/client` `Client.call<T>` takes `T` from each caller, so `io.ts` declares `FolderInfo`,
    `FolderEntry` (also in `server/folders.ts`), `FolderList`, `ChatSessionInfo` (also
    `server/chat-index.ts` `ChatSession` and `chat-session.schema.json`), `ActFields`, `BoardFields`
    and `BoardData`.
  - `scripts/gen-api.mjs` emits only the route table (`operations.generated.ts` `OPERATIONS`).
  - Fix: generate per-operation input and output types from the schemas, and type `call` by
    `OperationId`.
- **`get_board` is built twice:** `src/board/board-data.ts` `boardData` copies `server/reads.ts`
  `getBoard`, held equal by a test. These are not across a hard boundary, so make it one builder in
  `packages/actions`.
- **The fields that name a card are listed four times:**
  - `server/edge.ts` `cardsIn` (`n`, `nodes`, `cards`)
  - `server/write-refs.ts` `refsOf`/`resolve`, a different list
  - `packages/actions` `numbers.ts` `eventOut`
  - the page's `src/board/card-numbers.ts` `answerEvent`
  - Fix: one table beside `REFERENCES`, read in both directions.
- **Problem codes have three sources:** `server/problem.ts` `PROBLEMS`, `problem.schema.json`
  `$defs/code` and `packages/client` `ProblemDocument`. `PROBLEM_BASE` is defined in both
  `problem.ts` and `client.ts`. Two different `ProblemError` types share the name. Fix: the schema
  is the source (status as an `x-` field), and the rest is generated.
- **The server re-reads `openapi.json`:** `server/spec.ts` `securityOf` repeats `gen-api.mjs`
  `authOf` in another vocabulary, and `dispatch.ts` `NAMES` hand-writes parameter wording. Fix: gen
  emits a server table too.
- **Chat shapes are copied:**
  - `server/chat-session.ts` `MessageIn`/`ChatEvent`, `chat-approvals.ts` `ApprovalDraft` and
    `chat-prompt.ts` `Chip` copy `packages/chat` `events.ts`.
  - `'claude' | 'kiro'` appears in 4 places.
  - The model list `src/board/chat-rules.ts` `MODELS` sits apart from `packages/agent`
    `KIRO_DEFAULT_MODEL`.
  - Fix: import from chat; give the adapters a registry (id, label, models) in `packages/agent`.
- **Constants:**
  - Ledger v18 is hard-coded in `server/schema.ts` `LEDGER_EVENT_ID` and `write-board.ts` `KEY_ID`.
    Use `LEDGER_FORMAT`.
  - `writes.ts` `MAX_ITEMS` copies the schema's `maxItems`.
  - Port 4466 is set in 3 places.
  - `VB_*` environment names and the `VB-Project` header are each written in two packages.

### 4. Shared UI primitives written several times, some trapped in the app — M/L
- **Menus (5 implementations):**
  - `src/board/move-menu.ts` `createMoveMenu`
  - `src/board/app-cards.ts` (the app card's menu)
  - `src/shell/ToolbarMenu.svelte`
  - `packages/ui/src/region/region-row.ts` `bindModeRow`, with its own keys
  - `packages/ui` `node-template.ts`/`node-app-apply.ts` (Stop app)
  - The WAI-ARIA keys (`src/board/menu-keys.ts` `menuKeydown`) live in the app, and the Svelte shell
    imports them from `../board/`.
- **Dismissable layer (Esc, outside press, focus back), 8 copies:** `move-menu.ts`, `app-cards.ts`,
  `selection-pill.ts`, `note-outside.ts`, `ToolbarMenu.svelte`, ui `region-row.ts`, `region-note.ts`,
  `tip/hover-tip.ts`.
- **Dialogs:** `ConfirmDialog`, `BoardDialog`, `FolderDialog` and `ArchivedDialog` (`.svelte`) each
  repeat the `showModal`/`close` effect. The last two repeat the backdrop-click close word for word.
- **ui depends on app CSS:** `packages/ui` templates emit `vb-menu-item`, `vb-menu-list` and
  `vb-app-menu`, styled only in `apps/board/src/styles/board.css`. `.vb-menu-item` is defined again
  in ui `region.css`.
- **Recipes repeated in CSS:**
  - the popover surface: 9+ (`.vb-move-menu`, `.vb-region-menu`, `.vb-size-menu`, `.vb-mode-pop`,
    `.vb-note-pop`, `.vb-tip`, `.vb-card-pop`, `vb-note-bubble`, `.vb-dialog`…)
  - buttons: 4 (`.vb-btn`, `.vb-pop-btn`, `.vb-nb-btn`, `.chat-btn`)
  - chips: 2; `kbd`: 3; visually-hidden: 6
  - the focus ring outline: 29 times, with offsets −2, 1, 2, 3 and 5
  - the pressed `translateY(1px)`: 22 times
- **Why:** rules 1, 4 and 16. The chat and journal apps need menus, dialogs, buttons and popovers on
  day one.
- **Fix:** `packages/ui/src/base/`: `menu` (keys, roving focus, items), `layer` (dismiss and focus
  return), `dialog` (a web component), plus `button.css`, `surface.css`, `menu.css`, `a11y.css`,
  exported through the ui CSS front door (§1). The app keeps only board-specific rules.

### 5. Pure ledger queries live in the app — M
- **What:** DOM-free state queries in `apps/board/src/board/`:
  - `updates.ts` (`unseenCount`, `unseenSteps`, `seenDue`, `seenMarks`)
  - `retired.ts` (`retiredCounts`, `pastLines`)
  - `proposals.ts` (`proposalRows`, `acceptAllPlan`)
  - `go-to-card.ts` `goTarget`
  - `card-numbers.ts`
  - `board-data.ts` (`boardData`, `answeredIds`, `pageConditions`)
  - `remove-words.ts`
- Their tests sit in `apps/board/tests` and mostly exercise `packages/actions` logic.
- **Why:** rule 1. A chat app that shows a board's cards, or a journal reading the ledger, needs the
  same answers.
- **Fix:** move the queries into `packages/actions`, and their tests with them. The app keeps the
  wiring (`*-flow.ts`).

### 6. Server pieces a sibling app needs are tied to board types — L (decision entry and `LAYERS` row)
- **HTTP kit:** `guard`, `body`, `respond`, `static`, `atomic-file`, `lock`, the `problem` core, the
  `schema` registry and a generic `dispatch`.
  - Blockers: `dispatch.ts` `Ctx`/`ServerEnv` typed on Ledger, Chats, AppHost and Project; `PROBLEMS`
    mixes HTTP codes with board codes; `lock.ts` imports `ignoreInGit` from `agents.ts`.
- **Chat server:** `chat-session.ts`, `chat-approvals.ts` and `chat-index.ts` are generic.
  `chat-sessions.ts` `openChats` mixes the CLI lifecycle with board rounds (`round`, `tell`,
  `joinAndGrant`); split it.
- **App host:** `server/apps/*` is generic except `host.ts`'s Ledger use (`appAllowed`, `namedApps`;
  replace with callbacks), `DATA_DIR` and `SCHEMA_BASE`. `panel-state.ts` and `routes.ts` are
  board-bound.
- **Helpers inside handler files:**
  - `writes.ts` `body()` is imported by 4 modules.
  - `reads.ts` `endWhenClosed` is imported by `chat.ts`.
  - SSE framing is written twice (`reads.ts` `stream`, `chat.ts` `watchChat`).
  - Contained-file serving is done 3 ways (`static.ts` `resolveStatic` has no realpath; `images.ts`
    `locate` and `apps/panel-state.ts` `stateFile` do).
- **Fix:** first the S moves: `body()` into `body.ts`, one `sse.ts`, one `containedPath`. Then
  extract `packages/server-kit`, the chat server and the app host.

### 7. Box geometry has two homes — S
- **What:** ui `note-bubble-core.ts` `StageBox` duplicates layout `types.ts` `Box`.
- **Overlap, 3 copies:** layout `geometry.ts` `overlaps`, ui `note-bubble-core.ts` `meets` and
  `selection-bar-core.ts` `touches`.
- **Bounding box:** `boxAround` copies `boundsOf`.
- **`clamp`:** 2 copies.
- `LAYERS` forbids ui → layout, so ui re-wrote them.
- **Fix:** `Box` and its primitives in `packages/format` (a `geometry.ts`) or a tiny `geometry`
  layer both may use.

### 8. Tokens and style enforcement — M
- **Second palette:** `packages/chat/src/chat.css` carries a second palette: about 19 hex fallbacks,
  plus px, radius, shadow and duration fallbacks. Its accent is not in `tokens.css`. The
  chat → token map (`apps/board/src/styles/chat-host.css`) lives in the app, so each host rewrites it.
- **Missing scales:**
  - z-index: 1–30 bare, about 45 declarations
  - control sizes: 22/24/26/28/32 px literals; `--vb-space-5/6` used as sizes
  - focus offset
  - label tracking
  - opacity and leading
- About 390 px literals ≥ 2px in all.
- **Unused tokens:** `--vb-agent`, `--vb-state-open`, `--vb-brand`.
- **Doc drift:** `docs/principles.md` § Dependencies says verify checks "colour literals outside the
  tokens, I/O outside its layer". `scripts/verify.mjs` does neither.
- **Fix:** move `chat-host.css` to `packages/tokens` (for example `chat.css`) so any host loads it.
  Add a test that diffs the chat fallbacks against the tokens. Add `--vb-z-*`, `--vb-control-*` and
  `--vb-focus-offset` (protected file: maintainer's yes). Add the colour/px and I/O checks to verify,
  or correct the doc.

### 9. Tests have no shared helpers, and some sit in the wrong package — M/L
- **No shared test-support module.**
- **Ledger-line builder:** 8 copies in `apps/board/tests` and about 10 variants in actions and format
  tests. `packages/actions/tests/ledger-v3.ts` `Ledger`/`scene` exists but is used only there.
- **Temp dirs:** about 40 `mkdtempSync` copies.
- **Starting a board server:** `createBoardServer` is started in 8 places, with chained port
  offsets.
- **Playwright helpers** are redefined per spec: `join` ×6, `idle` ×8, `openBoard` ×6, `card`/`frame`
  locators in 35 and 26 files.
- **Package contracts tested from the app:** `schema*.test.ts`, `openapi.test.ts`,
  `route-table.test.ts` and `chat-schema.test.ts` sit in the app, because ajv lives only in
  `server/schema.ts` (D-026).
- **Packages depend on app content:**
  - 6 `packages/actions` tests read `apps/board/src/gallery/gallery.ledger.jsonl`.
  - `packages/cli` and `packages/mcp` tests run `apps/board/tests/serve-fixture.ts`.
- **Order-dependent page specs:** about 12 specs depend on run order ("Runs after board.spec.ts"),
  which forces `workers: 1`.
- **Fix:** a private `packages/testing`: ledger builder (defaults to `LEDGER_FORMAT` and validates),
  `makeTempDir`, `startTestBoard` and a port allocator, fake agents, `FIXTURE_LEDGERS`, and a
  `./playwright` subpath. Move `gallery.ledger.jsonl` to `packages/format/fixtures`. Where the schema
  tests go depends on D-026 (keep ajv in one home, but make that home importable by tests).

### 10. One job per file; long functions hidden in factory closures — M
- **The ~50-line function rule is not checked**, and closure factories hide it:
  - `src/board/controller.ts` `createBoard`: 222
  - `chat-panel.ts` `createChatPanel`: 221
  - `notes.ts` `createNoteFlow`: 215
  - ui `region-note.ts` `bindNoteParts`: 199
  - ui `region-row.ts` `bindModeRow`: 196
  - `pointer.ts` `bindPointer`: 179
  - `cards.ts` `createCardSet`: 154
  - server `chat-sessions.ts` `openChats`: ~155
  - `apps/supervisor.ts` `createSupervisor`: ~145
- **`io.ts` (301) does 6 jobs:** ledger reads, acts, chat, folders, apps and images. Split it into
  `io/` behind `io.ts` (skill rule 3).
- **`write-board.ts` has 2 jobs:** retry-key replay (`contentHash`, `replay`, `canonical`) and the item
  checks.
- **`apps/board/src/board/` is flat:** 76 files and 8,091 lines with no sub-folders. Its README
  paragraph tries to index them.
- **Fix:** feature folders (`canvas/`, `notes/`, `selection/`, `links/`, `chat/`, `apps/`, `cards/`),
  each with a public file. Split the factories at their seams, and add a function-length warning to
  verify.

### 11. Small helpers copied — S
- **`isRec`:** 5 copies in the server and 4 in format, while `packages/mcp` exports `isRecord`. The 5
  in agent are allowed by D-037.
- **The plural `n === 1 ? '' : 's'`:** 10 files.
- **`esc`:** in both ui `markdown/inline.ts` and `packages/chat/src/esc.ts` (allowed by D-037, but no
  test holds them equal).
- **Server helpers:** `real()` ×2, the 32-byte token ×3, the constant-time compare ×2.
- **Browser storage:** `shell/Toolbar.svelte` (theme, unguarded, key `vb-theme`) and `flags.ts` read
  `localStorage` directly instead of `shell/kept.ts` `kept`/`keep`.
- **Fix:** one home each (`packages/format` for `isRecord` and plural), or a parity test for the
  allowed copies.

## Worth a closer look

12. **`packages/actions` is the ledger domain, not only actions.** It holds the fold, permissions,
    conditions, references, reads and reply wording: about 150 exports, 33 flat files, and a README
    that is one paragraph. A journal app would want the fold and queries without the board's action
    registry. Consider `packages/ledger` (state and queries) and `packages/actions` (the registry),
    or at least sub-folders. L, decision entry.
13. **The pattern gallery lives in the app** (`apps/board/src/gallery/`, 41 files) and imports board
    internals (`draw.ts`, `render.ts`, `board-data.ts`, `io.ts`…). Gallery entries could travel with
    their patterns (`packages/ui/gallery/`, `packages/chat/gallery/`), with the board's mini-board as
    one host. M.
14. **The Svelte shell holds generic controls:** `ButtonIcon`, `MenuSelect`, `ConfirmDialog`. Rule 16
    says shared things are web components. Decide which go to ui (see §4) and which stay as app shell.
15. **"Busy" is decided in more than one place.** The message-while-busy rule is enforced in
    `server/chat-sessions.ts` `tell` and `chat.ts` `busy`, rather than read from `packages/chat`
    `CHAT_CONDITIONS` (`busy.send`, `ChatHost.holds`). It is a registry fact.
16. **`chat-round.ts` `previousSend` scans the acts** while the fold keeps `lastSend`. It could be
    one fold field.
17. **`bin/reply.ts`** reads the ledger directly and ignores `recent.ts` `startFolder`. Its comment
    says it is temporary until `vb check`; consider retiring it.
18. **Popover border and surface differ** (line, line-strong or line-contrast; card or raised). These
    may be deliberate; decide before merging §4's surfaces.
19. **`temp/` holds leftover spike files** (`s34*`, `summ.py`, logs), against cortex rule 8 (tidy up).

## Proposed order of work
1. **Package manifests**, `exports` (TS, CSS, schema, asset paths), the import codemod, and the
   verify gaps (§1). This comes first, because every later move changes paths. Decision entry.
2. **One source per contract (§3):** generated operation types and a typed client, problems from the
   schema, the card-reference table, chat types imported, and one `boardData` builder.
3. **`BoardHost` port (§2).** This decouples the canvas from Svelte state and module singletons.
4. **ui base primitives and their CSS (§4)**, the token additions with the maintainer's yes, and the
   style checks in verify (§8).
5. **Move the pure ledger queries to `packages/actions` (§5)**, and give geometry one home (§7).
6. **`packages/testing`**, and move the tests and fixtures to their packages (§9).
7. **Server extraction (§6):** the S helper moves first, then the HTTP kit, chat server and app host,
   each with a decision entry.
8. **Feature folders in `apps/board/src/board/`**, split the long factories, and add a function-length
   check (§10). Do §11 as each area is touched.
