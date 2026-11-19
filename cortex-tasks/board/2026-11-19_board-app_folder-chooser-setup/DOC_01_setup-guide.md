# DOC_01 — SETUP.md: Vision Board on another machine

Model: standard · Skills: cortex-docs

## Objective

`SETUP.md` at the repo root: the steps an agent on another machine follows to set Vision Board up, each with the exact
command and a check that it worked (PLAN § Decisions 3-5). MCP entries stay in their one home,
`packages/mcp/README.md` § Adding it to a client, which gains the clients it lacks.

## Inputs

- PLAN.md. `packages/mcp/README.md` (today: Kiro, Claude Code, Cursor). `README.md` § Running. `package.json`
  (`board` builds then serves; `.npmrc` has `ignore-scripts=true`, `save-exact=true`). Node: 22.18 or newer
  (`packages/mcp/README.md`). D-057 (`docs/decisions.md`): the skill's one source is `skills/vision-board/`; client
  skill folders hold links to it, never copies.
- The Kiro chat agent: the board server writes `~/.kiro/agents/vision-board.json` at start
  (`apps/board/server/chat-access.ts` header); kiro-cli itself is optional.
- Client locations to confirm from each vendor's own docs (cite the URL and the date you read it):
  - Claude Code: `claude mcp add -s user …`; skills `~/.claude/skills/`.
  - Claude Desktop: MCP in its config file (macOS `~/Library/Application Support/Claude/claude_desktop_config.json`):
    quit the app, edit, reopen (the maintainer's note). Whether it can load a skill from a folder: say what the docs
    say; if only by upload, say that.
  - Kiro CLI and Kiro IDE: MCP `~/.kiro/settings/mcp.json`; skills `~/.kiro/skills/` (kiro.dev/docs/skills).
  - Kiro Crew: skills `~/.kiro/crew/skills/` (kiro.dev/docs/crew/capabilities/skills); MCP added in its dashboard by
    command, or Discover & Sync reads existing MCP config (kiro.dev/docs/crew/capabilities/mcp-tools).
  - Codex: MCP `~/.codex/config.toml` `[mcp_servers.vision-board]` (or `codex mcp add`); skills `~/.agents/skills/`,
    links followed (learn.chatgpt.com/docs/build-skills).
  - ChatGPT app: left out, with the reason (PLAN decision 3).

## Steps

1. `packages/mcp/README.md` § Adding it to a client: one short entry per client above (where the entry goes, the
   exact shape for that client, the restart step). Keep the section the one place MCP set-up is written.
2. `SETUP.md`, for an agent to follow top to bottom, every step with a command and a check:
   prerequisites (macOS, git, Node 22.18+: `node -v`); clone (the URL the person gives; no URL in the file);
   `npm ci` (scripts stay off); start the board (`npm run board`, http://localhost:4466; how to keep it running);
   MCP per client (link to the README section; absolute paths from `which node` and the clone); skills: one
   `ln -s` per client to the clone's `skills/vision-board`, the folder made first if missing, never a copy;
   restart each client; a final check (ask the agent to call `list_boards`; what a good answer looks like); what to
   do when a check fails (the common faults: wrong Node, board not running, relative paths, the client not restarted).
   Plain words, short; a table only where it helps (client → MCP file → skills folder → restart).
3. Link `SETUP.md` from `README.md` § Running (one line).
4. Self-check: every path and command in both files is either in this repo (cite it) or confirmed from a vendor's
   docs (cite it in a short Sources list at the end of SETUP.md, with the date read). Nothing unsourced.

## Validation

- Every command copies and runs as written (absolute paths shown as placeholders the agent fills).
- No PII (no names, emails, usernames or real home paths); placeholders only.
- `npm run verify` passes.

## Constraints

Touch only `SETUP.md`, `packages/mcp/README.md`, `README.md`. Do not run anything that writes to the real home folder.
No git command that changes state. A deviation: stop and say so.

## Implementation Notes

Sources read 2026-11-19 (URLs in SETUP.md Sources). Unclear in the docs: Kiro and Crew symlinked skill folders; Crew Discover & Sync file paths; Codex CLI restart; Claude Code restart after mcp add; Claude Desktop skills (ZIP upload only, sources conflict on menu names); Cursor not re-read. Codex docs say the ChatGPT desktop app can add STDIO servers (shares Codex config); ChatGPT web is remote-only: SETUP names the web app as left out. npm run verify ok.
