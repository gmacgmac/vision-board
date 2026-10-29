// Front door of packages/agent (D-036, D-037): one adapter interface for command-line agents, the
// Claude adapter, the gate hook's logic (bin/gate.ts runs it) and the mapper to chat events. It
// imports nothing from this repo, so it moves into nclite as it is.
export type { AgentAdapter, AgentSession, AgentUpdate, GateConfig, McpServer, StartOptions, Usage } from './adapter.ts';
export { COMMAND_MAX, GATED_TOOLS, PATH_MAX, PREVIEW_MAX, READ_TOOLS, RELEASED_REFUSAL, RULES_REFUSAL, coverOf, factsFor, refusalFor } from './approvals.ts';
export type { ApprovalAnswer, ApprovalOutcome, ApprovalStatus, AskScope, CommandFacts, Cover, Facts, ReadFacts, WriteFacts, WriteOp } from './approvals.ts';
export { GATE_BIN, buildClaudeArgs, claudeDenyRules, gateSettings, isWrongSessionFlag, mcpConfigJson, projectSlug, transcriptExists } from './claude-args.ts';
export type { TurnSession } from './claude-args.ts';
export { BOARD_WRITE, ClaudeStream, boardWriteSummary, shortToolName } from './claude-stream.ts';
export { KILL_GRACE_MS, TURN_LIMIT_MS, createClaudeAdapter } from './claude.ts';
export type { ClaudeAdapterOptions } from './claude.ts';
export { toChatEvent } from './events.ts';
export type { ChatEventDraft } from './events.ts';
export { GATE_FOLDER_ENV, GATE_STRICT_ENV, GATE_TOKEN_ENV, GATE_URL_ENV, GATE_WAIT_ENV, GATE_WAIT_MS, HOOK_TIMEOUT_S, UNREACHABLE, askOverHttp, decide, gateEnv, runGate } from './gate.ts';
export type { Ask, GateAccess, HookOutput } from './gate.ts';
export { AcpConnection, NOT_OFFERED, RpcError } from './acp.ts';
export type { AcpHandlers } from './acp.ts';
export { createKiroAdapter } from './kiro.ts';
export type { KiroAdapterOptions } from './kiro.ts';
export { KIRO_AGENT, KIRO_AGENT_DRAFT, KIRO_DEFAULT_MODEL, KIRO_EFFORT, kiroAccess, kiroAgentFile, kiroAgentText, sessionProblem, writeKiroAgent } from './kiro-agent.ts';
export type { KiroRule } from './kiro-agent.ts';
export { KiroTurn } from './kiro-turn.ts';
export { outcome, pickOption, readRequest, verdictFor } from './kiro-permission.ts';
export type { PermissionRequest, Verdict } from './kiro-permission.ts';
export { ACCESS_RULES, OUTSIDE_RULE, accessFor, exceptionsTo, refusedTail } from './access-rules.ts';
export type { AccessOp, AccessRule, AccessVerdict } from './access-rules.ts';
export { NODE_READER, policy, resolveIn } from './policy.ts';
export type { Decision, PathReader, PathStat, PolicyFacts, PolicyOptions, ResolvedPath } from './policy.ts';
export { NEVER_REMEMBERED, REFUSED_PROGRAMS, commandHead, readOnlyCommand, rememberedHead, runsProgram, shellWords } from './readonly-command.ts';
export type { NeverKind, NeverRow, ReadOnly, ShellWord, ShellWords } from './readonly-command.ts';
