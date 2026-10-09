// Chat header pattern, layer 1 (core): which agent and model, the chat's status (the conditions
// table), New session and Stop. With more than one agent or model on offer the host gets a picker;
// with one, the header names it. No DOM.
import type { ChatHost, ChatStatus } from '../conditions.ts';
import { canStop, chatStatus } from '../conditions.ts';
import type { ChatState } from '../feed/feed-core.ts';

export interface ChatOption { id: string; label: string }

export interface HeaderInput {
  /** The session's agent and model, by id; `model` left out for the agent's default. */
  agent: string;
  model?: string;
  /** What the person may pick from for the next session; one or none draws plain text. */
  agents?: readonly ChatOption[];
  models?: readonly ChatOption[];
}

export interface HeaderView {
  agent: { id: string; label: string; options?: readonly ChatOption[] };
  model: { id: string; label: string; options?: readonly ChatOption[] };
  status: ChatStatus;
  stop: boolean;
}

/** The model left out reads as the agent's default. */
export const DEFAULT_MODEL = 'Default model';

const pick = (id: string, options: readonly ChatOption[] | undefined, fallback: string) => ({
  id, label: options?.find((o) => o.id === id)?.label ?? (id || fallback),
  ...(options && options.length > 1 && { options }),
});

export function headerView(input: HeaderInput, s: ChatState, host: ChatHost = {}): HeaderView {
  return {
    agent: pick(input.agent, input.agents, input.agent),
    model: pick(input.model ?? '', input.models, DEFAULT_MODEL),
    status: chatStatus(s, host),
    stop: canStop(s, host),
  };
}
