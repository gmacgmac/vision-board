// The chat agent's board access (chat-panel PLAN ruling 8, BE_03 ruling 3): for each new session the
// server joins the board as an agent labelled with the CLI's name and the session, and records the
// person's grant of the board to it (starting the session was the person's click). The secret goes
// only to the vb MCP server, in its environment (`VB_AGENT_SECRET`), so it never appears in a tool
// call, the CLI's command line, the transcript or a chat event. Secrets are never stored: after a
// restart the server gives the same agent a fresh one (`rekey`).
import { fileURLToPath } from 'node:url';
import type { McpServer } from '../../../packages/agent/src/index.ts';
import { GATED_TOOLS } from '../../../packages/agent/src/index.ts';
import type { Agents } from './agents.ts';
import { newSecret } from './agents.ts';
import type { ChatSession } from './chat-index.ts';
import type { Ledger } from './ledger.ts';

/** The vb MCP server the agent gets, run with this Node. */
export const VB_MCP = fileURLToPath(new URL('../../../packages/mcp/bin/vb-mcp.ts', import.meta.url));
/** The launched agent's instructions (BE_03 ruling 7; T_01 rewrites the file). */
export const INSTRUCTIONS_FILE = fileURLToPath(new URL('../../../skills/vision-board/SKILL.md', import.meta.url));
/** What the agent may call without asking: the board's tools, reading, and the gated tools, which
 * the gate asks the person about first (PLAN ruling 5). */
export const CHAT_TOOLS = ['mcp__vb__*', 'ToolSearch', 'Read', 'Glob', 'Grep', ...GATED_TOOLS];

const NAMES: Record<ChatSession['agent'], string> = { claude: 'Claude Code', kiro: 'Kiro' };

export const agentName = (agent: ChatSession['agent']): string => NAMES[agent];

/** The board label of a session's agent, such as "Claude Code chat 3f1c2a9e". */
export const chatLabel = (agent: ChatSession['agent'], session: string): string => `${NAMES[agent]} chat ${session.slice(0, 8)}`;

export interface Identity { agentId: string; secret: string }

/** A new agent id and secret, not yet stored: the session must start before the server joins. */
export function newIdentity(ledger: Ledger, agents: Agents): Identity {
  return { agentId: agents.mint(ledger.state().index.agents), secret: newSecret() };
}

/** Join as `identity` (the hash first, then the `join` line, as `join` does), then ask for the
 * board and record the person's grant of it. With no board (a session started in the folder), only
 * the join: its agent may create a board, and the creator needs no grant (panel-send ruling 2). */
export function joinAndGrant(ledger: Ledger, agents: Agents, identity: Identity, label: string, board?: string): void {
  const { agentId, secret } = identity;
  agents.add(agentId, secret);
  const agent = { by: 'agent', agent: agentId } as const;
  ledger.append({ type: 'join', label }, agent);
  if (board === undefined) return;
  const request = ledger.append({ type: 'grant-request', board, reason: 'The person started a chat on this board.' }, agent).seq;
  ledger.append({ type: 'act', action: 'grant', request }, { by: 'person' }, { board });
}

/** A fresh secret for an agent the server joined for a session before this start. */
export function rekey(agents: Agents, agentId: string): string {
  const secret = newSecret();
  agents.add(agentId, secret);
  return secret;
}

/** The vb MCP server for one session: the board server, the secret (in its environment only) and
 * the open folder the CLI works in, so its calls match it (folder-mismatch ruling 4). */
export function vbServer(base: string, secret: string, project: string): McpServer {
  return { command: process.execPath, args: ['--no-warnings', VB_MCP], env: { VB_SERVER: base, VB_AGENT_SECRET: secret, VB_PROJECT: project } };
}
