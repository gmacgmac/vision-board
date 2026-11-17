// The skin registry (D-100 1, decision 14): one row per skin saying where its node puts the answer and the marks. A
// skin changes how a node looks and where its controls sit, never what they do: the template reads a row, never a
// skin's name, so a new skin is a row here and a stylesheet (tokens' skins.css), never a branch in the node. The
// actions, their keys and what they do are the same in every row (skins.test.ts). Pure data.
import type { Skin } from '#format';

/** Where a skin's node puts its controls. `answer`: a disc on the top edge that opens Tick and Cross beside it
 *  (`disc`), or a Tick | Cross switch along the bottom (`switch`). `marks`: the number, kind, change badge and notes
 *  mark on the node's edges (`edges`), or in a plate along its top (`plate`). */
export interface SkinDef {
  answer: 'disc' | 'switch';
  marks: 'edges' | 'plate';
}

export const SKIN_DEFS: Readonly<Record<Skin, SkinDef>> = {
  default: { answer: 'disc', marks: 'edges' },
  // Completed by FE_04 (its styles and any value the plate needs); the template already draws by this row.
  'command-lens': { answer: 'switch', marks: 'plate' },
};
