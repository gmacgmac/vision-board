// The chat panel on the board (chat-panel FE_02, chatPanel flag): the chat package's header, feed and
// composer in the sidebar (ChatSidebar.svelte), fed by the open board's chat session. It holds the
// session in use on the board (the newest, first in `list_chats`), follows its events (`watch_chat`,
// applied with the chat's own reducer) and answers the elements' events with the chat routes, all
// through the page's one I/O module: a message starts a session first when the board has none
// (starting one is the person's click, so it grants the board, api.md 106), and one sent while a
// session starts waits for it and goes there (FIX_01 ruling 1); Allow or Deny, Stop, New session
// (confirmed) and the agent or model picked (a new session, confirmed, once one is in use). Why no
// message can go is the host's (`ChatHost.blocked`, chat-rules.ts): the page still loading, a past
// version, an archived board, a refused start. In a folder with no board (board '') it talks in the folder (`start_folder_chat`); the first
// board its agent draws opens, and the panel stays on that session (panel-send ruling 2). On a board
// every message carries the selected cards and the answers since the last Send (the composer's one
// chip, from the bridge, composer-one-chip ruling 1), and may go with no words when something is
// attached, or while the agent works, held until its turn ends (chat-board-context rulings 1-3, 5:
// `ChatHost.holds`). The board's Send goes through `boardSend`: with the board's session and something
// attached it is that message with no words (ruling 4); else the `send` act, which waits while the
// agent works (panel-send ruling 1). Held either way, Send shows it waiting until the next message.
// The feed follows the latest unless the person scrolls away; sending a message follows again (`feed.follow()`).
// Only the drawing is lazy (`loadDrawing`, chat-view.ts): the session, its events, the waiting and
// attached states and the bridge work from the page's start, with the panel closed; the header, feed and
// composer are made when the panel first opens (or a change chip's link needs them), then drawn from what
// the panel holds, with the context the bridge gave the composer (`composerSide`).
// The board's side (the cards, the answers, change chips, the stepper's link, opening a board) is the
// bridge's (chat-bridge.ts); this file knows a board only by its id.
// With the workAlongside flag (point 328) it tells the page what the agent is doing, for the board's mark,
// and the replies that land while the person can't see them, with a way to them (chat-news.ts `panelNews`);
// the composer then sends words alone while the agent works (`ChatHost.queues`: the server queues them).
// With the agentAccessRules flag the header lists what the person allowed "for this folder"
// (`list_permissions`, read when the drawing comes, when the list opens and when a yes for the folder is
// given); Forget asks first (the confirm dialog), then `forget_permission`, and the agent asks again.
// With the chatAttachments flag the composer takes files; the bridge uploads them and Send carries the ready ones (D-068).
import type {
  ChatAnswerDetail, ChatHost, ChatPickDetail, ChatSendDetail, ComposerContext,
} from '#chat';
import {
  CHAT_ANSWER_EVENT, CHAT_NEW_SESSION_EVENT, CHAT_PICK_EVENT, CHAT_SEND_EVENT, CHAT_STOP_EVENT, composerView,
  EMPTY_CHAT, headerView,
} from '#chat';
import { flagOn } from '#format';
import { renderMarkdown } from '#ui';
import type { ChatView } from './chat-view.ts';
import type { ChatPanel, ChatPanelDeps, ChatViewLoader } from './chat-panel-types.ts';
import type { ChatSessionInfo } from './page-io.ts';
import { ApiError } from '../board/io.ts';
import { answerApproval, attachChatFile, listChats, listFolderChats, sendChat, startChat, startFolderChat, stopChat, watchChat } from './page-io.ts';
import { pageFlags } from '../flags.ts';
import type { Agent, Pick } from './chat-rules.ts';
import { AGENTS, blockedReason, firstBoard, firstModel, follow, lastAsk, messageBody, MODELS, panelState, sendsInChat, shownPick } from './chat-rules.ts';
import * as chatWords from './words/chat.ts';
import { createAllowed } from './chat-allowed.ts';
import { panelNews } from './chat-news.ts';

const EMPTY = { board: chatWords.noMessagesYetAskThe, folder: chatWords.noBoardsHereYetAsk }; // the empty feed: on a board, in a folder with none
const NEW_ASK = [chatWords.startANewSession, chatWords.theAgentStartsAgainWith, chatWords.newSession] as const;
const listFor = (board?: string) => (board ? listChats(board) : listFolderChats());

export type { ChatPanel, ChatPanelDeps, ChatViewLoader } from './chat-panel-types.ts';

/** The drawing's module, loaded on demand: the only import of chat-view.ts (and so of the element code). */
const loadView: ChatViewLoader = () => import('./chat-view.ts');

export function createChatPanel(panel: HTMLElement, d: ChatPanelDeps, loader: ChatViewLoader = loadView): ChatPanel {
  let view: ChatView | null = null;
  let [loading, gone] = [null as Promise<boolean> | null, false];
  /** What the bridge gave the composer; the composer gets it when it exists. */
  let context: ComposerContext | null = null;
  const composerSide = { setContext(c: ComposerContext | null) { context = c; view?.composer.setContext(c); } };
  /** Whether the composer holds anything to send (a chip or the context): the context alone, before it exists. */
  const attachedNow = () => (view ? view.composer.attached : context !== null);
  let empty = '';
  const feedOptions = () => ({ render: (src: string) => renderMarkdown(src), boardName: d.boardName, empty });
  const configure = (text: string) => {
    if (text === empty) return;
    empty = text;
    view?.feed.configure(feedOptions());
  };
  configure(EMPTY.board);

  const st = panelState();
  const queues = flagOn('workAlongside', pageFlags()); // words queue while the agent works (App.svelte passes `work`... on the same flag)
  const attaching = flagOn('chatAttachments', pageFlags());
  const allowed = createAllowed({ confirm: d.confirm, fail: (err) => fail(err), changed: () => render() });
  let [unfollow, loads] = [() => {}, 0];
  let [waitShown, attachedShown] = [false, false];
  const news = panelNews(d, { feed: () => view?.feed ?? null, reveal: () => d.open().then(loadDrawing), focus: () => view?.composer.focusText() });
  const inChat = () => sendsInChat(st.session, st.board, attachedNow());
  const current = (): Pick => shownPick(st.session, st.refused, st.pick);

  function render() {
    if (st.wait !== null && lastAsk(st.chat) !== st.wait) st.wait = null;
    if (waitShown !== (st.wait !== null)) d.waiting((waitShown = st.wait !== null));
    if (attachedShown !== inChat()) d.attached((attachedShown = inChat()));
    news.show(st.chat);
    const blocked = blockedReason(st.board, st.past, st.refused, !!st.board && d.archived?.(st.board) === true);
    // On a board, what is attached goes with no words, and waits while the agent works (ruling 5).
    const host: ChatHost = blocked ? { blocked } : { ...(st.board && { holds: true }), ...(queues && { queues: true }) };
    const { agent, model } = current();
    if (!view) return;
    view.header.show(headerView({ agent, model, agents: AGENTS, models: MODELS[agent], ...(allowed.list && { allowed: allowed.list }) }, st.chat, host));
    view.feed.show(st.chat);
    view.composer.show({ ...composerView(st.chat, host), ...(attaching && { files: chatWords.attachingFiles }) });
  }

  /** Make the header, feed and composer (the first time), then draw them from what the panel holds. */
  function loadDrawing(): Promise<boolean> {
    if (view) return Promise.resolve(true);
    if (loading) return loading;
    d.view('loading');
    const run = (async () => {
      try {
        const made = (await loader()).mountChatView(panel);
        if (gone) return false;
        view = made;
        view.composer.dropArea(panel); // the whole panel takes a dropped file (point 357)
        view.feed.configure(feedOptions());
        view.composer.setContext(context);
        news.drawn(view.feed);
        render();
        void allowed.load(true);
        d.view('ready');
        return true;
      } catch {
        if (!gone) d.view('error');
        return false;
      } finally { loading = null; }
    })();
    return (loading = run);
  }

  function fail(err: unknown) {
    const e = err instanceof ApiError ? err : new ApiError(String(err));
    d.toast([e.message, ...e.problems].join(' · '), e.status === 409 ? 'info' : 'error');
  }

  /** Follow session `s` from its first event. */
  function use(s: ChatSessionInfo) {
    unfollow();
    Object.assign(st, { session: s, chat: EMPTY_CHAT, refused: undefined, wait: null });
    news.follow();
    d.bridge.refresh();
    render();
    unfollow = watchChat(s.session, () => st.chat.seq, (e, first) => {
      const drew = firstBoard(st.session, e);
      st.chat = follow(st.chat, e, first);
      render();
      news.event(e);
      if (e.kind === 'approval_result' && e.scope === 'folder') void allowed.load(true);
      if (drew) d.bridge.open(drew);
    }, () => listFor(st.session?.board));
  }

  function drop() {
    unfollow();
    unfollow = () => {};
    Object.assign(st, { session: null, chat: EMPTY_CHAT });
    news.follow();
    d.bridge.refresh();
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
        d.bridge.refresh();
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

  /** The message: null once it went or waits for the turn to end (Send then shows it waiting),
   *  else the problem, which a toast also says. */
  async function send({ text, chips: own }: ChatSendDetail): Promise<string | null> {
    if (st.sending || st.board === null) return chatWords.aMessageIsAlreadyOn;
    if (d.bridge.uploading()) { d.toast(chatWords.filesStillUploading, 'info'); return chatWords.filesStillUploading; } // the board's Send: the composer's waits by itself
    st.sending = true;
    view?.feed.follow();
    const [ask, chips, files] = [lastAsk(st.chat), [...own, ...d.bridge.chips()], d.bridge.files()];
    try {
      // A start already under way says itself why it failed; the composer keeps the text.
      const s = st.starting ? await st.starting.catch(() => null) : st.session ?? (await start(st.pick));
      if (!s) return chatWords.theAgentDidNotStart;
      const answer = await sendChat(s.session, { ...messageBody(text, chips), ...(files.length > 0 && { files }) });
      view?.composer.clear();
      d.bridge.sent(chips, files);
      // Held while the agent works: Send waits until the next message is the person's.
      if (answer.kind === 'system' && st.session === s && lastAsk(st.chat) === ask) { st.wait = ask; render(); }
      return null;
    } catch (err) {
      fail(err);
      return err instanceof ApiError ? err.message : String(err);
    } finally { st.sending = false; }
  }

  /** A new session with `pick` once confirmed; held from the ask, as the dialog's answer comes a moment
   * after it closes. Cancelled, a message waiting goes to the session in use. */
  async function renew(pick: Pick, ask = NEW_ASK) {
    const renewed = hold(d.confirm(...ask).then((ok) => (ok ? starts(pick) : (render(), st.session))));
    try { await renewed; } catch (err) { fail(err); }
  }

  function picked({ field, id }: ChatPickDetail) {
    const next: Pick = field === 'agent' ? { agent: id as Agent, model: firstModel(id as Agent) } : { ...current(), model: id };
    if (st.session) return void renew(next);
    Object.assign(st, { pick: next, refused: undefined });
    render();
  }

  const on = <T>(type: string, fn: (detail: T) => unknown) => panel.addEventListener(type, (e) => void fn((e as CustomEvent<T>).detail));
  on<ChatSendDetail>(CHAT_SEND_EVENT, send);
  on<ChatAnswerDetail>(CHAT_ANSWER_EVENT, ({ approvalId, answer }) => {
    if (st.session) answerApproval(st.session.session, approvalId, answer).catch((err) => view?.feed.answerFailed(approvalId, (err as Error).message));
  });
  on(CHAT_STOP_EVENT, () => st.session && stopChat(st.session.session).catch(fail));
  allowed.wire(on);
  on(CHAT_NEW_SESSION_EVENT, () => renew(current()));
  on<ChatPickDetail>(CHAT_PICK_EVENT, picked);

  /** Open the sidebar and bring the feed row `key` (a change chip's target) into view. */
  async function reveal(key: string) {
    await d.open();
    if (!(await loadDrawing()) || !view) return;
    const row = view.feed.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`);
    row?.scrollIntoView({ block: 'nearest' });
    (row?.querySelector<HTMLElement>('button') ?? row)?.focus({ preventScroll: true });
  }

  /** The board's Send: with the board's session and something attached, it is the message with no words (ruling 4). */
  async function boardSend(act: () => Promise<string | null>): Promise<string | null> {
    if (inChat()) return send({ text: '', chips: [] });
    const s = st.session;
    const ask = s && s.board !== undefined && s.board === st.board && st.chat.busy ? lastAsk(st.chat) : null;
    const problem = await act();
    // Recorded while the same message is still being answered: the server holds the answers.
    if (problem === null && ask !== null && st.session === s && lastAsk(st.chat) === ask) { st.wait = ask; render(); }
    return problem;
  }

  const detach = d.bridge.chat({
    panel, composer: composerSide, setFiles: (files) => view?.composer.setFiles(files), upload: attachChatFile, state: () => st.chat, changed: render,
    agent: () => (st.session && st.session.board === st.board ? st.session.agentId : undefined),
    reveal,
  });
  render();

  return {
    show(board, past) {
      if (board !== null && board !== st.board) void load(board);
      st.past = past;
      render();
    },
    boardSend,
    load: loadDrawing,
    focus: () => view?.composer.focusText(),
    opened: news.opened,
    destroy() { gone = true; view = null; unfollow(); detach(); panel.replaceChildren(); },
  };
}
