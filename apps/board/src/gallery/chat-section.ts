// Gallery entry for the chat panel (chat-panel FE_01, chatPanel flag): every state of the chat's
// elements, each a small panel (header, feed, composer) fed by gallery.chat.json, the recorded
// Claude turns (packages/agent/tests/fixtures) as chat events (rule 11; apps/board/tests/
// chat-fixture.test.ts keeps the two in step). The states come from the chat's own core:
// `applyEvents` for the feed, the conditions table for the header and the composer. Shown only
// with the flag on, so the gallery without it is unchanged. Then the board with the sidebar open
// (chat-panel FE_02): the board's own ChatSidebar, mounted in the page flow.
import type {
  ChatEvent, ChatFeedElement, ChatHeaderElement, ChatComposerElement, ChatHost, Chip, ComposerContext, HeaderInput,
} from '../../../../packages/chat/src/index.ts';
import { applyEvents, composerView, EMPTY_CHAT, headerView } from '../../../../packages/chat/src/index.ts';
import { ROUND_HEAD, selectionText } from '../../../../packages/actions/src/index.ts';
import type { ViewNode } from '../../../../packages/format/src/index.ts';
import { nodeState, renderMarkdown } from '../../../../packages/ui/src/index.ts';
import { mount } from 'svelte';
import { MODELS } from '../board/chat-rules.ts';
import ChatSidebar from '../shell/ChatSidebar.svelte';
import { cardList, el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { card } from './node-section.ts';
import scenesText from './gallery.chat.json?raw';

type Scene = 'session' | 'stopped' | 'error' | 'send';
const SCENES = JSON.parse(scenesText) as Record<Scene, ChatEvent[]>;

interface Sample {
  state: string;
  caption: string;
  /** The events shown: the first `upTo` of a scene. */
  scene: Scene;
  upTo: number;
  host?: ChatHost;
  /** The time on the page, for an approval's countdown. */
  now?: string;
  chips?: Chip[];
  header?: Partial<HeaderInput>;
  /** What the empty feed says, when not the board's. */
  empty?: string;
  /** The composer's one chip (the board's selected cards and answers since the last Send), opened when `open`. */
  context?: ComposerContext;
  open?: boolean;
}

const AGENTS = [{ id: 'claude', label: 'Claude' }, { id: 'kiro', label: 'Kiro' }];
const ALL = Number.MAX_SAFE_INTEGER;
const PAST = 'A past version of the board is showing. Go back to now to send a message.';
/** What a message carries from the board, as the composer shows it (composer-one-chip rulings 1-3):
 *  the selected cards, then the answers since the last Send, in the server's words (packages/actions). */
const SELECTED = [{ n: 7, title: 'Book the venue' }, { n: 3, title: 'Ship on Friday?' }];
const ROUND = [
  ROUND_HEAD, 'Board "Launch" (v4)', '2 (question): yes', '5 (finding): comment: Check this with the support team first', '7 (action): done',
  'Still open: 3', 'These are the person\'s answers up to head 42. To read anything newer, call check_responses on board "launch" with after 42.',
].join('\n');
const ANSWERS: ComposerContext = { label: '3 answers · 1 selected', text: `${selectionText(SELECTED.slice(0, 1))}\n\n${ROUND}` };
const PICKED: ComposerContext = { label: '2 selected', text: selectionText(SELECTED) };
const ON_A_BOARD: ChatHost = { holds: true };

const SAMPLES: Sample[] = [
  { state: 'empty', caption: 'Empty: a new session; chips a host attaches, each removable (the board attaches one chip instead); the agent can still be picked',
    scene: 'session', upTo: 0, header: { agents: AGENTS },
    chips: [{ kind: 'card', ref: 3, label: 'Release plan' }, { kind: 'card', ref: 7, label: 'Ship on Friday?' }, { kind: 'note', ref: 41, label: 'Keep a written record' }] },
  { state: 'thinking', caption: 'Thinking: the message is sent, nothing back yet', scene: 'session', upTo: 1 },
  { state: 'tool', caption: 'A tool running: one quiet line, never the tool\'s input', scene: 'session', upTo: 4 },
  { state: 'streaming', caption: 'Streaming: the change chip and the reply are in; the turn has not ended', scene: 'session', upTo: 6 },
  { state: 'approval', caption: 'Approval: a file change waits for Allow or Deny', scene: 'session', upTo: 10, now: '2026-10-08T21:39:25Z' },
  { state: 'approval-command', caption: 'Approval: a shell command waits', scene: 'stopped', upTo: 3, now: '2026-10-08T21:45:10Z' },
  { state: 'denied', caption: 'Answered: the card says how; the agent was told', scene: 'session', upTo: ALL },
  { state: 'blocked', caption: 'Blocked: the host says why no message can go', scene: 'session', upTo: 7, host: { blocked: PAST } },
  { state: 'stopped', caption: 'Stopped: the wait was released and the turn ended', scene: 'stopped', upTo: ALL },
  { state: 'error', caption: 'Error: the turn failed; the next message clears it', scene: 'error', upTo: ALL },
  { state: 'send-queued', caption: 'Send to agent while it works: the answers wait for the turn to end', scene: 'send', upTo: 3 },
  { state: 'send-handed', caption: 'Then they go: the board\'s answers as one message, in card order', scene: 'send', upTo: ALL },
  { state: 'answers', caption: 'One chip for what goes from the board: the answers since the last Send and the selected cards; no words needed to send',
    scene: 'session', upTo: 0, host: ON_A_BOARD, context: ANSWERS },
  { state: 'selected', caption: 'Cards selected and nothing answered: the chip says so alone; deselect a card to leave it out',
    scene: 'session', upTo: 0, host: ON_A_BOARD, context: PICKED },
  { state: 'answers-open', caption: 'The chip opened (hover, click, Enter or Space; Esc closes): exactly what the agent receives from the board',
    scene: 'session', upTo: 0, host: ON_A_BOARD, context: ANSWERS, open: true },
  { state: 'answers-working', caption: 'While the agent works: what is attached goes when it finishes',
    scene: 'session', upTo: 4, host: ON_A_BOARD, context: ANSWERS },
  { state: 'folder', caption: 'A folder with no board: the agent may draw the first one', scene: 'session', upTo: 0, empty: 'No boards here yet. Ask the agent to draw one.' },
];

/** Fills `box` with the chat's elements in the sample's state. */
function fill(box: HTMLElement, s: Sample): void {
  const state = applyEvents(EMPTY_CHAT, SCENES[s.scene].slice(0, s.upTo));
  const host = s.host ?? {};
  const header = document.createElement('chat-header') as ChatHeaderElement;
  header.show(headerView({ agent: 'claude', model: 'claude-sonnet-5-5[1m]', agents: [AGENTS[0]!], models: MODELS.claude, ...s.header }, state, host));
  const feed = document.createElement('chat-feed') as ChatFeedElement;
  const now = Date.parse(s.now ?? '2026-10-08T21:39:00Z');
  feed.configure({
    render: (src) => renderMarkdown(src),
    boardName: (id) => (id === 'scratch' ? 'Scratch' : id),
    empty: s.empty ?? 'No messages yet. Ask the agent about this board.',
    clock: () => now,
  });
  feed.show(state);
  const composer = document.createElement('chat-composer') as ChatComposerElement;
  composer.show(composerView(state, host));
  composer.setChips(s.chips ?? []);
  composer.setContext(s.context ?? null);
  if (s.open) composer.querySelector<HTMLElement>('button.chat-cmp-ctx')?.click();
  box.append(header, feed, composer);
}

function panel(s: Sample): HTMLElement {
  const box = el('div', 'chat-panel g-chat');
  fill(box, s);
  return box;
}

/** The board with the sidebar open (FE_02): the board's own ChatSidebar, in the page flow, beside a
 *  stretch of the board's ground, a card selected and so attached. */
const ON_BOARD: Sample = {
  state: 'board', caption: '', scene: 'session', upTo: 6, header: { agents: AGENTS }, host: ON_A_BOARD,
  context: { label: '1 selected', text: selectionText([{ n: 1, title: 'Ship on Friday?' }]) },
};

function onBoard(fx: Fixture): HTMLElement {
  const frame = el('div', 'g-chat-board');
  const ground = el('div', 'vb-ground g-chat-ground');
  const cards = (['Ship on Friday?', 'Add dark mode?'] as const).map((title, i): ViewNode => ({ id: `chat-${i + 1}`, n: i + 1, region: 'ideas', kind: 'question', title }));
  const [first, second] = cards.map((n) => card(n, fx));
  first!.update(nodeState(cards[0]!, fx.state, undefined, true));
  ground.append(cardList('Cards on the board', first!, second!));
  const side = el('div', 'g-chat-side');
  frame.append(ground, side);
  mount(ChatSidebar, { target: side, props: { placement: 'gallery', onhost: (p: HTMLElement) => fill(p, ON_BOARD) } });
  return frame;
}

function sample(s: Sample): HTMLElement {
  const fig = el('figure', 'g-chat-sample');
  fig.dataset.state = s.state;
  fig.append(panel(s), el('figcaption', 'g-note', s.caption));
  return fig;
}

export function chatSection(fx: Fixture): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'chatPanel';
  box.setAttribute('aria-labelledby', 'feature-chatPanel');
  const heading = el('h2', 'g-title', 'Chat panel');
  heading.id = 'feature-chatPanel';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, '<chat-header> <chat-feed> <chat-composer>'), ' · packages/chat · feature flag chatPanel, on by default · off with ?flags=-chatPanel');
  const row = el('div', 'g-chats');
  row.append(...SAMPLES.map(sample));
  box.append(heading,
    el('p', 'g-desc', 'The chat beside the board (D-036, D-037): the agent\'s words, its board writes as change chips, and its file changes and shell commands waiting for Allow or Deny. Styled only by --chat-* properties, mapped to the board\'s tokens in chat-host.css.'),
    meta,
    group('Every state', 'Fed by the recorded Claude turns as chat events. The header\'s status and the composer follow the chat conditions table.', row),
    group('On the board', 'The sidebar on the right, the board shrinking beside it. The toolbar\'s Chat button and T open and close it; its left edge drags (or takes the arrow keys) to set its width. What goes from the board (the selected cards, the answers since the last Send) is one chip that previews it; a change chip zooms to its cards.', onBoard(fx)));
  return box;
}
