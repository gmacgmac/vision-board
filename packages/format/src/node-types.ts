// The node-type registry (D-015): every fact that is true of a node type everywhere, declared
// once. The action layer refuses an action a type doesn't offer, the UI draws the label and the
// buttons from it. How it is built and how a type is added: docs/specification/components.md.
// The kind decides (every-node PLAN ruling 2, D-040 proposed): a card that needs an answer offers
// all five review actions; every other card offers a note and Later and never blocks.
import type { ActionId } from './ledger.ts';
import type { Kind } from './view.ts';

export interface NodeType {
  /** How the type reads in the UI and in labels. */
  readonly label: string;
  /** True when a card of this type asks the person for an answer: ✓, ✗ or a comment decides it,
   * and it counts in "N of M decided" (api.md 118). */
  readonly answer: boolean;
  /** The review actions a card of this type offers, in button order: `ANSWER_ACTIONS` or
   * `NOTE_ACTIONS`. */
  readonly actions: readonly ActionId[];
}

/** The five review actions, on a card that needs an answer. */
export const ANSWER_ACTIONS: readonly ActionId[] = ['ack', 'drop', 'comment', 'context', 'later'];
/** The three on every other card: answer it in words, ask back, or save it for later. */
export const NOTE_ACTIONS: readonly ActionId[] = ['comment', 'context', 'later'];

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
};
