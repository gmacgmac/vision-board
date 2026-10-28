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

- [ ] Every table row, `..`, symlinks, case, new files, outside paths, commands: tested, seen failing first
- [ ] Pure: no I/O but `fs.realpath`/`lstat` through an injected reader (so a host can supply its own)

## Implementation Notes

**Status**: Pending · **Completed**:

### Changes Made
-

### Caught Beyond the Brief
- None

### Deviations from Plan
- None

## On Completion

Notes; your row in TASK-STATUS.md; one LOG line (`[board-security] RULES_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS` for anything outside your files.

**Constraints**: deviation → stop and ask; no PII; no commits; never 4466; never `cortex/AUDITED.md`; no test starts a real CLI.
