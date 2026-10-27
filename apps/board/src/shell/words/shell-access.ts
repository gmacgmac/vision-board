// Words: shell-access. Access requests and the revoke confirm: what an agent asks for and what the person is told.
// Keys: board.shell-access.<name>. Plain code: no imports but other words files and types.

// ---- AccessRequests.svelte
export const askForAccess = (count: number): string => (count === 1 ? 'An agent asks for access' : `${count} agents ask for access`);
export const wantsToDrawOn = 'wants to draw on';
export const thisBoard = 'this board';
export const asksToWriteIn2 = 'asks to write in';
export const noteForOptional = (label: string | number): string => `Note for ${label} (optional)`;
export const optionalWhyNot = 'Optional: why not?';
export const refuse = (label: string | number): string => `Refuse ${label}`;
export const refuse2 = 'Refuse';
export const allow = 'Allow';
export const allowTo = (label: string | number, container: string | number): string => `Allow ${label} to ${container}`;
