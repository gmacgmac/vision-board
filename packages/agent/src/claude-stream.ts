// Reading the Claude CLI's stream-json output (PLAN ruling 3): one parsed line in, the updates it
// means out. Four things are read: `system/init` (were the MCP servers connected?), `assistant`
// text and tool_use, `user` tool_result, and `result`. A tool's raw input and output never leave
// here: a tool becomes its short name and state, and a board write also its board, cards and head.
// An unknown event type is logged once and passed over; a turn without a `result` is an error.
import type { AgentUpdate, Usage } from './adapter.ts';
import { isRecord } from './record.ts';

/** The board write tool (packages/mcp, `mcp__<server>__write_board`): its result names the cards. */
export const BOARD_WRITE = 'write_board';
/** Event types the CLI sends that need nothing from us. */
const PASSED_OVER = new Set(['stream_event', 'rate_limit_event']);
const BOARD_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const MAX_CARDS = 200;

type Rec = Record<string, unknown>;
const count = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);

/** `mcp__vision-board__write_board` → `write_board`; anything else cut to the chat schema's tool pattern. */
export function shortToolName(name: string): string {
  const mcp = /^mcp__.+?__(.+)$/.exec(name);
  return ((mcp ? mcp[1]! : name).replace(/[^A-Za-z0-9_.:-]/g, '-').slice(0, 80)) || 'tool';
}

const callId = (id: unknown) => (typeof id === 'string' ? id.replace(/[^A-Za-z0-9_.:-]/g, '-').slice(0, 128) : '') || 'call';

/** The text of a tool_result's content: a string, or text blocks. */
function resultText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((b) => (isRecord(b) && b.type === 'text' && typeof b.text === 'string' ? b.text : '')).join('');
}

/** The cards a board write drew or changed, and the head after it, from its result's JSON. */
export function boardWriteSummary(content: unknown): { cards: number[]; head?: number } {
  let answer: unknown;
  try { answer = JSON.parse(resultText(content)); } catch { return { cards: [] }; }
  if (!isRecord(answer)) return { cards: [] };
  const results = Array.isArray(answer.results) ? answer.results : [];
  const cards = [...new Set(results.flatMap((r) =>
    isRecord(r) && r.ok === true && Number.isInteger(r.n) && (r.n as number) >= 1 ? [r.n as number] : []))].slice(0, MAX_CARDS);
  const head = Number.isInteger(answer.head) && (answer.head as number) >= 0 ? answer.head as number : undefined;
  return { cards, ...(head !== undefined && { head }) };
}

function usageOf(result: Rec): Usage {
  const u = isRecord(result.usage) ? result.usage : {};
  const cost = result.total_cost_usd;
  return {
    input: count(u.input_tokens),
    output: count(u.output_tokens),
    cacheRead: count(u.cache_read_input_tokens),
    cacheWrite: count(u.cache_creation_input_tokens),
    ...(typeof cost === 'number' && Number.isFinite(cost) && { costUsd: cost }),
  };
}

/**
 * One turn's stream. `push` each parsed line; `end` once the CLI has exited. Text is held back one
 * block: a block is said `interim` once something follows it, and the last one is the reply.
 */
export class ClaudeStream {
  /** Set when `system/init` showed an MCP server that is not connected: stop the turn. */
  problem: string | null = null;
  private pending: string | null = null;
  private result: Rec | null = null;
  private readonly tools = new Map<string, { tool: string; board?: string }>();
  private readonly logged = new Set<string>();
  sawEvent = false;
  private readonly servers: readonly string[];
  private readonly log: (line: string) => void;

  /** `servers`: the MCP servers that must be connected; `log`: where an unknown shape is noted. */
  constructor(servers: readonly string[], log: (line: string) => void) {
    this.servers = servers;
    this.log = log;
  }

  push(event: unknown): AgentUpdate[] {
    if (!isRecord(event)) return [];
    this.sawEvent = true;
    switch (event.type) {
      case 'system': return this.system(event);
      case 'assistant': return this.assistant(event);
      case 'user': return this.user(event);
      case 'result': this.result = event; return [];
      default:
        if (!PASSED_OVER.has(String(event.type))) this.unknown(`event type ${String(event.type)}`);
        return [];
    }
  }

  private unknown(what: string): void {
    if (this.logged.has(what)) return;
    this.logged.add(what);
    this.log(`claude adapter: passed over an unknown ${what}`);
  }

  private system(event: Rec): AgentUpdate[] {
    if (event.subtype !== 'init') return [];
    const reported = Array.isArray(event.mcp_servers) ? event.mcp_servers.filter(isRecord) : [];
    for (const name of this.servers) {
      const status = reported.find((s) => s.name === name)?.status;
      if (status !== 'connected') {
        this.problem = `The ${name} tool server did not connect (status: ${String(status ?? 'not registered')}), so the turn was stopped.`;
        break;
      }
    }
    return [];
  }

  /** The held-back block, said as interim because something followed it. */
  private flush(): AgentUpdate[] {
    if (this.pending === null) return [];
    const text = this.pending;
    this.pending = null;
    return [{ type: 'text', text, interim: true }];
  }

  private assistant(event: Rec): AgentUpdate[] {
    const content = isRecord(event.message) && Array.isArray(event.message.content) ? event.message.content : [];
    const out: AgentUpdate[] = [];
    for (const block of content) {
      if (!isRecord(block)) continue;
      if (block.type === 'text' && typeof block.text === 'string' && block.text.trim() !== '') {
        out.push(...this.flush());
        this.pending = block.text;
      } else if (block.type === 'tool_use') {
        out.push(...this.flush());
        const call = callId(block.id);
        const tool = shortToolName(String(block.name ?? ''));
        const board = tool === BOARD_WRITE && isRecord(block.input) && typeof block.input.board === 'string' && BOARD_ID.test(block.input.board)
          ? block.input.board : undefined;
        this.tools.set(call, { tool, ...(board && { board }) });
        out.push({ type: 'tool', call, tool, state: 'running', ...(board && { board }) });
      } else if (block.type !== 'text' && block.type !== 'thinking' && block.type !== 'redacted_thinking') {
        this.unknown(`assistant block ${String(block.type)}`);
      }
    }
    return out;
  }

  private user(event: Rec): AgentUpdate[] {
    const content = isRecord(event.message) && Array.isArray(event.message.content) ? event.message.content : [];
    const out: AgentUpdate[] = [];
    for (const block of content) {
      if (!isRecord(block) || block.type !== 'tool_result') continue;
      const call = callId(block.tool_use_id);
      const known = this.tools.get(call);
      if (!known) continue;
      this.tools.delete(call);
      const failed = block.is_error === true;
      const summary = known.board && !failed ? boardWriteSummary(block.content) : null;
      out.push({
        type: 'tool', call, tool: known.tool, state: failed ? 'failed' : 'done',
        ...(known.board && { board: known.board }),
        ...(summary && { cards: summary.cards }),
        ...(summary?.head !== undefined && { head: summary.head }),
      });
    }
    return out;
  }

  /** The turn's ending, once the CLI has exited. `stderr` is its last words, for an error. */
  end(stderr = ''): AgentUpdate[] {
    if (this.problem) return [{ type: 'error', message: this.problem }];
    const detail = stderr.trim() ? ` ${stderr.trim().slice(-300)}` : '';
    if (this.result === null) {
      return [...this.flush(), { type: 'error', message: `Claude Code ended without a result.${detail}` }];
    }
    const said = typeof this.result.result === 'string' ? this.result.result : '';
    if (this.result.is_error === true) {
      // The CLI says some errors (a rate limit) as the agent's text too: shown once, as the error.
      if (this.pending !== null && said.trim() !== '' && said.includes(this.pending.trim())) this.pending = null;
      return [...this.flush(), { type: 'error', message: `Claude Code could not answer: ${said.trim() || String(this.result.subtype ?? 'an error')}` }];
    }
    const reply = this.pending ?? (said.trim() ? said : null);
    this.pending = null;
    return [...(reply === null ? [] : [{ type: 'text' as const, text: reply, interim: false }]), { type: 'done', usage: usageOf(this.result) }];
  }
}
