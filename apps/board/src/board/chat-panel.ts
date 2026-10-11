// The chat panel on the board (chat-panel FE_02, chatPanel flag): the chat package's header, feed and
// composer in the sidebar (ChatSidebar.svelte), fed by the open board's chat session. It holds the
// session in use on the board (the newest, first in `list_chats`), follows its events (`watch_chat`,
// applied with the chat's own reducer) and answers the elements' events with the chat routes, all
// through the page's one I/O module: a message starts a session first when the board has none
// (starting one is the person's click, so it grants the board, api.md 106), and one sent while a
// session starts waits for it and goes there (FIX_01 ruling 1); Allow or Deny, Stop, New session
// (confirmed) and the agent or model picked (a new session, confirmed, once one is in use). Why no
// message can go is the host's (`ChatHost.blocked`): the page still loading, a past version, a refused
// start. In a folder with no board (board '') it talks in the folder (`start_folder_chat`); the first
// board its agent draws opens, and the panel stays on that session (panel-send ruling 2). The board's
// Send goes through `boardSend`: pressed while the agent works, it waits until the answers go, at
// the next message (ruling 1; the server holds them). The board's side (chips, change chips, the
// stepper's link, opening a board) is the bridge's (chat-bridge.ts); this file knows a board only by its id.
import type {
  ChatAnswerDetail, ChatComposerElement, ChatEvent, ChatFeedElement, ChatHeaderElement, ChatHost, ChatOption,
  ChatPickDetail, ChatSendDetail, ChatState, Chip,
} from '../../../../packages/chat/src/index.ts';
import {
  applyEvent, CHAT_ANSWER_EVENT, CHAT_NEW_SESSION_EVENT, CHAT_PICK_EVENT, CHAT_SEND_EVENT, CHAT_STOP_EVENT, composerView,
  EMPTY_CHAT, headerView,
} from '../../../../packages/chat/src/index.ts';
import { renderMarkdown } from '../../../../packages/ui/src/index.ts';
import type { ChatBridge } from './chat-bridge.ts';
import type { ChatMessageBody, ChatSessionInfo } from './io.ts';
import { answerApproval, ApiError, listChats, listFolderChats, sendChat, startChat, startFolderChat, stopChat, watchChat } from './io.ts';

type Agent = ChatSessionInfo['agent'];

export const AGENTS: readonly ChatOption[] = [{ id: 'claude', label: 'Claude' }, { id: 'kiro', label: 'Kiro' }];
/** The models each agent offers, the first what picking the agent gives; '' is its default. Claude's
 *  by exact id, with the 1M context (chat-panel PLAN ruling 7, panel-send ruling 5; the CLI was checked
 *  to take both ids). Kiro's by Kiro's ids, Opus 5.5 first and never `auto` (N34 ruling 3). */
export const MODELS: Record<Agent, readonly ChatOption[]> = {
  claude: [{ id: '', label: 'Default' }, { id: 'claude-opus-5-5[1m]', label: 'Opus 5.5' }, { id: 'claude-sonnet-5-5[1m]', label: 'Sonnet 5.5' }],
  kiro: [{ id: 'claude-opus-5.5', label: 'Opus 5.5' }, { id: 'claude-sonnet-5.5', label: 'Sonnet 5.5' }],
};
/** The model picking `agent` gives. */
export const firstModel = (agent: Agent): string => MODELS[agent][0]?.id ?? '';
export const LOADING = 'Loading…';
export const PAST = 'A past version of the board is showing. Go back to now to send a message.';
/** What the empty feed says on a board, and in a folder with no board. */
const EMPTY = { board: 'No messages yet. Ask the agent about this board.', folder: 'No boards here yet. Ask the agent to draw one.' };
const NEW_ASK = ['Start a new session?', 'The agent starts again with no memory of this conversation, and a turn still running stops.', 'New session'] as const;

/** What the session runs, or will when it starts. */
export interface Pick { agent: Agent; model: string }

/** Why no message can go, in the order it matters: the page not knowing yet where it is (null; ''
 *  is a folder with no board), a past version, a refused start. */
export const blockedReason = (board: string | null, past: boolean, refused?: string): string | undefined =>
  board === null ? LOADING : past ? PAST : refused;

/** The key of the person's last message ('' before any): Send waits while it stays the one the agent
 *  was answering, and the answers handed over are the next. */
export const lastAsk = (s: ChatState): string => s.entries.findLast((e) => e.type === 'person')?.key ?? '';

/** The board a folder session's agent just drew on, its first: the page opens it. */
export const firstBoard = (s: ChatSessionInfo | null, e: ChatEvent): string | undefined =>
  s && s.board === undefined && e.kind === 'tool_activity' && e.state === 'done' ? e.board : undefined;

const listFor = (board?: string) => (board ? listChats(board) : listFolderChats());

/** One streamed event applied; `first`, the first since the stream (re)opened. An event then at or
 *  before the last one held means the server started over (a restart numbers events from 1 again,
 *  api.md 105), so the feed starts over with it. */
export const follow = (s: ChatState, e: ChatEvent, first: boolean): ChatState =>
  applyEvent(first && e.seq <= s.seq ? EMPTY_CHAT : s, e);

/** The message's body from the composer: the words, the notes by `seq`, the cards by number. */
export function messageBody(text: string, chips: readonly Chip[]): ChatMessageBody {
  const of = (kind: Chip['kind']) => chips.filter((c) => c.kind === kind).map((c) => c.ref);
  const [notes, cards] = [of('note'), of('card')];
  return { text, ...(notes.length > 0 && { notes }), ...(cards.length > 0 && { cards }) };
}

export interface ChatPanelDeps {
  bridge: ChatBridge;
  /** A board's title, for change chips. */
  boardName(id: string): string;
  confirm(heading: string, body: string, confirm: string): Promise<boolean>;
  toast(text: string, tone?: 'info' | 'error'): void;
  /** Open the sidebar; resolves once it shows. */
  open(): Promise<void>;
  /** Whether Send is waiting for the agent's turn to end (the Send button's waiting state). */
  waiting(on: boolean): void;
}

export interface ChatPanel {
  /** The open board ('' a folder with no board; null before the page knows), and whether a past version of it shows. */
  show(board: string | null, past: boolean): void;
  /** The board's Send (`send`, the act), waiting while the agent is mid-turn: null when recorded, else the problem. */
  boardSend(send: () => Promise<string | null>): Promise<string | null>;
  focus(): void;
  destroy(): void;
}

export function createChatPanel(panel: HTMLElement, d: ChatPanelDeps): ChatPanel {
  const header = document.createElement('chat-header') as ChatHeaderElement;
  const feed = document.createElement('chat-feed') as ChatFeedElement;
  const composer = document.createElement('chat-composer') as ChatComposerElement;
  panel.append(header, feed, composer);
  let empty = '';
  const configure = (text: string) => {
    if (text !== empty) feed.configure({ render: (src) => renderMarkdown(src), boardName: d.boardName, empty: (empty = text) });
  };
  configure(EMPTY.board);

  const st = {
    board: null as string | null, past: false, session: null as ChatSessionInfo | null, chat: EMPTY_CHAT,
    /** Send was pressed while the agent answered this message (`lastAsk`): waiting until the next. */
    wait: null as string | null,
    pick: { agent: 'claude', model: '' } as Pick, refused: undefined as string | undefined, sending: false,
    /** A session starting (New session, a pick, a first message): a message waits for it. */
    starting: null as Promise<ChatSessionInfo | null> | null,
  };
  let unfollow = () => {};
  let loads = 0;
  let waitShown = false;

  function render() {
    if (st.wait !== null && lastAsk(st.chat) !== st.wait) st.wait = null;
    if (waitShown !== (st.wait !== null)) d.waiting((waitShown = st.wait !== null));
    const blocked = blockedReason(st.board, st.past, st.refused);
    const host: ChatHost = blocked ? { blocked } : {};
    const now: Pick = st.session ? { agent: st.session.agent, model: st.session.model ?? '' } : st.pick;
    header.show(headerView({ agent: now.agent, model: now.model, agents: AGENTS, models: MODELS[now.agent] }, st.chat, host));
    feed.show(st.chat);
    composer.show(composerView(st.chat, host));
  }

  function fail(err: unknown) {
    const e = err instanceof ApiError ? err : new ApiError(String(err));
    d.toast([e.message, ...e.problems].join(' · '), e.status === 409 ? 'info' : 'error');
  }

  /** Follow session `s` from its first event. */
  function use(s: ChatSessionInfo) {
    unfollow();
    Object.assign(st, { session: s, chat: EMPTY_CHAT, refused: undefined, wait: null });
    render();
    unfollow = watchChat(s.session, () => st.chat.seq, (e, first) => {
      const drew = firstBoard(st.session, e);
      st.chat = follow(st.chat, e, first);
      render();
      if (drew) d.bridge.open(drew);
    }, () => listFor(st.session?.board));
  }

  function drop() {
    unfollow();
    unfollow = () => {};
    Object.assign(st, { session: null, chat: EMPTY_CHAT });
  }

  /** The newest session on `board` ('' the folder). A session in the folder is followed on while its
   *  first board opens: when that board lists it first, it is the same conversation. */
  async function load(board: string) {
    const moving = st.session && st.session.board === undefined ? st.session : null;
    if (!moving) drop();
    Object.assign(st, { board, refused: undefined, wait: null });
    configure(board ? EMPTY.board : EMPTY.folder);
    render();
    const at = ++loads;
    try {
      const newest = (await listFor(board)).sessions[0];
      if (at !== loads) return;
      if (moving && newest?.session === moving.session) {
        st.session = newest;
        return render();
      }
      if (moving) { drop(); render(); }
      if (newest) use(newest);
    } catch (err) { fail(err); }
  }

  /** Hold `p`, a session on its way, in `st.starting` until it settles: a message sent meanwhile waits for it. */
  function hold(p: Promise<ChatSessionInfo | null>): Promise<ChatSessionInfo | null> {
    const held = p.finally(() => { if (st.starting === held) st.starting = null; });
    st.starting = held;
    return held;
  }

  /** A new session with `pick`. */
  const start = (pick: Pick) => hold(starts(pick));

  /** A refusal (no such agent here, it could not start) blocks the composer and says why. */
  async function starts(pick: Pick): Promise<ChatSessionInfo | null> {
    try {
      const model = pick.model || undefined;
      const s = await (st.board ? startChat(st.board, pick.agent, model) : startFolderChat(pick.agent, model));
      st.pick = pick;
      use(s);
      return s;
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 422) throw err;
      Object.assign(st, { pick, refused: [err.message, ...err.problems].join(' ') });
      render();
      return null;
    }
  }

  async function send({ text, chips }: ChatSendDetail) {
    if (st.sending || st.board === null) return;
    st.sending = true;
    try {
      // A start already under way says itself why it failed; the composer keeps the text.
      const s = st.starting ? await st.starting.catch(() => null) : st.session ?? (await start(st.pick));
      if (!s) return;
      await sendChat(s.session, messageBody(text, chips));
      composer.clear();
      d.bridge.sent(chips);
    } catch (err) { fail(err); } finally { st.sending = false; }
  }

  /** A new session with `pick` once confirmed; held from the ask, as the dialog's answer comes a moment
   * after it closes. Cancelled, a message waiting goes to the session in use. */
  async function renew(pick: Pick, ask = NEW_ASK) {
    const renewed = hold(d.confirm(...ask).then((ok) => (ok ? starts(pick) : (render(), st.session))));
    try { await renewed; } catch (err) { fail(err); }
  }

  function picked({ field, id }: ChatPickDetail) {
    const now = st.session ? { agent: st.session.agent, model: st.session.model ?? '' } : st.pick;
    const next: Pick = field === 'agent' ? { agent: id as Agent, model: firstModel(id as Agent) } : { ...now, model: id };
    if (st.session) return void renew(next);
    Object.assign(st, { pick: next, refused: undefined });
    render();
  }

  const on = <T>(type: string, fn: (detail: T) => unknown) => panel.addEventListener(type, (e) => void fn((e as CustomEvent<T>).detail));
  on<ChatSendDetail>(CHAT_SEND_EVENT, send);
  on<ChatAnswerDetail>(CHAT_ANSWER_EVENT, ({ approvalId, answer }) => {
    if (st.session) answerApproval(st.session.session, approvalId, answer).catch((err) => feed.answerFailed(approvalId, (err as Error).message));
  });
  on(CHAT_STOP_EVENT, () => st.session && stopChat(st.session.session).catch(fail));
  on(CHAT_NEW_SESSION_EVENT, () => renew(st.session ? { agent: st.session.agent, model: st.session.model ?? '' } : st.pick));
  on<ChatPickDetail>(CHAT_PICK_EVENT, picked);

  const detach = d.bridge.chat({
    panel, composer, state: () => st.chat,
    async reveal(key) {
      await d.open();
      const row = feed.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`);
      row?.scrollIntoView({ block: 'nearest' });
      (row?.querySelector<HTMLElement>('button') ?? row)?.focus({ preventScroll: true });
    },
  });
  render();

  return {
    show(board, past) {
      if (board !== null && board !== st.board) void load(board);
      st.past = past;
      render();
    },
    async boardSend(act) {
      const s = st.session;
      const ask = s && s.board !== undefined && s.board === st.board && st.chat.busy ? lastAsk(st.chat) : null;
      const problem = await act();
      // Recorded while the same message is still being answered: the server holds the answers.
      if (problem === null && ask !== null && st.session === s && lastAsk(st.chat) === ask) { st.wait = ask; render(); }
      return problem;
    },
    focus: () => composer.focusText(),
    destroy() { unfollow(); detach(); panel.replaceChildren(); },
  };
}
