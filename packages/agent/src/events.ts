// Adapter updates as chat events (PLAN ruling 2): the shapes of packages/chat's chat-event schema,
// without the stamp (`at`, `session`, `seq`), which the host adds. So the host only forwards.
// Usage is not a chat event; a host that wants it reads the `done` update itself.
import type { AgentUpdate } from './adapter.ts';

export type ChatEventDraft =
  | { kind: 'message_out'; text: string; interim?: true }
  | {
    kind: 'tool_activity';
    call: string;
    tool: string;
    state: 'running' | 'done' | 'failed';
    board?: string;
    cards?: number[];
    head?: number;
  }
  | { kind: 'system'; text: string; turn?: 'done' | 'stopped' | 'error' };

const TEXT_MAX = 100_000;
const words = (text: string, fallback: string) => (text.trim() === '' ? fallback : text.slice(0, TEXT_MAX));

/** The chat event an update stands for. */
export function toChatEvent(update: AgentUpdate): ChatEventDraft {
  switch (update.type) {
    case 'text': return { kind: 'message_out', text: words(update.text, '…'), ...(update.interim && { interim: true as const }) };
    case 'tool': {
      const { type: _, ...activity } = update;
      return { kind: 'tool_activity', ...activity };
    }
    case 'done': return { kind: 'system', text: 'Done.', turn: 'done' };
    case 'stopped': return { kind: 'system', text: 'Stopped.', turn: 'stopped' };
    case 'error': return { kind: 'system', text: words(update.message, 'The agent failed.'), turn: 'error' };
  }
}
