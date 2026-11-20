# Setting up Vision Board on another machine

Written for an agent to follow top to bottom. Every step has a command and a check; do not go on
until the check passes. `<clone>` is the folder you cloned into, `<node>` is the output of `which node`.
Write the real absolute paths in every file; clients do not expand `~` or relative paths in an MCP entry.

## 1. Prerequisites

Needs macOS, git and Node 22.18 or newer (`packages/mcp/README.md`).

```bash
node -v
git --version
```

Check: `node -v` prints `v22.18.0` or higher. If not, install a newer Node first.

## 2. Get the code and install

The person gives you the repository address. Use it as `<url>`.

```bash
git clone <url> vision-board
cd vision-board
npm ci
```

Check: `npm ci` ends without an error. The repo's `.npmrc` turns install scripts off (`ignore-scripts=true`); leave it so.

## 3. Start the board

```bash
npm run board
```

This builds the page once, then serves it (`package.json`, `board`). It stays in the foreground: run it in a
terminal tab you leave open, or in the background (`npm run board > /tmp/vb-board.log 2>&1 &`).

Check, from another terminal:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4466
```

It prints `200`. If port 4466 is taken, start it on another with `VB_PORT=<port> npm run board`, and set the same
address as `VB_SERVER` in each MCP entry's `env` (`packages/mcp/README.md` § Settings). Open http://localhost:4466 in a
browser to see the board. It opens one folder at a time:
`VB_PROJECT` if set, else the last folder opened from the board, else this repo (`.kiro/steering/vision-board-proj.md`
§ Running). The person opens their project with "⋯", Open folder…: their home folder or a folder in it, a drive or
share in `/Volumes`, or a folder in `/Users/Shared` (D-111). An agent works only in the folder the board has open: its
folder is where its client starts it (or `VB_PROJECT`), and nothing searches upward for a board. Start each agent in the
project's folder or a folder inside it; anywhere else its calls answer `wrong-folder`. Only one board server may hold a folder's ledger; a second one refuses to start and names who holds it
(`README.md` § Running).

The board opens **read-only**: nothing is written, by the person or an agent, until it is switched to Editing (an
agent's writes answer `read-only` until then). The person presses Read-only in the toolbar to switch; or start it
writable with `VB_EDIT=1 npm run board` (the server says which when it starts).

## 4. Add the MCP server to each client

Do this for each client the person uses. The entry for every client is written once, in
[packages/mcp/README.md](packages/mcp/README.md) § Adding it to a client: follow its table row.
Use `<node>` from `which node` and `<clone>/packages/mcp/bin/vb-mcp.ts` as the two absolute paths. Each row there
gives the exact file or command (Claude Code's full `claude mcp add` line is only there) and how to restart the client:
Claude Code, Claude Desktop, Kiro CLI and Kiro IDE, Kiro Crew, Codex.

Check for each: the client lists a server named `vision-board` (Claude Code: `claude mcp list`; Codex:
`codex mcp list`; Kiro and Claude Desktop: in the client's MCP or connectors list; Crew: Probe All).

Not covered: the ChatGPT app on the web. It connects only to MCP servers on the internet, and the board stays on
this machine by design.

## 5. Link the skill into each client

The skill's one source is `<clone>/skills/vision-board`. Each client gets a link to it, never a copy
(D-057, `docs/decisions.md`). If a `vision-board` entry
already exists there, look at it before replacing it. Make the client's skills folder first, for example
`mkdir -p ~/.claude/skills`, or the link fails with "No such file or directory".

| Client | Skills folder | Link |
|---|---|---|
| Claude Code | `~/.claude/skills` | `ln -s <clone>/skills/vision-board ~/.claude/skills/vision-board` |
| Kiro CLI, Kiro IDE | `~/.kiro/skills` | `ln -s <clone>/skills/vision-board ~/.kiro/skills/vision-board` |
| Kiro Crew | `~/.kiro/crew/skills` | `ln -s <clone>/skills/vision-board ~/.kiro/crew/skills/vision-board` |
| Codex | `~/.agents/skills` | `ln -s <clone>/skills/vision-board ~/.agents/skills/vision-board` |

Check for each: `ls ~/.claude/skills/vision-board/SKILL.md` (with the client's own folder) lists the file. A
`ls -l` on the entry shows `->` to the clone.

Notes on what the vendors' docs say:

- Claude Code follows a symlinked skill folder and picks up changes without a restart, except when
  `~/.claude/skills` did not exist when the session started: then run `/reload-skills`.
- Codex follows symlinked skill folders and watches for changes; if the skill does not appear, restart it.
- Kiro CLI/IDE and Kiro Crew: the docs name these folders but do not say whether a symlinked skill folder is
  followed. If the skill does not show up, say so to the person; do not copy the folder.
- Kiro custom agents load no skills unless the agent file lists them. The board writes its own `vision-board` Kiro agent
  when it starts (`apps/board/server/chat-access.ts`); kiro-cli itself is optional.
- Claude Desktop: the docs found describe adding a skill only by uploading a ZIP in its settings (Customize, Skills),
  not from a folder. A ZIP is a copy, so tell the person this is the one client where the skill is not a link and
  will not follow the repo; do not do it without their yes. The docs were not fully clear on this: the sources
  conflicted on menu names.

## 6. Restart and check end to end

Restart each client as the table in step 4 says. In a new chat in each client, ask the agent:

> Call `list_boards` on the vision-board server and tell me what it answers.

A good answer lists boards (it may be an empty list) and names the folder the board has open (`project`).
A tool error or "no such tool" is a fault: see below.

## When a check fails

| Sign | Cause and fix |
|---|---|
| `SyntaxError` or the server exits at once | Node is older than 22.18: `node -v`; use the `<node>` of a newer one in the entry. |
| `list_boards` cannot reach the board | The board is not running: step 3, and `curl` it. |
| Server missing or "failed to connect" | A relative path or `~` in the entry: use absolute paths, check that `<clone>/packages/mcp/bin/vb-mcp.ts` exists. |
| Server absent after editing | The client was not restarted: step 4's restart column. |
| `wrong-folder` | The agent's folder (where its client started it) is not the folder the board has open, nor inside it. Stop and tell the person; do not call `join`. The fix: start the agent in the project's folder or a folder inside it; or the person opens the agent's folder in the board ("⋯", Open folder…); or, for a client that does not start it in the project, the entry's `env` sets `VB_PROJECT` to the folder the board has open (`packages/mcp/README.md` § Settings). |
| `read-only` | The board is read-only: the person switches it to Editing (step 3). |
| Skill not listed | The link is broken (`ls -l`), or the client was not restarted. |

## Sources

Read on 2026-11-19. Everything else in this file is in this repo (`package.json`, `.npmrc`,
`packages/mcp/README.md`, `README.md`, `docs/decisions.md` D-057, `apps/board/server/chat-access.ts`).

- Claude Code MCP: https://code.claude.com/docs/en/mcp
- Claude Code skills: https://code.claude.com/docs/en/skills
- Claude Desktop MCP config: https://modelcontextprotocol.io/docs/develop/connect-local-servers
- Claude Desktop skills by ZIP upload: https://support.claude.com/en/articles/12512180 (found by search; menu names differ between sources)
- Kiro MCP: https://kiro.dev/docs/mcp/configuration
- Kiro skills: https://kiro.dev/docs/skills
- Kiro Crew skills: https://kiro.dev/docs/crew/capabilities/skills
- Kiro Crew MCP: https://kiro.dev/docs/crew/capabilities/mcp-tools
- Codex MCP: https://learn.chatgpt.com/docs/extend/mcp?surface=cli
- Codex skills: https://learn.chatgpt.com/docs/build-skills
- ChatGPT on the web, internet-only MCP servers: https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-connectors
