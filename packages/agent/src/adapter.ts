// The adapter interface (D-036; chat-panel PLAN ruling 2), shaped after the Agent Client Protocol:
// start or resume a session, send a prompt, read its streamed updates, cancel. One adapter per
// command-line agent (claude.ts first; Kiro over ACP later). A host (the board server here, nclite
// later) holds sessions through this and never learns which CLI is behind it.

/** One MCP server the agent gets, as an MCP client's config names it. */
export interface McpServer {
  command: string;
  args?: string[];
  /** Passed to the server only (a secret goes here, never on the agent's command line). */
  env?: Record<string, string>;
}

/** Where the gate asks before a file edit or a shell command, and the token it shows. */
export interface GateConfig {
  /** The approval route, such as `http://127.0.0.1:4466/api/run/approvals`. */
  url: string;
  /** The session's run token, sent as `Authorization: Bearer`. */
  token: string;
}

export interface StartOptions {
  /** The agent's working folder. */
  cwd: string;
  /** Resume this session; left out, a new one starts with no memory. */
  sessionId?: string;
  /** As the CLI names it (`opus`); left out for the CLI's default. */
  model?: string;
  /** By name; the name is how tools are spelled (`mcp__vb__write_board`). */
  mcpServers: Record<string, McpServer>;
  /** Extra instructions appended to the agent's own system prompt, every turn. */
  instructionsFile?: string;
  /** Tools the agent may call without asking, in the CLI's spelling. Gated tools still pause. */
  allowedTools: string[];
  gate: GateConfig;
}

/** Token counts for one turn, as far as the CLI reports them. */
export interface Usage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  /** What the CLI says the turn cost, when it says. */
  costUsd?: number;
}

/**
 * What a turn streams. A tool call never carries its raw input or output: only its short name
 * and, for a board write, the board, the card numbers and the ledger head (its safe summary).
 */
export type AgentUpdate =
  | { type: 'text'; text: string; interim: boolean }
  | {
    type: 'tool';
    call: string;
    tool: string;
    state: 'running' | 'done' | 'failed';
    board?: string;
    cards?: number[];
    head?: number;
  }
  | { type: 'done'; usage: Usage }
  | { type: 'stopped' }
  | { type: 'error'; message: string };

export interface AgentSession {
  /** The session's id: pass it as `sessionId` to resume after a restart. */
  readonly id: string;
  /** Run one turn. Ends with exactly one `done`, `stopped` or `error`. One turn at a time. */
  prompt(text: string): AsyncIterable<AgentUpdate>;
  /** Stop the running turn, if any; its updates end with `stopped`. */
  cancel(): void;
  /** End the session's process for good, when it keeps one between turns. */
  close?(): void;
}

export interface AgentAdapter {
  /** Which CLI: `claude`, `kiro`. */
  readonly agent: string;
  start(options: StartOptions): Promise<AgentSession>;
}
