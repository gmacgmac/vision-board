// The chat agent's board access (chat-panel PLAN ruling 8, BE_03 ruling 3; D-114): every chat session
// the person starts in a folder's ledger is one agent, labelled with the folder's name: the server joins
// it for the first session (chat-identity.ts picks it), and records the person's grant of the board
// to it (starting the session was the person's click). The secret goes
// only to the board's MCP server (`vision-board`), in its environment (`VB_AGENT_SECRET`), so it never appears in a tool
// call, the CLI's command line, the transcript or a chat event. Secrets are never stored: after a
// restart the server gives the same agent a fresh one (`rekey`). Kiro gets the skill as its agent's
// prompt instead (N34 ruling 1): the server keeps `~/.kiro/agents/vision-board.json` current at start
// (`keepKiroAgent`), and a failure to write it stops only Kiro, saying why.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { holders } from '#actions';
import { openRequestOf } from '#format';
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
/** The skill's references, beside it: the agent is told the skill's folder and reads them without asking, never
 * writing there (maintainer point 547; skills/vision-board/source/build.mjs builds them). */
export const SKILL_REFERENCES = path.join(path.dirname(INSTRUCTIONS_FILE), 'references');
/** The line after the instructions, every turn, naming the skill's folder (Claude's; Kiro's agent file names it too). */
export const SKILL_NOTE = serverChatWords.skillFolder(path.dirname(INSTRUCTIONS_FILE));
/** What the agent may call without asking: the board's tools, ToolSearch, and the gated tools (reading
 * among them), which the gate decides by the access rules first (PLAN ruling 5, D-066). Its built-ins are
 * also the only ones the session has (`--tools`, buildClaudeArgs). */
export const CHAT_TOOLS = [`mcp__${MCP_NAME}__*`, 'ToolSearch', ...GATED_TOOLS];

const NAMES: Record<ChatSession['agent'], string> = { claude: serverChatWords.claudeCode, kiro: serverChatWords.kiro };

export const agentName = (agent: ChatSession['agent']): string => NAMES[agent];

/** The board label of a session's agent: the name of the folder it works in (its last part, not a
 * path; ruling 321), so the requests strip names a bot by where it works. A folder with no name
 * (the root) falls back to the CLI's name. */
export const chatLabel = (agent: ChatSession['agent'], folder: string): string => path.basename(folder) || NAMES[agent];

/** A session's board identity and its secret, not yet stored: the session must start before the
 * server joins it. `joined`: an earlier chat's agent of this ledger, which this session starts as (D-114). */
export interface Identity { agentId: string; secret: string; joined?: true }

/** A new agent id and secret, not yet stored: the session must start before the server joins. */
export function newIdentity(ledger: Ledger, agents: Agents): Identity {
  return { agentId: agents.mint(ledger.state().index.agents), secret: newToken() };
}

/** Record the person's grant of the board, or with `region` the container, to `agent`: its request
 * (an open one it already has, else a new one with `reason`), then the person's `grant`. */
export function grantTo(ledger: Ledger, agent: string, need: { board: string; region?: string | undefined }, reason: string): void {
  const { board, region } = need;
  const request = openRequestOf(ledger.state().index, agent, board, region)
    ?? ledger.append({ type: 'grant-request', board, ...(region !== undefined && { region }), reason }, { by: 'agent', agent }).seq;
  ledger.append({ type: 'act', action: 'grant', request }, { by: 'person' }, { board });
}

/** Join as `identity` (the hash first, then the `join` line, as `join` does; an identity already
 * joined gets only its fresh secret), then record the person's grant of the board unless it holds
 * it. With no board (a session started in the folder), only the join: its agent may create a board,
 * and the creator needs no grant (panel-send ruling 2). */
export function joinAndGrant(ledger: Ledger, agents: Agents, identity: Identity, label: string, board?: string): void {
  const { agentId, secret } = identity;
  agents.add(agentId, secret);
  if (!identity.joined) ledger.append({ type: 'join', label }, { by: 'agent', agent: agentId });
  if (board === undefined || holders(ledger.state(), board).includes(agentId)) return;
  grantTo(ledger, agentId, { board }, serverChatWords.thePersonStartedAChat);
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
    writeKiroAgent(home, INSTRUCTIONS_FILE, { note: SKILL_NOTE, readOnly: SKILL_REFERENCES });
    return undefined;
  } catch (err) {
    return serverChatWords.theKiroAgentFileCould(kiroAgentFile(home), err instanceof Error ? err.message : String(err));
  }
}
