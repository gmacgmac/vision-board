# Vision Board

An interactive board an AI agent draws to mid-session, so you can review its output item by
item (acknowledge, drop, comment, ask for more context, save for later) instead of answering a
wall of text. Why it exists: [docs/vision.md](docs/vision.md).

Status: building. The walking skeleton runs (local server, five layout modes, per-item actions);
board v3 is in progress (`cortex-tasks/tracker.md`).

## Layout

| Folder | What belongs there |
|---|---|
| `apps/board/` | The app: page in `src/` (Svelte shell, canvas controller) and the local server (`server/`) |
| `packages/format/` | View and transcript file formats, validator, fixtures |
| `packages/actions/` | Typed actions shared by buttons and agents |
| `packages/layout/` | Layout engine: modes, region packing, connector routing |
| `packages/ui/` | Visual patterns: node, link, region, note (core, template, element) |
| `packages/tokens/` | Design tokens and contrast checks |
| `packages/agent/` | (planned) The kiro-cli connection behind one interface |
| `packages/cli/` | (planned) The `vb` command: validate, reply, wait |
| `packages/mcp/` | The MCP server (`npm run mcp`): one tool per agent operation, generated from the API spec |
| `skills/` | Agent instructions: how any agent draws a board and reads replies |
| `scripts/` | Repo checks (`npm run verify`), the module map generator (`npm run map`) and the dev watch script (`npm run board:watch`) |
| `docs/` | Vision, principles, decisions, specifications (`specification/modules.md` is generated) |
| `prototypes/` | Reference only: the Uplynk Architect prototype |
| `cortex/`, `cortex-tasks/` | Work log, tracker and planned tasks (Cortex) |

Each folder has a README saying what goes in it, what it depends on, what uses it and its public
API. Dependencies point one way, and other modules import a package only through its
`src/index.ts` (D-016, checked by `npm run verify`). A new top-level folder or package needs a
decision entry.

## Running

- `npm run board`: builds once, then serves this repo's own project ledger at http://localhost:4466. Use it to review a session; the page never reloads by itself.
- `npm run board:watch`: for working on the board itself. Rebuilds the page on save, restarts the server only when server code changes, and reloads the open page with its view kept. Ctrl+C stops both.
- `npm run dev`: the example boards (`temp/demo`, seeded from the roadmap fixture).

## Working here

Read `.kiro/steering/vision-board-proj.md` (the rules) and `docs/principles.md` (why). All work
beyond a trivial fix is planned first as a Cortex task; the roadmap is `cortex-tasks/tracker.md`. `sessions/` (the agent's views
and your transcripts) is local working data and is not committed.
