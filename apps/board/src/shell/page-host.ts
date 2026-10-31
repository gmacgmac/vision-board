// The standalone page as the board's host (board/host.ts, ARCH_03): one host among any. Its calls go
// with `fetch` on the page's own origin, its change events are the project's live stream
// (`watch_project`), its settings are the page's flags (`?flags=` and `vb.flags`, flags.ts) and the
// viewer's alignment (align.ts), its notices the toast and its confirmations the shared dialog
// (shell.svelte.ts). Its page part names the open board in the address, keeps the board last looked
// at (per folder with the openFolder flag, folder.ts), reloads to start again and holds the person's
// cookie. Its chat is the chat panel's, through its bridge (chat-panel.ts, chat-bridge.ts `host`): the
// board's selection and answers, Send and the agent's status all go through `BoardChat`. With the
// leavePrompt flag it guards its own tab: a close or reload while a note holds unsaved words gets the
// browser's "Leave site?" prompt (`guardLeave`).
import { flagOn, isFlag } from '#format';
import type { BoardChat, BoardHost, BoardEvent } from '../board/host.ts';
import type { Status } from '../board/status.ts';
import { LAST_BOARD_KEY } from '../board/boards/index.ts';
import { pageFlags } from '../flags.ts';
import { folderMoved, lastBoardKey, loadFolder, openFolderOn, reloadOnto } from './folder.ts';
import { keep, kept } from './kept.ts';
import { asPerson, pageTransport, watchProject } from './page-io.ts';
import { askConfirm, shell, toast } from './shell.svelte.ts';

/** The standalone host, and how its page tells the board a setting changed (the "⋯" menu's Centre cards). */
export interface PageHost extends BoardHost {
  settingsChanged(): void;
}

/** The page's own guard (leavePrompt flag, M11): while the board's status says a note holds unsaved
 *  words, a tab close or reload gets the browser's "Leave site?" prompt. The listener is there only
 *  while they are unsaved: added when `unsaved` turns true, removed when it turns false (saved, sent
 *  or discarded) and by the function returned (the board unmounts). */
export function guardLeave(status: Pick<Status, 'now' | 'on'>): () => void {
  const prompt = (e: BeforeUnloadEvent) => e.preventDefault();
  const set = (on: boolean) => (on ? window.addEventListener('beforeunload', prompt) : window.removeEventListener('beforeunload', prompt));
  set(status.now.unsaved);
  const unhear = status.on((patch) => { if (patch.unsaved !== undefined) set(patch.unsaved); });
  return () => { unhear(); set(false); };
}

/** This board's id in a change event. */
const PLUGIN = 'board';

export function createPageHost(chat: BoardChat): PageHost {
  const flags = pageFlags();
  const openFolder = openFolderOn();
  const listeners = new Set<() => void>();
  /** Where the board last looked at is kept: per folder once the folder is known. */
  let lastKey = LAST_BOARD_KEY;

  /** The project's live stream as change events. In watch mode (dev only) the stream also names the
   *  built page: the first id is kept, and a different one reloads the page, whose view is already
   *  saved (FE_02 ruling 6). With the openFolder flag the stream is ended by a folder switch;
   *  reopened, it reloads the page when the folder changed, else the board catches up. */
  function events(listener: (e: BoardEvent) => void): () => void {
    let build: string | null = null;
    let opened = false;
    const catchUp = () => listener({ plugin: PLUGIN, ref: {} });
    return watchProject({
      change: (seq) => listener({ plugin: PLUGIN, ref: { head: seq } }),
      build: (id) => {
        if (build === null) build = id;
        else if (id !== build) location.reload();
      },
      open: () => {
        if (!opened || !openFolder) { opened = true; catchUp(); return; }
        void folderMoved().then((leaving) => { if (!leaving) catchUp(); });
      },
    });
  }

  return {
    api: pageTransport,
    events,
    chat,
    settings: {
      get: (key) => (key === 'align' ? shell.align : isFlag(key) ? flagOn(key, flags) : undefined),
      on(listener) {
        listeners.add(listener);
        return () => { listeners.delete(listener); };
      },
    },
    settingsChanged() { for (const l of listeners) l(); },
    notify: (text, tone) => toast(text, tone),
    confirm: ({ heading, body, confirm, list }) => askConfirm(heading, body, confirm, list),
    page: {
      async wanted() {
        const folder = openFolder ? await loadFolder() : null;
        lastKey = lastBoardKey(folder);
        const lasts = [kept(lastKey), kept(LAST_BOARD_KEY)].filter((x): x is string => x !== null);
        return [decodeURIComponent(location.hash.slice(1)), ...lasts];
      },
      opened(id) {
        history.replaceState(null, '', `#${encodeURIComponent(id)}`);
        keep(lastKey, id);
        if (lastKey !== LAST_BOARD_KEY) keep(LAST_BOARD_KEY, id);
      },
      restart: reloadOnto,
      person: asPerson,
    },
  };
}
