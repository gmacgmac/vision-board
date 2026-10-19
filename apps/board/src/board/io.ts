// The page's side of packages/client (rule 7, D-029): the client is the only code that calls the
// server; this wraps it in the shapes the page draws from. The page reads the ledger itself
// (`read_ledger`, live.ts) and works each board out from it (board-data.ts), so it never fetches
// a whole board to show one change (N12_FE_01). A refused call comes back as an ApiError carrying
// the problem's pointer errors (api.md 38).
import type { ActionId, ActSize, AppInfo, AppStateValue, AppToolResult, LedgerEvent, LedgerLine, Mode, NoteKind, View, Widths } from '../../../../packages/format/src/index.ts';
import { BOARD_MARKS, fromLine, IMAGE_ROUTE, IMAGE_WORDS } from '../../../../packages/format/src/index.ts';
import type { BoardAccess, BoardState } from '../../../../packages/actions/src/index.ts';
import { ApiProblem, createClient } from '../../../../packages/client/src/index.ts';
import type { ApprovalAnswer, ChatEvent } from '../../../../packages/chat/src/index.ts';

/** One board as the page draws it. `versions`: node id -> latest `ver`, sent back with an act;
 * `head`: the ledger's latest `seq`; `access`: open grant requests and each region's holders. */
export interface BoardData { head: number; view: View; state: BoardState; versions: Record<string, number>; access: BoardAccess }

/** What the page sends for one person action; the server stamps the rest. */
export interface ActFields {
  action: ActionId;
  n?: number;
  ver?: number;
  text?: string;
  x?: number;
  y?: number;
  region?: string;
  mode?: Mode;
  /** `widths`: the person's card widths for the container in `region` (field report batch 3 ruling 5). */
  widths?: Widths;
  size?: ActSize;
  /** `grant` and `deny`: the `seq` of the grant request answered. */
  request?: number;
  /** `revoke`: the agent losing access to `region`. */
  holder?: string;
  /** `note-edit` and `note-remove`: the `seq` of the act that made the note; `kind`: what an
   * edited note now asks for. */
  note?: number;
  kind?: NoteKind;
  /** A note on a group of cards (`comment`, 3_FE_02): the items it is on, in place of `n`. */
  nodes?: number[];
  /** An agent's proposal answered (api.md 93): accepted with its own action, or `reject`. */
  proposal?: number;
  /** `app-allow` and `app-revoke` (api.md 150): the app, and the version of its code allowed. */
  app?: string;
  hash?: string;
}

export class ApiError extends Error {
  /** HTTP status, or 0 when the server could not be reached. */
  status: number;
  problems: string[];
  constructor(message: string, status = 0, problems: string[] = []) {
    super(message);
    this.status = status;
    this.problems = problems;
  }
}

const client = createClient();

/** One call through the client, with every failure as an ApiError the page can show. */
async function call<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (err instanceof ApiProblem) throw new ApiError(err.detail, err.status, err.errors.map((e) => e.detail));
    throw new ApiError('The board server is not reachable. Is it running?');
  }
}

/** The most lines one `read_ledger` call returns (api.md 31). */
const PAGE = 500;

/** One page of ledger lines after `after`, oldest first, as code reads them (`fromLine`: a card is
 * its identity, `id`, and an old `list` mode reads `column`; api.md 125, 129); `more` when there
 * are more. The one place the page turns a line into an event (live.ts, versions.ts read here). */
export async function readLedger(after: number): Promise<{ events: LedgerEvent[]; head: number; more?: true }> {
  const page = await call(() => client.call<{ events: LedgerLine[]; head: number; more?: true }>('read_ledger', { after, limit: PAGE }));
  return { ...page, events: page.events.map(fromLine) };
}

/** sessionStorage flag: the page has already reloaded once for a fresh person cookie. */
const RELOADED = 'vb-person-reload';

/** A person route (`act`) answered `forbidden`: after a server restart the page's cookie is
 * stale, so reload once to get the new one (api.md 20). A second refusal is shown as usual. */
async function asPerson<T>(run: () => Promise<T>): Promise<T> {
  try {
    const out = await run();
    sessionStorage.removeItem(RELOADED);
    return out;
  } catch (err) {
    if (err instanceof ApiProblem && err.code === 'forbidden' && !sessionStorage.getItem(RELOADED)) {
      sessionStorage.setItem(RELOADED, '1');
      location.reload();
    }
    throw err;
  }
}

/** Acts the schema asks to name their board (api.md 16, 135, 138): it is always the board they are sent
 * to. Every board mark does (archive, restore, lock, unlock). */
const NAMES_BOARD: ReadonlySet<ActionId> = new Set(['mode', 'widths', 'send', 'revoke', ...BOARD_MARKS]);
/** A note or a place on a whole container names `board` + `region` in place of `n` (api.md 71). */
const CONTAINER_ACTS: ReadonlySet<ActionId> = new Set(['comment', 'note-edit', 'note-remove', 'pin', 'unpin']);
const namesBoard = (f: ActFields) =>
  NAMES_BOARD.has(f.action) || (CONTAINER_ACTS.has(f.action) && f.region !== undefined && f.n === undefined);

/** One person action; the stored line, its cards by board number (live.ts `own` reads it back). */
export const sendAct = (id: string, fields: ActFields) =>
  call(() => asPerson(() => client.call<LedgerLine>('act', {
    board: id, body: { type: 'act', ...fields, ...(namesBoard(fields) && { board: id }) },
  })));

/** What the person gives a board: `put_board`'s body (api.md 90). */
export interface BoardFields { title: string; summary?: string }

/** Create board `id`, or rename it when it exists (api.md 90); the stored `board` line. */
export const putBoard = (id: string, fields: BoardFields) =>
  call(() => asPerson(() => client.call<LedgerLine>('put_board', { board: id, body: fields })));

/** What the person removes from a board: `retire_cards`' body (N24, api.md 141), cards by number
 * or a whole container. */
export type RetireFields = { cards: number[] } | { region: string };

/** Remove cards, or a container with its cards, from board `id`; the stored `retire` line, its cards
 * by board number (live.ts `own` reads it back). */
export const retireCards = (id: string, fields: RetireFields) =>
  call(() => asPerson(() => client.call<LedgerLine>('retire_cards', { board: id, body: fields })));

/** The client for a call made as the page goes away: its request outlives the page (keepalive). */
const leavingClient = createClient({ fetch: (url, init) => globalThis.fetch(url, { ...init, keepalive: true }) });

/** The person has looked at `board` up to its line `head` (a board seen, api.md 87). `leaving`: the
 * page is going away, so the request outlives it and nothing waits for the answer. */
export function markBoardSeen(board: string, head: number, leaving = false): Promise<unknown> {
  const input = { board, body: { board, head } };
  if (leaving) return leavingClient.call('mark_seen', input).catch(() => undefined);
  return call(() => asPerson(() => client.call('mark_seen', input)));
}

/** The person has seen version `ver` of card `n` (its board number, D-018): a card seen; the stored line. */
export const markCardSeen = (board: string, n: number, ver: number) =>
  call(() => asPerson(() => client.call<LedgerLine>('mark_seen', { board, body: { n, ver } })));

/** What the project's live stream reports (`watch_project`, api.md 78-80). */
export interface ProjectEvents {
  /** The project ledger gained line `seq` (the agent drew, or another tab acted). */
  change(seq: number): void;
  /** The built page's id; sent only by a server in watch mode, on connect and on every rebuild. */
  build(id: string): void;
  /** The stream (re)connected. */
  open(): void;
}

/** Follow the whole project, boards or none; a stop function. */
export function watchProject(on: ProjectEvents): () => void {
  return client.watch('watch_project', {}, ['change', 'build'], (d, event) => {
    const data = d as { seq?: unknown; build?: unknown };
    if (event === 'change') on.change(Number(data.seq));
    else if (typeof data.build === 'string') on.build(data.build);
  }, () => on.open());
}

// ---- the chat (chat-panel FE_02, api.md 98-107) ---------------------------------------------

/** One chat session on a board (`start_chat`, `list_chats`), or in the folder on no board yet
 * (`start_folder_chat`, `list_folder_chats`, api.md 122): `board` left out until its agent creates one. */
export interface ChatSessionInfo { session: string; board?: string; agent: 'claude' | 'kiro'; model?: string; created: string; agentId: string }

/** What a message carries: the words, the notes by `seq` and the cards by number. */
export interface ChatMessageBody { text?: string; notes?: number[]; cards?: number[] }

const person = <T>(run: () => Promise<T>) => call(() => asPerson(run));

/** The board's sessions, newest first; the first is the one in use. */
export const listChats = (board: string) =>
  person(() => client.call<{ sessions: ChatSessionInfo[] }>('list_chats', { board }));

/** A new session on `board`; starting one grants the board to its agent (api.md 106). */
export const startChat = (board: string, agent: ChatSessionInfo['agent'], model?: string) =>
  person(() => client.call<ChatSessionInfo>('start_chat', { board, body: { agent, ...(model && { model }) } }));

/** The folder's sessions on no board, newest first; a session leaves the list once its agent creates a board. */
export const listFolderChats = () =>
  person(() => client.call<{ sessions: ChatSessionInfo[] }>('list_folder_chats'));

/** A new session in the folder, on no board; it grants nothing (api.md 122). */
export const startFolderChat = (agent: ChatSessionInfo['agent'], model?: string) =>
  person(() => client.call<ChatSessionInfo>('start_folder_chat', { body: { agent, ...(model && { model }) } }));

/** The person's message; the answer is its `message_in` event. `conflict` while the agent answers. */
export const sendChat = (session: string, body: ChatMessageBody) =>
  person(() => client.call<ChatEvent>('send_chat', { session, body }));

export const stopChat = (session: string) => person(() => client.call<{ stopped: boolean }>('stop_chat', { session }));

export const answerApproval = (session: string, approval: string, answer: ApprovalAnswer) =>
  person(() => client.call('answer_approval', { session, approval, body: answer }));

/** How long the chat stream waits before it opens again after it dropped. */
const CHAT_RETRY_MS = 2000;

/** Follow a session's events (`watch_chat`, like `watch_project`): every event after `after()`, then
 * each new one. `first` is true for the first event after each (re)open. When the stream drops it
 * opens again from the latest event held, after `check()` (a person call, so a stale cookie after a
 * server restart reloads the page, `asPerson`). A stop function. */
export function watchChat(session: string, after: () => number, on: (e: ChatEvent, first: boolean) => void, check: () => Promise<unknown>): () => void {
  let source: EventSource | null = null;
  let timer = 0;
  let stopped = false;
  const retry = () => {
    timer = window.setTimeout(() => { check().then(open, () => { if (!stopped) retry(); }); }, CHAT_RETRY_MS);
  };
  function open() {
    if (stopped) return;
    let first = true;
    const es = new EventSource(client.url('watch_chat', { session, after: after() }));
    source = es;
    es.addEventListener('chat', (m) => {
      let e: ChatEvent;
      try { e = JSON.parse((m as MessageEvent<string>).data) as ChatEvent; } catch { return; /* not JSON: ignored */ }
      on(e, first);
      first = false;
    });
    es.addEventListener('error', () => {
      es.close();
      if (!stopped && source === es) retry();
    });
  }
  open();
  return () => {
    stopped = true;
    clearTimeout(timer);
    source?.close();
  };
}

// ---- the open folder (open-folder task, api.md 109-113) ---------------------------------------

/** A folder as the server shows it: the open one (`get_project`), or the one a picker lists. */
export interface FolderInfo { path: string; name: string; found: boolean; boards?: number }

/** One folder in a listing: its name (its `~/...` name in the recent list), path and whether it has a board. */
export interface FolderEntry { name: string; path: string; hasBoard: boolean }

/** `list_folders`: a folder, the folders in it and the recent ones; on home, the cloud storage places. */
export interface FolderList extends FolderInfo { parent?: string; folders: FolderEntry[]; recent: FolderEntry[]; places?: FolderEntry[]; more?: true }

/** The folder the server has open. */
export const getProject = () => person(() => client.call<FolderInfo>('get_project'));

/** One folder under home (home itself when `path` is left out). */
export const listFolders = (path?: string) =>
  person(() => client.call<FolderList>('list_folders', path === undefined ? {} : { path }));

/** Open `path` in place of the open folder; `create` makes its Vision Board. */
export const openProject = (path: string, create = false) =>
  person(() => client.call<FolderInfo>('open_project', { body: { path, ...(create && { create }) } }));

// ---- app cards (D-047, api.md 152-153, 157) --------------------------------------------------------

/** Every app in the open folder and every app a card names, each in its state now (`list_apps`). */
export const listApps = () => person(() => client.call<{ apps: AppInfo[] }>('list_apps'));

/** How a call for a panel refuses: the API problem's code and its words (the frame's `AppCallError`). */
export interface AppCallRefusal { problem: string; detail?: string }

/** A call for a card's panel, as the person; a refusal rejects with an `AppCallRefusal`, which the
 * frame turns into the panel's JSON-RPC error. */
const forPanel = <T>(run: () => Promise<T>): Promise<T> => asPerson(run).catch((err: unknown) => {
  throw (err instanceof ApiProblem ? { problem: err.code, detail: err.detail }
    : { problem: 'app-failed', detail: 'The board server is not reachable. Is it running?' }) satisfies AppCallRefusal;
});

/** Run tool `tool` of app `app` for its panel (`call_app_tool`). */
export const callAppTool = (app: string, tool: string, args: Record<string, unknown>) =>
  forPanel(() => client.call<AppToolResult>('call_app_tool', { app, body: { tool, arguments: args } }));

/** The value app card `n`'s panel last saved on `board`, or undefined (`get_panel_state`, apps.md
 * § Saving the panel's state). */
export const panelState = async (board: string, n: number): Promise<AppStateValue | undefined> =>
  (await person(() => client.call<{ state?: AppStateValue }>('get_panel_state', { board, n }))).state;

/** Keep `state` as app card `n`'s panel state on `board` (`put_panel_state`); over the limit `too-large`. */
export const savePanelState = (board: string, n: number, state: AppStateValue) =>
  forPanel(() => client.call<{ bytes: number }>('put_panel_state', { board, n, body: { state } }));

// ---- images in cards (D-048, images.md § Updates) ---------------------------------------------------

/** What the image route says of `path` now: `same` when `etag` is still its version (304), else its
 * version's ETag, or why it is not shown (the problem's words, `IMAGE_WORDS`). A HEAD, so no picture
 * comes back. The route is not an API operation, so this is the page's one request for it by code; the
 * browser loads the picture itself (`<img src>`). Throws when the board can't be reached. */
export async function imageVersion(path: string, etag?: string): Promise<{ same?: true; etag?: string; problem?: string }> {
  const url = IMAGE_ROUTE + path;
  const head = await fetch(url, { method: 'HEAD', cache: 'no-store', ...(etag && { headers: { 'If-None-Match': etag } }) });
  await head.arrayBuffer(); // empty; read so the request ends as finished, not aborted
  if (head.status === 304) return { same: true };
  if (head.ok) return { etag: head.headers.get('ETag') ?? '' };
  const got = await fetch(url, { cache: 'no-store' }).then((r) => r.json() as Promise<{ detail?: unknown }>).catch(() => ({ detail: undefined }));
  return { problem: typeof got.detail === 'string' ? got.detail : IMAGE_WORDS.missing };
}
