# Ledgers and Read-only - Plan

> **Status Doc**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Created**: 2026-11-03 · **From**: maintainer chat 2026-11-02 to 2026-11-03, points 9-54 (decisions below) ·
> **Checkpoint**: tag `checkpoint/before-ledgers` (main at 45ee1dd, clean tree) · **Runs on**: the maintainer's
> always-on machine, from the same Dropbox-shared repo. This file and TASK-STATUS.md are the whole handover:
> nothing here depends on the chat it came from.

**How to start (orchestrator):** in the main checkout, run the `cortex-task-exe` skill on this folder's
TASK-STATUS.md as the orchestrator, wave by wave. SETUP (wave 0), in order:
1. `git status` is clean apart from this task folder, and `git tag -l checkpoint/before-ledgers` exists. If this
   folder is uncommitted, commit it alone on `main` ("Plan: ledgers and read-only"), so every worktree has it.
2. `git switch -c feat/ledgers`.
3. Append D-084 and D-085 (§ Decision entries to append) to `docs/decisions.md`.
4. Add the flags `ledgerFolders` and `readOnlyStart` to `packages/format/src/flags.ts`, default off, in the shape
   of the latest entries (`botToolRules`), descriptions from decisions 1 and 11.
5. Add `"ledgers:undo": "node apps/board/bin/ledgers-undo.ts"` to `package.json` scripts (the file comes in wave 2).
6. `npm run map`, `verify`, `check`, `npm test`; commit "Ledgers and read-only: set-up (D-084, D-085, flags)"; tag `ledgers/wave-0`.

---

## Problem Statement

A project holds one ledger (`.visionboard/ledger.jsonl`). The maintainer needs several per project: one per
area of work (architecture, UI), and throwaway ones for planning that is later brought into the main one. A
single ledger grows without end and mixes unrelated work.

Second, the board always opens for writing and takes the ledger's lock. The maintainer wants it to open
**read-only** by default, so a board shared through Dropbox, a git pull or a sent file can be watched live by
anyone, and to become writable only when the person presses **Edit**, which takes the lock if no one else holds it.

---

## Current State

- The server side is already an engine on one folder: `createEngine({ dir })` (`apps/board/server/engine/engine.ts`,
  `apps/board/plugin/engine.ts`; `docs/specification/plugin.md` § The engine). A host chooses `dir` (D-077, D-082
  rule 2). So a ledger in its own folder is, to the engine, just another `dir`.
- The standalone host fixes that folder at `<project>/.visionboard` in many places of its own: the lock
  (`apps/board/server.ts`, `apps/board/server/project.ts` `open`), images, apps, attachments, chat sessions,
  permissions, and the MCP server's folder search (`packages/mcp/README.md`). The names are constants spread
  over about ten files (`DATA_DIR`, `LEDGER_FILE` in `apps/board/server/ledger.ts`; `LOCK_FILE` in `lock.ts`;
  `AGENTS_FILE` in `agents.ts`; `IMAGES_DIR`, `APPS_DIR`, `APP_STATE_DIR` in `packages/format/src/`; and more).
- The agent's file rules (`packages/agent/src/access-rules.ts` `ACCESS_RULES`) are anchored to `.visionboard/` at
  the project root: a data folder one level deeper would leave its `agents.json` (agent secrets) readable.
- One server per ledger is enforced by a heartbeat lock file (`apps/board/server/lock.ts` `takeLock`, D-017,
  tracker U8): a live lock elsewhere stops a second server from starting. There is no read-only way in.
- The ledger already follows other writers' appended lines every 200 ms (`ledger.ts` `follow`, `FOLLOW_MS`),
  but only by growth (`refresh`: `now <= size` returns). A replaced file (git pull, a file dropped in) is not seen.
- The per-board lock (D-043: `locked`, 423, the person's padlock) is unrelated and stays exactly as it is.
- The header has three forms by its own width, from one table (`apps/board/src/board/chrome/header-tier.ts`;
  `docs/specification/components.md` § The header by its own width). The standalone page hands the header its
  folder as three page parts (`apps/board/src/board/host.ts` `folderChip`, `folderField`, `folderRow`).

---

## Proposed Solution

Two features, in this order, each behind its own flag, sharing one lock and one paths module.

1. **Ledger folders.** `.visionboard/` becomes the project's root for ledgers: one folder per ledger
   (`.visionboard/main/`, `.visionboard/ui/`, …), each a whole data folder for the engine. The header's path reads
   folder / ledger ▾ / board ▾ / version ▾; the ledger dropdown lists, switches and creates ledgers.
2. **Read-only, then Edit.** A ledger always opens read-only and takes no lock. Everything reads; nothing writes.
   Edit takes the ledger's lock at that moment, or says who holds it. Stop editing gives it back.

```
<project>/
  .visionboard/                 the project's board root (repo-wide files only)
    chat-sessions.json          repo-wide: the standalone chat (decision 6)
    attachments/                repo-wide
    permissions.json            repo-wide
    main/                       one ledger = one engine `dir`
      ledger.jsonl  agents.json  lock  images/  apps/  app-state/  .gitignore
    ui/                         another ledger, same shape
```

---

## Decisions

The maintainer's rulings, with the chat point each came from. Executing agents follow these and never
re-derive intent. A task that finds one unworkable stops and reports (`DEVIATION`), it does not reinterpret.

### Ledger folders (D-084 draft, below)

1. **One folder per ledger, inside `.visionboard/`** (24a: "make .visionboard the root and then … multiple folders
   within"). No ledger sits inside another ledger's folder. Ledger names are ids like board ids (lowercase,
   digits, `-`), shown as typed in the New ledger dialog's sanitised form; the first ledger is `main`. A name that
   is also a data-folder name is refused (`images`, `apps`, `app-state`, `attachments`, and any file name the
   paths module holds), so the agent's file rules can never confuse a ledger with a folder inside one.
2. **Every path follows the open ledger** (24b, 30, 37). One paths module gives every data-folder path from the
   project and the ledger name; nothing else builds a `.visionboard` path or names a data-folder file. The agent's
   file rules stay their own table, because `packages/agent` imports nothing from this repo (D-037); a test holds
   the table and the paths module equal.
3. **Identities, keys and agents are per ledger** (23A, 38). A key names one line of its ledger for good; card
   identities and board numbers belong to their ledger; an agent joins each ledger it works on. Bot instructions
   say "across the ledger" where they say "across the project" today.
4. **No seam change for ledgers** (23B, 44). Choosing a ledger is the standalone host's job, as choosing the folder
   is: a host already passes `dir`. The plugin gets ledgers for free.
5. **One server, one open ledger at a time** (23C). Switching ledgers is the folder switch's path
   (`apps/board/server/project.ts` `open`). "One server per ledger" stays literally true.
6. **What is repo-wide stays at `.visionboard/`** (38): the standalone chat's sessions, attachments and the
   permissions file. Everything the engine reads or writes is per ledger.
7. **Today's single ledger moves into `main/`** (28, 29) the first time the board opens a folder in the old layout,
   with the flag on: only while this server holds the folder's lock (no live lock anywhere), by rename only (never a
   copy-and-delete, never a rewrite), and never twice (an existing `main/` stops it with a message). Git and the
   checkpoint tag are the history. The reverse move, `npm run ledgers:undo -- <folder>` (only `main/` back to the
   root, refused while other ledgers or a live lock exist), is the revert path with the flag off.
8. **Throwaway ledgers** (19): any ledger. The New ledger dialog offers "Keep out of git", which writes a
   `.gitignore` of `*` into that ledger's folder. Off by default.
9. **Bringing a throwaway ledger into main** (20): the first version is the agent's. Its read tools may name another
   ledger of the same project and read it read-only; the agent then draws a summary on the open ledger. An exact
   copy of a board between ledgers is out of scope.
10. **The ledger chip** (40, 43, 44). The standalone page hands the header three more page parts, beside the folder's:
    the chip in the full path, the icon in the half form, a row of "⋯" in the narrowest. The dropdown lists the
    project's ledgers, switches, and ends with New ledger…. `header-tier.ts` stays the one table for where it sits.

### Read-only and Edit (D-085 draft, below)

11. **Every ledger opens read-only** (Q: "by default when the board starts … start as a viewer only"; 42). Opening
    or switching takes no lock. A start option opens in edit mode for development (`npm run board -- --edit`,
    `VB_EDIT=1`); page and API tests start in edit mode unless a test is about read-only.
12. **Edit checks the lock at the moment it is pressed** (25, 33). It uses `takeLock` as it stands: a live lock held
    elsewhere refuses, naming the computer, and the board stays read-only. Stop editing releases the lock.
13. **Read-only writes nothing into the ledger's folder** (34). No line (not even a flag, a seen mark or a Send act),
    no agent, no lock, no picture, no `.gitignore`: the folder may be a read-only Dropbox share. The person's write
    controls are disabled with the reason. The page's existing read-only path for a past version
    (`readOnly: () => !!versions.state`, `controller.ts` `sender`) is widened to cover it; D-043's
    `boardLocked`/`passesLock` is **not** reused, because it lets flags through. Seen marks stay in the page's memory.
    The repo-wide chat files at `.visionboard/` (sessions, attachments, permissions) are the person's conversation,
    not the board, and may still be written; a chat message on a read-only ledger records no Send act, as on a
    locked board (`chat-sessions.ts` `isLocked` path).
14. **Agents read, and are told** (39, 31 rev.). An agent that has joined the ledger reads everything; every read
    carries `readOnly: true`. Every write is refused, before anything is written, with a new problem `read-only`
    (HTTP 409), whose words say the person can press Edit. `join` is a write (it adds to `agents.json`): a new agent
    is refused until Edit, and a chat that would need a new agent or grant line says so. Tools stay listed (the MCP
    list is cached for an hour and the server announces no change, `packages/mcp/src/info.ts` `CACHE`). The new state
    is named `readOnly` / `read-only` everywhere, never `locked` (the "ruling 7" test in
    `apps/board/tests/api-lock-person.test.ts` keeps `.locked` to `visibility.ts` and `lock.ts`).
15. **"Locked" is untouched** (25, 32). D-043's per-board lock keeps its code, words and padlock. In edit mode the
    other boards of a ledger stay writable while one is locked.
16. **The read-only state is always visible** (45): in all three header forms, never only in "⋯", like the Locked
    padlock in the narrowest form.
17. **A watched ledger follows replacement too** (10). Besides appended lines, a ledger file replaced by a git pull,
    a Dropbox sync or a dropped-in copy is reopened, so a viewer always shows what is on disk.
18. **The plugin gets read-only too** (35). An optional engine option, so a host built for `SEAM` 1 still works:
    `SEAM_TYPES` is set again, `SEAM` stays 1 unless the types check says otherwise. Standalone first.

### Process (46-54, and the maintainer's 2026-11-03 message)

19. **Opus 5.5 for every sub-agent** ("you can actually use Opus 5.5 for everything"): every row's Model is `strong`.
20. **Checkpoint first** (done): tag `checkpoint/before-ledgers` on a clean `main`.
21. **One thing at a time**: ledgers fully (waves 1-3), then read-only (waves 4-5); the bot's instructions once,
    at wave 6.
22. **Flags on at the close**, planner's call: `ledgerFolders` and `readOnlyStart` default on once VERIFY_01 and
    FIX_01 leave no blocking finding. Before that, off. The maintainer's own repo folder moves into `main/` the first
    time the maintainer's board opens it with `ledgerFolders` on, so the closing note tells the maintainer that, and
    how to undo it (decision 7). If VERIFY_01 leaves anything blocking, the flags stay off and the note says why.

---

## Dependencies

- Wave 1 (PATHS_01, ACCESS_01) first: every later task asks the paths module for a folder, and the agent's file
  rules must be safe before a nested data folder exists anywhere.
- Wave 2, LEDGERS_01: the contract and the server for ledgers (open, switch, create, lock per ledger, the move).
- Wave 3, in parallel: LEDGER_UI_01 (the chip, on LEDGERS_01's contract) and LEDGERS_02 (how agents, the MCP server
  and the CLI find and name the ledger).
- Wave 4, READONLY_01: read-only and Edit on the server and the page's write paths; needs the lock per ledger.
- Wave 5, in parallel: READONLY_UI_01 (the header), PLUGIN_RO_01 (the plugin option) and CONSOLIDATE_01 (an agent
  reads another ledger, with READONLY_01's read-only opening).
- Wave 6, SKILL_01: the bot's instructions for all of it, in one change, so `eval:bot` runs once on the finished
  behaviour.
- VERIFY_01 (wave 7) checks the whole set with fresh eyes; FIX_01 (wave 8) fixes what it finds.
- Only one `eval:bot` runs at a time (its door port is fixed, `tests/evals/bot/limits.ts`); only SKILL_01 and
  FIX_01 run it.
- **No new dependency.** Nothing is installed.

---

## House Rules

- **Where it runs**: the maintainer's always-on machine, on the Dropbox-shared repo. The orchestrator works in the
  main checkout; every sub-agent works in its own worktree. The maintainer's board (port 4466) runs from the main
  checkout and must keep running: never stop it, never use port 4466, never open the repo's own `.visionboard/` from
  a test or a dev server (a test makes its own folder under the OS temp folder).
- **Branches**: the orchestrator cuts `feat/ledgers` from `main` at wave 0. Each task gets its worktree from the
  orchestrator before dispatch: `npm run worktree -- <name> --base feat/ledgers` (`scripts/worktree.mjs`: makes
  `.claude/worktrees/<name>` on `feat/<name>` and prints the path and a `VB_TEST_PORT`). `<name>` is the task id in
  kebab-case (`paths-01`). **Use the port in TASK-STATUS's Ports table, not the printed one**: the script probes only
  the first 10 ports of a block while page workers use base+10 to base+59, and two tasks picked before either starts
  testing can be given the same block. The brief names the path and the port; the sub-agent checks
  `git branch --show-current` first. After the wave gate the orchestrator merges each task branch into
  `feat/ledgers`, then removes the worktree (`git worktree remove`) and deletes the branch, so no stale entry is left.
- **Commits and tags**: only the orchestrator commits. After each wave gate it commits and tags `ledgers/wave-N`. At the
  close it merges `feat/ledgers` into `main` and tags `ledgers/done`. No push: the repo has no remote it pushes to.
- **Orchestrator-only files**: `docs/decisions.md`, `cortex-tasks/tracker.md`, `docs/specification/modules.md`
  (`npm run map`), `package.json` and the lockfile, `packages/format/src/flags.ts`, `cortex/AUDITED.md`.
  Sub-agents append their own one-line LOG entry to `cortex/LOG.md` (append-only, one line ending in a newline).
- **Protected** (never touched by anyone in this set): `.kiro/steering/vision-board-proj.md`, `AGENTS.md`, `CLAUDE.md`,
  `docs/principles.md`, the design tokens, existing entries in `docs/decisions.md`.
- **Flags**: `ledgerFolders` and `readOnlyStart` are added off at wave 0 (`packages/format/src/flags.ts`, the
  shape of the latest flags there). Each task tests both on and off. The orchestrator turns each on only after
  VERIFY_01 passes with no blocking finding (decision 22).
- **Project checks per task**: `npm run verify`, `npm run check`, `npm run gen -- --check` when the contract changed,
  the unit tests of what changed, and the page specs of what changed. Never the full page suite (the orchestrator's).
- **Wave gate (orchestrator)**: `npm run map`, `verify`, `check`, `gen -- --check`, `npm test`, `npm run test:plugin`;
  after waves 3, 5 and 8 also the full page suite (`npm run test:pages`). Any change to `skills/vision-board/SKILL.md`
  or the plugin's bot words: `npm run eval:bot` passes before the merge (project rule 399).
- **The machine**: `nice -n 15` and `VB_TEST_WORKERS=3` on every test run. Time limits: 5 minutes for a spec group,
  15 for the full page suite, 20 for `eval:bot`. A run that hangs is a failure to report, never a loop.
- **Long files**: a file over 50 lines is created with its first section and appended in chunks (Cortex rule 10).
  Repeated connection resets: stop and report.
- **The live skill**: `skills/vision-board/SKILL.md` is the one copy linked into `~/.claude/skills` and `~/.kiro/skills`
  from the main checkout (D-057), so edits on a branch reach no live agent until the close merges them.
- **Words**: every new sentence a person or an agent reads goes in its area's words file
  (`docs/specification/words.md` says which), never in the code that shows or sends it.
- **Screenshots**: an existing screenshot changes only where the task's look is the intended change, named in the
  task's notes. A refactor (PATHS_01) changes none.
- **Done** for any task with UI: every state, accessibility and contrast pass, a gallery entry, and a look in a
  browser in light and dark at all three header widths (1400, 900 and 600 px wide), as the person sees it.
- **Stop conditions**: a decision above proves unworkable; a test the task did not touch starts failing and the
  cause is outside the task's files; anything would write to the repo's own `.visionboard/` or `~/ai/nclite`.

---

## Decision entries to append (wave 0, orchestrator)

The maintainer approved the strategy in chat on 2026-11-03 ("you can proceed with all of this", points 23-54). The
orchestrator appends these two entries to the end of `docs/decisions.md` at wave 0, text as below, with the numbers
the file's next free ids give (D-084 and D-085 when written). Tasks then cite them by number.

```markdown
## D-084 A project holds several ledgers, one folder each
- **Date**: 2026-11-03 · **Status**: Accepted (maintainer, points 23-30, 37-44) · **From**: board-app ledgers-and-read-only PLAN
- **In short**: `.visionboard/` holds one folder per ledger; each is a whole data folder for the engine, chosen by the standalone host.
- **Decision**:
  1. `.visionboard/<ledger>/` holds a ledger, its agents, lock, images, apps and app state. Repo-wide files (the standalone chat's sessions, attachments, permissions) stay at `.visionboard/`. The first ledger is `main`.
  2. One paths module gives every data-folder path from the project and the ledger; the agent's file rules stay their own table (D-037), held equal to it by a test.
  3. Keys, card identities, board numbers and agents are per ledger (amends D-017's "per project" to "per ledger").
  4. Choosing a ledger is the standalone host's, as choosing the folder is; the plugin seam does not change.
  5. One server has one ledger open at a time; switching is the folder switch's path; the lock is per ledger.
  6. A folder in the old layout moves into `main/` on first open, by rename only, while holding the lock; `npm run ledgers:undo` reverses it.
  7. The header shows folder / ledger / board / version; the ledger is three page parts of the standalone host, placed by `header-tier.ts`.
  8. An agent's read tools may read another ledger of the same project, read-only, to bring its work into the open one.
  9. Behind `ledgerFolders`.
- **Why**: one ledger per project grows without end and mixes unrelated work; throwaway planning needs a ledger of its own.
- **Rejected**: a ledger folder beside `.visionboard/` (clutters the project root); per-board files inside one ledger (agents, grants and numbers are ledger-wide, a far larger contract change); ledgers inside the plugin's board picker (a seam change for a host's choice).
- **Task**: cortex-tasks/board/2026-11-03_board-app_ledgers-and-read-only/TASK-STATUS.md

## D-085 A ledger opens read-only; Edit takes its lock
- **Date**: 2026-11-03 · **Status**: Accepted (maintainer, points 25, 31-36, 39, 42, 45) · **From**: board-app ledgers-and-read-only PLAN
- **In short**: opening a ledger never writes; Edit takes the ledger's lock if no one holds it; agents can read a read-only ledger and are told it is read-only.
- **Decision**:
  1. A ledger opens read-only and takes no lock; `--edit` or `VB_EDIT=1` opens it for editing, for development and tests.
  2. Edit takes the lock at the moment it is pressed (`takeLock`); a live lock elsewhere refuses and names the computer. Stop editing releases it.
  3. Read-only writes nothing at all: no line, flag, Send, lock or file.
  4. Reads carry `readOnly: true`; writes answer the problem `read-only`. Tools stay listed. D-043's `locked` is unchanged.
  5. The read-only state shows in all three header forms.
  6. A followed ledger reopens when its file is replaced, not only when it grows.
  7. The engine takes an optional read-only option, so a host can have it; `SEAM` stays 1 if the types check allows.
  8. Behind `readOnlyStart`.
- **Why**: a board shared through Dropbox, a git pull or a sent file must be watchable by anyone without a second writer forking the ledger; writing is a deliberate step.
- **Rejected**: hiding the tools while read-only (MCP clients cache the list for an hour, `packages/mcp/src/info.ts` `CACHE`); reusing `locked` (it means one board closed by the person, and bots are told to stop); a read-only server mode chosen only at start (the person could not go from watching to editing).
- **Task**: cortex-tasks/board/2026-11-03_board-app_ledgers-and-read-only/TASK-STATUS.md
```

---

## Out of Scope

- The HTML export, the double-click app (Tauri), a hosted page talking to a local server (points 2, 3, 7, 12, 13): later sets.
- Ledgers chosen inside a host (nclite): a host keeps passing one `dir` per bot (D-077).
- An exact copy or move of a board between ledgers; merging two ledgers.
- More than one ledger open in one server at once; several board tabs.
- Opening a board from the server's reads in snapshots (tracker N15): separate.
- Cleaning up stale worktree folders under `.claude/worktrees/` from earlier sets: the maintainer's call, separately.

---

## Risks & Considerations

| Risk | Level | Mitigation |
|------|-------|------------|
| Agent secrets in a nested folder readable by the agent | High | ACCESS_01 in wave 1, tests first, both layouts covered before any nested folder exists; a test holds `ACCESS_RULES` equal to the paths module |
| A path still built from `<project>/.visionboard` shows the wrong ledger's pictures or apps | Medium | PATHS_01 moves every caller onto one module first, with no behaviour change; `npm run verify` gains a check that only the paths module names a data-folder file |
| The move into `main/` loses or forks data | Medium | Rename only, only while holding the lock, never twice; tested on a copy of a real ledger in a temp folder; checkpoint tag; `ledgers:undo` |
| An old server on the other machine (Dropbox) keeps writing the old path | Medium | The move refuses while any live lock exists; both machines run the same synced code, so a restarted server is the new one |
| Read-only by default breaks most page and API tests | High | READONLY_01 changes the test fixtures to start in edit mode first, in the same task, before the default changes |
| Bots told the wrong thing (a write refused, a folder moved) | Medium | `read-only` words say what to do; bot instruction changes pass `npm run eval:bot` before merge |
| Two writers after a stale-lock takeover over a slow Dropbox sync | Medium | Edit re-reads the lock and appends nothing until it holds it; the existing 2-minute rule stays; VERIFY_01 simulates two machines on one folder |
| Header crowding at narrow widths | Low | `header-tier.ts` decides; the ledger goes into "⋯" in the narrowest form; looks at three widths |
| A new ledger's file reaches GitLab | Medium | The maintainer changes `.git/export-gitlab.sh` to drop `--path .visionboard` whole (2026-11-03). The orchestrator never edits it; at the close it reads it and logs a `[needs-human-input]` item if the change is not there |
| Attachment paths already stored as `.visionboard/attachments/…` stop resolving | Low | Attachments stay repo-wide at `.visionboard/attachments/` (decision 6), so stored paths keep working; `chat-files.ts` `attachedFile` keeps its shape check |
| The header's measured widths (`FULL_MIN` 1300, `HALF_MIN` 620) no longer fit with one more chip | Medium | LEDGER_UI_01 re-measures with the longest names and changes the numbers only if a control is cut, with the header-tier specs as proof |
| The plugin's types hash changes | Low | PLUGIN_RO_01 sets `SEAM_TYPES` and records whether `SEAM` moves, by plugin.md § The types and the seam version |

---

## References

- `docs/principles.md` (whole); `cortex-architecture` skill; `docs/decisions.md` D-017, D-037, D-043, D-074, D-077, D-078, D-082, D-083
- `docs/specification/plugin.md` § The engine, § The types and the seam version; `docs/specification/components.md`
  § The header by its own width; `docs/specification/api.md`, `api-reference.md`; `docs/specification/words.md`
- Code: `apps/board/server/{ledger,lock,project,folders,agents,caller-folder,images,chat-files,chat-permissions,chat-index,recent}.ts`,
  `apps/board/server.ts`, `apps/board/server/engine/engine.ts`, `apps/board/plugin/{engine,seam}.ts`,
  `packages/agent/src/access-rules.ts`, `packages/mcp/`, `packages/cli/`, `packages/format/src/{flags,images,apps}.ts`,
  `apps/board/src/board/host.ts`, `apps/board/src/board/chrome/header-tier.ts`, `apps/board/src/shell/Folder*.svelte`
- The previous set, as a model of how a set runs here: `cortex-tasks/board/2026-10-31_board-app_plugin-mode/`

---

## Success Criteria

- [ ] A project holds several ledgers in `.visionboard/<ledger>/`; the header lists, switches and creates them at every width
- [ ] Nothing outside the paths module names a data-folder file; `npm run verify` holds it
- [ ] An agent can read no ledger's `agents.json`, chat sessions or app state, in either layout, proven by tests
- [ ] An old-layout folder moves into `main/` once, losing nothing; `ledgers:undo` moves it back
- [ ] A ledger opens read-only and writes nothing; Edit takes the lock or names who holds it; Stop editing releases it
- [ ] Agents read a read-only ledger, are told `readOnly`, and get `read-only` on writes; `locked` unchanged
- [ ] A viewer follows a ledger that grows and one that is replaced
- [ ] The plugin's engine takes the read-only option; `test:plugin` passes; `SEAM` decided by the types check
- [ ] An agent reads a throwaway ledger and draws a summary on the open one
- [ ] `npm run eval:bot` passes with the new instructions; full gates green; a look in light and dark at three widths
