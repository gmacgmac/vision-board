Read and follow `.kiro/steering/vision-board-proj.md` before any work: it points to every source of truth.

After changing `skills/vision-board/`, run `npm run build:skill`, then `npm run skill:install`; `npm run board` also
runs it at start. It copies the skill into each installed client (Claude Code, Kiro CLI and IDE, Kiro Crew) and
reports whether each has the board's MCP server. Clients get copies, not links, because Kiro Crew does not follow
links (D-118). Ask the person before running it with `--add-mcp`: that changes their client settings.
