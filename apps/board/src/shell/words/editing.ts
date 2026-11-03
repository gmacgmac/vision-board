// Words: editing. The read-only state in the header, Edit and Stop editing (readOnlyStart flag, D-085).
// Keys: board.editing.<name>. Plain code: no imports but other words files and types.

// ---- EditChip.svelte: the state, its name and tooltip
export const readOnly = 'Read-only';
export const editing = 'Editing';
/** The read-only chip's tooltip and name, while no other computer is editing. */
export const readOnlyPressEdit = 'Read-only: press Edit to change this ledger';
/** The same, while another computer holds the ledger. */
export const readOnlyEditedOn = (host: string, since: string): string => `Read-only: being edited on ${host} since ${since}`;
/** The editing chip's tooltip and name. */
export const editingHere = 'Editing: this ledger is open for changes here; Stop editing makes it read-only again';
/** The chip's menu, for screen readers. */
export const ledgerState = 'This ledger';
/** Said once when the state changes (a polite status). */
export const nowReadOnly = 'This ledger is now read-only.';
export const nowEditing = 'You are editing this ledger.';

// ---- EditChip.svelte, EditButton.svelte: the actions
export const edit = 'Edit';
export const stopEditing = 'Stop editing';
export const editTip = 'Open this ledger for changes here: it checks no other computer is editing it first';
export const stopEditingTip = 'Make this ledger read-only again, so another computer can edit it';
/** Edit refused: another computer holds the ledger. */
export const editRefused = (host: string, since: string): string =>
  `Still read-only: ${host} has been editing this ledger since ${since}. Press Edit again once it stops editing.`;
/** While Edit or Stop editing is on its way. */
export const opening = 'Opening for editing…';
export const stopping = 'Stopping…';
