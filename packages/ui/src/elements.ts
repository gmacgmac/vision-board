// Defines the board's elements. The page calls defineBoardElements() once at start-up, before
// it creates any of them; each define is idempotent. Later patterns (<vb-region>, <vb-link>)
// add their define call here.
import { defineVbNode } from './node/vb-node.ts';

export function defineBoardElements(): void {
  defineVbNode();
}
