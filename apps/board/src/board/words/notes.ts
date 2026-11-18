// Words: notes. Notes: the toasts for saving and removing.
// Keys: vision-board.notes.<name>. Plain code: no imports but other words files and types.

// ---- notes.ts
export const notSaved = (problem: string): string => `Not saved: ${problem}`;
export const container = (region: string): string => `container ${region}`;
export const cards = (count: number): string => `${count} cards`;
/** The toast after a note is saved: "Note on 3 added". */
export const noteOn = (on: string | number, action: string): string =>
  `Note on ${on} ${{ comment: 'added', 'note-edit': 'saved', 'note-remove': 'removed' }[action] ?? 'saved'}`;

// ---- note-box.ts, controller/ask-now.ts (the conversation box, FE_03)
export const noAgentIsListening = 'No agent is listening: your note waits for the board\'s Send';
export const notAsked = (problem: string): string => `Not asked: ${problem}. Your note waits for the board's Send`;
export const thisNode = 'This node';
export const withNodes = (numbers: string): string => `With ${numbers}`;
export const theAgentIsWorking = 'The agent is working: ask when it finishes this turn';

// ---- region-notes.ts
export const notRemoved = (problem: string): string => `Not removed: ${problem}`;
export const noteOnContainerRemoved = (title: string): string => `Note on container ${title} removed`;
