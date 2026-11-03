# TOOLS_01: The Tools Enforce The Rules, And Reads Say What The Bot Needs

**Skills**: cortex-architecture, cortex-docs · **Model**: strong · **Wave**: 1 · **Branch**: `feat/bot-tools`

## Objective

Move the rules the plugin bot broke, and the facts it lacked, out of prose and into the tools: one source
(`openapi.json` and the tool table), per host (`x-hosts`, D-080), behind one flag on by default.

## Inputs

PLAN.md; the live run's findings (`2026-11-03_board-agent_plugin-skill-live-run.md` § Findings, § Caught
Beyond the Brief); `docs/specification/plugin.md` (§ Tools, § The bot); `docs/specification/api.md`;
`scripts/gen-api.mjs`, `scripts/gen-tools.mjs`; `apps/board/server/words/plugin-tools.ts`;
`packages/mcp/src/protocol.ts` `createMcpServer`, `packages/mcp/src/info.ts`.

## Steps (design first, in your notes, then build; failing test before each change)

1. **No holding the turn under a host.** A host's bot gets `check_responses` without `wait` in its schema,
   generated, not hand-edited; the engine answers a plugin caller's `wait` without waiting, with words that
   say the person's Send brings the answers and to end the turn (decide refuse vs. answer-now and say why).
   Standalone keeps `wait` (terminal agents poll).
2. **The right instructions per host.** `createMcpServer` sends a host's bot words from the plugin's words
   (no `join`, no `wait`), from one home; standalone's unchanged.
3. **Reads tell the truth.** `get_board` (and `show_node` if it has the same gap) marks each note answered or
   owed by this bot, from the same rule `list_open` `pending` uses (one source). A bot can tell a board it
   holds: `list_boards` / `get_board` say so for the caller, so it never asks a grant it has.
4. **A key conflict helps.** The `conflict` answer names what the key already holds and how to make a new one;
   consider whether a key that repeats with the *same* item should be a quiet success (idempotent) rather than
   a conflict, and decide by the ledger rules (append-only, D-017).
5. **Flag** in `packages/format/src/flags.ts`, on by default; off is today's behaviour exactly (test both).
6. **Contract**: `openapi.json` first, `gen-api`, `info.version` bumped; words in words files; docs:
   `api.md`, `api-reference.md` (generated), `plugin.md`. Seam types: if `plugin.d.ts` changes, follow D-078
   (decide whether it is breaking, set `SEAM_TYPES`, bump `SEAM` only if breaking) and say which in notes.
7. **Checks** (`nice -n 15`, 3 workers): `npm test`, `npm run verify`, `check`, `gen-api --check`,
   `test:plugin` on 6110, the page specs you touch and the agent/MCP ones on 6210.

## Validation

Each of 1–4 held by a named test that failed first; flag off proven unchanged; gates green.

## Notes

Constraints: worktree only, no commits, no LOG/AUDITED, never 4466, no protected files. Decision drafts
(a new D- entry) in your notes for the morning. STOP and report if a change would break the standalone app's
agents (Kiro, Claude Code through `vb-mcp`).
