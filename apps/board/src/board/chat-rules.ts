// The chat panel's rules (split out of chat-panel.ts, N39): which agents and models it offers, what
// the header shows, why no message can go (`blockedReason`: loading, a past version, an archived
// board, a refused start), what Send waits on, the board a folder session first drew, how a streamed
// event is applied, and a message's body. Pure, so they are unit-tested under plain Node.
import type { ChatEvent, ChatOption, ChatState, Chip } from '#chat';
import { applyEvent, EMPTY_CHAT } from '#chat';
import type { ChatMessageBody, ChatSessionInfo } from './io.ts';

export type Agent = ChatSessionInfo['agent'];

export const AGENTS: readonly ChatOption[] = [{ id: 'claude', label: 'Claude' }, { id: 'kiro', label: 'Kiro' }];
/** The models each agent offers, the first what picking the agent gives; '' is its default. Claude's by
 *  exact id, with the 1M context (panel-send ruling 5). Kiro's by Kiro's ids, never `auto` (N34 ruling 3). */
export const MODELS: Record<Agent, readonly ChatOption[]> = {
  claude: [{ id: '', label: 'Default' }, { id: 'claude-opus-5-5[1m]', label: 'Opus 5.5' }, { id: 'claude-sonnet-5-5[1m]', label: 'Sonnet 5.5' }],
  kiro: [{ id: 'claude-opus-5.5', label: 'Opus 5.5' }, { id: 'claude-sonnet-5.5', label: 'Sonnet 5.5' }],
};
export const firstModel = (agent: Agent): string => MODELS[agent][0]?.id ?? ''; // what picking `agent` gives
/** The model a session runs: the one recorded, else the agent's first (Kiro with none runs Opus 5.5). */
export const shownModel = (agent: Agent, model?: string): string => model || firstModel(agent);
/** What the header shows: the session in use, else the pick (none in use, or its start was refused). */
export const shownPick = (s: ChatSessionInfo | null, refused: string | undefined, pick: Pick): Pick => (
  s && refused === undefined ? { agent: s.agent, model: shownModel(s.agent, s.model) } : pick);
export const LOADING = 'Loading…';
export const PAST = 'A past version of the board is showing. Go back to now to send a message.';

/** What the session runs, or will when it starts. */
export interface Pick { agent: Agent; model: string }

/** Why a chat on an archived board takes no message (N39 ruling 3): its agent can't see the board. */
export const ARCHIVED = 'This board is archived, so its agent can\'t see it. Restore it from the board picker to chat about it.';

/** Why no message can go, in the order it matters: the page not knowing yet where it is (null; ''
 *  is a folder with no board), a past version, an archived board, a refused start. */
export const blockedReason = (board: string | null, past: boolean, refused?: string, archived = false): string | undefined =>
  board === null ? LOADING : past ? PAST : archived ? ARCHIVED : refused;

/** The key of the person's last message ('' before any): Send waits while it stays the one the agent
 *  was answering, and the answers handed over are the next. */
export const lastAsk = (s: ChatState): string => s.entries.findLast((e) => e.type === 'person')?.key ?? '';

/** The board a folder session's agent just drew on, its first: the page opens it. */
export const firstBoard = (s: ChatSessionInfo | null, e: ChatEvent): string | undefined =>
  s && s.board === undefined && e.kind === 'tool_activity' && e.state === 'done' ? e.board : undefined;


/** One streamed event applied; `first`, the first since the stream (re)opened. An event then at or
 *  before the last one held means the server started over (a restart numbers events from 1 again,
 *  api.md 105), so the feed starts over with it. */
export const follow = (s: ChatState, e: ChatEvent, first: boolean): ChatState =>
  applyEvent(first && e.seq <= s.seq ? EMPTY_CHAT : s, e);

/** The message's body from the composer: the words (none when blank), the notes by `seq`, the cards by number. */
export function messageBody(text: string, chips: readonly Chip[]): ChatMessageBody {
  const of = (kind: Chip['kind']) => chips.filter((c) => c.kind === kind).map((c) => c.ref);
  const [notes, cards] = [of('note'), of('card')];
  return { ...(text.trim() && { text }), ...(notes.length > 0 && { notes }), ...(cards.length > 0 && { cards }) };
}

/** Whether the board's Send is the chat's message with no words: the session is on the open board
 *  and something is attached (ruling 4). */
export const sendsInChat = (s: ChatSessionInfo | null, board: string | null, attached: boolean): boolean =>
  attached && !!board && s?.board === board;
