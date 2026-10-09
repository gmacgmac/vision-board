// The chat panel on the board (chat-panel FE_02, chatPanel flag): the chat package's header, feed and
// composer in the sidebar (ChatSidebar.svelte), fed by the open board's chat session. It holds the
// session in use on the board (the newest, first in `list_chats`), follows its events (`watch_chat`,
// applied with the chat's own reducer) and answers the elements' events with the chat routes, all
// through the page's one I/O module: a message starts a session first when the board has none
// (starting one is the person's click, so it grants the board, api.md 106), and one sent while a
// session starts waits for it and goes there (FIX_01 ruling 1); Allow or Deny, Stop, New session
// (confirmed) and the agent or model picked (a new session, confirmed, once one is in use). Why no
// message can go is the host's (`ChatHost.blocked`): no board, a past version, a refused start. The
// board's side (chips, change chips, the stepper's link) is the bridge's (chat-bridge.ts); this file
// knows the board only by its id.
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
import { answerApproval, ApiError, listChats, sendChat, startChat, stopChat, watchChat } from './io.ts';

type Agent = ChatSessionInfo['agent'];

export const AGENTS: readonly ChatOption[] = [{ id: 'claude', label: 'Claude' }, { id: 'kiro', label: 'Kiro' }];
/** The models each agent offers; '' is its default. Claude's with the 1M context (PLAN ruling 7). */
export const MODELS: Record<Agent, readonly ChatOption[]> = {
  claude: [{ id: '', label: 'Default' }, { id: 'opus[1m]', label: 'Opus' }, { id: 'sonnet[1m]', label: 'Sonnet' }],
  kiro: [],
};
export const NO_BOARD = 'Open a board to talk about it.';
export const PAST = 'A past version of the board is showing. Go back to now to send a message.';
const NEW_ASK = ['Start a new session?', 'The agent starts again with no memory of this conversation, and a turn still running stops.', 'New session'] as const;

/** What the session runs, or will when it starts. */
export interface Pick { agent: Agent; model: string }

/** Why no message can go, in the order it matters: no board, a past version, a refused start. */
export const blockedReason = (board: string, past: boolean, refused?: string): string | undefined =>
  !board ? NO_BOARD : past ? PAST : refused;

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
}

export interface ChatPanel {
  /** The open board, and whether a past version of it shows. */
  show(board: string, past: boolean): void;
  focus(): void;
  destroy(): void;
}

export function createChatPanel(panel: HTMLElement, d: ChatPanelDeps): ChatPanel {
  const header = document.createElement('chat-header') as ChatHeaderElement;
  const feed = document.createElement('chat-feed') as ChatFeedElement;
  const composer = document.createElement('chat-composer') as ChatComposerElement;
  panel.append(header, feed, composer);
  feed.configure({ render: (src) => renderMarkdown(src), boardName: d.boardName, empty: 'No messages yet. Ask the agent about this board.' });

  const st = {
    board: '', past: false, session: null as ChatSessionInfo | null, chat: EMPTY_CHAT,
    pick: { agent: 'claude', model: '' } as Pick, refused: undefined as string | undefined, sending: false,
    /** A session starting (New session, a pick, a first message): a message waits for it. */
    starting: null as Promise<ChatSessionInfo | null> | null,
  };
  let unfollow = () => {};
  let loads = 0;

  function render() {
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
    Object.assign(st, { session: s, chat: EMPTY_CHAT, refused: undefined });
    render();
    unfollow = watchChat(s.session, () => st.chat.seq, (e, first) => {
      st.chat = follow(st.chat, e, first);
      render();
    }, () => listChats(s.board));
  }

  async function load(board: string) {
    unfollow();
    unfollow = () => {};
    Object.assign(st, { board, session: null, chat: EMPTY_CHAT, refused: undefined });
    render();
    const at = ++loads;
    if (!board) return;
    try {
      const newest = (await listChats(board)).sessions[0];
      if (at === loads && newest) use(newest);
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
      const s = await startChat(st.board, pick.agent, pick.model || undefined);
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
    if (st.sending) return;
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
    const next: Pick = field === 'agent' ? { agent: id as Agent, model: '' } : { ...now, model: id };
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
      if (board !== st.board) void load(board);
      st.past = past;
      render();
    },
    focus: () => composer.focusText(),
    destroy() { unfollow(); detach(); panel.replaceChildren(); },
  };
}
