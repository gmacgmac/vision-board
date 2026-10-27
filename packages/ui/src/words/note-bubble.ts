// Words: note-bubble. The note window: its accessible names, hint, buttons and thread labels.
// Keys: board.note-bubble.<name>. Plain code: no imports but other words files and types.

// ---- note-bubble-core.ts
export const yourNoteForTheAgent = 'Your note for the agent';
export const container = (container: string): string => `container ${container}`;
export const onContainer = (container: string): string => `on container ${container}`;
export const note = (on: string): string => `Note ${on}`;
export const editNote = (on: string | number): string => `Edit note ${on}`;
export const note2 = (index: number, on: string, past: string): string => `Note ${index} ${on}, ${past}`;
export const onCards = (count: number, join: string): string => `on ${count} cards: ${join}`;
export const note3 = (on: string, past: string): string => `Note ${on}, ${past}`;
export const noteOn = (number: number | undefined): string => `Note on ${number}`;
export const editNoteOn = (number: number | undefined): string => `Edit note on ${number}`;
export const noteOn2 = (index: number, number: number | undefined, past: string): string => `Note ${index} on ${number}, ${past}`;
export const notesAndReplies = 'Notes and replies';
export const replies = 'Replies';
export const noteAndReplies = 'Note and replies';
export const note4 = 'Note';
export const enterEscCancel = (adding: boolean): string => `Enter ${adding ? 'add' : 'save'} · Esc cancel`;
export const addNote = 'Add note';
export const save = 'Save';
export const cancel = 'Cancel';

// ---- note-bubble-template.ts
export const noteText = 'Note text';

// ---- vb-note-bubble.ts
export const saving = 'Saving…';

// ---- note-bubble-core.ts
export const conversationOn = (container: string | number | undefined): string => `Conversation on ${container}`;
