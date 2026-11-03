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

- [x] `node --test packages/agent/tests/` green; every pre-existing test unedited or only widened
- [x] For every per-ledger secret, a test proves read: refuse in `.visionboard/x`, `.visionboard/main/x` and
      `sub/.visionboard/main/x`; Claude's deny list holds the new globs
- [x] `npm run verify`, `npm run check` green

## Implementation Notes

_To be completed by the agent. Re-run? Add a `### Run N` block; never overwrite an earlier run._

**Status**: Completed (2026-11-03)

### Changes Made
- `packages/agent/src/access-rules.ts` `ACCESS_RULES`: a twin row a folder down for each per-ledger fact, beside its
  old one: `**/.visionboard/*/agents.json`, `**/.visionboard/*/ledger.jsonl`, `.visionboard/*/lock`,
  `**/.visionboard/*/app-state/**`, `.visionboard/*/images/**`, `.visionboard/*/apps/**` (17 → 24 rows). Plus
  `**/.visionboard/*/chat-sessions.json` (see Deviations). `.gitignore` needs no row: `.visionboard/**` already makes
  it the board's in both layouts. No new `why`: every row reuses its old twin's words.
- `refusedTail`: a command's glob word now meets a row's pattern name by name (`SAMPLES` carries `patterns`): a name
  the word spells out is tested against the row's pattern there, so `main` meets the ledger's `*` and `s.json` meets
  `app-state/**`. Before, `cat sub/.visionboard/main/agen*` and `cat sub/.visionboard/main/*` were only asked.
- Tests: new `packages/agent/tests/policy-ledgers.test.ts` (6 tests: every per-ledger file in `.visionboard/`,
  `.visionboard/main/`, `.visionboard/ui/` and the same under `sub/`; repo-wide files; pictures and apps with `.git`
  and secrets inside; case, `..`, links, searches, the shell's folder; commands spelled out and as patterns).
  `tests/access-fixture.ts` `accessFixture(extra)` takes more files. Widened only: `policy.test.ts` (ROWS gains the
  new rows, count 24), `claude-args.test.ts` (the deny list gains the twins), `kiro-turn.test.ts` (the `./.visionboard/**`
  write deny's exclude gains the ledger pictures and apps; 2.x `deniedPaths` gain the twins; new deny asserts).
- Docs: `docs/specification/chat.md` § The agent's access gains "Both layouts of the data folder"; the searches bullet
  and Tests line updated. `packages/agent/README.md` § Access rules names the twins and the glob rule.

### Issues & Resolutions
- Under `.visionboard/` a glob command was refused before this change only by accident: an unjudgeable command
  counts as a write and `.visionboard/**` refuses writes, so the reason was "the board's own files". In a nested
  project nothing backed it up (asked, not refused). Fixed in `refusedTail`; the reason is now the keys' or app
  state's. Held by "D-084: a command naming a ledger's keys or app state is refused…".
- Order matters on a tie: `.visionboard/*/images/**` and `.visionboard/attachments/**` rank the same, so the ledger
  pictures and apps rows sit after the attachments row (`.visionboard/attachments/images/x` stays the person's,
  write refused). Held by "D-084: the repo-wide files are the person's…".

### Caught Beyond the Brief
- Pre-existing gap, today's layout: `cat sub/.visionboard/app-st*/s.json` (a nested project's app state, by a
  pattern on the folder's name) was asked, not refused (checked on the unchanged code). The `refusedTail` fix closes it.
- Trade-off, stricter: the ledger rows' `*` also matches a data folder's name, so a file named like a ledger's
  under today's `images/`/`apps/` (`.visionboard/images/agents.json`, `.visionboard/images/lock`) is refused, and a
  pattern that could reach one is refused too: `cat .visionboard/images/*` and `cp x .visionboard/images/a*` were
  asked, now refused (with the keys' reason). Patterns with an extension (`*.png`) are unaffected. Stated in chat.md.

### Deviations from Plan
- Small, by the principles: `chat-sessions.json` is repo-wide (decision 6), yet its row also has a ledger-folder
  twin, so it is closed should it ever land in a ledger's folder (the Objective: "wherever they sit"). It costs no
  legitimate access. LEDGERS_01's equality test should allow this one extra row (or treat closed repo-wide secrets
  as closed in both layouts).
- `permissions.json` and `attachments/**` get no ledger-folder twin: there they fall to `.visionboard/**` (read,
  never written; an unknown command refused), never a looser answer.

### Verification
- Tier: normal. `node --test packages/agent/tests/` 147 pass, 0 fail (the six new tests failed first, as did the
  widened ones). Board tests that use the rules: `api-chat-access`, `chat-access`, `chat-approvals`,
  `chat-approvals-shell`, `api-chat-approvals`, `chat-permissions` 34 pass. `npm run verify` ok (no warning for
  these files), `npm run check` 0 errors.

## On Completion

Notes; your row; one LOG line (`[board-security] ACCESS_01: …` → this file, one line ending in a newline); the return
block with `REQUESTS`. No commit.
