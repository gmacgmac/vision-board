// Composer pattern, layer 1 (core): what the composer says and allows (PLAN ruling 9; the Architect
// composer). The text and the removable chips the host attaches (on the board: the person's unsent
// notes and the selected cards); Send only with words and while the chat conditions let it. No DOM.
import type { Chip } from '../events.ts';
import type { ChatHost } from '../conditions.ts';
import { canSend } from '../conditions.ts';
import type { ChatState } from '../feed/feed-core.ts';

export interface ComposerView {
  /** Whether a message can go now (the chat conditions). */
  send: boolean;
  /** Why the composer is shut, when it is: the host's blocked reason. The text can't be typed in. */
  shut?: string;
  /** The line under the box: why Send waits while the agent works, else the keys. */
  hint: string;
  placeholder: string;
}

export const COMPOSER_KEYS = 'Enter send · Shift+Enter new line';

export function composerView(s: ChatState, host: ChatHost = {}, placeholder = 'Message the agent'): ComposerView {
  const send = canSend(s, host);
  if (host.blocked) return { send, shut: host.blocked, hint: '', placeholder };
  return { send, hint: send ? COMPOSER_KEYS : 'The agent is working. Stop it to send now.', placeholder };
}

/** What Send does with the words typed: blank words send nothing (a message needs words). */
export function sendIntent(text: string, send: boolean): 'send' | 'skip' {
  return send && text.trim() !== '' ? 'send' : 'skip';
}

/** A chip's stable key, as its remove button names it. */
export const chipKey = (c: Chip): string => `${c.kind}-${c.ref}`;

/** The chips without the one named by `key`. */
export const withoutChip = (chips: readonly Chip[], key: string): Chip[] => chips.filter((c) => chipKey(c) !== key);
