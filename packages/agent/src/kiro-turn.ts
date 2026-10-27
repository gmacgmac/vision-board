// One Kiro turn as adapter updates (PLAN ruling 2): `session/update` notifications in, the updates
// they mean out, and the ending from the `session/prompt` answer's stopReason. Three kinds are read:
// `agent_message_chunk`, `tool_call` and `tool_call_update`; everything else (thoughts, plans,
// commands, usage, Kiro's own `_kiro.dev/...`) is passed over, and an unknown update kind is
// logged once. A tool's raw input and output never leave here: a tool becomes its short name and
// state, and a board write also its board, cards and head (the same summary the Claude adapter makes).
import type { AgentUpdate } from './adapter.ts';
import { BOARD_WRITE, boardWriteSummary, shortToolName } from './claude-stream.ts';
import { isRecord } from './record.ts';

type Rec = Record<string, unknown>;
const BOARD_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const PASSED_OVER = new Set([
  'agent_thought_chunk', 'user_message_chunk', 'plan', 'available_commands_update', 'current_mode_update',
  'config_option_update', 'session_info_update', 'usage_update',
]);

/** The text of an ACP content block (`{ type: 'text', text }`), or ''. */
export const blockText = (block: unknown): string => (isRecord(block) && block.type === 'text' && typeof block.text === 'string' ? block.text : '');

/** The text a tool call's `content` carries: `[{ type: 'content', content: { type: 'text', text } }]`. */
function contentText(content: unknown): string {
  return Array.isArray(content) ? content.map((c) => (isRecord(c) ? blockText(c.content) : '')).join('') : '';
}

/** The text an MCP tool's `rawOutput` carries: kiro-cli 2.28.0 sends `{ items: [{ Json: { content:
 * [{ type: 'text', text }] } }] }` there and no `content` on the update; a plain string is taken as is. */
function rawOutputText(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  const items = isRecord(raw) && Array.isArray(raw.items) ? raw.items : [];
  return items.map((i) => (isRecord(i) && isRecord(i.Json) && Array.isArray(i.Json.content) ? i.Json.content.map(blockText).join('') : '')).join('');
}

/** Kiro's own facts about a tool call: `_meta.kiro` (`toolName`, and for an MCP tool `mcpServerName`). */
export function kiroMeta(update: Rec): Rec {
  return isRecord(update._meta) && isRecord(update._meta.kiro) ? update._meta.kiro : {};
}

/** The tool's own name (`write_board`, `write`), else the last word of its title. */
function nameOf(update: Rec): string {
  const named = kiroMeta(update).toolName;
  const title = typeof update.title === 'string' ? update.title : '';
  return shortToolName(typeof named === 'string' && named !== '' ? named : title.trim().split(/\s+/).pop() || '');
}

const callId = (id: unknown) => (typeof id === 'string' ? id.replace(/[^A-Za-z0-9_.:-]/g, '-').slice(0, 128) : '') || 'call';

export class KiroTurn {
  private pending = '';
  private readonly tools = new Map<string, { tool: string; board?: string }>();
  private readonly calls = new Map<string, Rec>();
  private readonly logged = new Set<string>();
  private readonly log: (line: string) => void;

  constructor(log: (line: string) => void) {
    this.log = log;
  }

  /** The held-back text, said as interim because a tool follows it. */
  private flush(): AgentUpdate[] {
    if (this.pending.trim() === '') { this.pending = ''; return []; }
    const text = this.pending;
    this.pending = '';
    return [{ type: 'text', text, interim: true }];
  }

  /** The updates one `session/update` notification's `update` means. */
  push(update: unknown): AgentUpdate[] {
    if (!isRecord(update)) return [];
    const kind = String(update.sessionUpdate);
    if (kind === 'agent_message_chunk') {
      this.pending += blockText(update.content);
      return [];
    }
    if (kind === 'tool_call' || kind === 'tool_call_update') return this.tool(update);
    if (!PASSED_OVER.has(kind) && !this.logged.has(kind)) {
      this.logged.add(kind);
      this.log(`kiro adapter: passed over an unknown update kind ${kind}`);
    }
    return [];
  }

  /** What the turn knows of a tool call so far (its `tool_call`, with later updates over it): Kiro's
   * permission request carries less than the call it asks about. */
  known(toolCallId: unknown): Rec {
    return this.calls.get(String(toolCallId)) ?? {};
  }

  private tool(update: Rec): AgentUpdate[] {
    const id = String(update.toolCallId);
    this.calls.set(id, { ...this.calls.get(id), ...Object.fromEntries(Object.entries(update).filter(([, v]) => v !== null && v !== undefined)) });
    const call = callId(update.toolCallId);
    const known = this.tools.get(call);
    const out: AgentUpdate[] = [];
    if (!known) {
      out.push(...this.flush());
      const tool = nameOf(update);
      const input = isRecord(update.rawInput) ? update.rawInput : {};
      const board = tool === BOARD_WRITE && typeof input.board === 'string' && BOARD_ID.test(input.board) ? input.board : undefined;
      this.tools.set(call, { tool, ...(board && { board }) });
      out.push({ type: 'tool', call, tool, state: 'running', ...(board && { board }) });
    }
    const now = this.tools.get(call)!;
    const status = update.status;
    if (status !== 'completed' && status !== 'failed') return out;
    this.tools.delete(call);
    const failed = status === 'failed';
    const summary = now.board && !failed ? boardWriteSummary(contentText(update.content) || rawOutputText(update.rawOutput)) : null;
    out.push({
      type: 'tool', call, tool: now.tool, state: failed ? 'failed' : 'done',
      ...(now.board && { board: now.board }),
      ...(summary && { cards: summary.cards }),
      ...(summary?.head !== undefined && { head: summary.head }),
    });
    return out;
  }

  /** The turn's ending from the prompt's stopReason: the reply, then `done`, `stopped` or an error. */
  end(stopReason: unknown): AgentUpdate[] {
    const reply = this.pending.trim() === '' ? [] : [{ type: 'text' as const, text: this.pending, interim: false }];
    this.pending = '';
    switch (stopReason) {
      case 'end_turn': return [...reply, { type: 'done', usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } }];
      case 'cancelled': return [...reply, { type: 'stopped' }];
      case 'refusal': return [...reply, { type: 'error', message: 'Kiro declined to answer that.' }];
      case 'max_tokens': return [...reply, { type: 'error', message: 'Kiro ran out of room to answer (max tokens).' }];
      case 'max_turn_requests': return [...reply, { type: 'error', message: 'Kiro stopped after too many steps in one turn.' }];
      default: return [...reply, { type: 'error', message: `Kiro ended the turn in a way this board does not know (${String(stopReason)}).` }];
    }
  }
}
