// Words: node-updates. A card's updates since you last looked: the step labels and counts.
// Keys: vision-board.node-updates.<name>. Plain code: no imports but other words files and types.

// ---- node-updates.ts
export const drawnAgainWithNoChange = 'Drawn again with no change';
export const title = (short: string): string => `Title: ${short}`;
export const bodyRewritten = 'Body rewritten';
export const update = (k: number): string => `${k} update${k === 1 ? '' : 's'}`;
export const updateOf = (at: number, k: number): string => `Update ${at} of ${k}`;
export const theAgentSReply = 'the agent\'s reply';
export const reply = 'Reply';
export const theAgent = 'the agent';
export const showing = (toLowerCase: string): string => `, showing ${toLowerCase}`;
export const unseen = ' unseen ';
