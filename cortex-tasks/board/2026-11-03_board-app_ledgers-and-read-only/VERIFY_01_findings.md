# VERIFY_01 findings: ledgers and read-only

> **Task**: [VERIFY_01_verification.md](./VERIFY_01_verification.md) · **Run**: 1 · **Branch**: `feat/verify-01` at 90db410
> (`ledgers/wave-6`) · **Port block**: 7100 · Every folder was under the OS temp folder and is removed.

Blocking (PLAN decision 22): the flags cannot go on while one is open. Each finding: what to do, what was expected,
what happened, and the file + symbol suspected. "Server" below means `node apps/board/server.ts` from the worktree
with `HOME`, `VB_PORT`, `VB_PROJECT`, `VB_FLAGS=ledgerFolders,readOnlyStart`, `VB_KIRO_AGENT=0`; "Edit" is
`POST /api/project/edit` with the page's cookie (or the chip's Edit); two servers on one folder stand for two
computers (same host, different `HOME` and port; `LockEnv` can't be set from outside a test).

| # | Finding | Blocking |
|---|---|---|
| F1 | A watcher of an old-layout folder, after another server moved it into `main/`, shows an empty ledger; its Edit then writes a second ledger at `.visionboard/ledger.jsonl` beside the one being edited | **yes** |
| F2 | A running chat keeps writing `images/` and `apps/` after Stop editing (and into every other ledger's folder) | **yes** |
| F3 | Chat sessions cross ledgers: one ledger's session shows, resumes and re-keys its agent on another ledger's same-id board (LEDGERS_01-R6) | **yes** |
| F4 | With both flags defaulted on: 21 unit failures (as reported) and 13 page failures (not 4) (CONSOLIDATE_01-R4) | **yes** (for the close) |
| F5 | A flags-off server (older checkout, `-ledgerFolders`) opens a moved folder as empty and its first write forks it | no |
| F6 | Losing the lock, or another computer starting or stopping, sends no `editing` event (READONLY_UI_01-R2) | no |
| F7 | A writer waking from sleep re-beats its lock from its own copy of the file (two writers over a slow sync) | no |
| F8 | Edit on a folder that can't be written answers 500 "Something went wrong" | no |
| F9 | The Read-only chip's menu (Edit) opens under the access-request bar | no |
| F10 | Some write controls stay enabled in read-only, saying why only after the server refuses | no |
| F11 | The page's flags are its own: a server read-only by `VB_FLAGS` with the page's flag off shows no chip and no Edit | no |
| F12 | After a ledger switch an agent's reads silently answer the other ledger; only its writes stop | no |
| F13 | The part-way move's message offers `ledgers:undo`, which refuses in that state | no |
| F14 | Start ignores the last ledger when `VB_PROJECT` is not a real path (`/var` vs `/private/var`, a Dropbox symlink) | no |
| F15 | `pageStore` shares zoom and proposals-hidden between same-id boards of two ledgers (LEDGER_UI_01-R3, weighed) | no |

## Blocking

### F1 A stale watcher forks the ledger after a move (blocking)

The Dropbox case of PLAN decision 7 and Risks ("an old-layout server after the move"), with both flags on and the
same code on both computers.

**Steps**
1. An old-layout folder (`.visionboard/ledger.jsonl`, 353 lines of `gallery.ledger.jsonl` plus a board, agents,
   images, an app, app state, chat sessions, attachments, `.gitignore`).
2. Server A (HOME a, port 7110) starts on it: read-only, the old layout not moved (correct).
3. Server C (HOME b, port 7130) starts on it and presses Edit: the folder moves into `main/` (correct).
4. A, watching: `GET /api/boards` answers `boards: []`; `get_project` still says `boards: 11`, no `ledger`.
5. A presses Edit: `200`, `editing: {here: true}`, while C holds `.visionboard/main/lock`. A has taken
   `.visionboard/lock` (another file).
6. An agent joins through A: `.visionboard/ledger.jsonl` (1 line, `seq: 1`) and `.visionboard/agents.json` appear
   beside `main/`.
7. A fresh server D on the folder now opens that 1-line ledger (`boards: []`, `head: 1`), and its Edit refuses:
   "has both .visionboard/ledger.jsonl and .visionboard/main/ledger.jsonl".

**Expected**: the watcher follows the move (or says the ledger moved), and Edit never takes a lock or writes in the
old place while `main/` holds the ledger (decision 7: "never twice"; D-085 3).
**Happened**: a second writer, a forked ledger, and every later open showing the fork instead of the real 11 boards.
The same empty view follows `npm run ledgers:undo` run under a read-only server (it shows `ledger: main`, `ledgers: []`).

**Suspected**: `apps/board/server/project.ts` `edit` (only `isOldLayout(cur.dir)` is asked; else it locks
`path.dirname(cur.ledger.file)`, the old place); `apps/board/server/ledger.ts` `openLedger` `append` (after `refresh`
finds the held file gone, `reopen` reads it as empty and `appendFileSync` makes a new file from `seq` 1); the two
layouts' locks are different files (`lock.ts` `takeLock` on `.visionboard/lock` cannot see `main/lock`).
**Fix hint**: Edit (and a watcher's refresh) re-resolve the folder's layout and switch to `main/` when the open file
has gone there; `append` refuses when a non-empty held file has vanished; a lock check in either layout looks at both.

### F2 A chat writes pictures and apps after Stop editing (blocking: a write in read-only; READONLY_01-R6)

**Verdict on READONLY_01-R6**: confirmed from the code; not run end to end (a real Claude or Kiro CLI under a temp
`HOME` has no sign-in, and the brief rules out spending on it).

**Evidence**
- `project.ts` `stopEditing` calls only `cur.editing.drop()`; the folder's chats and app host keep running (a switch,
  by contrast, runs `Held.close`: `chats?.close()`, `apps?.close()`). The same holds when the lock is lost to another
  computer (`editing.ts` `readOnly` turns true; nothing is stopped).
- The chat's file gate does not ask read-only: `packages/agent/src/access-rules.ts` `ACCESS_RULES` rows
  `.visionboard/*/images/**` and `.visionboard/*/apps/**` are `write: 'allow'` with no state. Probed with `accessFor`:
  `write .visionboard/ui/images/x.png` → `allow`; `write .visionboard/ui/apps/x/server.js` → `allow`.
- Those rows also match every ledger, not the open one: a chat on `main` may write into `ui/images/` or `ui/apps/`
  (a ledger another computer may be editing), which the flag's own description does not allow ("write in the open
  ledger's `images/` and `apps/`", `flags.ts` `agentAccessRules`).
- `call_app_tool` reaches an app process that keeps running; app state writes are refused (`apps/panel-state.ts`
  checks `ctx.ledger.readOnly()`), the process itself is not stopped.

**Steps** (to reproduce once a CLI can run): Edit; start a chat on a board; Stop editing; ask the agent to save a
picture into the ledger's `images/`: the file is written with no question.
**Expected**: Stop editing (or a lost lock) leaves nothing that writes into the ledger folder (decision 13: "no
picture"). **Suspected**: `project.ts` `stopEditing` and the lost-lock path; `access-rules.ts` the two `*/` rows.
**Fix hint**: Stop editing and a lost lock close the folder's chats and app host as a switch does (or the approval
route refuses those writes while `readOnly()`); scope the write rows to the open ledger (the chat knows its ledger
folder), keeping the twin-row equality test.

### F3 Chat sessions cross ledgers (blocking; LEDGERS_01-R6)

**Verdict on LEDGERS_01-R6**: confirmed.

**Steps**
1. `main` has board `plan` and a chat session on it in `.visionboard/chat-sessions.json` (agent `a-141bmuqj`, joined
   on `main`).
2. Make ledger `ui` and, as an agent of `ui`, write a board with the same id `plan`.
3. With `ui` open: `GET /api/boards/plan/chats` → `main`'s session (`agentId: a-141bmuqj`).

**Expected**: a ledger's board shows only its own sessions (agents are per ledger, D-084 3).
**Happened**: the other ledger's conversation is listed as this board's. Opening it runs `chat-sessions.ts` `load`,
which calls `chat-access.ts` `rekey(agents(), record.agentId)`: `main`'s agent id is added to `ui/agents.json`, and its
resumed CLI conversation (about `main`) goes on drawing on `ui`'s board, its Send and answers resolved on `ui`.
Board ids are chosen by agents (`plan`, `roadmap`), so the same id in two ledgers is ordinary.
**Suspected**: `chat-index.ts` (`ChatSession` has no ledger), `chat-sessions.ts` `list`, `current`, `live`/`load`.
**Fix hint**: store `ledger` on each entry (absent = the old layout's, i.e. `main`), filter `list`, `current`,
`attach` and `live` by the open ledger; the schema (`chat-session.schema.json`) first.

### F4 Tests that fail with both flags defaulted on (blocking for the close; CONSOLIDATE_01-R4)

Both defaults flipped in this worktree's `packages/format/src/flags.ts` only, rebuilt, run, then the file restored
byte for byte and rebuilt (`git status` clean).

**Unit** (`node --test` over `apps/board/tests`, `packages/*/tests`, `tests/plugin/*.test.ts`): 2229 tests, 2208 pass,
**21 fail**, matching the report: 20 tests and 1 file-level hook.
- `apps/board/tests/api-cloud-places.test.ts`: "a folder opened by its link and by its real path is one folder: one
  recent entry, one lock"; "an agent working through the home link matches the open folder (its board MCP sends the
  link path)"
- `apps/board/tests/api-folder-mismatch.test.ts`: "after a switch, a secret from the folder left gets wrong-folder
  naming both folders, not \"join again\""; "working in the open folder with a secret from a folder joined earlier:
  told to join again here (field report batch 1, ruling 2)"; "a header naming another folder is refused on reads,
  join and writes; nothing is read or written"; "the chat panel's agent still draws after a switch: its board MCP
  names the open folder"
- `apps/board/tests/api-ledgers.test.ts`: "ledgerFolders off: no ledger in the answers, `ledger` is ignored, the old
  layout opens in place"
- `apps/board/tests/api-project.test.ts`: "open: the chats stop, the streams and held reads end, the agents and boards
  are the new folder's"; "create: a folder with no Vision Board gets .visionboard and an empty ledger; the old lock
  goes"; "back again: recent keeps the newest first, and a person act lands in the open folder's ledger"; and the
  file's `after` hook (line 51-53: `chmod` of `projects/unreadable/.visionboard/ledger.jsonl`, `ENOENT`: the file sits
  in `main/` with the flag on)
- `apps/board/tests/api-read-only-open.test.ts`: "at start: read-only, no lock; a write is refused; Edit takes the
  lock"; "a switch opens read-only: no lock taken there, nothing written there, the lock held before let go";
  "create in read-only: the board is made under a lock let go at once, and opens read-only"; "edit mode (`--edit`):
  with readOnlyStart on, a switch takes the lock as before and writes go"; "Edit over another computer's lock gone
  stale (no beat for 2 minutes, by the lock's clock) takes it, as at start"
- `apps/board/tests/api-read-only.test.ts`: "Edit while another computer edits: `conflict` naming that computer; still
  read-only, and get_project says who"; "Edit takes the lock; every answer is as before Stop editing (but the
  ledger's position), and Stop editing lets it go"; "a lock taken over by another computer (after a sleep) stops this
  server before its next line"; "a replaced ledger file is read again, and the project stream says `reset`"
- `apps/board/tests/images-route.test.ts`: "the route serves the folder that is open now, not the one the server
  started on"

**Page** (`npm run test:pages` over header-tiers, ledgers, ledger-folders, read-only, read-only-writes, current-folder,
open-folder, chat-folder, note-folder; several of these are `serial`, so a first failure hides the rest: re-run with
each failure excluded until none was left): **13 fail**, not 4. The full suite was not run (the orchestrator's), so
other specs may add to this list.
- `tests/pages/header-tiers.spec.ts`: "full: one path, the title once as the page's heading, the closed picker without
  a version" (3 `.vb-path-sep`, not 2: the ledger chip); "a third: the bar is the name, a compact count, Send, Chat and
  \"⋯\"; every action is in \"⋯\" and works" (the "⋯" title now names Ledger); "a third: the zoom row, the version row,
  Agents and the menu's own rows"; "gallery: the section is last, draws the three forms with ids of its own, and not
  with -adaptiveHeader"
- `tests/pages/ledgers.spec.ts`: "the flag off: no ledger in the path or in \"⋯\", the path as it was"; "gallery: the
  section is there only with the flag, last, with the three forms and ids of its own"
- `tests/pages/read-only.spec.ts`: "the flag off on the page: no chip and no Edit, and on a server without it, writes
  as today"; "gallery: the section is there only with the flag, last, with the three forms and ids of its own";
  "gallery: the section passes axe and matches its screenshot (light)" (3845 px tall, not 3844)
- `tests/pages/current-folder.spec.ts`: "the \"⋯\" menu says which folder is open on a line under Open folder…, which
  is not a row" (`#open-folder` not focused: the menu has more rows)
- `tests/pages/open-folder.spec.ts`: "by keyboard: Enter on the row, Enter into folders, Create focused on one with no
  board, Esc closes" (same focus count); "Create makes a Vision Board in a folder with none and lands on its empty
  board" (`ENOENT` reading `.visionboard/ledger.jsonl`: it is in `main/`); "Cloud storage by keyboard: Shift+Tab from
  the first folder in ~ reaches the place; Enter goes in" (focus)

Every one is a test leaning on a default (or on the old layout's path), not a product fault seen in the browser.
**Fix hint**: set the flags each test is about explicitly, so it passes with the defaults either way; the focus tests
count rows of a "⋯" menu that grew by Ledger, Edit and New ledger.

## Not blocking

### F5 A flags-off server forks a moved folder

**Steps**: a folder already in `main/` (another server editing it); start a server with `ledgerFolders` off (the default
today, `VB_FLAGS=-ledgerFolders` later, or any checkout from before this set). `get_project` → `found: true, boards: 0`,
open for writing (no read-only without its flag); an agent joins → `.visionboard/ledger.jsonl` and `agents.json`
appear beside `main/`: the same two-layout state as F1.
**Expected**: PLAN Risks: "both machines run the same synced code, so a restarted server is the new one" – true for
the code, not for its flags or for a worktree/older checkout. **Suspected**: `server.ts` start (flags off: `takeLock` on
`.visionboard`, `openLedger(ledgerPath(...))`), `project.ts` `openOne`. **Fix hint**: with the flag off, a folder whose
ledger is only in `main/` opens read-only (or refuses) with a sentence naming the flag; the closing note warns that a
checkout from before the set must not open a moved folder.

### F6 No `editing` event when the lock changes hands elsewhere (READONLY_UI_01-R2)

**Verdict**: confirmed, and wider than reported.
**Steps**: B edits; B's lock file's `beat` made 3 minutes old (B asleep); A presses Edit → takes it over. B's
`/api/events` stream: last event `editing {"readOnly":false}`, nothing after; B's `get_project` says `readOnly: true`,
`editing` A; B's agent write → `read-only` 409. Also: watchers never hear another computer start or stop editing
(their chip's "being edited on…" is as of their last read).
**Suspected**: `editing.ts` `createEditing` (`tell` runs only from `take`/`drop`; a lost `held()` tells no one);
`project.ts` beat interval. **Fix hint**: the beat (30 s) also checks `held()` and `lockHolder`, and tells `onChange`
when either changed.

### F7 A writer waking from sleep re-asserts its lock

Over Dropbox each computer has its own copy of `lock`. A laptop asleep > 2 minutes while editing: a colleague's Edit
takes the lock (correct, `STALE_MS`). On wake, the laptop's `setInterval` beat fires at once; `lock.ts` `beat` checks
`ours()` against the laptop's own copy (the colleague's lock not synced yet), rewrites it, and the ledger gate
(`held()`) says writable: both write until Dropbox settles, with a conflicted copy of `lock` and of the ledger.
Not reproducible on one disk (one file); from the code. Pre-existing (D-017's takeover at start), not made worse.
**Fix hint**: a holder whose own last beat is `STALE_MS` old or more treats its lock as lost (read-only, Edit again)
instead of beating it (`lock.ts` `takeLock` `beat`/`held`).

### F8 Edit on a folder that can't be written: 500

**Steps**: `chmod -R a-w` a folder (new or old layout); open it (read-only: works, nothing written); Edit → `500`
"Something went wrong on the server…"; the log shows `EACCES` opening `.visionboard/main/lock.<pid>.tmp`.
**Expected**: a refusal in words ("this folder can't be written on this computer"), the board staying read-only (it
does stay read-only). **Suspected**: `lock.ts` `takeLock` (`writeLock`), `project.ts` `lockOf`/`edit`.

### F9 The Read-only chip's menu opens under the access-request bar

**Steps**: 1400 px, `?flags=ledgerFolders,readOnlyStart`, board `gallery` (agents ask for access, so the access bar
shows under the header); click the eye chip. `aria-expanded="true"`, the menu (`vb-editing-c*`, `z-index: 29`) is laid
out at y 45, but `document.elementFromPoint` there is `.vb-access`: Edit can't be seen or clicked. The "⋯" menu is on
top in the same place; the ledger and board pickers are native selects (not affected). Without the access bar the
menu shows and Edit works. **Suspected**: `apps/board/src/styles/editing.css` (the menu's stacking) against the access
bar's. **Fix hint**: the chip's menu stacks as the "⋯" menu does.

### F10 Write controls that stay enabled in read-only

Read-only, both flags on the page: enabled with no reason, refused only after the server answers ("Read-only: press
Edit to change it" toast): access requests' Allow all / Allow / Refuse, Agents' "Remove <chat>'s access to this
board", "Allow app" on an app card. Card ✓ / ✗ / comment / later / flag carry `aria-disabled="true"` but their tooltip
says only "Check · a" (a click explains with the toast). Decision 13: "the person's write controls are disabled with
the reason". **Suspected**: the access bar and agents panel components in `packages/ui` / `apps/board/src/board`,
which take no `readOnly`; the card toolbar's title. Nothing was written (the folder was `chmod a-w`, listing and
checksums unchanged).

### F11 The page's flags are its own

**Steps**: server `VB_FLAGS=ledgerFolders,readOnlyStart`, page with no `?flags=`: the header shows no ledger and no
Read-only chip, so there is no Edit anywhere; the board is read-only on the server (writes refused). Today the page
reads flags only from `?flags=` and `localStorage` (`apps/board/src/flags.ts` `pageFlags`). At the close both defaults
flip together, so they agree unless one side is overridden. **Fix hint**: the page shows the read-only chip and Edit
whenever `get_project` says `readOnly` (and the ledger chip whenever it names a `ledger`), whatever its own flag.

### F12 After a switch, an agent's reads answer the other ledger

**Steps**: real stdio `vb-mcp` (`packages/mcp/bin/vb-mcp.ts`) with `main`'s secret; the person switches to `ui`;
`list_boards` and `get_board plan` answer `ui`'s (`ledger: "ui"`, its own board `plan`); only `write_board` stops:
`wrong-folder` "The board has ledger \"ui\" of ~/proj open. Your work is in ledger \"main\"…" (good words). The task
expected the next call to stop. An agent reading `plan` may take `ui`'s board for `main`'s. **Fix hint**: a read that
carries a secret known only in another ledger answers `wrong-folder` too (`caller-folder.ts` `secretElsewhere` on reads
with `Authorization`), or the bot is told to compare `ledger` on every read.

### F13 The part-way move's advice does not work

**Steps**: old layout; `chmod a-w .visionboard/images`; Edit → 409 "Moving the ledger of ~/proj stopped part-way
(EACCES…). In .visionboard/main/: agents.json. Still in .visionboard/: images, apps, app-state, ledger.jsonl. Nothing
was lost: open the folder again to finish, or run npm run ledgers:undo -- <folder> to put them back." Then
`ledgers:undo` → "has no .visionboard/main/ledger.jsonl to move back", exit 1. Opening again (after `chmod u+w`) does
finish; checksums then equal the original, and `ledgers:undo` restores it byte for byte. While part-way, the old
layout's agents can't authenticate (`agents.json` is in `main/`). **Suspected**: `words/server-folders.ts`
`movePartWay`; `ledger-move.ts` `undoMove` (requires `main/ledger.jsonl`, which moves last).

### F14 The last ledger is missed when `VB_PROJECT` is not a real path

**Steps**: `VB_PROJECT=/var/folders/…/proj` (macOS: `/var` → `/private/var`); switch to `ui`; restart: `main` opens.
`recent.json` keeps `ledgers` under the real path; `server.ts` `startLedger` / `startReadOnly` look up
`lastLedger(HOME, PROJECT)` with the path as given (`recent.ts` `startFolder` resolves, not `realpath`). On a Mac with
`~/Dropbox` linked to `~/Library/CloudStorage/Dropbox` the same happens. **Fix hint**: look up by the real path.

### F15 `pageStore` is shared by same-id boards of two ledgers (LEDGER_UI_01-R3, weighed)

Confirmed: `apps/board/src/shell/kept.ts` `pageStore` keeps `vb.<key>` by board id only. Zoom is cosmetic;
proposals-hidden on `main/plan` also hides `ui/plan`'s proposals, which could leave a proposal unseen. Low; keep it
as the tracker row it is routed to (key the store by folder and ledger).

## Checked, fine

- **The move** (step 1): a real-shaped old layout (above). Read-only open: nothing changed (checksums). Edit: moved
  into `main/`, every file byte-identical, `.gitignore` split (per-ledger lines into `main/.gitignore`); `git status`
  shows the renames. `ledgers:undo` while the server edits: refused naming the server; after Stop editing: done, the
  folder **identical to the original** (checksum list, `.gitignore` included). Edit while a flags-off server holds the
  old lock: 409 naming it, nothing moved. `main/` already holding a ledger: refused ("has both … Nothing was moved").
  Interrupted part-way (a folder that can't be renamed, standing in for a kill between renames): each entry whole in
  one place, the message says which; reopening finishes; content identical (but F13).
- **Two machines** (step 2): writer A, reader B (HOME b): B followed each appended line (`head` 359→361, SSE
  `change`); B's Edit → 409 naming A's computer, process, port; B's agent write → `read-only`, nothing written; A Stop
  editing, B Edit → B writes, A follows; a stale lock taken over → the old writer refuses its next write (F6 for the
  page); B restarted → read-only, `editing` names A. Ledger file replaced shorter (300 of 362 lines) and longer: both
  servers show what is on disk, SSE `reset` with the new head; bad lines skipped with a warning.
- **Read-only writes nothing** (step 3): two folders `chmod -R a-w` (new and old layout); open, switch between them,
  every board read, every page control pressed in the browser, Edit pressed (F8): listing and checksums of both
  unchanged. The only write was the server's own `~/.visionboard/recent.json` under the temp `HOME`.
- **Agents** (step 4): real stdio `vb-mcp`: read-only reads answer, `write_board` and `join` answer `read-only` with the
  host-neutral words; `list_boards`/`show_node` with `ledger: "ui"` read it marked `readOnly: true`; a write with
  `?ledger=` → 400; unknown ledger → 404 naming `main, ui`; `../ui` → 400. File rules (`accessFor`, Claude and Kiro
  share it): `.visionboard/{main,ui}/agents.json`, `*/chat-sessions.json`, `*/app-state/**` read → `refuse`;
  `*/ledger.jsonl`, `*/lock`, `.gitignore`, `permissions.json` write → `refuse`; paths are realpath'd before the rule
  (`policy.ts`), so `images/../main/agents.json` is not a way round.
- **The header** (step 5): 1400, 900, 600 px, light and dark: folder / ledger / board / version at full, icon + ledger
  at half, "⋯" rows Folder, Ledger, Edit at a third; the Read-only eye in all three (decision 16). New ledger: `Images`
  shown as `images` and refused ("the name of a file or folder the board keeps"), `main`/`ui` "already", `app-state`,
  `attachments`, `lock` refused, 70 characters "at most 40", `My Ledger` → `my-ledger`; Keep out of git → `scratch/.gitignore`
  is `*`, `git status` lists nothing of it. Keyboard and axe: not re-run by hand; `ledgers.spec.ts` and
  `read-only.spec.ts` (axe, keyboard, every form) pass with the flags off by default.
- **The plugin** (step 6): `npm run test:plugin` 83/83 (a first run had 3 `EADDRINUSE` on 7110: my own hand-started
  server sat in the test block; re-run clean).
- **Flags off** (step 7): page specs header-tiers, ledgers, read-only, read-only-writes, open-folder, current-folder,
  toolbar: 109 passed; the wave-6 gate's unit suite (2344/0) stands; `flags.ts` restored, no diff.
- **Doc audit** (step 8): 321 added lines in `docs/specification/{api,components,chat,plugin,words,apps,images}.md`
  since `checkpoint/before-ledgers`: all 150 code symbols named exist (`git grep -w`), every cited test file exists.
  Known stale sentences stay with FIX_01: `api.md` "…press Edit…" (SKILL_01-R1), `#client` `ledgersIn` comment
  (READONLY_01-R7).
- **Seen, already routed**: the Edit refusal reads "Stop that server first" (READONLY_UI_01-R1). After New ledger…
  while editing, the new ledger opens read-only and needs Edit again (D-085 1; worth a line in the closing note).

## Run 2

> 2026-11-03 · branch `feat/verify-01-run2` at fface1c (`ledgers/wave-8`, after FIX_01) · ports 7150-7199 · the same
> rules; every temp folder removed; `flags.ts` flipped for the F4 runs and restored (sha1 `f9cd6c7…`, no diff).

**Blocking left: yes, one: F16** (a test that fails with both defaults on, the F4 rule). F1, F2, F3 and F4's 34 listed
tests are fixed.

| # | Run 1 | Run 2 | Blocking now |
|---|---|---|---|
| F1 | stale watcher forks a moved ledger | **fixed**: re-run as in Run 1 | no |
| F2 | chat writes after Stop editing | **fixed** for the board's chats (writes refused, chats run on); the app process left | no |
| F3 | chat sessions cross ledgers | **fixed** | no |
| F4 | 21 unit + 13 page tests fail with flags on | **fixed** (all 34 pass); one more found: F16 | — |
| F16 | — | `host-styles.spec.ts` gallery samples fail with flags on (the New ledger dialog sample) | **yes** (for the close) |
| F5, F6, F7, F8, F12, F13, F14 | | fixed (spot-checked; F6 with a gap: N2) | no |
| F9, F11 (read-only half) | | fixed (their page tests pass with flags on) | no |
| F10, F11 (chip half), F2 (app process) | | left by FIX_01; judged not blocking | no |
| F15 | | tracker row | no |

### F1 re-run: fixed
Same sequence: watcher A (read-only on the old layout), mover C (Edit → `main/`). A then reads `ledger: "main"`, 11
boards, `editing` naming C, with an agent's read first as well as with `get_project` first (`project.ts` `followMove`);
A's Edit → 409 "Computer … has been editing this ledger since …, so it stays read-only here. Press Edit again once it
stops editing." (READONLY_UI_01-R1's words too); A's join → `read-only`; nothing appears beside `main/`. A fresh D opens
`main` with 11 boards. `ledgers:undo` under two watchers → the folder identical to the original; the watchers follow
back to the old layout, and follow the next move again. A writer whose ledger file vanished: a join → 409 "The ledger
file this board read has gone … nothing was written", no file made (but N1).

### F2 re-run: fixed for the chats, judged against decision 13
`chat-sessions.ts` hands the gate `{ folder, writable: !ledger.readOnly() }` at each question; `ledger.readOnly` is the
editing gate, so it covers Stop editing and a lost lock (`held()` false) alike. `accessFor` with `OpenLedger`: the open
ledger's pictures/apps written only while `writable`; another ledger's refused; Claude's hook (writability unknown)
asks the board, which decides. Tests `policy-ledgers`, `gate`, `chat-approvals` "the open ledger…" pass (37/37 with
F1/F3's). Not run with a real CLI (as Run 1). **Judgement**: decision 13 says read-only writes nothing into the ledger's
folder; the chat's own talk goes to the repo-wide chat files, which may be written. Refusing the chat's file writes
meets that; stopping the chat is not required. Fine.
**Left (the app process)**: an allowed app's process keeps running while read-only, as `call_app_tool` already did
from a read-only start; the board writes nothing for it (panel state refused). The process is the person's own allowed
code. Not blocking; the maintainer's question stands (FIX_01's `[needs-human-input]`).

### F3 re-run: fixed
`main` and `ui` both with board `plan`; `main`'s session on `plan`: `ui`'s `GET /api/boards/plan/chats` → `[]`,
`main`'s → its session. Entries with no `ledger` stay `main`'s (test "an entry naming no ledger…").

### F4 re-run: fixed; F16 new
Both defaults flipped in this worktree's `flags.ts`, rebuilt:
- unit (`apps/board/tests`, `packages/*/tests`, `tests/plugin/*.test.ts`): **2242 / 2242 pass**, 0 fail.
- the 10 related page specs of Run 1 (header-tiers, ledgers, ledger-folders, read-only, read-only-writes,
  current-folder, open-folder, chat-folder, note-folder): **108 / 108 pass** (the 13 of Run 1 among them).
- more groups: gallery, app-gallery, chat-attach-gallery: 23/23; toolbar, host-styles, chat-*, lock, archive: 66
  passed, **2 failed** (F16). The full page suite was not run (the orchestrator's); other specs may still fail.

### F16 `host-styles.spec.ts` gallery samples fail with both flags on (blocking for the close)
**Steps**: both defaults on (or the gallery with `ledgerFolders`); `npx playwright test … host-styles -g "gallery's
samples"`. **Happened**, light and dark, twice out of two: "target 306 (div vb-dialog vb-ledger-dialog
g-ledger-dialog) changed under the host's element rules (first pass: 35)" (dark: 8), over `RASTER` 2. With the flags
off the ledger section is not drawn, so the test passes today. **Suspected**: the New ledger dialog's sample in
`apps/board/src/gallery/ledger-section.ts` / `shell/LedgerDialog.svelte`, `LedgerForm.svelte` and
`styles/ledgers.css`: an element (input, label, checkbox or button) styled by a host's element rule, which other
dialogs' samples resist. **Fix hint**: the dialog's controls take the base classes the other dialogs use; or, if a
standalone-only dialog is not meant to sit under a host, the check names why it leaves it out. The fix starts with the
failing test (it already fails with the flags on).

### Non-blocking fixes spot-checked
- F5: a flags-off server on a moved folder refuses to start, naming the flag and `ledgers:undo`; nothing written.
- F6: another server starting to edit reached a watcher's stream as `editing` within a beat, and `get_project` names
  it. But N2.
- F7: `lock.test.ts` "a holder waking after a sleep of 2 minutes or more…" passes (not reproducible on one disk).
- F8: Edit on a `chmod -R a-w` folder → 409 "~/proj can't be written on this computer (a read-only share, or its
  permissions), so it stays read-only. Nothing was written."
- F9, F11 (read-only half): `read-only.spec.ts` "the chip's menu opens over the access-request bar…" and "the flag off
  on the page: the server says read-only, so the chip and Edit show…" pass (with flags on too).
- F12: `main`'s agent reading while `ui` is open → `wrong-folder` naming both ledgers.
- F13: the part-way message now says "once the cause is fixed, open the folder again (or press Edit) to finish… Once it
  has finished, npm run ledgers:undo… puts it all back"; `ledgers:undo` part-way still refuses, as the words now say.
- F14: `VB_PROJECT` under `/var/…` (real path `/private/var/…`): restart reopens `ui`, the last ledger.

### Left by FIX_01, judged (PLAN decision 22)
- F10 (write controls enabled in read-only): not blocking. Nothing is written (each is refused with the read-only
  words); a tracker row.
- F11 (the ledger chip when only the server has `ledgerFolders`): not blocking. At the close both defaults turn on
  together, and the read-only chip and Edit now follow the server; a tracker row.
- F2 (an app's process): not blocking (above); the maintainer's question.

### New, not blocking
- **N1**: a join refused because the ledger file vanished still adds the new agent's hash to `agents.json` (one
  orphan entry with no join line; its secret was never returned, so no one can use it). Suspected: the join path adds
  to the agents store before `ledger.append` refuses (`agents.ts` `add`, the join handler). Order them, or roll back.
- **N2**: `editing.ts` `look` only notes what it sees on its first beat after a start or a switch, so a change in that
  first beat window (up to 30 s) is never told: a watcher started while C edited kept "being edited on…" after C
  stopped 1 s later (no `editing` event in 44 s). Seed `seen` when the editing state is made, or tell on a first look
  that differs from what the page was given.
- **N3**: right after a vanished ledger file comes back, an agent's first write answers 401 "not authenticated" until
  a read refreshes the ledger; the next write goes. Suspected: the secret check reads the held state without
  `refresh`.
