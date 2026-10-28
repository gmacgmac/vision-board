# RULES_01_access-rules: The access rules and the policy

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

One table of path rules and one pure function that decides, for any tool call the agent makes, allow,
ask or refuse, with a reason. Nothing is wired yet (WIRE_01 does that); this task makes it exact.

## Inputs

- **Files to modify**: TASK-STATUS.md File Ownership (RULES_01)
- **Files to reference**: `packages/agent/src/approvals.ts` (`factsFor`, `Facts`, `WriteFacts`,
  `CommandFacts`), `kiro-permission.ts` (`verdictFor`), PLAN.md § The rules, `docs/specification/words.md`
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. **Contract first** (`access-rules.ts`, `policy.ts` types): `AccessRule { path: string (glob, relative
   to the folder); read: 'allow' | 'ask' | 'refuse'; write: same; why: string }`, `ACCESS_RULES` (PLAN.md's
   table, most specific match wins, then the order written); `Decision = { allow: true } | { ask: true; scopes: ('once' | 'session' | 'folder')[] } | { refuse: string }`.
   A read fact kind is needed for reads (`ReadFacts { kind: 'read'; path }`): add it beside `WriteFacts`
   in `approvals.ts`'s types only if WIRE_01 can't take it; say which in your notes (it is WIRE_01's file in wave 2; if you must add the type now, put it in `policy.ts` and export it).
2. **Failing tests first** (`packages/agent/tests/policy.test.ts`), on a real temporary folder with real
   symlinks: every row of the table for read and write; `..` (`.visionboard/images/../ledger.jsonl`
   refused); a symlink inside the folder to a refused file refused, to a file outside asked; a symlink
   folder; case (`.ENV` on a case-insensitive disk: refuse, and say how you know the disk's case rule);
   a file that does not exist yet (its nearest existing parent decides); an absolute path inside; a
   path outside (asked, scopes once and session only); `~` never expanded by us (it is a literal name);
   the board's folder itself a symlink.
3. **Shell commands** (`readOnlyCommand(command)`): the allow-list in PLAN.md; tokenise with quotes;
   anything with redirection, `$(`, backticks, `;`, `&&`, `||`, `&`, or a command not on the list is
   not read-only. A read-only command is a read of every path-like argument (each decided by the
   table; any refused → refuse; any outside → ask). Any command (read-only or not) naming a refused path
   → refuse. Tests: `ls`, `cat src/x.ts`, `git log --oneline`, `git diff HEAD~1`, `grep -rn foo src | head`
   allowed; `cat .env`, `cat .visionboard/agents.json`, `echo x > .visionboard/ledger.jsonl`,
   `rm .git/hooks/x` refused; `npm test`, `git commit -m x`, `find . -delete`, `sed -i`, `cat ~/x` asked.
4. **The policy** `policy(facts, folder)`: resolves, matches, decides; reasons from the words file (the
   agent reads them: plain, short, saying what to do instead: "The ledger is written only through the
   board's tools.").
5. **README** and the words home; no wiring.
6. **Draft D-066** in your notes (§ Proposed decision): the agent's access is decided by path rules (the
   table, refusal holds over any answer, resolution, unlisted asks, outside asks once or session, the
   `folder` scope narrowed to a folder or a command head, questions wait: PLAN.md rulings).
7. **Checks**: `npm test`, `check`, `verify`, `gen-api --check`.

## Validation

- [x] Every table row, `..`, symlinks, case, new files, outside paths, commands: tested, seen failing first (stubs threw; 22 tests failed, then passed; the `$'...'` case checked by disabling its branch)
- [x] Pure: no I/O but through an injected `PathReader` (`realpath`, `lstat`, plus `readlink` and `readdir`: see Deviations)

## Implementation Notes

**Status**: Completed · **Completed**: 2026-10-28

### Changes Made
- `packages/agent/src/access-rules.ts` (new): `AccessRule`, `AccessVerdict`, `AccessOp`, `ACCESS_RULES` (PLAN's
  table, 13 rows), `OUTSIDE_RULE`, `globRegExp`, `accessFor(rel, op)` (most specific row: a row naming a file
  beats one naming a folder's contents, then more named parts, then order; matched as written and ignoring
  case, the stricter kept), `stricter`, `refusedTail(word, op, glob)` (a command word refused by any trailing part).
- `packages/agent/src/policy.ts` (new): `ReadFacts { kind: 'read'; path; recursive? }` (here, not in
  `approvals.ts`: WIRE_01 may move it beside `WriteFacts`), `PolicyFacts`, `AskScope`, `Decision`, `PathReader`,
  `PathStat`, `NODE_READER`, `ResolvedPath`, `resolveIn(folder, path, reader?)`, `policy(facts, folder, { reader?, strict? })`.
  Resolution walks each part as the kernel does (`..` on the real folder, symlinks followed with a 40-link limit,
  a dangling link by where it would create, `realpath.native` for the disk's spelling, a missing tail as written).
- `packages/agent/src/readonly-command.ts` (new): `shellWords` (POSIX quoting, `\`, `$'...'` decoded, words split
  even when not plain), `readOnlyCommand` (`{ reads, searches }` or null), `commandHead`.
- `packages/agent/src/words/agent-access.ts` (new): every sentence the agent reads from the rules and the policy.
- `packages/agent/src/index.ts`: the export lines. `packages/agent/README.md`: § Access rules, Public API.
- Tests: `packages/agent/tests/policy.test.ts` (paths, 13), `policy-command.test.ts` (commands, 9),
  `access-fixture.ts` (a real folder: symlinks inside/outside/folder/dangling/loop, a hard link, a linked board folder).

### Caught Beyond the Brief
- **Lexical `..` is a bypass**: with `up` → `.visionboard/images`, `up/../agents.json` is `agents.json` as text but
  `.visionboard/agents.json` on disk. Resolved part by part on the real folders (test "`..` is followed").
- **A dangling symlink in an allowed folder** (`.visionboard/images/hooky` → `.git/hooks/pre-commit`) would let a
  Write create a git hook; followed to where it would create, refused.
- **Case-folded absolute path to the folder** (`/USERS/...`) read as outside (asked) would have let a yes reach
  `.env`; `realpath.native` gives the disk's spelling, so it is inside and refused.
- **A hard link is a second name** no path rule can see: a file with `nlink > 1` is asked `once` (never allowed,
  never remembered).
- **A search reads files it doesn't name**: `grep -rn x .`, `rg x` (no path: the folder) read `.env` and
  `agents.json`. A recursive read (`ReadFacts.recursive`, `grep -r`, `rg`) walks the folder (up to 5000 entries)
  and is refused when anything under it is refused; unsure (a link to a folder or outside, too many files) → `once`.
  `grep -rn foo src` stays allowed. When grep/rg flags are not the simple known set, the folder itself counts
  as searched (an `-e`/`-g` value can't be told from a path).
- **Routes to a refused name in a command**: `.en''v`, `.\env`, `$'\x2eenv'`, `"$HOME/p/.env"`, `${PWD}/.env`,
  `~/p/.env`, `$(echo .env)`, `HEAD:.env`, `-f.env`, `--file=.env`, `cd src && cat ../.env`, `.e*`,
  `.visionboard/*`: all refused (tests). `find -fprint`, `tree -o`/`-R`, `git diff --output`, `git -c`, `file -C`,
  `wc --files0-from`, `rg --pre`/`--hostname-bin` are not read-only.
- `strict` option: the `agentAccessRules` flag off as one switch (`packages/agent` imports nothing from the repo, so
  the host passes it): nothing allowed unasked, no `folder` scope; refusals unchanged.

### Deviations from Plan
- The reader has `readlink` and `readdir` beside `realpath`/`lstat` (dangling links; the search walk). Still injected.
- In a command, a word whose **trailing part** names a refused path is refused wherever it points (a `cd` or a
  variable makes a command's words unresolvable), so `cat ../other/.env` is refused while a Read of that file
  (exactly resolved, outside) is asked. Stricter for commands only.

### For WIRE_01 and the maintainer
- Call `policy` first, then any remembered yes, and never let a remembered yes turn a `refuse` into a yes.
  Remember a command yes by `commandHead` only (null → don't remember). An interpreter head (`python3`,
  `node`, `sh`) remembered covers any script it runs: consider never remembering those.
- Claude's Grep/Glob → `ReadFacts` (`recursive: true` for Grep), Read → `ReadFacts`; Kiro `read`/`search` the same.
- Not in the table, raised for the maintainer: `**/.env.*` refuses `.env.example` too (the repo commits one);
  a nested board's `sub/.visionboard/agents.json` is readable (the rows are root-relative).
- Not covered: a command that reads a refused file without naming it (a script, `python -c`, a name built at
  run time, `git log -p` of a committed secret) is asked, not refused. Between the decision and the tool
  running, the disk could change (only by an already approved command).

### Proposed decision
**D-066 The agent's access is decided by path rules** (points 329, 331, 334, 335)
- **Decision**: The side-panel agent's every tool call is decided by one function, `policy`
  (`packages/agent/src/policy.ts`), over one table, `ACCESS_RULES` (`access-rules.ts`), of paths relative to
  the board's folder:
  1. The table: everything in the folder read allow, write ask; `**/.env`, `**/.env.*`,
     `.visionboard/agents.json`, `.visionboard/chat-sessions.json` refused; the ledger, `lock`, `app-state/**`,
     `permissions.json` and the rest of `.visionboard/` read allow, write refuse; `.visionboard/images/**` and
     `apps/**` allow (an app's changed code asks again before it runs, D-047); `.git/**` read allow, write refuse.
     The most specific row wins (a file before a folder's contents, then more named parts, then order).
  2. A refusal holds whatever the person answers, and is applied before anything remembered.
  3. A path is resolved before the table is asked: absolute, `..` on the real folders, symlinks followed, the
     disk's spelling, a new file by its nearest existing folder; matched as written and ignoring case, the
     stricter kept. A hard-linked file is asked once.
  4. Anything the table doesn't allow outright is asked. Outside the folder: asked "once" or "this session"
     only, never remembered for the folder.
  5. A shell command that only reads (the allow-list, joined only by `|`, plain words) is a read of each word;
     a search is a read of every file under its folders. Any other command is asked; any command naming a
     refused path is refused.
  6. A remembered yes is narrowed: a write yes covers its file's folder, a command yes its first words
     (`commandHead`); the new `folder` scope is kept in `.visionboard/permissions.json`, which only the server
     writes, listed and forgettable by the person.
  7. A question waits until the person answers, stops, or sends a new message; the turn's limit counts only
     the agent's own working time; Claude's hook waits up to 24 hours.
  8. Behind `agentAccessRules` (on): off, nothing is allowed unasked and there is no `folder` scope; the
     refusals, the resolution and the narrower remembered yes are a fix and hold either way.
- **Why**: one yes covered every write or command; reads had no limit (`.env`, the bots' keys, the home
  folder); the ledger and `.git/` were ordinary files; paths were judged as typed; a question expired after
  2 minutes.
- **Rejected**: a deny list on paths as typed (bypassed by `..`, links, case); refusing every command
  (the agent could not run tests); refusing outside the folder (the person sometimes wants it).
- **Task**: cortex-tasks/board/2026-10-28_board-agent_agent-access-and-working/TASK-STATUS.md

## On Completion

Notes; your row in TASK-STATUS.md; one LOG line (`[board-security] RULES_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS` for anything outside your files.

**Constraints**: deviation → stop and ask; no PII; no commits; never 4466; never `cortex/AUDITED.md`; no test starts a real CLI.
