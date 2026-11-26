// Card size tiers on the page (D-030, the nodeSize flag): the tier each card is drawn at, and the act a pick sends (the
// selection bar's Width, bar-acts.ts).
import type { ActSize, TierSize, ViewNode } from '#format';
import type { BoardState } from '#actions';
import { sizeTier } from '#layout';
import type { ActFields } from '../io.ts';

/** The tier a card is drawn at: the person's pick, else the agent's suggestion or the auto tier.
 *  `tables`: a table makes the card L only while Markdown draws tables (markdownMore, MD_01-R3). */
export const tierOf = (n: ViewNode, s: BoardState, tables?: boolean): TierSize => sizeTier(n, s.sizes.get(n.id), tables);

/** The person's `size` act; `auto` removes their pick (api.md 16). No `ver`: it is about the
 *  node's place on the board, like `pin`. `ActFields` (io.ts) has no `size` field yet, so the
 *  extra field rides on an intersection the I/O module sends unchanged. */
export const sizeAct = (id: string, size: ActSize): ActFields =>
  ({ action: 'size', n: Number(id), size });
