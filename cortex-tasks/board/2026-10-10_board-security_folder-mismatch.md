---
category: board-security
status: completed
created: 2026-10-10
tracker: cortex-tasks/tracker.md#U12
---

# An agent from another folder is told so, never re-joined or misread

> **Follows**: `2026-10-09_board-app_open-folder.md` (built, not yet committed) · **From**:
> maintainer, 2026-10-10 (chat 435-436) · **Model**: Opus 5.5 · **Go**: given

## Problem

The board can now switch folder while it runs. An agent that joined while folder A was open keeps
calling after the person opens folder B:

- Its writes are refused (agents are kept per folder), but the refusal says "Call join again"
  (`apps/board/server/callers.ts` `UNKNOWN_SECRET`). The agent joins B as a new agent and may draw
  A's work as a new board in B (a board needs no grant): stray boards in the wrong folder.
- Its reads need no secret, so it reads B's card 12 believing it is A's card 12.

## Rulings (maintainer; do not reopen)

1. **A secret from a recent folder gets a clear refusal**, never "join again": "The board has
   switched to `~/projects/b`. Your work is in `~/projects/a`. Ask the person to open it again;
   don't join here." The server checks an unknown secret against the agents of the recent folders
   (`server/recent.ts`; their `agents.json` hold hashes only) before answering.
2. **The `vb` MCP says which folder it works in**, and the server refuses reads and writes from a
   different folder with the same clear message. The folder is `VB_PROJECT` in the MCP's env if
   set, else the nearest folder at or above the MCP's working folder that has `.visionboard/`.
   With neither (an agent started outside any project, e.g. in the home folder), nothing is sent
   and nothing is checked (ruling 1 still protects writes). An agent working in a subfolder of the
   open folder matches.
3. **Answers name the open folder**: `join` and `list_boards` carry it (display name under `~`), so
   an agent can check where it is.
4. **The chat panel keeps working**: its CLI runs in the open folder, so its `vb` MCP matches; the
   switch already stops its chats.
5. Person routes and the page are unaffected.

## Design (the task may refine; stop and say so if a ruling can't hold)

- **Contract first** (OpenAPI 1.12.0): an optional request header on every agent operation
  (e.g. `VB-Project`, an absolute path); a new problem type for the mismatch (`wrong-folder`,
  409) whose detail names both folders; `project` on the `join` and `list_boards` answers.
  `npm run gen` for the MCP tools and docs; `api.md` lines.
- **Server**: one module for "which folder is this caller in" (header vs the open folder, real
  paths, subfolder match), called once in dispatch for agent operations; the unknown-secret path
  in `callers.ts` asks the recent folders' agents before the generic message.
- **MCP** (`packages/mcp`): work out the folder once at start (ruling 2) and send it on every
  call; update the MCP instructions (`INSTRUCTIONS`, `INSTRUCTIONS_JOINED`) so an agent refused
  with `wrong-folder` stops and tells the person rather than joining.
- **Skill**: one line in `skills/vision-board/SKILL.md` under access (agent instructions are code,
  rule 17): on `wrong-folder`, stop and tell the person.

## Steps

1. [x] Contract and generated code.
2. [x] Failing tests first: a secret from the folder left gets `wrong-folder` naming both folders
   (not "join again"); reads and writes with a header for another folder are refused; a subfolder
   matches; no header is not checked; `join`/`list_boards` name the folder; the MCP works out its
   folder (env, upward search, none) and sends it; the chat panel's agent still draws after a
   switch (fake CLI).
3. [x] Build server, MCP, instructions, skill line.

## Validation

- [x] The five gates exit 0 (`npm test`, `npm run check`, `npm run verify`,
  `npm run gen -- --check`, `npm run test:pages`).

## Constraints

- If deviation is needed, stop and say so. No PII in examples (`~/projects/a`). No git commits or
  stash.
- Protected files (steering, decisions, `tokens.css`): propose wording, never edit.
- Scratch in the system temp folder; stop only your own processes; never touch the repo's
  `.visionboard/` or real home-folder files (tests inject a temp home).
- One job per file, under 300 lines. Fill Implementation Notes below and append your own LOG line.

## Implementation Notes

**Status**: Completed 2026-10-10 (Opus 5.5). No ruling changed; one refinement (1 below).

### Contract (OpenAPI 1.12.0)
- Parameter `projectHeader`: `VB-Project` (header, optional) on all 10 `x-agent` operations; the
  folder's absolute path percent-encoded as `encodeURI` does it, so the header stays ASCII
  (`project.schema.json` `$defs/folderHeader`, `^/[!-~]*$`). Response `wrongFolder` (409,
  `wrong-folder`) on the same 10; no other operation has either (openapi.test.ts checks both ways).
- Problem code `wrong-folder` (409, "Wrong folder") in `problem.schema.json` and `server/problem.ts`.
- `project` (required; the display name, `project.schema.json` `displayName`) on
  `join-response.schema.json` and `list-boards-response.schema.json`; `join` and `list_boards`
  descriptions say so, and `join`'s says: on `wrong-folder`, stop, tell the person, don't join.
- `scripts/gen-reference.mjs` lists header inputs in the reference's Inputs tables (they are not
  tool arguments or `vb` flags); `server/spec.ts` leaves header parameters out of `SPECS.params`.
  `npm run gen`: route table (version only), MCP tools, `vb` table (descriptions), api-reference.md.
- api.md: errors table row, 22 and 111 updated, new § "An agent from another folder" (114-117).

### Server
- `apps/board/server/caller-folder.ts` (new, 60 lines): `checkFolder` (header → decoded → real
  path; the open folder or inside it matches, else `wrong-folder`; bad header `bad-request`),
  `secretElsewhere` (recent folders' `agents.json`, hashes only, read only; the open folder
  skipped; a missing or bad file skipped), `wrongFolder` (the ruling-1 text, both folders as
  display names), `openName` (for `join`/`list_boards`).
- `dispatch.ts`: for `SPECS[id].agent` operations, `checkFolder` runs before `callerOf`, so the
  header wins over an unknown secret. `callers.ts`: `CallerEnv.elsewhere`, asked before the
  generic `UNKNOWN_SECRET` (which stays for a secret no recent folder knows).
- `reads.ts` `listBoards` and `writes.ts` `join` answer `project`.
- `chat-access.ts` `vbServer(base, secret, project)` sets `VB_PROJECT` to the open folder
  (`chat-sessions.ts` passes its `cwd`), so the panel's MCP always matches (ruling 4).

### MCP and client
- `packages/client` `ClientOptions.project` → `VB-Project: encodeURI(project)`.
- `packages/mcp/src/project.ts` (new) `projectOf(env, cwd)`: `VB_PROJECT` (resolved against the
  working folder), else the nearest folder at or above with `.visionboard/ledger.jsonl`, else none.
  `bin/vb-mcp.ts` works it out once and logs it; `ServerOptions.project` / `CallContext.project`.
- `info.ts` `REST` (so both `INSTRUCTIONS` and `INSTRUCTIONS_JOINED`): "`join` and `list_boards`
  name the folder the board has open (`project`). If a call answers `wrong-folder`, the board has
  another folder open: stop, tell the person what it says, and do not call `join`."
- README: `VB_PROJECT` setting and the `wrong-folder` identity note.
- Skill: one line under Access; status v1.1. `scenarios.md` gains 9 "The board switched folder".
  **Not run against a model** (rule 17): the scenario is there for the maintainer's run.

### Tests
- New `apps/board/tests/api-folder-mismatch.test.ts` (7): `join`/`list_boards` name the folder;
  after a switch the old secret gets `wrong-folder` with the exact text on `write_board`,
  `request_grant`, `list_open`, `check_responses` (no "join again", no `WWW-Authenticate`, nothing
  written); a header for another folder refused on `list_boards`, `get_board`, `read_ledger`,
  `join` (nothing written) and checked before the secret; the open folder, a subfolder and a link
  to it match, no header unchecked; bad headers 400; person routes ignore the header; the chat
  panel's agent after a switch: its config carries `VB_PROJECT`, the real `vb-mcp` started from
  that config in the CLI's folder draws, and the same MCP with another folder gets the text.
- New `packages/mcp/tests/project.test.ts` (5): env, upward search, none (home with only
  `recent.json`), the header sent / not sent, the instructions.
- Changed: `client.test.ts` (header encoding), `openapi.test.ts` (1.12.0, header/409 on agent ops
  only, 13 codes), `api-errors.test.ts` and `api-schemas.test.ts` (`project` required),
  `api-harness.ts` (`agent(secret?, project?)`; a temp home unless the test brings one, so no API
  test reads the real home, as api.md 112 already claimed), `packages/mcp/tests/support.ts` (the
  spawned MCP runs in the temp folder: the repo's own `.visionboard/` is not the fixture server's).
- `npm run map` regenerated `docs/specification/modules.md` (verify asked for it).

### Gates (2026-10-10)
`npm test` 0 (921 + 6 pass), `npm run check` 0, `npm run verify` 0 (0 warnings), `npm run gen --
--check` 0, `npm run test:pages` 0 (307 passed; no screenshot changed). The real `~/.visionboard`
was never created.

### Refinements and things to know (no ruling changed)
1. **"Has `.visionboard/`" is read as "has `.visionboard/ledger.jsonl`"** in the MCP's upward
   search. The home folder keeps `~/.visionboard/recent.json` (open-folder task), so with the
   folder test alone every agent under home would name `~` and be refused everywhere, breaking
   ruling 2's "in the home folder, nothing is sent". The ledger file is the same test `hasBoard`
   uses everywhere else.
2. `project` is the display name string (`~/projects/a`), not `{ path, name }`.
3. A recent folder's secret is matched by hash alone (its ledger's `join` line is not read), to
   keep the refusal cheap; a hash left by a failed join could at worst give `wrong-folder` instead
   of "join again". Only folders under home are in recent, so a folder left outside home (a
   `VB_PROJECT` start in `/tmp`) still gets the generic `not-authenticated`.
4. The message says "has switched to" in the header case too (ruling 2: "the same clear message"),
   even when the agent's folder was never open on this board.
5. Reads without a header and without a secret stay unchecked (ruling 2 accepts this).
6. **Open:** `vb` (packages/cli) does not send `VB-Project`; the rulings name only the MCP. Adding
   it is one option in `vb`'s client (say the word).
7. An MCP client must start `vb-mcp` in the project (Claude Code and Kiro do); one started
   elsewhere with no `VB_PROJECT` sends nothing, and only ruling 1 protects it.

### Proposed wording (protected files; not edited)
**Steering** (`.kiro/steering/vision-board-proj.md`, "Running the board and connecting an agent",
the MCP bullet, add after "Leave `VB_AGENT_SECRET` unset so each chat joins as its own agent."):
> The MCP names the folder it works in (`VB_PROJECT`, else the project it was started in); when the
> board has another folder open, every call answers `wrong-folder`, and the agent stops and tells
> you.

**D-039** (`docs/decisions.md`, append):
> **D-039 — Agents say which folder they work in.** Date: 2026-10-10. Status: Proposed. Decision:
> every agent operation takes an optional `VB-Project` header (the agent's folder); the server
> refuses a call for another folder, and a secret known to a recent folder's agents, with
> `wrong-folder` (409) naming both folders, never "join again". The `vb` MCP sends the header
> (`VB_PROJECT`, else the nearest project at or above its working folder); `join` and
> `list_boards` name the open folder. Why: once the board can switch folder (D-038), an agent left
> behind would join the new folder and draw its work there, or read another project's card 12 as
> its own (rulings 435-436). Rejected: one agents file across folders (an identity would follow
> the person into every repo), and refusing only writes (reads would still mislead). Task:
> `cortex-tasks/board/2026-10-10_board-security_folder-mismatch.md`.
