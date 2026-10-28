// Front door of packages/agent (D-036, D-037): one adapter interface for command-line agents, the
// Claude adapter, the gate hook's logic (bin/gate.ts runs it) and the mapper to chat events. It
// imports nothing from this repo, so it moves into nclite as it is.
export type { AgentAdapter, AgentSession, AgentUpdate, GateConfig, McpServer, StartOptions, Usage } from './adapter.ts';
export { COMMAND_MAX, GATED_TOOLS, PATH_MAX, PREVIEW_MAX, RELEASED_REFUSAL, factsFor, refusalFor } from './approvals.ts';
export type { ApprovalAnswer, ApprovalOutcome, ApprovalStatus, CommandFacts, Facts, WriteFacts, WriteOp } from './approvals.ts';
export { GATE_BIN, buildClaudeArgs, gateSettings, isWrongSessionFlag, mcpConfigJson, projectSlug, transcriptExists } from './claude-args.ts';
export type { TurnSession } from './claude-args.ts';
export { BOARD_WRITE, ClaudeStream, boardWriteSummary, shortToolName } from './claude-stream.ts';
export { KILL_GRACE_MS, TURN_LIMIT_MS, createClaudeAdapter } from './claude.ts';
export type { ClaudeAdapterOptions } from './claude.ts';
export { toChatEvent } from './events.ts';
export type { ChatEventDraft } from './events.ts';
export { GATE_TOKEN_ENV, GATE_URL_ENV, GATE_WAIT_MS, HOOK_TIMEOUT_S, UNREACHABLE, askOverHttp, decide, runGate } from './gate.ts';
export type { Ask, HookOutput } from './gate.ts';
export { AcpConnection, NOT_OFFERED, RpcError } from './acp.ts';
export type { AcpHandlers } from './acp.ts';
export { createKiroAdapter } from './kiro.ts';
export type { KiroAdapterOptions } from './kiro.ts';
export { KIRO_AGENT, KIRO_AGENT_DRAFT, KIRO_DEFAULT_MODEL, KIRO_EFFORT, kiroAgentFile, kiroAgentText, sessionProblem, writeKiroAgent } from './kiro-agent.ts';
export { KiroTurn } from './kiro-turn.ts';
export { outcome, pickOption, readRequest, verdictFor } from './kiro-permission.ts';
export type { PermissionRequest, Verdict } from './kiro-permission.ts';
export { ACCESS_RULES, OUTSIDE_RULE, accessFor, refusedTail } from './access-rules.ts';
export type { AccessOp, AccessRule, AccessVerdict } from './access-rules.ts';
export { NODE_READER, policy, resolveIn } from './policy.ts';
export type { AskScope, Decision, PathReader, PathStat, PolicyFacts, PolicyOptions, ReadFacts, ResolvedPath } from './policy.ts';
export { commandHead, readOnlyCommand, shellWords } from './readonly-command.ts';
export type { ReadOnly, ShellWord, ShellWords } from './readonly-command.ts';
