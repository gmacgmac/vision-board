// What an import keeps by who writes it (D-108), after the conditioning: the person's answers, places and notes are the
// person's own acts, so an agent's import leaves them out; the agent's replies on a note are the agent's words, so the
// person's import leaves them out. Each part left out is named where it was. Pure.
import * as formatExportWords from '../words/format-export.ts';
import type { Conditioned } from './condition.ts';
import type { ExportFile } from './index.ts';

/** `file` as `by` may write it, and each part left out, in reading order. */
export function keptFor(file: ExportFile, by: 'person' | 'agent'): Conditioned {
  const dropped: string[] = [];
  const name = (part: unknown[] | undefined, at: string, why: (at: string) => string) =>
    part?.forEach((_, i) => dropped.push(formatExportWords.refused(why(`${at}[${i}]`))));
  if (by === 'agent') {
    const { answers, pins, notes, ...rest } = file;
    name(answers, 'answers', formatExportWords.agentAnswer);
    name(pins, 'pins', formatExportWords.agentPin);
    name(notes, 'notes', formatExportWords.agentNote);
    return { file: rest, dropped };
  }
  if (!file.notes?.some((n) => n.thread !== undefined)) return { file, dropped };
  const notes = file.notes.map(({ thread, ...note }, i) => {
    if (thread !== undefined) dropped.push(formatExportWords.refused(formatExportWords.personThread(`notes[${i}]`)));
    return note;
  });
  return { file: { ...file, notes }, dropped };
}
