// Card size tiers (D-030, docs/specification/components.md § Node size). Pure: a node in, a tier
// word out. The page writes the tier on the card as `data-size` before it measures, so layout keeps
// reading measured sizes and never sees a width (rule 9).
import type { ActSize, NodeSize, ViewNode } from '#format';

/** The tiers, smallest first; emphasis moves one step along this list. */
export const TIERS: readonly NodeSize[] = ['s', 'm', 'l'];
/** Body characters over which a card is L. */
export const LONG_BODY = 480;
/** Body characters over which a card is at least M. */
export const MEDIUM_BODY = 140;
/** List items over which a card is at least M. */
export const MANY_ITEMS = 6;

/** What the auto rule reads from a body: its length, whether it has a fenced code block, its list items. */
export interface BodyMeasure { chars: number; code: boolean; items: number }

// A line's container prefix (blockquote markers and indentation) is skipped before the test.
const PREFIX = /^(?:\s*>)*\s*/;
const FENCE = /^(?:`{3,}|~{3,})/;
const ITEM = /^(?:[-*+]|\d{1,9}[.)])(?:\s|$)/;

/** Body length (trimmed), fenced code, and list items outside code. Title and tags never count. */
export function measureBody(body = ''): BodyMeasure {
  let fence: string | null = null;
  let code = false;
  let items = 0;
  for (const raw of body.split('\n')) {
    const line = raw.replace(PREFIX, '');
    const open = FENCE.exec(line)?.[0];
    if (fence !== null) {
      if (open !== undefined && open[0] === fence[0] && open.length >= fence.length) fence = null;
      continue;
    }
    if (open !== undefined) { fence = open; code = true; continue; }
    if (ITEM.test(line)) items += 1;
  }
  return { chars: body.trim().length, code, items };
}

/** The tier the body asks for: L over 480 characters; M over 140, with a code block, or over 6 list items; else S. */
export function autoTier(body?: string): NodeSize {
  const m = measureBody(body);
  if (m.chars > LONG_BODY) return 'l';
  if (m.chars > MEDIUM_BODY || m.code || m.items > MANY_ITEMS) return 'm';
  return 's';
}

/** One tier up, never past L. */
const up = (t: NodeSize): NodeSize => TIERS[Math.min(TIERS.indexOf(t) + 1, TIERS.length - 1)]!;

/**
 * The card's tier. The person's pick wins and is exact; `auto` (or none) leaves it to the agent's
 * `size` suggestion, else the auto tier, and emphasis raises that one step, up to L.
 */
export function sizeTier(node: Pick<ViewNode, 'body' | 'size' | 'emphasis'>, personSize?: ActSize): NodeSize {
  if (personSize !== undefined && personSize !== 'auto') return personSize;
  const base = node.size ?? autoTier(node.body);
  return node.emphasis ? up(base) : base;
}
