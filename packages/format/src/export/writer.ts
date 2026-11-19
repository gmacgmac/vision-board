// What an import keeps by who writes it (D-108), after the conditioning: the person's answers and places are the
// person's own acts, so an agent's import leaves them out, each named where it was. The conversation comes in whoever
// imports (point 617): its lines keep their author. Pure.
import * as formatExportWords from '../words/format-export.ts';
import type { Conditioned, Drop } from './condition.ts';
import { gone } from './condition.ts';
import type { ExportFile } from './index.ts';

/** `file` as `by` may write it, and each part left out, in reading order. */
export function keptFor(file: ExportFile, by: 'person' | 'agent'): Conditioned {
  if (by === 'person') return { file, dropped: [] };
  const dropped: Drop[] = [];
  const name = (part: unknown[] | undefined, at: string, why: (at: string) => string) =>
    part?.forEach((_, i) => dropped.push(gone(`${at}[${i}]`, formatExportWords.refused(why(`${at}[${i}]`)))));
  const { answers, pins, ...rest } = file;
  name(answers, 'answers', formatExportWords.agentAnswer);
  name(pins, 'pins', formatExportWords.agentPin);
  return { file: rest, dropped };
}
