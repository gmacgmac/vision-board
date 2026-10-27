// The chat operations (api.md 98-104, 121-122, 131, chat-panel BE_03): start and list a board's
// sessions, or the folder's on no board, send the person's message (with the board's answers since
// its agent was last told, as one message, chat-board-context; a session on no board sends none),
// stop a turn, answer
// an approval, watch a session's events, and the gate's ask. The caller check has already run: the
// person's cookie on every route but the gate's, which carries a run token this handler checks
// names a session with a turn running (api.md 102). Sessions live in chat-sessions.ts.
import type { ApprovalAnswer, Facts } from '#agent';
import { REALM, bearerOf } from './callers.ts';
import type { ChatSession } from './chat-index.ts';
import type { ChatMessage } from './chat-prompt.ts';
import { promptFor, wordsOf } from './chat-prompt.ts';
import type { ChatEvent } from './chat-session.ts';
import type { Ctx, Handler, HandlerTable } from './dispatch.ts';
import { problem } from './problem.ts';
import { endWhenClosed } from './streams.ts';
import { sendJson } from './respond.ts';
import { personBoard, refuseArchived, refuseLocked } from './visibility.ts';
import { body } from './body.ts';

const NO_RUN = 'The server knows no running chat turn with this run token. Only a running session\'s gate asks.';
const BUSY = 'The agent is still answering the last message. Wait for it, or press Stop.';
const NOTHING = 'There is nothing to send: write a message, attach cards or notes, or answer on the board first.';

/** The session in the path, loaded; it must be the one in use on its board, with no new one
 * starting there, to take a message. */
async function inUse({ params, chats }: Ctx) {
  const live = await chats().live(String(params.session));
  const { board, session } = live.record;
  if (chats().current(board)?.session !== session) {
    throw problem('conflict', 'A newer session replaced this one on the board; send your message there.');
  }
  if (chats().starting(board)) throw problem('conflict', 'A new session is starting on this board; send your message there once it has.');
  return live;
}

/** A session on a board; never on an archived one, whose agent could not see it (api.md 136), nor
 * on a locked one, where its grant can't be written (api.md 139). */
const startChat: Handler = async ({ req, res, params, ledger, chats }) => {
  const board = personBoard(ledger.state(), params.board);
  refuseArchived(ledger.state(), board, 'invalid', 'no chat can start on it');
  refuseLocked(ledger.state(), board);
  const b = await body('start_chat', req);
  const session = await chats().start(board, b.agent as ChatSession['agent'], b.model as string | undefined);
  sendJson(res, 201, session);
};

const listChats: Handler = ({ res, params, ledger, chats }) => {
  const board = personBoard(ledger.state(), params.board);
  sendJson(res, 200, { sessions: chats().list(board) });
};

/** A session in the folder, on no board until its agent creates one (panel-send ruling 2). */
const startFolderChat: Handler = async ({ req, res, chats }) => {
  const b = await body('start_folder_chat', req);
  sendJson(res, 201, await chats().start(undefined, b.agent as ChatSession['agent'], b.model as string | undefined));
};

const listFolderChats: Handler = ({ res, chats }) => {
  sendJson(res, 200, { sessions: chats().list(undefined) });
};

/** Words alone while the agent is still answering: its waiting approvals released, and refused. */
function busy(live: { approvals: { release(): void } }): never {
  live.approvals.release();
  throw problem('conflict', BUSY);
}

const nothing = () => problem('invalid', NOTHING, { errors: [{ pointer: '/text', detail: 'no words, nothing attached and no new answers on the board' }] });

/** The person's message; never to a session on an archived board (api.md 136). On a board, one
 * message with the chips and the board's answers since its
 * agent was last told, recorded as the board's Send when it goes (chat-sessions.ts `tell`); with
 * something attached it waits while the agent works (202 with the wait's system line). In the
 * folder, the words alone. Words alone while the agent is still answering are refused. */
const sendChat: Handler = async (ctx) => {
  const { req, res, ledger, chats } = ctx;
  const live = await inUse(ctx);
  const msg = await body('send_chat', req) as ChatMessage;
  const { board } = live.record;
  if (board !== undefined) refuseArchived(ledger.state(), board, 'conflict', 'its chat can\'t take messages');
  const built = promptFor(ledger.state(), board, msg);
  if (board === undefined) {
    if (live.busy) busy(live);
    if (!wordsOf(msg)) throw nothing();
    return sendJson(res, 202, live.send(built.prompt, { kind: 'message_in', text: built.text }));
  }
  const told = chats().tell(live, msg);
  if (told === 'busy') busy(live);
  if (!told) throw nothing();
  sendJson(res, 202, told);
};

/** Stop the running turn; a session not loaded since the server started has none. */
const stopChat: Handler = async ({ res, params, chats }) => {
  const id = String(params.session);
  const live = chats().loaded(id) ?? (await chats().live(id));
  sendJson(res, 200, { stopped: live.stop() });
};

const answerApproval: Handler = async ({ req, res, params, chats }) => {
  const id = String(params.session);
  const live = chats().loaded(id) ?? (await chats().live(id));
  const answer = await body('answer_approval', req) as unknown as ApprovalAnswer;
  sendJson(res, 200, live.approvals.answer(String(params.approval), answer));
};

/** Every event after `after`, then each new one. An `after` past the latest event is from before
 * the server restarted (events are numbered again from 1), so the stream starts over. It ends when
 * the folder closes (a switch, api.md 111). */
const watchChat: Handler = async ({ res, params, chats, closed }) => {
  const live = await chats().live(String(params.session));
  const asked = Number(params.after);
  const after = asked > live.last() ? 0 : asked;
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
  res.write('retry: 2000\n\n');
  const send = (e: ChatEvent) => res.write(`id: ${e.seq}\nevent: chat\ndata: ${JSON.stringify(e)}\n\n`);
  for (const e of live.after(after)) send(e);
  const off = live.subscribe(send);
  const beat = setInterval(() => res.write(': beat\n\n'), 20000);
  endWhenClosed(res, closed);
  res.on('close', () => { off(); clearInterval(beat); });
};

/** The gate's ask: held open until the approval is settled; the gate going away releases it. */
const askApproval: Handler = async ({ req, res, chats }) => {
  const live = chats().byToken(bearerOf(req) ?? '');
  if (!live?.busy) throw problem('not-authenticated', NO_RUN, { headers: REALM });
  const facts = await body('ask_approval', req) as unknown as Facts;
  const gone = new AbortController();
  res.on('close', () => gone.abort());
  const outcome = await live.approvals.ask(facts, gone.signal);
  if (!res.destroyed) sendJson(res, 200, outcome);
};

export const CHAT: Pick<HandlerTable, 'start_chat' | 'list_chats' | 'start_folder_chat' | 'list_folder_chats' | 'send_chat' | 'stop_chat' | 'answer_approval' | 'watch_chat' | 'ask_approval'> = {
  start_chat: startChat,
  list_chats: listChats,
  start_folder_chat: startFolderChat,
  list_folder_chats: listFolderChats,
  send_chat: sendChat,
  stop_chat: stopChat,
  answer_approval: answerApproval,
  watch_chat: watchChat,
  ask_approval: askApproval,
};
