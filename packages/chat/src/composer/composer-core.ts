// Composer pattern, layer 1 (core): what the composer says and allows (PLAN ruling 9; the Architect
// composer). The text, the removable chips a host may attach, and the host's context: one chip
// summarising what the message carries, which opens a preview of exactly that text (on the board:
// "3 answers · 2 selected", the selected cards and the answers since the last Send; the board attaches
// no other chips, composer-one-chip ruling 1). Send with words while the chat conditions let it; with a
// host that holds what is attached (`ChatHost.holds`), also with something attached and no words,
// and while the agent works; with a host that queues (`ChatHost.queues`), words alone go while the
// agent works or waits for an OK, and are queued. With the host's words for it (`ComposerView.files`) it
// takes files: the host uploads each and says where it stands (`ComposerFile`); a ready file goes with no
// words, Send waits while one uploads, a refused one never goes (D-068). No DOM.
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
  /** The host's words for attaching; given, the composer takes files by drop, paste and the paperclip. */
  files?: ComposerFileWords;
}

/** Where a file in the composer stands: the host says (D-068 ruling 6). */
export type FileState = 'uploading' | 'ready' | 'refused';
/** One file: the host's `id` for it, the name to show, and with `refused` why (shown in full, never clipped). */
export interface ComposerFile { id: string; name: string; state: FileState; reason?: string }

/** Every sentence of attaching, from the host, as `placeholder` is. */
export interface ComposerFileWords {
  /** The paperclip's name and its tip. */
  attach: string;
  tip: string;
  /** On the composer while a file is dragged over it. */
  drop: string;
  /** On a chip while its file uploads; read after the name on a ready one. */
  uploading: string;
  ready: string;
  /** The line under the box while a file uploads. */
  waits: string;
  remove(name: string): string;
  removed(name: string): string;
  /** What a screen reader is told when a file arrives or its state moves. */
  said(file: ComposerFile): string;
}

/** What the host sends with every message: one chip, `label` (its summary), that opens a preview of
 *  `text`, exactly what goes, shown as it is ('' for no preview). */
export interface ComposerContext { label: string; text: string }

/** The preview's name and heading. */
export const PREVIEW_LABEL = 'What the agent receives';

export const COMPOSER_KEYS = 'Enter send · Shift+Enter new line';
const WORKING = 'The agent is working. Stop it to send now.';
const HOLDING = 'The agent is working. What is attached goes when it finishes; Stop it to send words alone.';
const QUEUING = 'The agent is working. A message you send now is queued.';
const HOLDING_QUEUING = 'The agent is working. What is attached goes when it finishes; words you send now are queued.';
const ASKING_QUEUING = 'The agent is waiting for your OK. Sending a message now leaves the question unanswered.';

/** The agent is at work or waiting for an OK: what a host that queues says the hint of. */
const busy = (s: ChatState): boolean => s.busy || s.pending.length > 0;

export function composerView(s: ChatState, host: ChatHost = {}, placeholder = 'Message the agent'): ComposerView {
  const send = canSend(s, host);
  if (host.blocked) return { send, shut: host.blocked, hint: '', placeholder };
  const attach = host.holds === true;
  const hint = !host.queues || !busy(s) ? (send ? COMPOSER_KEYS : attach ? HOLDING : WORKING)
    : s.pending.length > 0 ? ASKING_QUEUING : attach ? HOLDING_QUEUING : QUEUING;
  return { send, ...(attach && { attach }), hint, placeholder };
}

/** What Send does: words go while the chat lets them; with `attached` (chips or the context) and a
 *  host that holds them, a message goes with no words, and while the agent works. */
export function sendIntent(text: string, v: Pick<ComposerView, 'send' | 'attach' | 'shut'>, attached = false, files: readonly ComposerFile[] = []): 'send' | 'skip' {
  if (v.shut !== undefined || filesUploading(files)) return 'skip';
  if (v.attach && attached) return 'send';
  return v.send && (text.trim() !== '' || filesReady(files)) ? 'send' : 'skip';
}

export const filesUploading = (files: readonly ComposerFile[]): boolean => files.some((f) => f.state === 'uploading');
export const filesReady = (files: readonly ComposerFile[]): boolean => files.some((f) => f.state === 'ready');

/** What to announce for the files `now`, after `was`: each new file, and each whose state moved. */
export function filesSaid(was: readonly ComposerFile[], now: readonly ComposerFile[], words: Pick<ComposerFileWords, 'said'>): string {
  const before = new Map(was.map((f) => [f.id, f.state]));
  return now.filter((f) => before.get(f.id) !== f.state).map((f) => words.said(f)).join(' ');
}

/** Whether a drag carries files, which is the only drag the composer takes: never text or a card. */
export const dragsFiles = (e: { dataTransfer: { types: readonly string[] } | null }): boolean => e.dataTransfer?.types.includes('Files') === true;

/** The file to bring into view in a long row: the last one that came, or that was just refused (its reason must be seen). */
export function newestFile(was: readonly ComposerFile[], now: readonly ComposerFile[]): ComposerFile | undefined {
  const before = new Map(was.map((f) => [f.id, f.state]));
  return now.findLast((f) => !before.has(f.id) || (f.state === 'refused' && before.get(f.id) !== 'refused'));
}

/** The files a paste attaches. Spreadsheets and word processors put a picture of what was copied beside
 *  its text, and that paste is the text: files go only when the clipboard has no text, or the text is
 *  just their names (a file copied from the system's file manager). */
export function pastedFiles<F extends { name: string }>(files: readonly F[], text: string): F[] {
  const names = new Set(files.map((f) => f.name));
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines.every((l) => names.has(l)) ? [...files] : [];
}

/** A chip's stable key, as its remove button names it. */
export const chipKey = (c: Chip): string => `${c.kind}-${c.ref}`;

/** The chips without the one named by `key`. */
export const withoutChip = (chips: readonly Chip[], key: string): Chip[] => chips.filter((c) => chipKey(c) !== key);
