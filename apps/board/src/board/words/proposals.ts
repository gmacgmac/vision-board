// Words: proposals. Proposal counts, the accept-all confirm and its toast.
// Keys: board.proposals.<name>. Plain code: no imports but other words files and types.

// ---- proposals.ts
export const accepted = 'Accepted';
export const rejected = 'Rejected';
export const outOfDate = (stale: number): string => `${stale} out of date`;
/** The noun beside a count: "proposal", "proposals". */
export const noun = (k: number): string => (k === 1 ? 'proposal' : 'proposals');
/** "1 proposal", "3 proposals". */
export const count = (k: number): string => `${k} ${noun(k)}`;
export const acceptHeading = (k: number): string => `Accept ${k === 1 ? 'this proposal' : `these ${count(k)}`}?`;
export const acceptBody = (k: number): string =>
  (k === 1 ? 'This decision is applied to its card:' : 'These decisions are applied in this order, each to its card:');
export const apply = (k: number): string => `Apply ${count(k)}`;
export const accepted2 = (k: number): string => `Accepted ${count(k)}`;
