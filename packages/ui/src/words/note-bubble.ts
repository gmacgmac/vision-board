// Words: note-bubble. The note window: its accessible names, hint, buttons and thread labels.
// Keys: vision-board.note-bubble.<name>. Plain code: no imports but other words files and types.

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
export const cardsList = (count: number, join: string): string => `${count} cards: ${join}`;
export const conversationOn = (container: string | number | undefined): string => `Conversation on ${container}`;

// ---- the conversation box (note-bubble-core.ts, conversation-template.ts; FE_03)
// The box's two modes (FIX_03 ruling 3): the field and the tooltips say which one Enter does.
export const noteAbout = (about: string | number | undefined): string => `Add a note about ${about}`;
export const askAbout = (about: string | number | undefined): string => `Ask the agent about ${about} now`;
export const nCards = (count: number): string => `${count} cards`;
export const both = (numbers: readonly number[]): string => numbers.join(' and ');
export const askNow = 'Ask now';
export const askNowTip = (active: boolean): string => (active
  ? 'Ask now (Enter, or Cmd or Ctrl Enter): this message goes to the agent at once'
  : 'Ask now (Cmd or Ctrl Enter): this message goes to the agent at once. Pressing it makes Enter ask');
export const addNoteTip = (active: boolean): string => (active
  ? 'Add note (Enter): it waits for the board\'s Send'
  : 'Add note: it waits for the board\'s Send. Pressing it makes Enter add notes');
export const waitingForTheAgent = 'Waiting for the agent';
// A note no agent has had yet (point 619), and where an imported conversation ends (point 617).
export const notSent = 'Not sent';
export const noteNumber = (index: number): string => `Note ${index}`;
export const imported = 'Imported';
export const asking = 'Asking…';
export const conversations = 'Conversations';
export const closeConversation = 'Close conversation';
