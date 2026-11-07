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
// `main/` (ledger-move.ts `takeLedger`). A new ledger is made only with `create` (ledgers.ts `makeLedger`).
// With read-only opening (`readOnlyStart`, D-085; off with `edit`, the server's `--edit`) opening or switching takes no
// lock and writes nothing (an old layout is not moved); `create` takes the new ledger's lock only while making it.
// `edit` takes the open ledger's lock then (refused, naming the holder, while another server holds it live), moving an
// old layout first; `stopEditing` lets it go. editing.ts holds the state the ledger, engine and agents ask.
// A read may name another ledger of the open folder (`ledger`, D-084 8): ledgers.ts `otherLedgers` opens it read-only on
// its first read (no lock, gated, nothing written), the engine reads it again on every read, and it is let go with the
// folder. An open ledger another server moved between layouts (into `main/`, or back) is followed there, read-only.
import fs from 'node:fs';
import path from 'node:path';
import { MAIN_LEDGER, flagOn, ledgerFiles, ledgerFolder, ledgerOfFolder, projectOfLedger, withoutHostFlags } from '#format';
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
import { holdLock, takeLedger } from './ledger-move.ts';
import { checkLedgerName, chooseLedger, isOldLayout, listLedgers, movedLedger, otherLedgers, refuseLedgerFolders } from './ledgers.ts';
import type { Editing } from './editing.ts';
import { createEditing } from './editing.ts';
import type { Lock, LockEnv } from './lock.ts';
import { BEAT_MS, lockHolder, takeLock } from './lock.ts';
import { problem } from './problem.ts';
import { addRecent, lastLedger } from './recent.ts';
import * as serverFoldersWords from './words/server-folders.ts';

/** One open folder. */
export interface OpenFolder {
  /** The folder: its real path. */
  readonly dir: string;
  /** The open ledger's name, with ledger folders; undefined in the old layout (`ledgerOfFolder`). */
  readonly ledgerName: string | undefined;
  /** The board's engine on the folder's ledger folder (`ledgerFolder`). */
  readonly engine: Engine;
  readonly ledger: Ledger;
  /** Whether it may be written now, and who is writing it (editing.ts). */
  readonly editing: Editing;
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
  /** Open every ledger for writing under its lock, as before read-only opening (`--edit`, `VB_EDIT=1`; tests). */
  edit?: boolean | undefined;
  /** What a new lock reads from the world (tests: another computer's live lock). */
  lockEnv?: LockEnv | undefined;
}

export interface Project {
  readonly home: string;
  current(): OpenFolder;
  /** Open `dir` (a real folder under home, checked by the caller); `create` makes its Vision Board
   * (with ledger folders: the ledger named) when it has none. The ledger already open is returned unchanged. */
  open(dir: string, options?: OpenOptions): OpenFolder;
  /** Edit the open ledger: its lock taken now, or `conflict` naming the server that holds it (D-085 2). */
  edit(): OpenFolder;
  /** Stop editing: the lock let go, the ledger read-only (D-085 2). */
  stopEditing(): OpenFolder;
  /** Stop the chats, end the streams and let go of the lock (the server closing). */
  close(): void;
}

/** What `open` opens: with ledger folders, which ledger, and for a new one whether git sees it. */
export interface OpenOptions {
  create?: boolean | undefined;
  ledger?: string | undefined;
  keepOutOfGit?: boolean | undefined;
}

interface Held extends OpenFolder { close(): void }

/** The folder's parts, each made on first use (the data folder, the real path and the engine too,
 * the engine on the ledger already opened under its lock). A Send through the engine hands the folder's chat session
 * the person's answers, and is recorded once it has them (api.md 121, chat-sessions.ts `send`). */
function hold(ledger: Ledger, lock: Lock | undefined, o: ProjectOptions): Held {
  const guard = flagOn('readOnlyStart', o.apps?.flags ?? {});
  const editing = createEditing(lock, !guard || o.edit === true || lock !== undefined, guard, guard && o.edit !== true, o.lockEnv);
  ledger.gate(editing.readOnly);
  const data = () => path.dirname(ledger.file);
  let dir: string | undefined;
  let chats: Chats | undefined;
  let apps: AppHost | undefined;
  let engine: Engine | undefined;
  const abort = new AbortController();
  const getDir = () => (dir ??= realPath(projectOfLedger(data())));
  const getLedgerName = () => ledgerOfFolder(data());
  const others = flagOn('ledgerFolders', o.apps?.flags ?? {}) ? otherLedgers(getDir, getLedgerName, () => displayName(o.home, getDir())) : undefined;
  const getEngine = () => (engine ??= createEngine({
    dir: data(), ledger, name: () => displayName(o.home, getDir()), ledgerName: getLedgerName(), onSend, flags: withoutHostFlags(o.apps?.flags), readOnly: editing.readOnly, otherLedger: others?.get,
  }));
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
    ledger, editing, closed: abort.signal, agents: getAgents, chats: getChats,
    apps: () => (apps ??= createAppHost({ dir: getDir, ledgerName: getLedgerName(), ledger, flags: o.apps?.flags, limits: o.apps?.limits })),
    close() {
      chats?.close();
      apps?.close();
      others?.close();
      abort.abort();
      editing.drop();
    },
  };
}

export function openProject(o: ProjectOptions): Project {
  const { home } = o;
  const ledgers = flagOn('ledgerFolders', o.apps?.flags ?? {});
  /** Read-only opening (D-085 1): no lock on open or switch; Edit takes it. */
  const readOnlyStart = flagOn('readOnlyStart', o.apps?.flags ?? {}) && o.edit !== true;
  let cur = hold(o.ledger, o.lock, o);
  const exit = () => cur.close();
  process.on('exit', exit);
  const beat = setInterval(() => {
    cur.editing.lock?.beat();
    cur.editing.look(path.dirname(cur.ledger.file)); // the lock changed hands elsewhere: the streams are told (F6)
  }, BEAT_MS);
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

  /** A ledger file opened read-only: no lock, nothing written; it need only be readable (a read-only share). */
  function readOnlyLedger(dir: string, file: string): Ledger {
    try {
      if (fs.existsSync(file)) fs.accessSync(file, fs.constants.R_OK);
      return openLedger(file);
    } catch {
      throw problem('conflict', serverFoldersWords.theBoardServerCouldNot('', displayName(home, dir)));
    }
  }

  /** `ledger`, opened under `lock`: with read-only opening the lock (taken only to make it) is let go first. */
  const opened = (ledger: Ledger, lock: Lock): [Ledger, Lock | undefined] => {
    if (!readOnlyStart) return [ledger, lock];
    lock.release();
    return [ledger, undefined];
  };

  /** Make `ledger` the open one: the old folder's chats, streams and lock end, both are kept as recent. */
  function switchTo([ledger, lock]: [Ledger, Lock | undefined], prev: Held = cur, closed = false): OpenFolder {
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
      if (create && !cur.editing.readOnly() && !fs.existsSync(cur.ledger.file)) fs.writeFileSync(cur.ledger.file, '', { flag: 'a' });
      return cur;
    }
    refuseLedgerFolders(dir, displayName(home, dir));
    const found = hasBoard(dir);
    if (!create && !found) throw noBoard(dir);
    if (readOnlyStart && found) return switchTo([readOnlyLedger(dir, ledgerPath(dir)), undefined]);
    const lock = holdLock(ledgerFolder(dir), { port: o.port() });
    return switchTo(opened(ledgerOf(dir, ledgerPath(dir), create, lock), lock));
  }

  /** Ledger folders: ledger `asked` of `dir` (default the one open there last, else `main`). */
  function openLedgerOf(dir: string, { create = false, ledger: asked, keepOutOfGit = false }: OpenOptions): OpenFolder {
    checkLedgerName(asked);
    const old = isOldLayout(dir);
    const name = chooseLedger(dir, asked, lastLedger(home, dir));
    // An old layout opened read-only is its one ledger, not moved: `main` names it.
    if (dir === cur.dir && (name === cur.ledgerName || (old && name === MAIN_LEDGER && cur.ledgerName === undefined))) return cur;
    const there = old ? name === MAIN_LEDGER : listLedgers(dir).includes(name);
    if (!there && !create) throw old || hasBoard(dir) ? problem('not-found', serverFoldersWords.noSuchLedger(displayName(home, dir), name)) : noBoard(dir);
    if (readOnlyStart && there) return switchTo([readOnlyLedger(dir, old ? ledgerPath(dir) : ledgerFiles(ledgerFolder(dir, name)).ledger), undefined]);
    return lockLedger(dir, name, there ? undefined : { keepOutOfGit });
  }

  /** Ledger `name` of `dir` taken under its lock (made when `make`, an old layout moved first) and opened. */
  function lockLedger(dir: string, name: string, make?: { keepOutOfGit: boolean }, env?: LockEnv): OpenFolder {
    // The open folder in the old layout: let it go first, so the move can take its lock; held again if the move can't.
    const prev = cur;
    const aside = isOldLayout(dir) && dir === prev.dir;
    const had = prev.editing.lock !== undefined;
    if (aside) prev.close();
    let lock: Lock;
    try { lock = takeLedger(dir, name, make, o.port(), displayName(home, dir), env); } catch (err) {
      if (aside) cur = hold(prev.ledger, had ? relock(ledgerFolder(dir)) : undefined, o);
      throw err;
    }
    const ledger = ledgerOf(dir, ledgerFiles(ledgerFolder(dir, name)).ledger, false, lock);
    return switchTo(make ? opened(ledger, lock) : [ledger, lock], prev, aside);
  }

  /** The old folder's lock again, after a move that could not run; none when another server took it meanwhile. */
  function relock(dir: string): Lock | undefined {
    const taken = takeLock(dir, o.port());
    return taken.ok ? taken.lock : undefined;
  }

  /** The open ledger, read-only, moved between layouts by another server since it was opened (into `main/` by its Edit,
   * or back by `ledgers:undo`): opened again where it is now, read-only, its streams ended as on a switch (FIX_01 F1).
   * Under `--edit` this server holds its lock, so nothing moves it; its ledger refuses a line to a file that has gone. */
  function followMove(): OpenFolder {
    const file = ledgers && readOnlyStart ? movedLedger(cur.dir, cur.ledgerName, cur.ledger.file) : undefined;
    return file === undefined ? cur : switchTo([readOnlyLedger(cur.dir, file), undefined]);
  }

  /** Edit (D-085 2): the open ledger's lock taken now, where the ledger is now; a folder still in the old layout is
   * moved into `main/` first, so it opens again there (its streams end, as on a switch). */
  function edit(): OpenFolder {
    if (!followMove().editing.readOnly()) return cur;
    const old = ledgers && isOldLayout(cur.dir);
    const holder = lockHolder(old ? ledgerFolder(cur.dir) : path.dirname(cur.ledger.file), o.lockEnv);
    if (holder) throw problem('conflict', serverFoldersWords.editRefused(holder.host, holder.pid, holder.port, holder.started));
    try {
      if (old) return lockLedger(cur.dir, MAIN_LEDGER, undefined, o.lockEnv);
      cur.editing.take(holdLock(path.dirname(cur.ledger.file), { port: o.port(), env: o.lockEnv }));
    } catch (err) { // a folder this computer can't write (a read-only share): said in words, still read-only (F8)
      if (!['EACCES', 'EPERM', 'EROFS'].includes((err as NodeJS.ErrnoException).code ?? '')) throw err;
      throw problem('conflict', serverFoldersWords.cannotBeWritten(displayName(home, cur.dir)));
    }
    return cur;
  }

  return {
    home,
    current: followMove,
    open: (dir, options = {}) => (followMove(), ledgers ? openLedgerOf(dir, options) : openOne(dir, options.create === true)),
    edit,
    stopEditing() {
      cur.editing.drop();
      return cur;
    },
    close() {
      clearInterval(beat);
      process.off('exit', exit);
      cur.close();
    },
  };
}
