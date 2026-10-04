// Shared state between the board controller (plain TypeScript) and the Svelte shell around it.
// The controller writes here; the toolbar, reply panel, dialog and toast read it (D-005: Svelte
// arranges the page, the canvas stays framework-free).
import type { BoardSummary } from '../board/io.ts';

export interface NoteRequest {
  heading: string;
  item: string;
  required: boolean;
  placeholder: string;
  resolve(text: string | null): void;
}

export interface Toast { text: string; tone: 'info' | 'error'; seq: number }

export const shell = $state({
  boards: [] as BoardSummary[],
  boardId: '',
  title: 'Vision Board',
  version: null as number | null,
  summary: '',
  counts: { open: 0, decided: 0, later: 0 },
  answered: 0,
  replyText: '',
  replyOpen: false,
  hide: false,
  message: null as string | null,
  toast: null as Toast | null,
  note: null as NoteRequest | null,
});

let toastTimer = 0;
let toastSeq = 0;

export function toast(text: string, tone: Toast['tone'] = 'info'): void {
  shell.toast = { text, tone, seq: ++toastSeq };
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { shell.toast = null; }, tone === 'error' ? 6000 : 2200);
}

/** Opens the note dialog. Resolves to the text ('' when optional and left empty), or null when cancelled. */
export function askNote(heading: string, item: string, required: boolean, placeholder: string): Promise<string | null> {
  return new Promise((resolve) => {
    shell.note = { heading, item, required, placeholder, resolve };
  });
}
