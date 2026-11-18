// Front door of board/notes/: code outside the folder imports from here only (ARCH_06).
export { DISCARD_ASK } from './note-discard.ts';
export { createNoteFlow } from './notes.ts';
export type { NoteFlow } from './note-flow-types.ts';
export { createRegionNotes } from './region-notes.ts';
/** The conversation box's code (FE_03), loaded on first use: out of the page's start weight. */
export const loadNoteBox = () => import('./note-box.ts');
export type { BoxDeps } from './note-box.ts';
