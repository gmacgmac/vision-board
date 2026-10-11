// Composer pattern, layer 1 (core): what the composer says and allows (PLAN ruling 9; the Architect
// composer). The text, the removable chips a host may attach, and the host's context: one chip
// summarising what the message carries, which opens a preview of exactly that text (on the board:
// "3 answers · 2 selected", the selected cards and the answers since the last Send; the board attaches
// no other chips, composer-one-chip ruling 1). Send with words while the chat conditions let it; with a
// host that holds what is attached (`ChatHost.holds`), also with something attached and no words,
// and while the agent works. No DOM.
import type { Chip } from '../events.ts';
import type { ChatHost } from '../conditions.ts';
import { canSend } from '../conditions.ts';
import type { ChatState } from '../feed/feed-core.ts';

export interface ComposerView {
  /** Whether a message can go now (the chat conditions). */
  send: boolean;
  /** The host holds what is attached (`ChatHost.holds`): with something attached a message can go
   *  with no words, and while the agent works. */
  attach?: boolean;
  /** Why the composer is shut, when it is: the host's blocked reason. The text can't be typed in. */
  shut?: string;
  /** The line under the box: why Send waits while the agent works, else the keys. */
  hint: string;
  placeholder: string;
}

/** What the host sends with every message: one chip, `label` (its summary), that opens a preview of
 *  `text`, exactly what goes, shown as it is ('' for no preview). */
export interface ComposerContext { label: string; text: string }

/** The preview's name and heading. */
export const PREVIEW_LABEL = 'What the agent receives';

export const COMPOSER_KEYS = 'Enter send · Shift+Enter new line';
const WORKING = 'The agent is working. Stop it to send now.';
const HOLDING = 'The agent is working. What is attached goes when it finishes; Stop it to send words alone.';

export function composerView(s: ChatState, host: ChatHost = {}, placeholder = 'Message the agent'): ComposerView {
  const send = canSend(s, host);
  if (host.blocked) return { send, shut: host.blocked, hint: '', placeholder };
  const attach = host.holds === true;
  return { send, ...(attach && { attach }), hint: send ? COMPOSER_KEYS : attach ? HOLDING : WORKING, placeholder };
}

/** What Send does: words go while the chat lets them; with `attached` (chips or the context) and a
 *  host that holds them, a message goes with no words, and while the agent works. */
export function sendIntent(text: string, v: Pick<ComposerView, 'send' | 'attach' | 'shut'>, attached = false): 'send' | 'skip' {
  if (v.shut !== undefined) return 'skip';
  if (v.attach && attached) return 'send';
  return v.send && text.trim() !== '' ? 'send' : 'skip';
}

/** A chip's stable key, as its remove button names it. */
export const chipKey = (c: Chip): string => `${c.kind}-${c.ref}`;

/** The chips without the one named by `key`. */
export const withoutChip = (chips: readonly Chip[], key: string): Chip[] => chips.filter((c) => chipKey(c) !== key);
