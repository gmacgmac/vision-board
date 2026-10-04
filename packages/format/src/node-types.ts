// The node-type registry (D-015): every fact that is true of a node type everywhere, declared
// once. The action layer refuses an action a type doesn't offer, the UI draws the label and the
// buttons from it. How it is built and how a type is added: docs/specification/components.md.
import type { ActionId } from './ledger.ts';
import type { Kind } from './view.ts';

export interface NodeType {
  /** How the type reads in the UI and in labels. */
  readonly label: string;
  /** The review actions an item of this type offers, in button order. */
  readonly actions: readonly ActionId[];
}

/** The five review actions; a finding leaves out drop. */
const ALL_FIVE: readonly ActionId[] = ['ack', 'drop', 'comment', 'context', 'later'];

export const NODE_TYPES: Readonly<Record<Kind, NodeType>> = {
  question: { label: 'Question', actions: ALL_FIVE },
  finding: { label: 'Finding', actions: ['ack', 'comment', 'context', 'later'] },
  decision: { label: 'Decision', actions: ALL_FIVE },
  risk: { label: 'Risk', actions: ALL_FIVE },
  action: { label: 'Action', actions: ALL_FIVE },
  topic: { label: 'Topic', actions: [] },
  note: { label: 'Note', actions: [] },
};
