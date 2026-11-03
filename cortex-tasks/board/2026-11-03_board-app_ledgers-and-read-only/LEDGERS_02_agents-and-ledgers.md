# LEDGERS_02_agents-and-ledgers: Agents find and name the ledger

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

With `ledgerFolders` on, the MCP server, the `vb` CLI and the chat's agent find a project in either layout, and an
agent that joined one ledger, calling while the board has another open, is stopped with one sentence naming both
ledgers, never served by the wrong one.

## Context

PLAN decisions 3 and 5. LEDGERS_01's notes first: its contract answers `ledger` on `list_boards` and `join`. Today
(research, 2026-11-03):

- `packages/client/src/project.ts` `projectOf`: `VB_PROJECT`, else the nearest folder at or above the working folder
  with `.visionboard/ledger.jsonl` (now through the paths module), else none. Used by `packages/mcp/bin/vb-mcp.ts` and
  `packages/cli/src/node-io.ts`; `client.ts` sends it as `PROJECT_HEADER` (`VB-Project`). Tests:
  `packages/mcp/tests/project.test.ts` (including "else none: a home folder with only recent.json…", which builds a
  `homeLike/.visionboard/x` folder that the new layout could mistake for a ledger). Documented in
  `packages/mcp/README.md` § Settings.
- `apps/board/server/caller-folder.ts`: `checkFolder` (`isUnder(env.dir, header)` or `wrongFolder`), `secretElsewhere`
  (scans the recent folders' agents files; returns `joinAgain` or `wrongFolder`); wired in `dispatch.ts`.
- The chat's agent gets `VB_PROJECT = cwd` (`chat-access.ts` `boardMcpServer`, from `chat-sessions.ts` `openChats`).
  After PATHS_01, `cwd` is `projectOfLedger(…)`, the project, not a data folder.
- Agents are per ledger (decision 3): a secret lives in one ledger's `agents.json`.

## Inputs

- **Files to modify**: TASK-STATUS.md File Ownership (LEDGERS_02, wave 3)
- **Files to reference**: `docs/specification/api.md` § An agent from another folder; `api-reference.md` `join`;
  the bot's rule for `wrong-folder` (`skills/vision-board/SKILL.md`, the MCP instructions in `packages/mcp/src/words/info.ts`:
  stop, tell the person, do not join)
- **Shared artifacts to reuse**: `data-folder.ts` (`ledgerFolder`, `projectOfLedger`, the layout test it offers),
  `hasBoard` from LEDGERS_01 if exported for this; never a second "is this a board" rule
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. **Failing tests first**: `projectOf` finds a new-layout project and an old one; `homeLike/.visionboard/recent.json`
   alone is still none; an agent joined on ledger `ui` calling while `main` is open gets `wrong-folder` whose words name
   both ledgers and say to tell the person; an agent unknown to every ledger of the folder still gets
   `not-authenticated`; `secretElsewhere` looks in every ledger of each recent folder.
2. **One "is this a board" rule**: `projectOf` and the server's `hasBoard` share it (export it from the place
   LEDGERS_01 put it, or move it to the paths module's pure part if it needs no I/O; never two copies).
3. **The wrong ledger**: reuse the `wrong-folder` problem (the bot already stops on it, so no instruction change);
   new words only, in `apps/board/server/words/`, naming the folder and both ledgers.
4. **The chat's agent**: its MCP server gets the project and, if the server needs it, the open ledger
   (`VB_LEDGER`), so the chat agent's calls land on the ledger the person is looking at.
5. **The CLI**: `vb` reports the ledger beside the project where it reports the project today.
6. **Docs** (`cortex-docs`): `api.md` § An agent from another folder (another ledger too); `packages/mcp/README.md`
   § Settings (both layouts).

## Validation

- [ ] `node --test packages/client/tests packages/mcp/tests packages/cli/tests` and the named `apps/board/tests` green, flag on and off
- [ ] `npm run verify`, `check` green
- [ ] On a scratch project with two ledgers: an MCP server in its folder joins `main`; switching the board to `ui`
      makes its next call answer `wrong-folder` naming both

## Implementation Notes

_To be completed by the agent. Re-run? Add a `### Run N` block; never overwrite an earlier run._

**Status**: Completed (2026-11-03, Opus 5.5, worktree `feat/ledgers-02`)

### Changes Made
- **One "is this a board" rule for the agent's tools** (step 2, LEDGERS_01-R5): `packages/client/src/project.ts`
  `ledgersIn(dir, { fs })` (old layout, plus the `.visionboard/` folders with a ledger name and a ledger file; paths from
  `#format` `ledgerFolder`/`ledgerFiles`/`projectFiles`/`ledgerNameProblem`); `projectOf` uses it, so the MCP server and
  `vb` find a project in either layout, from inside a ledger folder too. `ProjectFs.fs` gains `readdirSync`.
  `apps/board/tests/ledger-layout-rule.test.ts` holds it equal to the server's `ledgers.ts` `isOldLayout`/`listLedgers`/
  `hasLedger` and `folders.ts` `hasBoard` on 8 folder shapes (see Deviations).
- **The wrong ledger** (step 3): `caller-folder.ts` `FolderEnv.ledger` (from `dispatch.ts`, `open.ledgerName`), `wrongLedger`
  (reuses `wrong-folder`, 409), `secretElsewhere` looks in the open folder's other ledgers first, then every ledger of each
  recent folder in either layout (`ledgerDirs`, `knows`; hashes read only). Words: `words/http.ts` `theBoardHasLedgerOpen`
  (names the folder and both ledgers, says stop and tell the person, don't join). No instruction change.
- **The chat's agent** (step 4): no code change needed. Its MCP server already gets `VB_PROJECT` = the project
  (`chat-sessions.ts` `openChats` `cwd` = `projectOfLedger`), and its secret is the open ledger's, so after a ledger switch its
  next call meets `wrongLedger`, never the other ledger. No `VB_LEDGER`: the server does not need it. Proven by test.
- **The CLI** (step 5): `vb` relays `list_boards`/`join` answers, which carry `ledger` beside `project` since LEDGERS_01; a
  `run.test.ts` case holds `--text` printing `project:` then `ledger:`. No CLI code change.
- **`bin/reply.ts`** (LEDGERS_01-R5): follows the ledger: the old layout's `.visionboard/` when the project is in it; else
  `--ledger <name>` (checked by `ledgerNameProblem`), else the last ledger open there (`recent.ts` `lastLedger`), else main
  (`ledgers.ts` `chooseLedger`). Writes nothing. Its sentences moved to `words/bin.ts` (`replyUsage`, `noBoardInLedger`).
- **Tests**: `api-folder-mismatch-ledgers.test.ts` (5, flag on: ui agent while main open, with header, from a subfolder and
  without, nothing written; unknown secret still `not-authenticated`; a recent folder's `ui` ledger secret: `wrong-folder` /
  join again; the real `vb-mcp` started in a scratch two-ledger project joins main then gets `wrong-folder` naming both after a
  switch; the chat agent draws on main, then is stopped on ui); `bin-reply.test.ts` (3); `ledger-layout-rule.test.ts` (2);
  `packages/mcp/tests/project.test.ts` (+2: new layout found, from a ledger folder; not-ledgers none); `run.test.ts` (+1).
  The MCP call helper moved from `api-folder-mismatch.test.ts` to `apps/board/tests/mcp-call.ts` (`callMcp`, `ownMcp`).
- **Docs** (step 6): `api.md` § An agent from another folder or ledger: 115 (every ledger, either layout), new 115a (the
  wrong ledger), 116 (both layouts, `ledgersIn`, the equality test), 117 (`ledger` in answers, the chat agent after a
  ledger switch), 124 (no join-again for another ledger); `packages/mcp/README.md` § Settings and § Identity;
  `packages/client/README.md` public API (`ledgersIn`).

### Issues & Resolutions
- `reply.ts`'s first board argument was skipped when no `--ledger` was given (`at + 1` = 0): caught by its test, fixed.
- `api-ledgers.test.ts` "the folder open now, still in the old layout…" fails in a fresh worktree with no `apps/board/dist`
  (the page sets no cookie); identical on the base without these changes; passes after `npm run build`. Environmental.
- No `timeout` on this machine: runs limited with `perl -e 'alarm N; exec …'`.

### Caught Beyond the Brief
- `join` carries no ledger: an agent with no secret yet (or one that re-joins after a compaction) joins whatever ledger is
  open. Its answer names `ledger`, so the bot can check it; worth a line in SKILL_01's instructions ("check `ledger` in the
  join answer is the one you meant").
- LEDGERS_01-R6 has a sharper edge: `chat-sessions.ts` `load` calls `rekey(agents(), record.agentId)` on the *open* ledger's
  agents for a session record found by board id (repo-wide). A session from ledger `ui` whose board id also exists in `main`
  would be given a hash in `main`'s `agents.json` for an agent id that never joined there. For VERIFY_01.
- `caller-folder.ts` `ledgerDirs` and `folders.ts` `countBoards` build the same list (old layout's folder, then each ledger's):
  one home in `ledgers.ts` would serve both (request).

### Deviations from Plan
- Small, by the principles. Step 2 asks for one rule shared by `projectOf` and the server's `hasBoard`, moved to the paths
  module or exported from `ledgers.ts`. Both of those files are outside this wave's ownership and `packages/client` may not
  import the server, so the rule lives in `#client` `ledgersIn` (I/O handed in, ready to move into `data-folder.ts` as is)
  and the server keeps its own, held equal by `ledger-layout-rule.test.ts`. Request: make `ledgers.ts` use the one rule.

### Verification
- Tier: normal (agent-facing server edge, client package, a bin; no page change). `npm run verify` ok (34 warnings, the
  same as the base); `npm run check` 0 errors; the whole unit suite (`npm test`'s globs, 3 at a time) 2301 pass, 0 fail,
  0 cancelled (after `npm run build` in the worktree). Flag on: `api-folder-mismatch-ledgers`, `api-ledgers`; flag off:
  `api-folder-mismatch`, `api-chat-*`; the client/MCP/CLI code reads no flag.
- Scratch two-ledger project: in `api-folder-mismatch-ledgers.test.ts`, the real `vb-mcp` started in the project's
  subfolder with no `VB_PROJECT` joined `main`, and after the board switched to `ui` its next call answered `wrong-folder`
  naming both ledgers, writing nothing.

## On Completion

Notes; your row; one LOG line (`[board-agent] LEDGERS_02: …` → this file, one line ending in a newline); the return
block with `REQUESTS`. No commit.
