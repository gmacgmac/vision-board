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
export interface ComposerFile {
  id: string;
  name: string;
  state: FileState;
  reason?: string;
  /** How many files this one chip stands for, when more than one: files over the limit share a chip. */
  count?: number;
  /** Work still going on a file that is ready and can go as it is, in a few words: "Reading pages… 12 of 30". */
  doing?: string | undefined;
  /** Why Send waits for this file though it is ready, in the host's words: the line under the box says so. */
  holds?: string | undefined;
  /** What to know about a file that is ready and still goes, shown in full: "Its pages can't be read". */
  note?: string | undefined;
}

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
  /** The same for many files at once: how many now stand where, so one drop is one short line. */
  batch(counts: Record<FileState, number>): string;
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
  if (v.shut !== undefined || filesUploading(files) || whyFilesHold(files)) return 'skip';
  if (v.attach && attached) return 'send';
  return v.send && (text.trim() !== '' || filesReady(files)) ? 'send' : 'skip';
}

export const filesUploading = (files: readonly ComposerFile[]): boolean => files.some((f) => f.state === 'uploading');
/** Why Send waits for a file that is ready; none when it doesn't. */
export const whyFilesHold = (files: readonly ComposerFile[]): string | undefined => files.find((f) => f.holds)?.holds;
export const filesReady = (files: readonly ComposerFile[]): boolean => files.some((f) => f.state === 'ready');

/** More files than this moving at once are said as counts, not one by one. */
const SAID_ONE_BY_ONE = 3;

/** Where a file stands, for announcing: work starting or ending is news, and the count of pages going up is not. */
const standing = (f: ComposerFile): string => `${f.state}|${f.doing ? 'doing' : ''}|${f.note ?? ''}`;

/** What to announce for the files `now`, after `was`: each new file and each whose state moved; many, as one line of counts. */
export function filesSaid(was: readonly ComposerFile[], now: readonly ComposerFile[], words: Pick<ComposerFileWords, 'said' | 'batch'>): string {
  const before = new Map(was.map((f) => [f.id, standing(f)]));
  const moved = now.filter((f) => before.get(f.id) !== standing(f));
  if (moved.length <= SAID_ONE_BY_ONE) return moved.map((f) => words.said(f)).join(' ');
  const counts: Record<FileState, number> = { uploading: 0, ready: 0, refused: 0 };
  for (const f of moved) counts[f.state] += f.count ?? 1;
  return words.batch(counts);
}

/** Whether all that moved from `was` to `now` is the words of work still going: those change in place, so a press on a chip's remove button is never lost to a redraw. */
export function onlyDoingMoved(was: readonly ComposerFile[], now: readonly ComposerFile[]): boolean {
  return was.length === now.length && now.every((f, i) => {
    const before = was[i]!;
    return f.id === before.id && f.state === before.state && f.note === before.note && f.holds === before.holds && f.name === before.name && !!f.doing === !!before.doing;
  });
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
