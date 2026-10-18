// The node-type registry (D-015): every fact that is true of a node type everywhere, declared
// once. The action layer refuses an action a type doesn't offer, the UI draws the label and the
// buttons from it. How it is built and how a type is added: docs/specification/components.md.
// The kind decides (every-node PLAN ruling 2, D-040): a card that needs an answer offers ✓, ✗, a
// note and Later; every other card offers a note and Later and never blocks. Only ✓ or ✗ answers a
// card, and More context is gone: a note can ask (D-045).
import type { ActionId } from './ledger.ts';
import type { Kind } from './view.ts';

export interface NodeType {
  /** How the type reads in the UI and in labels. */
  readonly label: string;
  /** True when a card of this type asks the person for an answer: only ✓ or ✗ answers it (a note
   * never does), and it counts in "N open · N answered · N later" (api.md 118, D-045). */
  readonly answer: boolean;
  /** The review actions a card of this type offers, in button order: `ANSWER_ACTIONS` or
   * `NOTE_ACTIONS`. */
  readonly actions: readonly ActionId[];
}

/** The four review actions, on a card that needs an answer: ✓, ✗, a note, Later. */
export const ANSWER_ACTIONS: readonly ActionId[] = ['ack', 'drop', 'comment', 'later'];
/** The two on every other card: a note (which may ask back) or Later. `context` stays in the
 * format, so old lines read, but no card offers it (D-045). */
export const NOTE_ACTIONS: readonly ActionId[] = ['comment', 'later'];

const asks = (label: string): NodeType => ({ label, answer: true, actions: ANSWER_ACTIONS });
const tells = (label: string): NodeType => ({ label, answer: false, actions: NOTE_ACTIONS });

export const NODE_TYPES: Readonly<Record<Kind, NodeType>> = {
  question: asks('Question'),
  finding: tells('Finding'),
  decision: asks('Decision'),
  risk: tells('Risk'),
  action: asks('Action'),
  topic: tells('Topic'),
  note: tells('Note'),
  // An app the agent built, shown in a panel inside the card (D-047 ruling 3): a note and Later.
  app: tells('App'),
};
