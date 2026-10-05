#!/usr/bin/env node
// The `vb-mcp` executable: an MCP client starts it (npm run mcp, or node packages/mcp/bin/vb-mcp.ts).
// VB_SERVER is the board server (default http://127.0.0.1:4466); VB_AGENT_SECRET, when set, is the
// secret for every call that does not pass its own. Logs go to stderr; stdout is the protocol.
import { createMcpServer, serveStdio } from '../src/index.ts';

const base = (process.env.VB_SERVER || 'http://127.0.0.1:4466').replace(/\/+$/, '');
const secret = process.env.VB_AGENT_SECRET || undefined;
const log = (line: string) => { process.stderr.write(`${line}\n`); };

log(`vb-mcp: serving the board API at ${base} over stdio`);
await serveStdio(createMcpServer({ base, ...(secret && { secret }), log }), { input: process.stdin, output: process.stdout });
