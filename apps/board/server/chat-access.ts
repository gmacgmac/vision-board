// The chat agent's board access (chat-panel PLAN ruling 8, BE_03 ruling 3): for each new session the
// server joins the board as an agent labelled with the folder's name, and records the
// person's grant of the board to it (starting the session was the person's click). The secret goes
// only to the board's MCP server (`vision-board`), in its environment (`VB_AGENT_SECRET`), so it never appears in a tool
// call, the CLI's command line, the transcript or a chat event. Secrets are never stored: after a
// restart the server gives the same agent a fresh one (`rekey`). Kiro gets the skill as its agent's
// prompt instead (N34 ruling 1): the server keeps `~/.kiro/agents/vision-board.json` current at start
// (`keepKiroAgent`), and a failure to write it stops only Kiro, saying why.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { McpServer } from '#agent';
import { GATED_TOOLS, kiroAgentFile, writeKiroAgent } from '#agent';
import { MCP_BIN } from '#mcp';
import type { Agents } from './agents.ts';
import { newToken } from './secrets.ts';
import type { ChatSession } from './chat-index.ts';
import type { Ledger } from './ledger.ts';
import * as serverChatWords from './words/server-chat.ts';

/** The name the agent knows the board's MCP server by: its tools are `mcp__vision-board__*` in
 * Claude Code and `@vision-board` in Kiro (`packages/agent/kiro/vision-board.agent.json`). */
export const MCP_NAME = 'vision-board';
/** The launched agent's instructions (BE_03 ruling 7; T_01 rewrites the file). */
export const INSTRUCTIONS_FILE = fileURLToPath(new URL('../../../skills/vision-board/SKILL.md', import.meta.url));
/** What the agent may call without asking: the board's tools, reading, and the gated tools, which
 * the gate asks the person about first (PLAN ruling 5). */
export const CHAT_TOOLS = [`mcp__${MCP_NAME}__*`, 'ToolSearch', 'Read', 'Glob', 'Grep', ...GATED_TOOLS];

const NAMES: Record<ChatSession['agent'], string> = { claude: serverChatWords.claudeCode, kiro: serverChatWords.kiro };

export const agentName = (agent: ChatSession['agent']): string => NAMES[agent];

/** The board label of a session's agent: the name of the folder it works in (its last part, not a
 * path; ruling 321), so the requests strip names a bot by where it works. A folder with no name
 * (the root) falls back to the CLI's name. */
export const chatLabel = (agent: ChatSession['agent'], folder: string): string => path.basename(folder) || NAMES[agent];

export interface Identity { agentId: string; secret: string }

/** A new agent id and secret, not yet stored: the session must start before the server joins. */
export function newIdentity(ledger: Ledger, agents: Agents): Identity {
  return { agentId: agents.mint(ledger.state().index.agents), secret: newToken() };
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
  const request = ledger.append({ type: 'grant-request', board, reason: serverChatWords.thePersonStartedAChat }, agent).seq;
  ledger.append({ type: 'act', action: 'grant', request }, { by: 'person' }, { board });
}

/** A fresh secret for an agent the server joined for a session before this start. */
export function rekey(agents: Agents, agentId: string): string {
  const secret = newToken();
  agents.add(agentId, secret);
  return secret;
}

/** The board's MCP server for one session: the board server, the secret (in its environment only)
 * and the open folder the CLI works in, so its calls match it (folder-mismatch ruling 4). */
export function boardMcpServer(base: string, secret: string, project: string): McpServer {
  return { command: process.execPath, args: ['--no-warnings', MCP_BIN], env: { VB_SERVER: base, VB_AGENT_SECRET: secret, VB_PROJECT: project } };
}

/** Keep Kiro's agent file under `home` current, its prompt this repo's skill (N34 ruling 1); why it
 * could not be, when it could not (a Kiro start then says so; nothing else stops). */
export function keepKiroAgent(home: string): string | undefined {
  try {
    writeKiroAgent(home, INSTRUCTIONS_FILE);
    return undefined;
  } catch (err) {
    return serverChatWords.theKiroAgentFileCould(kiroAgentFile(home), err instanceof Error ? err.message : String(err));
  }
}
