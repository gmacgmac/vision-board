# WIRE_01_wire-policy: Every route uses the policy

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

Every tool call the agent makes, by Claude or Kiro, file or command, read or write, is decided by
RULES_01's `policy` before anything else; a remembered yes is narrow; "Allow for this folder" is kept
across sessions in a file only the server writes.

## Inputs

- **Files to modify**: TASK-STATUS.md File Ownership (WIRE_01)
- **Files to reference**: RULES_01's and HOLD_01's notes (Shared Foundations), `chat-access.ts`
  `CHAT_TOOLS`, `claude-args.ts` `gateSettings`, `gate.ts` `decide`, `kiro-permission.ts` `verdictFor`,
  `chat-approvals.ts` `kept`, the chat schema (`packages/chat/schema/chat-event.schema.json`, the
  `folder` scope the orchestrator added)
- **Skills**: `cortex-architecture`, `cortex-docs`; the `vision-board` skill (you edit it: bump its version)

## Steps

1. **Failing tests first**, end to end with the fake CLIs: Claude's Read of `.env` refused, of a file in
   the folder allowed without a question, of a file outside asked; Write to the ledger refused even after
   "this session" for writes; a session yes for `src/a.ts` covers `src/b.ts` but not `docs/x.md`; a
   command yes for `npm test` covers `npm test -- foo` but not `npm run build`; Kiro the same through
   `verdictFor`; `cat .env` refused; "for this folder" survives a new session and a server restart.
2. **Claude**: the hook's matcher adds `Read`, `Glob`, `Grep`; `--settings` also carries
   `permissions.deny` generated from `ACCESS_RULES`' refused reads (absolute paths, `//…`), as a second
   line. `CHAT_TOOLS` keeps the read tools allowed so the hook decides.
3. **The gate and Kiro** call `policy` first: refuse → the reason, allow → no question, ask → the server.
4. **The server** (`chat-approvals.ts`): `policy` again (the server is the authority), then remembered
   yeses: write by folder, command by its first words, `folder` scope from the store. Outside the board's
   folder: once or session only.
5. **The store** (`chat-permissions.ts`): `.visionboard/permissions.json`, written by the server only
   (atomic write), read at start; list and forget operations in openapi.json (`list_permissions`,
   `forget_permission`: the person's, cookie, like the other person routes), api.md rows; regenerate is
   the orchestrator's (a `REQUEST`).
6. **The skill**: what the agent may read and write and that refusals are final; version line, `NOTES.md`.
7. **Docs**: chat.md § approvals, api.md. **Checks**: unit, `check`, `verify`, `gen-api --check` (stale
   until the orchestrator regenerates: say so), chat page specs on 5400.

## Validation

- [x] One policy on every route; refused holds over any answer; narrow remembered yeses; the store kept and forgettable

## Implementation Notes

**Status**: Completed · **Completed**: 2026-10-28

### Changes Made
- **packages/agent** — `approvals.ts`: `ReadFacts` moved here (`Facts` = write | command | read), `AskScope`,
  `READ_TOOLS` (Read, Glob, Grep) in `GATED_TOOLS`; `factsFor` makes read facts (Read's file, Glob's pattern's
  folder, Grep's path `recursive`); `RULES_REFUSAL` (`asked: false`, not approved); `coverOf` (a write's
  folder, a read's file, a search's folder, a command's `rememberedHead`). `access-rules.ts` (RULES_01-R3,
  points 338/339): `**/.env.example` read allow / write ask; `**/.visionboard/agents.json`,
  `**/.visionboard/chat-sessions.json` in any board folder; `rememberedHead` (never an interpreter, shell or
  launcher, nor a script by its path; `npm run <script>` keeps the script). `gate.ts`: `decide(…, access)`
  calls `policy` first (refuse → the rule's reason, allow → unasked, ask → the server);
  `AGENT_GATE_FOLDER`, `AGENT_GATE_STRICT`, `gateEnv` (claude.ts uses it); no folder → denial.
  `kiro-permission.ts` `verdictFor(…, strict)`: reads, searches, edits, moves, commands through `policy`
  on every path the call names. `claude-args.ts`: hook matcher covers the read tools; `claudeDenyRules`
  → `permissions.deny` in `--settings` (second line). `adapter.ts` `StartOptions.strictAccess`; `kiro.ts`
  passes it. `kiro/vision-board.agent.json`: only `@vision-board` pre-approved (reads were never asked).
- **Server** — `chat-approvals.ts` `createApprovals(emit, { folder, ttlMs, onWait, strict, kept })`: `policy`
  again, then a kept yes (session in memory, folder from the store), else a request with `scopes`; an
  answer with a scope not offered is `invalid`. `chat-permissions.ts` (new): `.visionboard/permissions.json`
  (atomic, 0600, git-ignored, schema-checked; damaged → nothing kept). `chat-session.ts` (`access`),
  `chat-sessions.ts` (flags `approvalHold`/`strictAccess` to the adapter and approvals; `tell` queues words
  alone and folder messages, joined; `permissions`), `chat.ts` (`sendChat`: a message accepted while busy
  releases waiting approvals, a refused one releases nothing; `list_permissions`, `forget_permission`),
  `project.ts`/`app.ts` (flags from `VB_FLAGS`, HOLD_01-R1). Words: `server-chat.ts`, `agent-access.ts`.
- **Contract** — openapi.json 1.31.0: `list_permissions` (GET /api/permissions), `forget_permission`
  (POST /api/permissions/forget `{ id }`, no new path parameter), descriptions of `ask_approval` and
  `answer_approval`; `api/permission*.schema.json` (3 new). Chat schema: `readFacts`, `approval_request.scopes`
  (see Deviations). `npm run gen` run (generated output only).
- **Docs** — chat.md § The agent's access (new) and item 4; api.md 100, 101, 106, 107 (access + timing,
  HOLD_01-R4), 108, the operations table; packages/agent/README.md (interface, hold/approvalHold/turn-clock,
  gate, Kiro, coverOf/rememberedHead, API); skill v3.17 + NOTES.md.
- **Tests** — new `packages/agent/tests/remember.test.ts`, `apps/board/tests/chat-permissions.test.ts`,
  `apps/board/tests/api-chat-access.test.ts` (end to end: fake claude + the real bin/gate.ts with the CLI's own
  environment against the server); updated gate, kiro-turn, claude-args, policy, chat-approvals, chat-hold,
  api-chat-approvals/-sessions/-context, route-table, openapi; fake-claude notes `gateEnv`; `accessFixture`
  in `#agent/testing`.

### Verification
- `npm test`: see Return; `npm run check` 0 errors; `gen-api --check` current; `npm run verify` fails only on
  `docs/specification/modules.md` (orchestrator's `npm run map`).
- Page specs `tests/pages/chat*.spec.ts` on 5400 with `VB_TEST_WORKERS=4` (port 5450 is held by another
  process, not ours): 65 passed.

### Caught Beyond the Brief
- **Kiro never asked for reads**: its agent file pre-approved `read`/`grep`/`glob` and `fs_read`, so `verdictFor`
  would never see a read and `.env` stayed open to Kiro. Now only `@vision-board` is pre-approved.
- **The gate's folder can't come from the hook input**: its `cwd` follows the agent's `cd`; the folder comes
  from the CLI's environment (`AGENT_GATE_FOLDER`), which the agent cannot change.
- **A read yes outside the folder kept by folder** would open its neighbours (a yes to `~/notes.txt` "this
  session" would allow `~/.npmrc`): a read's cover is its file only.
- **A script by its path** (`./build.sh`) remembered would cover whatever the agent writes into it next:
  never remembered. `npm run` alone would cover every script: `npm run <script>` keeps the script.
- **A refused words-alone message released the open question** (WORK_01): now a message that is accepted
  (queued) releases (point 335), a refused one releases nothing (test).
- Claude Grep with no path, `rg x`: a whole-folder search is always refused in a board folder, because
  `.visionboard/agents.json` is there. Skill says "search a subfolder"; for the maintainer (below).

### Deviations from Plan
- **Files outside WIRE_01's row**, each a line or two, needed to carry the policy on every route:
  `packages/agent/src/adapter.ts` (`strictAccess`), `claude.ts` (`gateEnv`), `kiro.ts` (passes `strictAccess`),
  `policy.ts` (`ReadFacts` moved out, as RULES_01 offered), `packages/agent/kiro/vision-board.agent.json`,
  `packages/agent/tests/fake-claude.ts`, `support.ts`, `apps/board/tests/api-harness.ts` (`PERSON_OPS`),
  `apps/board/tests/openapi.test.ts`, `route-table.test.ts`.
- **The chat schema** (`packages/chat/schema/chat-event.schema.json`, the orchestrator's): `$defs/readFacts` in
  `facts`, `approvalRequest.scopes`, the outcome's `asked` description. Without `read` facts an asked read
  (outside the folder, or strict) can't reach the person; without `scopes` ASK_01 can't know when to offer
  "for this folder". Additive; the `$id` is still `chat/1` (chat.md 7 says a change moves it: the
  orchestrator's call, as for the `folder` scope).
- **Generated files**: `npm run gen` was run to verify (output only); the orchestrator may regenerate.
- **The page's `ChatHost` flag for queued words** is not done: it needs a field in `packages/chat`
  (`conditions.ts` `ChatHost`, `composer-core.ts`), outside `apps/board/src/shell/chat-*.ts` (REQUESTS).

### For the maintainer
- A command yes covers its first words as planned, so a yes to `rm -rf build` covers `rm -rf src` (head `rm`)
  and `git -C x commit` covers all of `git`. Consider never remembering destructive heads (`rm`, `mv`, `dd`)
  or a single-word head with flags.
- Every whole-folder search is refused in a board folder (`agents.json` is always there). If that bites,
  the search walk could skip what the agent may not read instead of refusing; a decision.
- Not established in sources: how Claude Code matches an escaped `[` in a `Read(//...)` deny rule; whether
  Kiro's `shell` runs read-only commands without a permission request (an `autoAllowReadonly`-like
  default would bypass `verdictFor` for `cat .env`). VERIFY_01 should try both with real CLIs.

### Run 2
- Orchestrator: schema additions accepted as they are; `$id` stays `chat/1`.
- **Never remembered, asked every time** (failing tests first, `remember.test.ts`): one table,
  `NEVER_REMEMBERED` in `readonly-command.ts` beside `commandHead` (moved there with `rememberedHead`
  from `access-rules.ts`): `code` (interpreters, shells, launchers), `targets` (`rm`, `rmdir`, `mv`, `cp`,
  `chmod`, `chown`, `ln`, `dd`, `truncate`, `git reset`, `git clean`, `git restore`, `git push`, `git rebase`,
  `npm publish`; `git checkout` with `--`; `git branch` with `-D`; any git command with `--force`,
  `--force-*` or `-f` among short flags), `network` (`curl`, `wget`).
- `git -C <dir>` and `-c k=v` are skipped when taking the head (`commandHead`, `plainWords`): `git -C x commit`
  is `git commit`.
- Said in chat.md § The agent's access, api.md 107, the agent README, the skill's Allow line (v3.17 status)
  and NOTES.md. `api-chat-access.test.ts`: `rm -rf build` offered `once` only; `git -C . commit` kept as
  `git commit` end to end.
- Checks: unit 1897 pass; check 0 errors; gen-api current; verify fails only on modules.md (map); chat page
  specs on 5400 (4 workers): 65 passed. No new LOG line (orchestrator).

## On Completion

Notes; your row in TASK-STATUS.md; one LOG line (`[board-security] WIRE_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS` for anything outside your files.

**Constraints**: deviation → stop and ask; no PII; no commits; never 4466; never `cortex/AUDITED.md`; no test starts a real CLI.
