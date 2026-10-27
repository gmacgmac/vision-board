// The standalone page's own calls (rule 7, D-029), beside the board's (board/io.ts): the page is the
// board's host, so it holds the origin (`fetch` on its own), the person's cookie, the project's change
// stream, the chat and the open folder. The board reaches the server only through the transport the
// page gives it (`pageTransport`, page-host.ts); a host such as nclite gives its own, and its change
// events in place of this stream (`EventSource` needs an origin).
import type { OperationInput, OperationOutput } from '#format';
import type { Transport } from '#client';
import { ApiProblem, createClient, httpTransport } from '#client';
import type { ApprovalAnswer, ChatEvent } from '#chat';
import { asApiError, createIo } from '../board/io.ts';

/** The page's transport: `fetch` on its own origin. */
export const pageTransport: Transport = httpTransport('');
const client = createClient({ transport: pageTransport });

/** sessionStorage flag: the page has already reloaded once for a fresh person cookie. */
const RELOADED = 'vb-person-reload';

/** A person route answered `forbidden`: after a server restart the page's cookie is stale, so
 * reload once to get the new one (api.md 20). A second refusal is shown as usual. */
export async function asPerson<T>(run: () => Promise<T>): Promise<T> {
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

/** The board's calls as this page makes them: its transport, its person cookie (the gallery's app
 * sample uses them too). */
export const pageIo = createIo(pageTransport, asPerson);

const person = <T>(run: () => Promise<T>) => asApiError(() => asPerson(run));

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
export type ChatSessionInfo = OperationOutput<'start_chat'>;

/** What a message carries: the words, the notes by `seq` and the cards by number. */
export type ChatMessageBody = OperationInput<'send_chat'>['body'];

/** The board's sessions, newest first; the first is the one in use. */
export const listChats = (board: string) =>
  person(() => client.call('list_chats', { board }));

/** A new session on `board`; starting one grants the board to its agent (api.md 106). */
export const startChat = (board: string, agent: ChatSessionInfo['agent'], model?: string) =>
  person(() => client.call('start_chat', { board, body: { agent, ...(model && { model }) } }));

/** The folder's sessions on no board, newest first; a session leaves the list once its agent creates a board. */
export const listFolderChats = () =>
  person(() => client.call('list_folder_chats'));

/** A new session in the folder, on no board; it grants nothing (api.md 122). */
export const startFolderChat = (agent: ChatSessionInfo['agent'], model?: string) =>
  person(() => client.call('start_folder_chat', { body: { agent, ...(model && { model }) } }));

/** The person's message; the answer is its `message_in` event. `conflict` while the agent answers. */
export const sendChat = (session: string, body: ChatMessageBody) =>
  person(() => client.call('send_chat', { session, body }));

export const stopChat = (session: string) => person(() => client.call('stop_chat', { session }));

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
export type FolderInfo = OperationOutput<'get_project'>;

/** `list_folders`: a folder, the folders in it and the recent ones; on home, the cloud storage places. */
export type FolderList = OperationOutput<'list_folders'>;

/** One folder in a listing: its name (its `~/...` name in the recent list), path and whether it has a board. */
export type FolderEntry = FolderList['folders'][number];

/** The folder the server has open. */
export const getProject = () => person(() => client.call('get_project'));

/** One folder under home (home itself when `path` is left out). */
export const listFolders = (path?: string) =>
  person(() => client.call('list_folders', path === undefined ? {} : { path }));

/** Open `path` in place of the open folder; `create` makes its Vision Board. */
export const openProject = (path: string, create = false) =>
  person(() => client.call('open_project', { body: { path, ...(create && { create }) } }));
