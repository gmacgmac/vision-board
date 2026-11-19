// What an import keeps by who writes it (D-108), after the conditioning: the person's answers and places are the
// person's own acts, so an agent's import leaves them out, each named where it was; a card the person moved to Later
// is drawn in the file's first container instead (`laterHome`). The conversation comes in whoever imports (point 617):
// its lines keep their author. Pure.
import { LATER_REGION } from '../ledger.ts';
import * as formatExportWords from '../words/format-export.ts';
import type { Conditioned, Drop } from './condition.ts';
import { gone, less } from './condition.ts';
import type { ExportFile } from './index.ts';

type Rec = Record<string, unknown>;

/** The container a card in Later is drawn in on import (a node line names a container; Later is a place only the
 * person's move gives): the file's first container's id, or undefined when the file has none. */
export const laterHome = (file: ExportFile): string | undefined => {
  const first = (file.items as Rec[]).find((x) => x.type === 'region')?.region as Rec | undefined;
  return first === undefined ? undefined : String(first.id);
};

/** `file` as `by` may write it, and each part left out, in reading order. */
export function keptFor(file: ExportFile, by: 'person' | 'agent'): Conditioned {
  if (by === 'person') return { file, dropped: [] };
  const dropped: Drop[] = [];
  const name = (part: unknown[] | undefined, at: string, why: (at: string) => string) =>
    part?.forEach((_, i) => dropped.push(gone(`${at}[${i}]`, formatExportWords.refused(why(`${at}[${i}]`)))));
  const { answers, pins, ...rest } = file;
  name(answers, 'answers', formatExportWords.agentAnswer);
  name(pins, 'pins', formatExportWords.agentPin);
  const home = laterHome(file);
  const items = home === undefined ? file.items : (file.items as Rec[]).map((x, i) => {
    if (x.type !== 'node' || (x.node as Rec).region !== LATER_REGION) return x;
    const at = `items[${i}].node.region`;
    dropped.push(less(at, formatExportWords.refused(formatExportWords.agentLater(at))));
    return { ...x, node: { ...(x.node as Rec), region: home } };
  });
  return { file: { ...rest, items } as ExportFile, dropped };
}
