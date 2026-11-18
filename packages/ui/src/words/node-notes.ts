// Words: node-notes. The notes on a card in a conversation: who wrote them.
// Keys: vision-board.node-notes.<name>. Plain code: no imports but other words files and types.

// ---- node-notes.ts
export const agentReply = (agent: string): string => `Agent reply${agent}`;
export const cards = (count: number): string => ` · ${count} cards`;

// ---- node-notes.ts `conversation` (the conversation box, FE_03)
export const askedNow = ' · Asked now';
