// Defines the board's elements. The page calls defineBoardElements() once at start-up, before
// it creates any of them; each define is idempotent. Later patterns (<vb-link>) add their
// define call here.
import { defineVbNode } from './node/vb-node.ts';
import { defineVbRegion } from './region/vb-region.ts';
import { defineVbNoteBubble } from './note-bubble/vb-note-bubble.ts';

export function defineBoardElements(): void {
  defineVbNode();
  defineVbRegion();
  defineVbNoteBubble();
}
