// The open folder (open-folder task, api.md 109, 111; D-038 proposed): which project folder the
// server has open, with its engine (the board's ledger and agents, in `<folder>/.visionboard`), lock,
// chats and app host, and the only thing that switches it.
// A switch takes the new folder's lock first and changes nothing when it can't (`conflict`), or when
// the new ledger can't be made or read (its lock is let go). Then, in order: the old folder's chats
// and app processes stop (they work there), its live streams and held reads end (`closed`), its lock is let go,
// the new folder becomes the open one, and both are kept in the recent list (the old one only when
// it is under home). The lock is beaten while held and let go when the server closes or exits.
import fs from 'node:fs';
import path from 'node:path';
import type { Agents } from './agents.ts';
import type { AppHost, AppHostOptions } from './apps.ts';
import { createAppHost } from './apps.ts';
import type { ChatAdapters, ChatOptions, Chats } from './chat-sessions.ts';
import { openChats } from './chat-sessions.ts';
import type { Engine } from './engine/index.ts';
import { createEngine } from './engine/index.ts';
import { displayName, hasBoard, isUnder, realPath } from './folders.ts';
import type { Ledger } from './ledger.ts';
import { DATA_DIR, ledgerPath, openLedger } from './ledger.ts';
import type { Lock } from './lock.ts';
import { BEAT_MS, holderMessage, takeLock } from './lock.ts';
import { problem } from './problem.ts';
import { addRecent } from './recent.ts';
import * as serverFoldersWords from './words/server-folders.ts';

/** One open folder. */
export interface OpenFolder {
  /** The folder: its real path. */
  readonly dir: string;
  /** The board's engine on the folder's data folder (`.visionboard`). */
  readonly engine: Engine;
  readonly ledger: Ledger;
  agents(): Agents;
  chats(): Chats;
  /** Its apps (D-047): made on first use; their processes stop when the folder closes. */
  apps(): AppHost;
  /** Aborted when the folder is closed (a switch, the server closing): its streams and held reads end. */
  readonly closed: AbortSignal;
}

export interface ProjectOptions {
  /** The first folder's ledger. */
  ledger: Ledger;
  /** Its lock, when the caller took one (server.ts); tests take none. */
  lock?: Lock | undefined;
  /** The person's home folder, a real path. */
  home: string;
  /** The port the server listens on (for a new lock) and its own address (for the chats' MCP server). */
  port: () => number;
  base: () => string;
  chat?: Pick<ChatOptions, 'approvalTtlMs' | 'blocked' | 'approvalHold' | 'strictAccess' | 'attachments' | 'readAttachment' | 'sendHead'> & { adapters?: ChatAdapters | undefined } | undefined;
  /** The server's flags and, for tests, shorter app limits (every folder's app host gets them). */
  apps?: Pick<AppHostOptions, 'flags' | 'limits'> | undefined;
}

export interface Project {
  readonly home: string;
  current(): OpenFolder;
  /** Open `dir` (a real folder under home, checked by the caller); `create` makes its Vision Board
   * when it has none. The folder already open is returned unchanged. */
  open(dir: string, create: boolean): OpenFolder;
  /** Stop the chats, end the streams and let go of the lock (the server closing). */
  close(): void;
}

interface Held extends OpenFolder { readonly lock: Lock | undefined; close(): void }

/** The folder's parts, each made on first use (the data folder, the real path and the engine too,
 * the engine on the ledger already opened under its lock). A Send through the engine hands the folder's chat session
 * the person's answers (api.md 121); a session that can't be loaded leaves the Send as it was. */
function hold(ledger: Ledger, lock: Lock | undefined, o: ProjectOptions): Held {
  const data = () => path.dirname(ledger.file);
  let dir: string | undefined;
  let chats: Chats | undefined;
  let apps: AppHost | undefined;
  let engine: Engine | undefined;
  const abort = new AbortController();
  const getDir = () => (dir ??= realPath(path.dirname(data())));
  const getEngine = () => (engine ??= createEngine({ dir: data(), ledger, name: () => displayName(o.home, getDir()), onSend }));
  const getAgents = () => getEngine().agents();
  const getChats = () => (chats ??= openChats({
    ledger, resolve: getEngine().resolve, agents: getAgents, base: o.base, adapters: o.chat?.adapters, approvalTtlMs: o.chat?.approvalTtlMs, blocked: o.chat?.blocked,
    approvalHold: o.chat?.approvalHold, strictAccess: o.chat?.strictAccess, attachments: o.chat?.attachments, readAttachment: o.chat?.readAttachment, sendHead: o.chat?.sendHead,
  }));
  const onSend = (board: string, seq: number) => {
    getChats().round(board, seq).catch((err) => console.error(`chat: the Send's answers were not handed over: ${err instanceof Error ? err.message : String(err)}`));
  };
  return {
    get dir() { return getDir(); },
    get engine() { return getEngine(); },
    ledger, lock, closed: abort.signal, agents: getAgents, chats: getChats,
    apps: () => (apps ??= createAppHost({ dir: getDir, ledger, flags: o.apps?.flags, limits: o.apps?.limits })),
    close() {
      chats?.close();
      apps?.close();
      abort.abort();
      lock?.release();
    },
  };
}

export function openProject(o: ProjectOptions): Project {
  const { home } = o;
  let cur = hold(o.ledger, o.lock, o);
  const exit = () => cur.close();
  process.on('exit', exit);
  const beat = setInterval(() => cur.lock?.beat(), BEAT_MS);
  beat.unref();

  /** The new folder's ledger, its lock already taken: made when `create`, then opened. */
  function ledgerOf(dir: string, create: boolean, lock: Lock): Ledger {
    const file = ledgerPath(dir);
    try {
      if (create) fs.writeFileSync(file, '', { flag: 'a' });
      fs.accessSync(file, fs.constants.R_OK | fs.constants.W_OK);
      return openLedger(file);
    } catch {
      lock.release();
      throw problem('conflict', serverFoldersWords.theBoardServerCouldNot(create ? serverFoldersWords.makeOr : '', displayName(home, dir)));
    }
  }

  return {
    home,
    current: () => cur,
    open(dir, create) {
      if (dir === cur.dir) {
        if (create && !fs.existsSync(cur.ledger.file)) fs.writeFileSync(cur.ledger.file, '', { flag: 'a' });
        return cur;
      }
      if (!create && !hasBoard(dir)) {
        throw problem('not-found', `No Vision Board here: ${displayName(home, dir)} has no .visionboard/ledger.jsonl. Send create: true to make one, or choose another folder.`);
      }
      const taken = takeLock(path.join(dir, DATA_DIR), o.port());
      if (!taken.ok) throw problem('conflict', holderMessage(taken.holder));
      const ledger = ledgerOf(dir, create, taken.lock);
      const old = cur;
      old.close();
      cur = hold(ledger, taken.lock, o);
      try {
        if (isUnder(home, old.dir)) addRecent(home, old.dir);
        addRecent(home, cur.dir);
      } catch (err) {
        console.error(`The recent folders could not be saved: ${err instanceof Error ? err.message : String(err)}`);
      }
      return cur;
    },
    close() {
      clearInterval(beat);
      process.off('exit', exit);
      cur.close();
    },
  };
}
