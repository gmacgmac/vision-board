// Shared state between the board controller (plain TypeScript) and the Svelte shell around it.
// The controller writes here; the toolbar, reply panel, confirm dialog and toast read it (D-005: Svelte
// arranges the page, the canvas stays framework-free).
import type { BoardListItem } from '../../../../packages/actions/src/index.ts';

export interface Toast { text: string; tone: 'info' | 'error'; seq: number }

/** A confirmation the page asks for before a decision that takes something away (rule 8). */
export interface ConfirmRequest {
  heading: string;
  body: string;
  /** The confirming button's text, for example "Remove access". */
  confirm: string;
  resolve(ok: boolean): void;
}

/** One open grant request as the strip shows it (agentAccess flag): `container` is the region's
 * title, `label` the asking agent's. */
/** The Send to agent button's own states; hover, focus and pressed are CSS. */
export type SendState = 'idle' | 'sending' | 'sent' | 'error';

export interface AccessRequestRow { seq: number; label: string; container: string; reason: string }

export const shell = $state({
  /** The picker's list, from the held state after every batch (boards.ts `listed`). */
  boards: [] as BoardListItem[],
  boardId: '',
  /** Boards that appeared after the page opened and have not been opened yet (FE_02 ruling 3).
   * Replaced, never changed in place, so the toolbar sees every change. */
  newBoards: new Set<string>(),
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
  confirm: null as ConfirmRequest | null,
  /** The agentAccess flag: Send to agent, the requests strip and the holders on each frame. */
  agentAccess: false,
  requests: [] as AccessRequestRow[],
  /** What the selection's live region says ("3 cards selected", "Selection cleared"), 3_FE_01. */
  selection: '',
});

let toastTimer = 0;
let toastSeq = 0;

export function toast(text: string, tone: Toast['tone'] = 'info'): void {
  shell.toast = { text, tone, seq: ++toastSeq };
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { shell.toast = null; }, tone === 'error' ? 6000 : 2200);
}

/** Opens the confirm dialog. Resolves true when confirmed, false when cancelled. */
export function askConfirm(heading: string, body: string, confirm: string): Promise<boolean> {
  return new Promise((resolve) => {
    shell.confirm = { heading, body, confirm, resolve };
  });
}
