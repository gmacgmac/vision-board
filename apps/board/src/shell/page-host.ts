// The standalone page as the board's host (board/host.ts, ARCH_03): one host among any. Its calls go
// with `fetch` on the page's own origin, its change events are the project's live stream
// (`watch_project`), its header's own controls the page's parts (page-parts.ts), its settings are the page's flags (`?flags=` and `vb.flags`, flags.ts) and the
// viewer's alignment (align.ts), its notices the toast and its confirmations the shared dialog
// (shell.svelte.ts), its store this browser's storage, per folder and ledger (kept.ts `pageStore`). Its page part names the open board in the address, keeps the board last looked
// at in that same store (per folder and ledger with the openFolder flag, folder.ts `lastBoardKey`), reloads to start again and holds the person's
// cookie. Its chat is the chat panel's, through its bridge (chat-panel.ts, chat-bridge.ts `host`): the
// board's selection and answers, Send and the agent's status all go through `BoardChat`. With the
// leavePrompt flag it guards its own tab: a close or reload while a note holds unsaved words gets the
// browser's "Leave site?" prompt (`guardLeave`).
import { flagOn, isFlag } from '#format';
import type { BoardChat, BoardHost, BoardPageParts, PluginEvent } from '../board/host.ts';
import type { Status } from '../board/status.ts';
import { pageFlags } from '../flags.ts';
import { readEditing } from './editing.ts';
import { folderMoved, lastBoardKey, loadFolder, openFolderOn, reloadOnto } from './folder.ts';
import { pageStore } from './kept.ts';
import { asPerson, pageTransport, watchProject } from './page-io.ts';
import { askConfirm, shell, toast } from './shell.svelte.ts';
import * as pageHelpWords from './words/page-help.ts';

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

export function createPageHost(chat: BoardChat, parts: BoardPageParts = {}): PageHost {
  const flags = pageFlags();
  const openFolder = openFolderOn();
  const listeners = new Set<() => void>();
  /** The board's memory and the board last looked at, per folder and ledger once the folder is read. */
  const store = pageStore(() => shell.folder);

  /** The project's live stream as change events. In watch mode (dev only) the stream also names the
   *  built page: the first id is kept, and a different one reloads the page, whose view is already
   *  saved (FE_02 ruling 6). With the openFolder flag the stream is ended by a folder switch;
   *  reopened, it reloads the page when the folder changed, else the board catches up. */
  function events(listener: (e: PluginEvent) => void): () => void {
    let build: string | null = null;
    let opened = false;
    const catchUp = () => listener({ plugin: PLUGIN, ref: {} });
    return watchProject({
      change: (seq) => listener({ plugin: PLUGIN, ref: { head: seq } }),
      // The ledger file was replaced: a head of 0 reads it again from the start (live.ts). Edit or Stop editing, or the
      // lock changed hands elsewhere: the board reads again and learns `readOnly` from the read, and the folder is read
      // again for who is editing (the chip's words, FIX_01 F6).
      reset: () => listener({ plugin: PLUGIN, ref: { head: 0 } }),
      editing: () => { catchUp(); if (openFolder) void readEditing(); },
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
    store,
    page: {
      async wanted() {
        if (openFolder && !shell.folder) await loadFolder(); // read before the mount (App.svelte)
        const last = store.get(lastBoardKey);
        return [decodeURIComponent(location.hash.slice(1)), ...(last === null ? [] : [last])];
      },
      opened(id) {
        history.replaceState(null, '', `#${encodeURIComponent(id)}`);
        store.set(lastBoardKey, id);
      },
      restart: reloadOnto,
      parts,
      help: { waiting: pageHelpWords.npmRunBoardServesYour, unreachable: pageHelpWords.couldNotReachTheBoard, reply: { lead: pageHelpWords.pasteItIntoChatOr, command: pageHelpWords.nodeAppsBoardBinReply } },
      person: asPerson,
    },
  };
}
