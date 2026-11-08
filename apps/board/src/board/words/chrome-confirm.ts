// Words: chrome-confirm. The confirm dialog, its list and the discard-changes confirm.
// Keys: vision-board.chrome-confirm.<name>. Plain code: no imports but other words files and types.

// ---- ConfirmDialog.svelte
export const areYouSure = 'Are you sure?';
export const confirm = 'Confirm';

// ---- ConfirmList.svelte
export const item = (ref: string | number): string => `Item ${ref}:`;
export const notIncluded = 'Not included';
