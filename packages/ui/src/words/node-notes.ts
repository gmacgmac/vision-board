// Words: node-notes. The notes on a card in a conversation: who wrote them.
// Keys: vision-board.node-notes.<name>. Plain code: no imports but other words files and types.

// ---- node-notes.ts
// One label line (points 618-619): "User" on a note, "Agent · <name> <id>" on a reply; the name may be cut, the id never.
export const user = 'User';
export const agent = 'Agent';
export const agentLead = 'Agent · ';
export const agentWho = (name: string | undefined, id: string | undefined): string =>
  (name || id ? `${agentLead}${[name, id].filter(Boolean).join(' ')}` : agent);
