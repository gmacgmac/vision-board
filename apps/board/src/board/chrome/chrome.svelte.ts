// What the board's controls share, one per mount (mount.ts): the board's status as Svelte state, the
// dialogs the header opens, and what they take from the host: its flags, its notices and the page's own
// parts. Svelte's context carries it, so two boards on one page never share a toolbar's state. Nothing
// outside `board/chrome/` reads it; a host reads the status (status.ts).
import { getContext, setContext } from 'svelte';
import type { BoardActionId } from '#actions';
import type { FlagName } from '#format';
import type { BoardHost, BoardPageParts, BoardStore } from '../host.ts';
import { flagOf, memoryStore } from '../host.ts';
import { initialStatus } from '../status.ts';

/** The Send to agent button's own states; hover, focus and pressed are CSS. */
export type SendState = 'idle' | 'sending' | 'sent' | 'error' | 'waiting' | 'disabled';

/** The New board or Rename board dialog (BoardDialog), with the words it opens with. */
export interface BoardDialogRequest { action: BoardActionId; title: string; summary: string }

/** The board's status (status.ts), as it last said it, and the dialogs open now. */
export function chromeState() {
  const state = $state({
    ...initialStatus(),
    /** The Archived list is open (ArchivedDialog.svelte). */
    archivedDialog: false,
    /** The New board or Rename board dialog, open while set (navigation BE_01). */
    boardDialog: null as BoardDialogRequest | null,
  });
  return state;
}
export type ChromeState = ReturnType<typeof chromeState>;

export interface Chrome {
  state: ChromeState;
  /** Where the strips say their height (`--vb-strip-h`, `--vb-banner-h`), and what the controls search inside. */
  root: HTMLElement;
  flag(f: FlagName): boolean;
  /** A control's document id: the mount's prefix (mount-ids.ts), none on the first. */
  id(name: string): string;
  ids: string;
  notify: BoardHost['notify'];
  /** Where the viewer's conveniences are kept (BoardHost.store). */
  store: BoardStore;
  /** The page's own controls in the header; a host has none. */
  parts: BoardPageParts;
  /** The board has its own page: `?` is heard outside its root too (keys.ts `pageWide`). */
  pageWide: boolean;
}

/** One mount's controls, over its host. */
export function createChrome(host: Pick<BoardHost, 'settings' | 'notify' | 'page'>, root: HTMLElement, ids: string, store: BoardStore = memoryStore(), state = chromeState()): Chrome {
  return {
    state, root, ids, flag: (f) => flagOf(host, f), id: (name) => `${ids}${name}`, notify: (text, tone) => host.notify(text, tone),
    store, parts: host.page?.parts ?? {}, pageWide: !!host.page,
  };
}

const KEY = Symbol('vb-chrome');
/** For one sample's `mount`, outside BoardChrome (the gallery). */
export const chromeContext = (chrome: Chrome) => new Map([[KEY, chrome]]);
export const provideChrome = (chrome: Chrome): Chrome => setContext(KEY, chrome);
export const useChrome = (): Chrome => getContext<Chrome>(KEY);
