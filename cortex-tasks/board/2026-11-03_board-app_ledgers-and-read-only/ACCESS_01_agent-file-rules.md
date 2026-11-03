# ACCESS_01_agent-file-rules: Agent file rules for ledger folders

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The agent's file rules hold in both layouts, today's (`.visionboard/<file>`) and the ledger folders'
(`.visionboard/<ledger>/<file>`), before any nested data folder exists: no agent can read any ledger's
`agents.json` or app state, or the repo-wide chat sessions, wherever they sit. Tests first.

## Context

`packages/agent/src/access-rules.ts` `ACCESS_RULES` anchors these rows at the project root or at any depth:
`**/.visionboard/agents.json`, `**/.visionboard/chat-sessions.json`, `**/.visionboard/ledger.jsonl`,
`**/.visionboard/app-state/**`, `.visionboard/lock`, `.visionboard/permissions.json`, `.visionboard/**`,
`.visionboard/images/**`, `.visionboard/apps/**`, `.visionboard/attachments/**`. Under `.visionboard/main/` the
`**/.visionboard/x` rows stop matching, so `main/agents.json` would fall to `.visionboard/**` (read: allow). That is
the hole this task closes. `packages/agent` imports nothing from this repo (D-037): the table stays its own; LEDGERS_01
adds the test that holds it equal to the paths module.

Matching lives in the same file (`globRegExp`, `rank`, `pick`, `accessFor`, `exceptionsTo`, `refusedTail`,
`nameGlob`). Consumers: `policy.ts` (`accessFor`, `refusedTail`), `claude-args.ts` (Claude Code's deny list from
`ACCESS_RULES` and `exceptionsTo`), `kiro-agent.ts` (`refused`, `kiroPath`).

Which file is where (PLAN decisions 1, 6): per ledger: `ledger.jsonl`, `agents.json`, `lock`, `images/`, `apps/`,
`app-state/`, `.gitignore`. Repo-wide at `.visionboard/`: `chat-sessions.json`, `permissions.json`, `attachments/`.
A ledger name never equals a data-folder name (decision 1).

## Inputs

- **Files to modify**: TASK-STATUS.md File Ownership (ACCESS_01): `packages/agent/**` only
- **Files to reference**: PLAN.md; `docs/specification/chat.md` § The agent's access; `docs/decisions.md` D-037,
  D-064 to D-069 (the access rulings), points 345 and 346 in the tests' names
- **Patterns to follow**: the existing rows and their `why` words (`packages/agent/src/words/`), the tests in
  `packages/agent/tests/policy-rulings.test.ts` ("345: app state unread and the ledger unwritten in any board
  folder…", "346: .git in any folder is refused both ways…") and `tests/access-fixture.ts`
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. **Failing tests first**, beside the 345/346 rulings: for each per-ledger file in both layouts (`.visionboard/x`,
   `.visionboard/main/x`, `.visionboard/ui/x`, and the same under a nested project `sub/.visionboard/…`), the
   expected read/write verdict; the repo-wide files only at `.visionboard/`; pictures and apps writable in both
   layouts; `.git` still refused inside them; a ledger folder named like a data folder is not a case (refused by
   name). Add the Claude deny-list and Kiro cases (`claude-args.test.ts`, `kiro-turn.test.ts`) for the new paths.
2. **The rows**: one row per fact, covering both layouts by glob (`.visionboard/*/agents.json` beside
   `.visionboard/agents.json`, and the `**/` forms). Keep the most-specific-wins ranking (`rank`) behaving as now
   for every existing path: every existing test passes unedited, except where a test's literal path must name the
   new layout too, and then it gains a case, it does not lose one.
3. **Words**: a new `why` only if a new kind of file appears (none expected). Sentences in the agent's words file.
4. **Docs** (`cortex-docs`): `docs/specification/chat.md` § The agent's access and `packages/agent/README.md` state
   the rows by layout; keep each claim tied to a test name.

## Validation

- [ ] `node --test packages/agent/tests/` green; every pre-existing test unedited or only widened
- [ ] For every per-ledger secret, a test proves read: refuse in `.visionboard/x`, `.visionboard/main/x` and
      `sub/.visionboard/main/x`; Claude's deny list holds the new globs
- [ ] `npm run verify`, `npm run check` green

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

Notes; your row; one LOG line (`[board-security] ACCESS_01: …` → this file, one line ending in a newline); the return
block with `REQUESTS`. No commit.
