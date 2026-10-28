// Words: shell-proposals. Proposal counts, the accept-all confirm and its toast.
// Keys: board.shell-proposals.<name>. Plain code: no imports but other words files and types.

// ---- ProposalsBar.svelte
export const theAgent = 'The agent';
export const showTheNotice = (count: string): string => `${count}, show the notice`;
export const showTheProposalsNotice = 'Show the proposals notice';
export const hideTheProposalsNotice = 'Hide the proposals notice';
export const hideEsc = 'Hide · Esc';
export const review = 'Review';
export const acceptAll = (ready: string | number): string => `Accept all (${ready})`;
export const proposesOnItem = (agent: string | number, reason: string | number, n: number): string => `${agent} proposes: ${reason}, on item ${n}`;
export const reviewACardWithAProposal = 'Review a card with a proposal';
export const reviewChooseOneTo = 'Review · choose a card with a proposal';
