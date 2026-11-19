// The parts an import left out, as a person reads them (point 619): one line per part, saying what it is (a card by its
// title, a link, a note) and whether all of it went or only something in it, the same part named once. The agent reads
// each part's own words, pointer first (`Drop.text`). Pure.
import { isRecord } from '../records.ts';
import * as formatExportWords from '../words/format-export.ts';
import type { Drop } from './condition.ts';

type Rec = Record<string, unknown>;

/** The part a pointer is in: a reply, or one entry of a list, or a list as a whole, or the file (''). */
const PART = /^(?:notes\[\d+\]\.thread\[\d+\]|(?:items|answers|pins|notes)\[\d+\]|items|answers|pins|notes)/;

/** A title as a person reads it in a line: trimmed, and cut with an ellipsis past `MAX_TITLE` characters. */
const MAX_TITLE = 60;
const shortTitle = (t: unknown): string | undefined => {
  if (typeof t !== 'string' || !t.trim()) return undefined;
  const chars = [...t.trim()];
  return chars.length > MAX_TITLE ? `${chars.slice(0, MAX_TITLE - 1).join('')}…` : chars.join('');
};

/** What a person calls the part at `part` of file `raw`. */
function partName(raw: Readonly<Rec>, part: string): string {
  const w = formatExportWords;
  if (part.includes('.thread[')) return w.aReply;
  const one = /^(\w+)\[(\d+)\]$/.exec(part);
  if (!one) return ({ items: w.theBoard, answers: w.theAnswers, pins: w.thePlaces, notes: w.theNotes } as Record<string, string>)[part] ?? w.theFile;
  if (one[1] === 'answers') return w.anAnswer;
  if (one[1] === 'pins') return w.aPlace;
  if (one[1] === 'notes') return w.aNote;
  const x = (Array.isArray(raw.items) ? raw.items : [])[Number(one[2])];
  const type = isRecord(x) ? x.type : undefined;
  const body = isRecord(x) && (type === 'node' || type === 'region') ? x[type] : undefined;
  const title = isRecord(body) ? shortTitle(body.title) : undefined;
  if (type === 'node') return w.card(title);
  if (type === 'region') return w.container(title);
  return type === 'link' ? w.aLink : w.aPart;
}

/** Each part of `raw` that `dropped` names, once, in reading order: whether all of it was left out, or only something
 * in it; at most `max` lines, the last then saying how many more. `raw`: the file as read, upgraded (its titles name the
 * cards and containers). */
export function forPerson(raw: Readonly<Rec>, dropped: readonly Drop[], max = Infinity): string[] {
  const parts = new Map<string, boolean>();
  for (const d of dropped) {
    const part = PART.exec(d.at)?.[0] ?? '';
    parts.set(part, (parts.get(part) ?? false) || d.out);
  }
  const lines = [...parts].map(([part, out]) => (out ? formatExportWords.personOut : formatExportWords.personPart)(partName(raw, part)));
  return lines.length <= max ? lines : [...lines.slice(0, max - 1), formatExportWords.personMore(lines.length - max + 1)];
}
