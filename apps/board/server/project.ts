// The open folder (open-folder task, api.md 109, 111; D-038 proposed): which project folder the
// server has open, with its engine (the board's ledger and agents, in its ledger folder: data-folder.ts), lock,
// chats and app host, and the only thing that switches it.
// A switch takes the new folder's lock first and changes nothing when it can't (`conflict`), or when
// the new ledger can't be made or read (its lock is let go). Then, in order: the old folder's chats
// and app processes stop (they work there), its live streams and held reads end (`closed`), its lock is let go,
// the new folder becomes the open one, and both are kept in the recent list (the old one only when
// it is under home). The lock is beaten while held and let go when the server closes or exits.
// With ledger folders (`ledgerFolders`, D-084) the open folder is a project and one of its ledgers: opening
// names the ledger (default the one open there last, else `main`), switching ledgers is opening the same
// folder with another, the lock is the ledger folder's, and a folder in the old layout is first moved into
// `main/` (ledger-move.ts). A new ledger is made only with `create` (ledgers.ts `makeLedger`).
import fs from 'node:fs';
import path from 'node:path';
import { MAIN_LEDGER, flagOn, ledgerFiles, ledgerFolder, ledgerNameProblem, ledgerOfFolder, projectOfLedger } from '#format';
import type { Agents } from './agents.ts';
import type { AppHost, AppHostOptions } from './apps.ts';
import { createAppHost } from './apps.ts';
import type { ChatAdapters, ChatOptions, Chats } from './chat-sessions.ts';
import { openChats } from './chat-sessions.ts';
import type { Engine } from './engine/index.ts';
import type { SendHook } from './engine/operations.ts';
import { createEngine } from './engine/index.ts';
import { displayName, hasBoard, isUnder, realPath } from './folders.ts';
import type { Ledger } from './ledger.ts';
import { ledgerPath, openLedger } from './ledger.ts';
import { moveIntoMain } from './ledger-move.ts';
import { chooseLedger, isOldLayout, listLedgers, makeLedger } from './ledgers.ts';
import type { Lock } from './lock.ts';
import { BEAT_MS, holderMessage, takeLock } from './lock.ts';
import { problem } from './problem.ts';
import { addRecent, lastLedger } from './recent.ts';
import * as serverFoldersWords from './words/server-folders.ts';
import * as writesWords from './words/writes.ts';

/** One open folder. */
export interface OpenFolder {
  /** The folder: its real path. */
  readonly dir: string;
  /** The open ledger's name, with ledger folders; undefined in the old layout (`ledgerOfFolder`). */
  readonly ledgerName: string | undefined;
  /** The board's engine on the folder's ledger folder (`ledgerFolder`). */
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
  /** The server's flags (every folder's app host and engine get them) and, for tests, shorter app limits. */
  apps?: Pick<AppHostOptions, 'flags' | 'limits'> | undefined;
}

export interface Project {
  readonly home: string;
  current(): OpenFolder;
  /** Open `dir` (a real folder under home, checked by the caller); `create` makes its Vision Board
   * (with ledger folders: the ledger named) when it has none. The ledger already open is returned unchanged. */
  open(dir: string, options?: OpenOptions): OpenFolder;
  /** Stop the chats, end the streams and let go of the lock (the server closing). */
  close(): void;
}

/** What `open` opens: with ledger folders, which ledger, and for a new one whether git sees it. */
export interface OpenOptions {
  create?: boolean | undefined;
  ledger?: string | undefined;
  keepOutOfGit?: boolean | undefined;
}

interface Held extends OpenFolder { readonly lock: Lock | undefined; close(): void }

/** The folder's parts, each made on first use (the data folder, the real path and the engine too,
 * the engine on the ledger already opened under its lock). A Send through the engine hands the folder's chat session
 * the person's answers, and is recorded once it has them (api.md 121, chat-sessions.ts `send`). */
function hold(ledger: Ledger, lock: Lock | undefined, o: ProjectOptions): Held {
  const data = () => path.dirname(ledger.file);
  let dir: string | undefined;
  let chats: Chats | undefined;
  let apps: AppHost | undefined;
  let engine: Engine | undefined;
  const abort = new AbortController();
  const getDir = () => (dir ??= realPath(projectOfLedger(data())));
  const getLedgerName = () => ledgerOfFolder(data());
  const getEngine = () => (engine ??= createEngine({ dir: data(), ledger, name: () => displayName(o.home, getDir()), ledgerName: getLedgerName(), onSend, flags: o.apps?.flags }));
  const getAgents = () => getEngine().agents();
  const getChats = () => (chats ??= openChats({
    ledger, resolve: getEngine().resolve, agents: getAgents, base: o.base, adapters: o.chat?.adapters, approvalTtlMs: o.chat?.approvalTtlMs, blocked: o.chat?.blocked,
    approvalHold: o.chat?.approvalHold, strictAccess: o.chat?.strictAccess, attachments: o.chat?.attachments, readAttachment: o.chat?.readAttachment, sendHead: o.chat?.sendHead,
  }));
  const onSend: SendHook = (board, record) => getChats().send(board, record);
  return {
    get dir() { return getDir(); },
    get engine() { return getEngine(); },
    get ledgerName() { return getLedgerName(); },
    ledger, lock, closed: abort.signal, agents: getAgents, chats: getChats,
    apps: () => (apps ??= createAppHost({ dir: getDir, ledgerName: getLedgerName(), ledger, flags: o.apps?.flags, limits: o.apps?.limits })),
    close() {
      chats?.close();
      apps?.close();
      abort.abort();
      lock?.release();
    },
  };
}

/** The lock of ledger folder `dir`, or a refusal naming who holds it. */
function lockOf(dir: string, port: number): Lock {
  const taken = takeLock(dir, port);
  if (!taken.ok) throw problem('conflict', holderMessage(taken.holder));
  return taken.lock;
}

/** Ledger `name` of project `dir`, made when `make` and locked: an old layout moved into `main/` first
 * (its lock taken by the move), the new ledger made next, and its own lock taken last. */
export function takeLedger(dir: string, name: string, make: { keepOutOfGit: boolean } | undefined, port: number, shown: string): Lock {
  const moved = isOldLayout(dir) ? moveIntoMain(dir, { port, name: shown }) : undefined;
  if (make) makeLedger(dir, name, make.keepOutOfGit);
  if (moved && name === MAIN_LEDGER) return moved;
  try { return lockOf(ledgerFolder(dir, name), port); } finally { moved?.release(); }
}

/** A ledger name the request may name: the schema has checked its characters; a data-folder name is refused here. */
function checkName(name: string | undefined): void {
  const why = name === undefined ? undefined : ledgerNameProblem(name);
  if (why) throw problem('invalid', writesWords.theRequestDoesNotFit, { errors: [{ pointer: '/ledger', detail: why }] });
}

export function openProject(o: ProjectOptions): Project {
  const { home } = o;
  const ledgers = flagOn('ledgerFolders', o.apps?.flags ?? {});
  let cur = hold(o.ledger, o.lock, o);
  const exit = () => cur.close();
  process.on('exit', exit);
  const beat = setInterval(() => cur.lock?.beat(), BEAT_MS);
  beat.unref();

  /** The ledger file, its lock already taken, opened; made when `create`. */
  function ledgerOf(dir: string, file: string, create: boolean, lock: Lock): Ledger {
    try {
      if (create) fs.writeFileSync(file, '', { flag: 'a' });
      fs.accessSync(file, fs.constants.R_OK | fs.constants.W_OK);
      return openLedger(file);
    } catch {
      lock.release();
      throw problem('conflict', serverFoldersWords.theBoardServerCouldNot(create ? serverFoldersWords.makeOr : '', displayName(home, dir)));
    }
  }

  /** Make `ledger` the open one: the old folder's chats, streams and lock end, both are kept as recent. */
  function switchTo(ledger: Ledger, lock: Lock, prev: Held = cur, closed = false): OpenFolder {
    if (!closed) prev.close();
    cur = hold(ledger, lock, o);
    try {
      if (isUnder(home, prev.dir)) addRecent(home, prev.dir, prev.ledgerName);
      addRecent(home, cur.dir, cur.ledgerName);
    } catch (err) {
      console.error(`The recent folders could not be saved: ${err instanceof Error ? err.message : String(err)}`);
    }
    return cur;
  }

  const noBoard = (dir: string) => problem('not-found', serverFoldersWords.noVisionBoardHere(displayName(home, dir), ledgerFiles(ledgerFolder('')).ledger));

  /** The old layout: one ledger, `.visionboard/ledger.jsonl` (ledger folders off). */
  function openOne(dir: string, create: boolean): OpenFolder {
    if (dir === cur.dir) {
      if (create && !fs.existsSync(cur.ledger.file)) fs.writeFileSync(cur.ledger.file, '', { flag: 'a' });
      return cur;
    }
    if (!create && !hasBoard(dir)) throw noBoard(dir);
    const lock = lockOf(ledgerFolder(dir), o.port());
    return switchTo(ledgerOf(dir, ledgerPath(dir), create, lock), lock);
  }

  /** Ledger folders: ledger `asked` of `dir` (default the one open there last, else `main`). */
  function openLedgerOf(dir: string, { create = false, ledger: asked, keepOutOfGit = false }: OpenOptions): OpenFolder {
    checkName(asked);
    const old = isOldLayout(dir);
    const name = chooseLedger(dir, asked, lastLedger(home, dir));
    if (dir === cur.dir && name === cur.ledgerName) return cur;
    const there = old ? name === MAIN_LEDGER : listLedgers(dir).includes(name);
    if (!there && !create) throw old || hasBoard(dir) ? problem('not-found', serverFoldersWords.noSuchLedger(displayName(home, dir), name)) : noBoard(dir);
    // The open folder in the old layout: let it go first, so the move can take its lock; held again if the move can't.
    const prev = cur;
    const aside = old && dir === prev.dir;
    if (aside) prev.close();
    let lock: Lock;
    try { lock = takeLedger(dir, name, there ? undefined : { keepOutOfGit }, o.port(), displayName(home, dir)); } catch (err) {
      if (aside) cur = hold(prev.ledger, prev.lock && relock(ledgerFolder(dir)), o);
      throw err;
    }
    return switchTo(ledgerOf(dir, ledgerFiles(ledgerFolder(dir, name)).ledger, false, lock), lock, prev, aside);
  }

  /** The old folder's lock again, after a move that could not run; none when another server took it meanwhile. */
  function relock(dir: string): Lock | undefined {
    const taken = takeLock(dir, o.port());
    return taken.ok ? taken.lock : undefined;
  }

  return {
    home,
    current: () => cur,
    open: (dir, options = {}) => (ledgers ? openLedgerOf(dir, options) : openOne(dir, options.create === true)),
    close() {
      clearInterval(beat);
      process.off('exit', exit);
      cur.close();
    },
  };
}
