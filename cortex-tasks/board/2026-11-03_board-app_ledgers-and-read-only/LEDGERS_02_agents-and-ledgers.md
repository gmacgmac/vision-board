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

**Status**: Pending

### Changes Made
-
### Issues & Resolutions
-
### Caught Beyond the Brief
- None
### Deviations from Plan
- None

## On Completion

Notes; your row; one LOG line (`[board-agent] LEDGERS_02: …` → this file, one line ending in a newline); the return
block with `REQUESTS`. No commit.
