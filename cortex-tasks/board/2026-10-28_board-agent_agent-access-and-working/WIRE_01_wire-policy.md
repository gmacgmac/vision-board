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

### Run 3 (VERIFY_01 findings; failing tests first for each)
- **F1** `kiro-agent.ts` `kiroAccess` (from `ACCESS_RULES`, with `exceptionsTo`, now shared with
  `claudeDenyRules`), merged into the agent file by `kiroAgentText`. Engine V3 `permissions.rules`
  (kiro.dev/docs/permissions: a rule is `capability`, optional `match`, optional `exclude`, `effect`
  `deny`|`ask`|`allow`; "deny > ask > allow"; the agent scope is "Embedded in agent profile (`permissions`
  field)"; the default allows "`fs_read` on `./**`"): `fs_read` `**` ask, `shell` `*` ask, a `deny` per
  refused row (`fs_read`/`fs_write`, exceptions as `exclude`, `**/` rows as they are, the rest `./`-relative).
  CLI 2.x `toolsSettings` (kiro.dev/docs/reference/built-in-tools: `read`/`write` `allowedPaths`,
  `deniedPaths`; `grep`/`glob` `allowedPaths`, `deniedPaths`, `allowReadOnly`; `shell` `allowedCommands`,
  `deniedCommands`, `autoAllowReadonly`, `denyByDefault`; "`read`, `grep`, and `glob` are trusted in the
  current working directory"): `read`/`grep`/`glob` `deniedPaths` for every row refusing a read (`.env.*`
  included: 2.x has no exception, so `.env.example` is closed to Kiro 2.x's own reads), `write` `deniedPaths`
  for refused rows without exceptions, `shell.autoAllowReadonly: false`. **Not established in sources**: a
  way to make 2.x reads in the working folder ask (none documented), so on 2.x a read inside the folder
  never reaches `verdictFor` and only the closed files are stopped (by Kiro); the JSON shape of the agent's
  `permissions` field (the page shows YAML for the file scope; the draft already used `{ rules: [...] }`);
  whether patterns are workspace-relative (the default's `./**` suggests so); whether an `ask` over ACP
  becomes `session/request_permission` ("when no interactive client is available, every `ask` is treated as
  a deny"). Test: `kiro-turn.test.ts` (the generated file); `kiro-agent.test.ts` adjusted.
- **F2** `policy.ts` `commandPolicy`: a word outside the folder → `once` only.
- **F3** `policy.ts` `searchOf`: a search (`grep -r`/`rg`, Claude's Grep, Kiro's search) of a folder holding
  the board's folder (the parent, `/`) walks the board's folder and is refused like one inside. Glob and
  `find` list names, not contents, so they are not walked (F13's advice relies on `find . -name`).
- **F4** `claude.ts`: `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR=1` (code.claude.com/docs/en/tools-reference
  § What persists between commands: "To disable this carry-over so every Bash command starts in the project
  directory"). `PolicyOptions.cwd`: a command's words resolved from it, judged against the folder; the gate
  passes the hook's `cwd` (an unresolvable `cwd` is refused). The server, which never sees that `cwd`, never
  lets an asked command through unasked (`chat-approvals.ts`: a command its policy would allow is asked, as strict).
- **F6** `git config` in `NEVER_REMEMBERED` (`code`).
- **F8** `buildClaudeArgs` passes `--tools` with the built-ins among `allowedTools` (Claude Code's flag:
  "Restrict which built-in tools Claude can use … The flag doesn't affect MCP tools", code.claude.com/docs/en/cli-reference).
  `CHAT_TOOLS` no longer lists Read/Glob/Grep twice (they are in `GATED_TOOLS`); their words exemptions went
  with them (`scripts/words-homes.mjs`, `docs/specification/words.md`).
- **F12** README's Kiro line, api.md 108, chat.md § The agent's access (Claude, Kiro, searches) and § Kiro;
  the gallery's `folderAccess` description ("Reads outside the folder ask like changes and commands", the same
  length): it still changes `folder-access-dark-darwin.png` by 2212 px (same size); light did not run after it
  (serial file). **Baseline not re-taken** (orchestrator's).
- **F13** the skill's search line (name top-level files; `find . -name` for names), NOTES.md. **F2/F7** chat.md
  "Not covered": a remembered command runs whatever code it runs; a `sed -i` yes inside covers every asked file.
- Checks: unit 1914 pass; check 0 errors; gen-api current; verify fails only on modules.md (map); chat specs on
  5400 (4 workers): 73 passed, 1 failed (the baseline above), 2 not run.

### Run 4 (the maintainer's rulings 345, 346; failing tests first: `policy-rulings.test.ts`)
- **Table** (`ACCESS_RULES`, 16 rows): `**/.envrc`, `**/.npmrc` refused both ways (`secretsFiles`, now naming
  them); `**/.visionboard/app-state/**` refused both ways (new words `appState`); `**/.visionboard/ledger.jsonl`
  write refused in any board folder; `**/.git/**` refused both ways (`gitFolder` reworded: git is the person's).
- **Ranking**: between rows naming a folder's contents, one refusing both reading and writing now wins
  before more named parts, so `**/.git/**` holds inside `.visionboard/images/` and `apps/` (which are
  writable). File rows are unchanged (`.env.example` still beats `.env.*`).
- **Every git command refused**: git off the read-only allow-list (`READERS`, `GIT_READS`, `GIT_BRANCH_LIST`
  gone); `REFUSED_PROGRAMS = ['git']` and `runsProgram` (`readonly-command.ts`) find it in any piece between
  separators and quotes, after assignments and wrappers (`env`, `sudo`, `xargs`…), by its last path part;
  `policy` refuses first with `gitIsThePersons`. A command that only mentions it (`grep "git" README`) is
  refused too (accepted false positive). The Run 2 git rows of `NEVER_REMEMBERED` and the `-C`/`-c` head
  skipping are gone (moot): one `git` row stays so a yes is never kept even off the policy.
- **Second lines regenerate**: Claude `Read/Edit(//…/**/.git/**)`, the new rows, `Bash(git)`, `Bash(git *)`;
  Kiro `fs_read`/`fs_write` denies, `shell` deny `git`, `git *`, 2.x `deniedPaths` and `shell.deniedCommands`
  `git(\s.*)?` (built-in-tools page: anchored regexes).
- **Docs**: chat.md § The agent's access (git is the person's; secrets and board files; Not covered), api.md
  107, the agent README, skill v3.18 (the Allow line and the closed files) + NOTES.md. No gallery or page copy
  became untrue (none mentions git, `.envrc`, `.npmrc` or app state): no baseline touched.
- Tests updated for the rulings: policy, policy-command, remember, claude-args, kiro-turn, api-chat-access.
- Checks: unit 1917 pass; check 0 errors; gen-api current; verify fails only on `modules.md` (new exports
  `REFUSED_PROGRAMS`, `runsProgram`: map is stale); chat specs on 5400 (4 workers): 76 passed.

### Proposed decision Run 4
**D-067 Git is the person's; more closed files** (maintainer, points 345, 346; amends D-066)
- **Decision**: D-066's table and policy change as follows.
  1. `.git` in any folder (`**/.git/**`) is refused to read and to write; among rows naming a folder's
     contents, one refusing both ways wins, so it holds inside `.visionboard/images/` and `apps/`.
  2. Every git command is refused, read-only ones too, however it is spelled (`cd … && git`, `env … git`,
     a path to git, `sh -c "git …"`, `$(git …)`); git is off the read-only allow-list. The agent says what it
     would run and why; the person runs it. A command that only mentions git is refused too.
  3. `**/.envrc` and `**/.npmrc` are refused like `.env`.
  4. `**/.visionboard/app-state/**` is refused to read and write, and `**/.visionboard/ledger.jsonl` to write,
     in any board folder.
  5. Claude Code's deny rules and Kiro's agent rules are regenerated from the table (`Bash(git *)`, Kiro's
     `shell` deny and `deniedCommands`).
- **Why**: the integrated agent builds boards and apps in `.visionboard/`; it does not see or touch git (346).
  `.git/config` can hold a token; git's own settings run commands; reading app state reached `.env` values
  through an app (VERIFY_01 F5, F6, F9, F10).
- **Rejected**: refusing only git's writing subcommands (git's config and aliases make reads run code);
  git at the folder's top only (nested repositories).
- **Task**: cortex-tasks/board/2026-10-28_board-agent_agent-access-and-working/TASK-STATUS.md (WIRE_01 Run 4)

## On Completion

Notes; your row in TASK-STATUS.md; one LOG line (`[board-security] WIRE_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS` for anything outside your files.

**Constraints**: deviation → stop and ask; no PII; no commits; never 4466; never `cortex/AUDITED.md`; no test starts a real CLI.
