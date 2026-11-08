// Words: node-notes. The notes on a card: who wrote them, how many are new, and the hide and show labels.
// Keys: vision-board.node-notes.<name>. Plain code: no imports but other words files and types.

// ---- node-notes.ts
export const agentReply = (agent: string): string => `Agent reply${agent}`;
export const cards = (count: number): string => ` · ${count} cards`;
export const noteOnShowIt = (index: number, on: string, sent: boolean): string => `Note ${index} on ${on}, ${sent ? 'sent' : 'answered'}. Show it`;
export const noteOnEditIt = (index: number, on: string): string => `Note ${index} on ${on}. Edit it`;
export const newReply = 'new reply';
export const newReplies = 'new replies';
export const hideNotesOnItem = (n: number | undefined): string => `Hide notes on item ${n}`;
export const showOnItem = (hidden: string, n: number | undefined): string => `Show ${hidden} on item ${n}`;
export const items = (join: string): string => `items ${join}`;
export const item = (n: number | undefined): string => `item ${n}`;
