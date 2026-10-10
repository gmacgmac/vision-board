// What a review button says on each kind (every-node ruling 3, assumption B). ✓ and ✗ keep one
// meaning on every card (OK / yes, no / not wanted); on a question they read "Yes" and "No", on an
// action ✓ reads "Done". Everywhere else the registry's label. The one definition behind the
// buttons' tooltips (node-template.ts) and the key help (apps/board key-help.ts).
import type { ActionId, Kind } from '../../../format/src/index.ts';
import { ACTIONS } from '../../../actions/src/index.ts';

export const KIND_WORDS: Readonly<Partial<Record<Kind, Readonly<Partial<Record<ActionId, string>>>>>> = {
  question: { ack: 'Yes', drop: 'No' },
  action: { ack: 'Done' },
};

/** The word action `a` reads on a card of `kind`. */
export const actionWord = (a: ActionId, kind: Kind): string => KIND_WORDS[kind]?.[a] ?? ACTIONS[a].label;

/** Every other word action `a` reads on some kind, in kind order: ["Yes", "Done"] for ack. */
export const otherWords = (a: ActionId): string[] =>
  [...new Set(Object.values(KIND_WORDS).flatMap((w) => (w?.[a] ? [w[a]] : [])))];
