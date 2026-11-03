// One `tools/call` to the board's MCP server exactly as a CLI would start it: command, args and env
// from its MCP config, in the folder the CLI ran in (the folder-mismatch and ledger-agents tests).
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { MCP_BIN } from '#mcp';

export interface McpServerSpec { command: string; args: string[]; env: Record<string, string> }

/** The board's MCP server as an agent's own config starts it: no `VB_PROJECT`, so it finds its folder. */
export const ownMcp = (base: string): McpServerSpec => ({ command: process.execPath, args: ['--no-warnings', MCP_BIN], env: { VB_SERVER: base } });

/** The result of one `tools/call` of `name` with `args`. The test's own `VB_PROJECT` and secret are
 * never inherited: only `server.env` names them. */
export async function callMcp(server: McpServerSpec, cwd: string, name: string, args: Record<string, unknown>): Promise<any> {
  const { VB_PROJECT: _p, VB_AGENT_SECRET: _s, ...inherited } = process.env;
  const env: NodeJS.ProcessEnv = { ...inherited, ...server.env };
  const child = spawn(server.command, server.args, { cwd, env, stdio: ['pipe', 'pipe', 'ignore'] });
  const meta = { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientCapabilities': {} };
  const answer = new Promise<any>((resolve) => createInterface({ input: child.stdout! }).once('line', (l) => resolve(JSON.parse(l))));
  child.stdin!.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args, _meta: meta } })}\n`);
  const r = await answer;
  const exited = new Promise((resolve) => child.once('exit', resolve));
  child.stdin!.end();
  await exited;
  return r.result;
}
