# VERIFY_01 findings: the agent's access

> **Task**: [VERIFY_01_access-verification.md](./VERIFY_01_access-verification.md) · **Date**: 2026-10-29 ·
> **Tree**: `feat/agent-access` at ef3b04a (wave 3)

How it was tried: probes in `temp/verify01/` (deleted) drove the real code with the CLIs' own
tool-call shapes: Claude's hook input (`tool_name`, `tool_input`, `cwd`) through `gate.ts` `decide`, Kiro's
ACP tool call through `kiro-permission.ts` `verdictFor`, and the server's `chat-approvals.ts`
`createApprovals` for what a remembered yes covers, over a scratch board folder holding `.env`,
`.env.local`, `.env.example`, `.envrc`, `.npmrc`, `.visionboard/{agents,chat-sessions,permissions}.json`, the
ledger, `.git/config` with a token in a remote URL, a nested repository and board, a link `link -> .env`
and a folder link `src/vb -> ../.visionboard`, and a folder beside it (outside). No real CLI was run.
What the CLIs themselves do is taken from their documentation (cited) and listed for the maintainer's
live look (§ What only a live run settles).

Severity: **blocking** = a success criterion of PLAN.md fails; **high** = a refused file or a yes's
scope gives way with one ordinary answer from the person; **medium** = needs a chain; **low** = rule gap.

## Summary

| # | Finding | Severity | Proposed |
|---|---|---|---|
| F1 | Kiro reads the board's folder without asking: its default policy allows `fs_read` on `./**`, so `.env` and the bots' secrets never reach `verdictFor` | blocking | Fix in this set (agent file rules) + live run |
| F2 | A command yes "for this session" is kept by its first words and covers any path outside the folder (`cat`, `grep`, `sed -i`) | high | Fix in this set (`policy.ts`) |
| F3 | A search of a folder that holds the board's folder (`grep -r x ..`, Grep on the parent) is only asked; a yes reads `.env` and `agents.json` | high | Fix in this set (`policy.ts`) |
| F4 | Command words are resolved against the board's folder, not the shell's: after a `cd`, `cat agents.json` goes unasked | high | Fix in this set (`claude.ts` env, gate `cwd`) + live run |
| F5 | `.visionboard/app-state/**` is readable, though D-050's store says no agent read opens it; an app's `.env` keys can reach it | medium | Table row (maintainer's yes) |
| F6 | `git config` is remembered by its head; it writes `.git/config` (refused to the file tools) and can set a command `git status` then runs unasked | medium | Fix in this set (`NEVER_REMEMBERED`) |
| F7 | A remembered runner (`npm test`, `npm run build`) runs code the agent writes; that code reads `.env`, and can take the page's cookie and answer its own question | medium | chat.md line now; tracker row |
| F8 | Claude starts with its whole tool set; tools the hook doesn't match and that need no permission (`Agent`, `SendMessage`, `LSP`, `CronCreate`) bypass the gate | medium | Fix in this set (`--tools`) + live run |
| F9 | Rows for `.git/**` and the ledger are anchored at the folder's top: a nested repository's hooks or a nested board's ledger are only asked by the file tools (a command naming them is refused) | low | Table rows (maintainer's yes) |
| F10 | Other secrets are read unasked: `.git/config` (a remote URL with a token), `.envrc`, `.npmrc` | low | Tracker row (the person's rules file) |
| F11 | A command acting on a whole folder (`cp -r . ../x`, `tar czf ../x.tgz .`) is asked without saying the folder holds closed files | low | Tracker row |
| F12 | Docs say Kiro's reads all reach the rules (README, api.md, chat.md twice); chat.md § Kiro still says reading goes unasked | doc | With F1 |
| F13 | Whole-folder searches: the skill's "search a subfolder" leaves the folder's own top files without a search | low | Skill line now; tracker row |

What held is in § What held. The gates are green (§ Gates).

## Findings

### F1 Kiro reads the board's folder without asking (blocking)

- **Seen**: the board's code is right when Kiro asks (`verdictFor` refuses `.env`, `../`, the link, `.ENV`,
  `cat .e*`, `src/vb/agents.json`: § What held). But Kiro does not ask for these reads. Its documentation:
  - kiro.dev/docs/permissions § default policy: without a `permissions.yaml` the default allows "`fs_read`
    on `./**` - read any workspace file silently", plus "read-only git commands" (`git status`, `git log`,
    `git diff`, `git branch` "and similar"); "the most restrictive effect wins regardless of which scope it
    came from"; effects `deny`, `ask`, `allow`.
  - kiro.dev/docs/reference/built-in-tools (the CLI 2.x page): "`read`, `grep`, and `glob` are trusted in the
    current working directory."
  - `packages/agent/kiro/vision-board.agent.json` has one rule (`mcp`, `vision-board/*`, `allow`) and
    `allowedTools: ["@vision-board"]`. Leaving reads out of `allowedTools` does not make them asked.
  So a Kiro read of `.env`, `.visionboard/agents.json` or `chat-sessions.json` in the board's folder never
  becomes a `session/request_permission`, and `verdictFor` never runs. The fake Kiro asks for everything, so
  `kiro-turn.test.ts` cannot show this. WIRE_01's "Caught beyond the brief" removed the pre-approval but not
  the default trust.
- **Fix (small, in this set; owner of the agent file, WIRE_01's row)**: in the agent file's
  `permissions.rules`, add `{ "capability": "fs_read", "match": ["**"], "effect": "ask" }` and
  `{ "capability": "shell", "match": ["*"], "effect": "ask" }`, so every read and command reaches
  `session/request_permission` and `verdictFor` (which then allows inside the folder unasked, as for Claude);
  and, as Claude's `claudeDenyRules` is a second line, `deny` rules generated from `ACCESS_RULES`
  (`fs_read`/`fs_write` on `**/.env`, `**/.env.*` with `exclude` `**/.env.example`,
  `**/.visionboard/agents.json`, `**/.visionboard/chat-sessions.json`; `fs_write` on the ledger,
  `.visionboard/**` but images and apps, `.git/**`), written by `kiroAgentText` (`kiro-agent.ts`) as the
  Claude rules are by `claudeDenyRules`. For the 2.x CLI, `toolsSettings` `read`/`grep`/`glob` `deniedPaths`
  with the same paths (the V3 page says `toolsSettings` is deprecated but still read). A test that the
  generated agent file carries an `ask` on `fs_read` and `shell` and a `deny` per refused row.
- **Live run** (the maintainer's look): which Kiro the board runs (api.md names kiro-cli 2.28.0; the V3
  rules page says a 2.x profile with `allowedTools` and no `permissions` block is skipped by V3); that an
  `ask` arrives over ACP as `session/request_permission` (the page says only that with no interactive
  client every `ask` is a deny); whether the patterns are relative to the workspace; whether a shell
  `cat .env` is also checked against `fs_read` rules (not established in sources).

### F2 A command's "for this session" covers paths outside the folder (high)

- **Seen** (`createApprovals`, the server's own): answer "Allow for this session" to `cat <outside>/notes.txt`
  (offered once, session), then, unasked: `cat <outside>/id_key`, `cat /etc/hosts`. The same with
  `grep -r TODO <outside>` (then `grep -r SECRET ..` and `grep -r KEY <the board's parent>` unasked) and with
  `sed -i s/a/b/ src/a.ts` (then `sed -i … <outside>/notes.txt` unasked). The cover is the command's head
  (`coverOf` → `rememberedHead`: `cat`, `grep`, `sed`), and `policy` offers `session` for an outside read
  (`settle`). WIRE_01 closed this for the Read tool ("a read's cover is its file only"); a read-only command
  reaches the same files.
- **Fix (small, in this set; `policy.ts` `commandPolicy`, RULES_01's file)**: a command any of whose words
  resolves outside the folder is offered `once` only (`settle(…, once = true)` when `judged.some((j) =>
  !j.inside)`), so no kept yes ever covers a path outside. Failing test first in `remember.test.ts` or
  `api-chat-access.test.ts`: the three trials above. Inside the folder a `sed -i` yes still covers every
  file the rules ask about (the Write tool's covers one folder): worth a line in chat.md.

### F3 A search of a folder holding the board's folder is only asked (high)

- **Seen**: `grep -r SECRET ..` and Claude's `Grep` with `path` the board's parent, Kiro's `search` with
  `path: '..'`: all three **ASK** (Claude gate and Kiro alike). A yes reads `.env` and
  `.visionboard/agents.json` inside the board's folder, which D-066 2 refuses "whatever the person answers".
  `policy` walks a search only when it is inside the folder (`commandPolicy`: `if (!j.inside …) continue`;
  `policy`: `facts.recursive && j.inside`). With F2, one session yes on an outside `grep` then covers every
  later search of the parent or the home folder unasked. Claude Code's own deny rules don't close it for
  `grep -r` ("They don't apply to a command that reads files without naming them, such as `grep -r pattern
  .`", code.claude.com/docs/en/permissions.md § What Read and Edit rules cover).
- **Fix (small, in this set; `policy.ts`)**: when a search's folder is outside but holds the board's folder
  (the root is under it), walk the board's folder as for a search inside it, and refuse what it finds
  (`searchReaches`). Test: `grep -r x ..`, `rg x /`, Grep with the parent: refused.

### F4 Command words are resolved against the board's folder, not the shell's (high)

- **Seen**: the gate takes the folder from `AGENT_GATE_FOLDER` (right: the rules are relative to it) but
  also resolves a command's words from there (`commandPolicy` → `judge(root, word)`), never from the hook's
  `cwd`. Claude Code keeps a `cd` between Bash commands inside the project ("the new working directory
  carries over to later Bash commands as long as it stays inside the project directory",
  code.claude.com/docs/en/tools-reference.md § What persists between commands). With the hook's `cwd` at
  `.visionboard/`: `cat agents.json`, `grep -h "" agents.json`, `head -c 999 chat-sessions.json` are all
  **allowed unasked** by the gate (`refusedTail` sees only `agents.json`; `judge` looks for
  `<folder>/agents.json`, which isn't there). The Read tool, by contrast, is placed by the hook's `cwd`
  (`factsFor` → `placed`) and refused. Getting there takes one ordinary-looking yes: `cd .visionboard` is
  refused, but `cd .vision*` is only asked (and offered "for this folder"), and `cd src` then `cd vb`
  (a link to `.visionboard`) asks `cd vb` judged at the folder's top, where `vb` doesn't exist.
  Claude Code's own deny rules may still stop `cat` (they "apply to … file commands Claude Code recognizes
  in Bash, such as `cat`, `head`, `tail`, `sed`, and `tee`"); `grep` on a named file is not established.
- **Fix (small, in this set)**: (a) `claude.ts` sets `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR=1` in the CLI's
  environment beside `gateEnv` ("To disable this carry-over so every Bash command starts in the project
  directory", same page), so every command starts in the board's folder; (b) the gate resolves a command's
  relative words from the hook's `cwd` when that is inside the folder (a `cwd` option to `policy` for
  commands; the rules still relative to the folder). Test: hook `cwd` `.visionboard`, `cat agents.json`:
  refused. Kiro: whether its shell keeps a `cd` is not established in sources (live run).

### F5 App state is readable, and an app's `.env` keys can reach it (medium)

- **Seen**: `ACCESS_RULES` reads `.visionboard/app-state/**` freely (`policy` → `{"allow":true}`), but the
  store's own header says "no agent read opens these files" (`apps/board/server/apps/panel-state.ts`,
  D-050). An app the agent writes freely in `.visionboard/apps/` may declare `env` keys (apps.md `env`:
  "The keys in the project's `.env` the tools may read"); after the person's Allow its tool gets them
  (`ctx.env`), its panel may save any value (`vision-board/save-state`), and the saved file lands in
  `app-state/`, which the agent then reads unasked: a `.env` value through one Allow that, as far as the
  page's code shows, does not name the `.env` keys (no words for `env` found in `apps/board/src`; not
  established that the Allow card shows them).
- **Fix (table row, the maintainer's yes, D-066 1)**: `.visionboard/app-state/**` read refuse (write is
  already refused). Tracker row: the app Allow names the `.env` keys it gives the app.

### F6 `git config` is remembered by its head (medium)

- **Seen**: `git config user.name x` answered "for this session", then `git config core.fsmonitor 'sh x.sh'`
  and `git config core.hooksPath src` go **unasked** (head `git config`). `.git/**` is refused to the
  file tools, but git writes `.git/config` itself; `core.fsmonitor`, `core.hooksPath`, `core.pager`,
  `diff.external` and aliases run a command on a later git call, and `git status`, `git diff` are
  read-only, so unasked.
- **Fix (small, in this set; `readonly-command.ts` `NEVER_REMEMBERED`)**: `git config` as `code` (asked every
  time); a failing case in `remember.test.ts`. The asked question still shows the whole command.

### F7 A remembered runner runs whatever the agent writes (medium)

- **Seen** (by reading, not run): `rememberedHead('npm test')` is `npm test`, offered for the session and for
  the folder (`api-chat-access.test.ts` keeps it). With a write yes in the test folder (or in the top
  folder, which holds `package.json`), the agent changes the code that `npm test` runs and runs it unasked.
  That code reads `.env` (the rules judge tool calls, not what a program opens: chat.md § Not covered says
  this of a script, not of a remembered runner), and it can `GET` the page and keep the person's cookie
  (`app.ts` sets `vb_person` on every `.html`; api.md 27: "it stops mistakes, … not attackers"), then
  `answer_approval` its own question or mark a card ✓.
- **Proposed**: now, a line in chat.md § The agent's access (Not covered) and the skill: a yes for a
  command that runs the folder's code covers what the agent later writes there. Tracker row: offer only
  `once` for runners of the folder's own code (`npm test`, `npm run`, `make`, `pytest`, `cargo test`), or put
  Claude's Bash in Claude Code's sandbox (code.claude.com/docs/en/sandboxing.md: OS-level, the
  permissions page's recommendation for what Read rules can't reach), and give the person cookie only to
  the page the board opened (not to any local `GET`).

### F8 Claude's tools outside the gate (medium)

- **Seen** (from `buildClaudeArgs` and the docs): the CLI starts with its default tools; `--allowedTools`
  pre-approves `CHAT_TOOLS`, and the hook matches `^(Write|Edit|MultiEdit|NotebookEdit|Bash|Read|Glob|Grep)$`.
  Tools marked "Permission required: No" in code.claude.com/docs/en/tools-reference.md run without asking
  and without the hook: `Agent` (a subagent; its own calls do reach the hook, but this is not established for
  every case), `SendMessage` ("one of your other Claude Code sessions, on this machine or beyond it", where
  cross-session messaging is on: work handed to a session the board's rules don't cover), `CronCreate`,
  `LSP` (Read deny rules apply to it), `ListMcpResourcesTool`. Tools that need permission and aren't allowed
  (`Monitor`, `WebFetch`, `Skill`) are refused in `-p` without a prompt [INFERENCE: no prompt is possible].
- **Fix (small, in this set; `claude-args.ts` `buildClaudeArgs`)**: pass `--tools` with only the built-ins the
  board gates (`Read`, `Glob`, `Grep`, `Write`, `Edit`, `NotebookEdit`, `Bash`, `ToolSearch`), so no other
  built-in tool exists in the session (the docs: "With `--tools` you get the ones you list"). Live run:
  the board's MCP tools still load with `--tools` set.

### F9 Rows anchored at the folder's top (low)

- **Seen**: Write `sub/.git/hooks/pre-commit` (a nested repository) and `sub/.visionboard/ledger.jsonl` (a nested
  board): **ASK**. The rows are `.git/**` and `.visionboard/ledger.jsonl`, not `**/…`; point 339 widened only the
  bots' secrets. A command naming the same files is refused (`refusedTail` matches any trailing part), so the
  two routes disagree. A board opened on a folder of repositories leaves every repository's hooks one
  ordinary yes away.
- **Proposed (table rows, the maintainer's yes)**: `**/.git/**` and the `**/.visionboard/…` write rows.

### F10 Other secrets read unasked (low)

- **Seen**: Read `.git/config` (a remote URL with a token), `.envrc`, `.npmrc`: **ALLOW**. Only `.env` and
  `.env.*` are named.
- **Proposed**: tracker row with the person's own rules file (PLAN § Out of scope), or rows now for
  `.envrc`, `.npmrc`, `.netrc`, `*.pem`, `*.key`, `id_*`: the maintainer's call.

### F11 A command on a whole folder (low)

- **Seen** (by reading `commandPolicy`): the search walk runs for `grep`/`rg` only. `cp -r . ../x`,
  `tar czf ../x.tgz .`, `zip -r ../x .` are asked (never remembered for `cp`; `tar`, `zip` are kept by head),
  and the question doesn't say the folder holds closed files. A yes copies `.env` and `agents.json` out;
  `tar xOf ../x.tgz` (naming no closed file) then prints them.
- **Proposed**: tracker row: an asked command naming a folder that holds closed files says so in the
  question (the walk is there), and such a command is never remembered.

### F12 Docs that are not true (doc)

- `packages/agent/README.md` (the Kiro draft: "so every read, search, write and command reaches the
  permission request"), api.md ("Kiro's agent file allows no reading tool unasked, so every read reaches the
  rules") and chat.md § The agent's access ("so every read reaches it"): untrue while F1 stands; true once
  F1's rules are in the agent file (then keep, with the test).
- chat.md § Kiro: "The board's own tools (`vb`) and reading go ahead unasked; a file change or a command is
  asked": since D-066 reads go through `verdictFor`; replace with a pointer to § The agent's access.
- The gallery's `folderAccess` description (`apps/board/src/gallery/folder-access-section.ts`): "Reads and
  searches are asked like changes and commands": only outside the folder (or with `agentAccessRules` off).
- chat.md § Not covered: add F7's line and F2's inside-the-folder note.

### F13 Whole-folder searches (the brief's question)

- **Seen**: any search of the board's whole folder is refused (`grep -r x .`, `rg x`, Grep with no path), since
  `.visionboard/agents.json` is always there. The skill says "Search a subfolder (`src`), not the whole
  folder" (SKILL.md, the closed-files bullet). Claude's `Glob` and `find . -name …` still list names across
  the folder (names only: allowed), and a search with named files (`grep -n x README.md package.json`) is
  allowed.
- **Is the advice enough?** Mostly. It misses the folder's own top files, which no subfolder holds (`grep x *`
  is a glob, so asked, not allowed). Note: Claude Code leaves `Grep`/`Glob` out on macOS unless named in
  `--allowedTools` (tools-reference § Glob tool behavior); the board names them, so they stay.
- **Proposed now** (skill, WIRE_01's line): "For files at the top of the folder, name them
  (`grep -n x README.md package.json`); `find . -name` lists names across the whole folder." **Tracker row**:
  a gentler walk. Not by trusting ripgrep's own skipping of hidden files: a whitelist line (`!.env`) in an
  `.ignore` or `.gitignore` the agent may write would bring a hidden file back [INFERENCE from ripgrep's
  ignore rules; not checked here], so any such rule has to read those files too.

## What held

Every attempt below is **refused** on both routes (Claude's gate and Kiro's `verdictFor`), with the rule's reason:

- `.env`: Read directly, through `src/../../board/.env`, through the link `link -> .env`, as `.ENV`; `cat .env`,
  `cat .e""nv`, `cat $'.e\x6ev'`, `cat .e*`, `cat .[e]nv`, `cat link`, `find . -name .env -exec cat {} ;`,
  `cat src/a.ts | cat - .env`, `git show HEAD:.env`, `grep -r SECRET .`.
- The bots' secrets: `cat .visionboard/agents.json`; Read `src/vb/agents.json` through a folder link.
- Writes: the ledger (Write, Kiro edit, `echo {} >> .visionboard/ledger.jsonl`), `.git/hooks/pre-commit`,
  `.visionboard/permissions.json`; `sed -i` on a nested `.git/hooks/` file (a command).
- A yes's scope: a Read yes outside covers that file only (the next outside file is asked); outside calls
  are never offered "for this folder"; a kept yes never covers a refused path (the policy runs first, and
  `sed -i` on a refused path is refused after a session yes for `sed`); `cd src` "for this session" covers
  `cd src` only (`cd vb` is asked).
- **Hold** (step 2): `chat-hold.test.ts` (an hour of fake time still waiting; Stop, the turn ending and a new
  message release it), `chat-approvals.test.ts` (an answer after an hour, a day: still the answer),
  `turn-clock.test.ts` (five hours held is not working time; Stop ends it): all pass. A question can't answer
  itself through the board's own routes (`answer_approval` is the person's cookie only, `callers.ts`), but see
  F7 for the cookie.
- **Working alongside and the folder scope** (steps 3 and 4): `chat-alongside.spec.ts` and
  `chat-folder.spec.ts` on 5600, 17 passed (every state, axe and contrast, light and dark baselines). A look in
  the gallery in a browser, light and dark: the Chat button's marks, Queued, the toast with Open chat; the
  approval with four answers inside and three outside, "Allowed for this folder" on the card, the header's
  list with Forget, and the empty list. Nothing wrong to the eye; F12 has one description line.

## What only a live run settles (the maintainer's look)

1. **Claude Code and an escaped `[`** (WIRE_01's question): the docs say Read and Edit rules "use gitignore
   pattern syntax", that Claude Code itself escapes `[`, `]` and `*` in a rule it writes for an approved path
   "so the generated rule matches only the literal path you approved", and that a deny rule whose path
   isn't a usable pattern "still guards that exact path" (code.claude.com/docs/en/permissions.md § Special
   characters). [INFERENCE] its matcher reads `\[` as a literal `[`, so `ruleRoot`'s escaping is right. A
   live run with a board folder whose name holds `[` and a `Read` of its `.env` past a gate that allows it
   (the gate decides first, so the rule is only the second line) would settle it.
2. **Kiro and read-only shell commands** (WIRE_01's question): the 2.x page gives `autoAllowReadonly` default
   `false` ("When enabled, read-only commands are allowed without prompting"); the V3 permissions page's
   default allows read-only git commands and system-info commands silently, not `cat`. So `cat .env` should
   reach `verdictFor` and be refused; `git show HEAD:.env` may not (if "and similar" covers `git show`):
   F1's `shell` `ask` rule closes both. Which Kiro runs, and that `ask` becomes `session/request_permission`
   over ACP: F1.
3. F4: whether Claude Code's deny rules stop `cat agents.json` after a `cd`, and whether Kiro's shell keeps a `cd`.
4. F8: `--tools` with the board's MCP tools.

## Gates

`npm test`: 1907 pass, 0 fail; timing 14 pass. `npm run check`: 0 errors, 0 warnings. `npm run verify`: ok
(18 warnings, long files). `gen-api --check`: current. Page specs for what changed (`chat-alongside`,
`chat-folder`, port 5600, 2 workers): 17 passed. No full page suite (house rule).

## Doc audit (`cortex-docs`)

- chat.md § The agent's access: true but for F12's Kiro line and F3 (a search outside "asked" reaches refused
  files); § Kiro stale (F12); § The approval's timing true (tests above).
- api.md 100, 101, 106 to 108: the Kiro line (F12); the rest agrees with `createApprovals` and the probes.
- `packages/agent/README.md`: the Kiro draft line (F12).
- The skill v3.17: the closed files, the asked commands and "search a subfolder" agree with the code; F13's
  line for top files, F7's line.
