// Chat header pattern, layer 1 (core): which agent and model, the chat's status (the conditions
// table), New session and Stop. With more than one agent or model on offer the host gets a picker;
// with one, the header names it. A host that keeps "Allow for this folder" gives the yeses kept, which
// the header lists in words, each to forget. No DOM.
import type { ChatHost, ChatStatus } from '../conditions.ts';
import { canStop, chatStatus } from '../conditions.ts';
import type { ChatState } from '../feed/feed-core.ts';

export interface ChatOption { id: string; label: string }

/** One yes the person gave the agent for the folder, as the host lists it (the board: `list_permissions`):
 *  writes in a folder, a read of a file, a search of a folder (`path`, relative to the folder, '' the folder
 *  itself), or a command by its first words. */
export interface AllowedYes {
  id: string;
  kind: 'write' | 'read' | 'search' | 'command';
  path?: string;
  command?: string;
}

/** A kept yes in words, with its id for Forget. */
export interface AllowedItem { id: string; label: string }

export interface HeaderInput {
  /** The session's agent and model, by id; `model` left out for the agent's default. */
  agent: string;
  model?: string;
  /** What the person may pick from for the next session; one or none draws plain text. */
  agents?: readonly ChatOption[];
  models?: readonly ChatOption[];
  /** What was allowed for the folder: given, the header offers the list (even when empty); left out, it does not. */
  allowed?: readonly AllowedYes[];
}

export interface HeaderView {
  agent: { id: string; label: string; options?: readonly ChatOption[] };
  model: { id: string; label: string; options?: readonly ChatOption[] };
  status: ChatStatus;
  stop: boolean;
  /** The kept yeses in words; left out when the host keeps none. */
  allowed?: readonly AllowedItem[];
}

/** The model left out reads as the agent's default. */
export const DEFAULT_MODEL = 'Default model';

const pick = (id: string, options: readonly ChatOption[] | undefined, fallback: string) => ({
  id, label: options?.find((o) => o.id === id)?.label ?? (id || fallback),
  ...(options && options.length > 1 && { options }),
});

const dir = (p: string | undefined, whole: string, some: (d: string) => string): string => (p ? some(`${p}/`) : whole);

/** A kept yes in words: "Write files in src/", "Run npm test", "Read docs/notes.md", "Search docs/". */
export function allowedLabel(y: AllowedYes): string {
  switch (y.kind) {
    case 'command': return `Run ${y.command ?? ''}`;
    case 'read': return `Read ${y.path ?? ''}`;
    case 'search': return dir(y.path, 'Search the folder', (d) => `Search ${d}`);
    case 'write': return dir(y.path, 'Write files in the folder', (d) => `Write files in ${d}`);
  }
}

export function headerView(input: HeaderInput, s: ChatState, host: ChatHost = {}): HeaderView {
  return {
    agent: pick(input.agent, input.agents, input.agent),
    model: pick(input.model ?? '', input.models, DEFAULT_MODEL),
    status: chatStatus(s, host),
    stop: canStop(s, host),
    ...(input.allowed && { allowed: input.allowed.map((y) => ({ id: y.id, label: allowedLabel(y) })) }),
  };
}
