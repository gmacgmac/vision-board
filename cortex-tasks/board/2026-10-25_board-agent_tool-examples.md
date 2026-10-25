---
task_name: Tool Examples For Agents
created: 2026-10-25
completed: 2026-10-25
status: completed
categories: [board-agent]
type: implementation
model: standard
skills: [cortex-architecture, cortex-docs]
tracker:
---

# Task: Every agent tool shows a worked example, and a refusal shows the right shape

> **Source**: field feedback relayed by the maintainer, chat 2026-10-25 (points 16-21, 19 approved)
> · **Branch / worktree**: `feat/tool-rail-and-examples` in `.claude/worktrees/tool-rail`

---

## Problem Statement

An agent using `write_board` guessed flat items (`{type: "node", title, kind}`) and was refused; the
right shape is wrapped (`{type: "node", key, node: {region, kind, title, body}}`). It found the shape
only by reading `.visionboard/ledger.jsonl`. The worked example already exists in the single source
(`packages/format/schema/openapi.json`, `write_board` request `example`: a region and two nodes) but
`scripts/gen-mcp.mjs` `describe` never copies request examples into the tools, so no agent sees it.
21 agent operations carry a request example and none reaches the agent. Fix it once, for every tool.

---

## Design

1. **Examples are part of the contract (rule 6).** Each write item's sent form (`$defs/sent` in
   `packages/format/schema/events/{board,region,node,link,unlink,reply,park,retire}.schema.json`, plus
   the inline `propose` and `append` forms in `packages/format/schema/api/write-item.schema.json`) gets
   one JSON Schema `examples` entry: the smallest complete item, with `key`. `examples` is an
   annotation, so validation does not change and no schema version bump is needed; `mcp-schema.mjs`
   already keeps `examples` (its `ANNOTATIONS`), so they reach each tool's `inputSchema` on their own.
   If `npm run verify` or the register treats these files as frozen, STOP and ask.
2. **The `write_board` request example gains a link item** (`from` / `to` by `key`), so region, node
   and link are all shown in one call.
3. **Every tool's description ends with its example.** `gen-mcp.mjs` `describe`: when the operation's
   JSON request body has an `example` (or the first of `examples`), append `Example: <compact JSON>`.
   Generic: no per-tool code. Regenerate (`npm run gen`); `tools.generated.json` stays generated.
4. **A refusal shows the shape (point 19).** `problem.schema.json` gains an optional `example` member
   (contract first; OpenAPI references it). `apps/board/server/write-board.ts`: when an item fails the
   write-item schema and its `type` names a known form, the failure carries that form's `examples[0]`
   (read from the schema, never written in code); an unknown or missing `type` lists the ten types.
   `apps/board/server/writes.ts` `invalid` (whole-body refusals of other operations) carries the
   operation's request example the same way. One helper reads examples from the schema for both.
5. **Tests hold it true.** Every `x-agent` operation with a JSON body has a request example; every
   example (operation-level and each write-item form) passes its own schema; a flat node item is
   refused with the wrapped node example; the generated description contains the example
   (`gen-api --check` already fails when generated files are stale).
6. **The skill points at the example, it doesn't copy it.** `skills/vision-board/SKILL.md` § Writing
   cards: one line, each item wraps its content (`node: {...}`, `region: {...}`), and `write_board`'s
   description and any refusal show the exact shape. Bump the skill's `status` (v3.11). Add scenario 26
   to `scenarios.md`: an agent in a new project, with no ledger to copy from, writes a region, two
   nodes and a link correctly on its first call. Run it before the skill change ships (rule 17).

---

## Steps

1. Tests first (failing): `packages/mcp/tests/tools.test.ts` (example in each description; every body
   operation has one), a format test that validates every `examples` entry, a server test in
   `apps/board/tests/` for the flat-item refusal carrying the node example.
2. Schema: `examples` on each sent form; the link in the `write_board` request example; `example` on
   `problem.schema.json`.
3. Generator: `describe` in `scripts/gen-mcp.mjs`; `npm run gen`.
4. Server: the shared example helper beside `apps/board/server/spec.ts` `bodyProblems`; use it in
   `write-board.ts` (per item) and `writes.ts` `invalid`.
5. Skill line, status bump, scenario 26; run scenario 26 with a fresh agent through the MCP on a
   test port (not 4466) and record the run.
6. Docs via `cortex-docs`: `docs/specification/api.md` (problems carry an example; tools show
   examples), `packages/mcp/README.md` if it describes tool descriptions.

---

## Files Involved

| File | Purpose |
|------|---------|
| `packages/format/schema/events/*.schema.json` (`$defs/sent`), `packages/format/schema/api/write-item.schema.json` | `examples` per item form |
| `packages/format/schema/openapi.json` | Link in the `write_board` request example |
| `packages/format/schema/api/problem.schema.json` | Optional `example` member |
| `scripts/gen-mcp.mjs` (`describe`), `packages/mcp/src/tools.generated.json` (generated) | Example in each tool description |
| `apps/board/server/spec.ts`, `write-board.ts`, `writes.ts` (`invalid`) | Refusals carry the example |
| `packages/mcp/tests/tools.test.ts`, `packages/format/tests/`, `apps/board/tests/` | Tests |
| `skills/vision-board/SKILL.md`, `skills/vision-board/scenarios.md` | One line, status, scenario 26 |
| `docs/specification/api.md`, `packages/mcp/README.md` | Docs |

---

## Constraints

- **DO NOT** touch the rail task's files (`packages/ui`, `packages/tokens`, `apps/board/src`,
  `tests/pages`, `packages/format/src/flags.ts`); it runs in parallel in this worktree.
- **DO NOT** change what any schema accepts; examples are annotations only.
- **DO NOT** hand-edit `tools.generated.json`; run `npm run gen`.
- **DO NOT** edit protected files (`.kiro/steering/vision-board-proj.md`, `docs/decisions.md`, `docs/principles.md`).
- Examples use made-up content (no PII). No git commits. Never touch port 4466. Writes over 50 lines in chunks.
- **STOP** and tell the maintainer if an example makes a generated description unreasonably long
  (over about 1,500 characters added to one tool), with the numbers.

---

## Success Criteria

- [x] `write_board`'s description shows a region, a node and a link in the wrapped shape
- [x] Every agent tool with a JSON body shows its example; a test fails when one is missing or invalid
- [x] A flat node item is refused with the wrapped node example; a wrong `type` lists the ten types
- [x] SKILL.md points to the examples; scenario 26 run and recorded as a good run
- [x] `npm test`, `npm run verify`, `npm run gen -- --check` (or `gen-api --check`) pass
- [x] Docs updated; task file updated with completion notes

---

## References

- `scripts/mcp-schema.mjs` (`ANNOTATIONS` keeps `examples`) · `scripts/gen-api.mjs` (`--check`)
- `docs/specification/api.md` (problem details, tool generation)
- `cortex-tasks/board/2026-10-16_board-agent_skill-say-what-marks-mean.md` (how a skill change is run against scenarios)

---

## Implementation Notes

**Completed**: 2026-10-25 12:20

### Changes Made
- Schemas: an `examples` entry on each of the ten write item forms (`packages/format/schema/events/{board,region,node,link,unlink,reply,retire,park}.schema.json` `$defs/sent`; `propose` and `append` inline in `api/write-item.schema.json`); `example` member on `api/problem.schema.json` `$defs/core`.
- `openapi.json`: the `write_board` request example is now a region, two nodes and a link by key (its 200 example matches); `info.version` 1.30.0 (additive: the problem `example`); `openapi.test.ts` expects 1.30.0.
- `scripts/gen-mcp.mjs` `describe`: every tool whose JSON request body has an example ends with `Example: <compact JSON>`; `npm run gen` regenerated `tools.generated.json` and `api-reference.md`.
- Server: `apps/board/server/examples.ts` (`itemExample`, `itemTypes`, `bodyExample`, reads the schema and `SPECS[id].example`, new `example` in `spec.ts` `OperationSpec`); `write-board.ts` `refuse` (known type: that form's example; missing or unknown type: the ten types in `detail`); `writes.ts` `invalid` carries the request example for whole-body refusals; `problem.ts` `example` extra. `packages/client` `ApiProblem.example`, shown by `packages/mcp/src/call-tool.ts` `failureText` and `packages/cli/src/failure.ts`.
- Tests: `apps/board/tests/write-examples.test.ts` (new), three tests in `packages/mcp/tests/tools.test.ts`.
- Skill v3.11: one bullet in Writing cards; scenario 34 in `scenarios.md`; `NOTES.md` entry with the run. Docs: `docs/specification/api.md` points 39, 47, 48.

### Issues & Resolutions
- `write_board`'s description was 2,015 characters and `tools.test.ts` (and `openapi.test.ts`) hold every description under 2,048, which Claude Code cuts at, so the example would have been cut off. Fixed by shortening the prose in the `write_board` operation description (about 500 characters: the `append` and `retire` sentences, the region widths sentence, the grant sentence, the "person can write a note on any node" clause and the `app` kind sentence, which `list_apps` and the node schema still say). It now ends the example at 2,030 characters.
- Scenario 26 was already taken (a round with "Waiting for your reply"); the new scenario is 34.
- The tests were written alongside the code, not strictly failing first.
- Scenario 34 live run: one fresh `sonnet` sub-agent, tool list and server instructions only (through a stdio bridge to `vb-mcp.ts` on a test server, port 4570, empty temporary project): its first `write_board` call had the right shape and all five items were `ok`. A single run on a single model; no run without the examples to compare, no Kiro run. The agent noted nothing says how to choose the path's `board` id for a new board.
- `npm run test:timing`: the 100,000-event server start test failed at about 2.1 to 3.3 s with the machine's load average near 29 (another agent working); layout and markdown timings failed once under load and passed on re-run. Not shown to be caused by this change.

### Deviations from Plan
- Scenario number 34, not 26 (taken). Shortened the `write_board` prose to keep the 2,048 limit. Added `ApiProblem.example` and its display in the MCP and CLI failure text (a whole-call refusal would otherwise drop it). `info.version` 1.29.0 to 1.30.0.

---

## On Completion

1. Update frontmatter: `status: completed` and `completed: YYYY-MM-DD`
2. Append your LOG entry — one line, terminated with a newline, append-only (never `str_replace`):
   ```
   [[YYYY-MM-DD HH:MM]] [board-agent] Completed: Tool Examples For Agents → Task: [[cortex-tasks/board/2026-10-25_board-agent_tool-examples.md]]
   ```
3. Do not write to `AUDITED.md`.
