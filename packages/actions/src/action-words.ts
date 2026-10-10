// What ✓ and ✗ mean on each kind (every-node ruling 3; panel-send ruling 4). ✓ and ✗ keep one
// meaning on every card (OK / yes, no / not wanted); on a question they mean "yes" and "no", on an
// action ✓ means "done". Elsewhere they mean the action itself. The one definition behind the
// buttons' tooltips (packages/ui node-template.ts), the key help (apps/board key-help.ts), what
// `check_responses` reports (`means`) and the numbered reply (reply.ts).
import type { ActionId, Kind } from '../../format/src/index.ts';
import { ACTIONS } from './registry.ts';

/** The word an act says on a kind, for the agent. */
export type Meaning = 'yes' | 'no' | 'done';

export const MEANINGS: Readonly<Partial<Record<Kind, Readonly<Partial<Record<ActionId, Meaning>>>>>> = {
  question: { ack: 'yes', drop: 'no' },
  action: { ack: 'done' },
};

/** What action `a` means on a card of `kind`, or undefined where it means the action itself. */
export const meaningOf = (a: ActionId, kind: Kind): Meaning | undefined => MEANINGS[kind]?.[a];

const capital = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

/** The word action `a` reads on a card of `kind`: "Yes" for ack on a question, else the registry's label. */
export const actionWord = (a: ActionId, kind: Kind): string => {
  const m = meaningOf(a, kind);
  return m ? capital(m) : ACTIONS[a].label;
};

/** Every other word action `a` reads on some kind, in kind order: ["Yes", "Done"] for ack. */
export const otherWords = (a: ActionId): string[] =>
  [...new Set(Object.values(MEANINGS).flatMap((w) => (w?.[a] ? [capital(w[a])] : [])))];
