// Gallery entry for "Allow for this folder" and forgetting it (agent-access-and-working ASK_01,
// agentAccessRules flag): the approval card with the answers its request offers (four inside the board's
// folder, three outside, Allow once alone for what can't be remembered), a read and a search, one that
// waits for the person with no time limit (approvalHold) and one with a limit, one settled for the folder;
// and the chat header's "Allowed for this folder": closed with its count, opened with each kept yes in
// words and Forget, and opened with none. Each a small panel (header and feed) fed by chat events through
// the chat's own core, as the chat section does. Shown only with chatPanel and agentAccessRules on, and
// last in the gallery, so no section above moves.
import type { AllowedYes, ChatEvent, ChatFeedElement, ChatHeaderElement, Facts, ApprovalScope } from '#chat';
import { applyEvents, EMPTY_CHAT, headerView } from '#chat';
import { renderMarkdown } from '#ui';
import { MODELS } from '../shell/chat-rules.ts';
import { el, group } from './dom.ts';

const SESSION = '5d2c8e41-7a36-4f0b-9c1d-3e6a8b2f4d70';
const NOW = Date.parse('2026-10-08T21:39:08Z');
const UNTIL = '2026-10-08T21:41:00Z';
const ALL: ApprovalScope[] = ['once', 'session', 'folder'];

type Unstamped<E> = E extends ChatEvent ? Omit<E, 'at' | 'session' | 'seq'> : never;
type Draft = Unstamped<ChatEvent>;

const ASKED: Draft = { kind: 'message_in', text: 'Update the release notes.' };
const ask = (id: string, facts: Facts, scopes: ApprovalScope[], expiresAt?: string): Draft =>
  ({ kind: 'approval_request', approvalId: id, facts, scopes, ...(expiresAt && { expiresAt }) });
const NOTES: Facts = { kind: 'write', op: 'edit', path: '/home/someone/project/src/notes.md', preview: '- old line\n+ new line' };

interface Sample {
  state: string;
  caption: string;
  drafts: Draft[];
  /** What was allowed for the folder; given, the header offers the list, opened when `open`. */
  allowed?: AllowedYes[];
  open?: boolean;
  height?: number;
}

const KEPT: AllowedYes[] = [
  { id: 'pm-0123456789ab', kind: 'write', path: 'src' }, { id: 'pm-ba9876543210', kind: 'command', command: 'npm test' },
  { id: 'pm-0f1e2d3c4b5a', kind: 'read', path: 'docs/notes.md' }, { id: 'pm-5a4b3c2d1e0f', kind: 'search', path: 'docs' },
];

const SAMPLES: Sample[] = [
  { state: 'inside', caption: 'Inside the board\'s folder: four answers. No time limit (approvalHold): it says it waits for the person',
    drafts: [ASKED, ask('ap-1', NOTES, ALL)] },
  { state: 'outside', caption: 'Outside the folder: three answers, never "for this folder"; with a time limit it counts down',
    drafts: [ASKED, ask('ap-1', { ...NOTES, path: '/home/someone/other/notes.md' }, ['once', 'session'], UNTIL)] },
  { state: 'once', caption: 'What can\'t be remembered (a script, an interpreter): Allow once, or Deny',
    drafts: [ASKED, ask('ap-1', { kind: 'command', command: 'python3 build.py', risks: [], paths: ['build.py'] }, ['once'])] },
  { state: 'reads', caption: 'A read and a search of a folder, asked as such: the path exactly',
    drafts: [ASKED, ask('ap-1', { kind: 'read', path: '/home/someone/notes.txt' }, ['once', 'session']),
      ask('ap-2', { kind: 'read', path: '/home/someone/project', recursive: true }, ['once', 'session'])] },
  { state: 'kept', caption: 'Answered for the folder: the card says so, and the next such call is not asked',
    drafts: [ASKED, ask('ap-1', NOTES, ALL), { kind: 'approval_result', approvalId: 'ap-1', approved: true, status: 'approved', scope: 'folder' }] },
  { state: 'timed', caption: 'With a time limit (approvalHold off): the time left and "Denied if not answered"',
    drafts: [ASKED, ask('ap-1', NOTES, ALL, UNTIL)] },
  { state: 'list', caption: 'Allowed for this folder, opened: each kept yes in words, with Forget (it asks first)',
    drafts: [], allowed: KEPT, open: true, height: 340 },
  { state: 'closed', caption: 'Closed: the button counts what is kept', drafts: [], allowed: KEPT, height: 200 },
  { state: 'empty', caption: 'Opened with nothing kept yet: how to keep one', drafts: [], allowed: [], open: true, height: 240 },
];

function fill(box: HTMLElement, s: Sample): void {
  const stamped = s.drafts.map((d, i) => ({ ...d, at: `2026-10-08T21:39:${String(8 + i).padStart(2, '0')}Z`, session: SESSION, seq: i + 1 }) as ChatEvent);
  const state = applyEvents(EMPTY_CHAT, stamped);
  const header = document.createElement('chat-header') as ChatHeaderElement;
  header.show(headerView({
    agent: 'claude', model: 'claude-sonnet-5-5[1m]', agents: [{ id: 'claude', label: 'Claude' }], models: MODELS.claude, ...(s.allowed && { allowed: s.allowed }),
  }, state));
  const feed = document.createElement('chat-feed') as ChatFeedElement;
  feed.configure({ render: (src) => renderMarkdown(src), boardName: (id) => id, empty: 'No messages yet. Ask the agent about this board.', clock: () => NOW });
  feed.show(state);
  box.append(header, feed);
  if (s.open) header.querySelector<HTMLElement>('button[data-allowed]')?.click();
}

function sample(s: Sample): HTMLElement {
  const fig = el('figure', 'g-access-sample');
  fig.dataset.state = s.state;
  const box = el('div', 'chat-panel g-chat');
  if (s.height) box.style.height = `${s.height}px`;
  fill(box, s);
  fig.append(box, el('figcaption', 'g-note', s.caption));
  return fig;
}

export function folderAccessSection(): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'folderAccess';
  box.setAttribute('aria-labelledby', 'feature-folderAccess');
  const heading = el('h2', 'g-title', 'Allow for this folder');
  heading.id = 'feature-folderAccess';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, '<chat-approval> <chat-header>'), ' · packages/chat · feature flag agentAccessRules, on by default · off with ?flags=-agentAccessRules');
  const row = (state: string[]) => {
    const r = el('div', 'g-chats');
    r.append(...SAMPLES.filter((s) => state.includes(s.state)).map(sample));
    return r;
  };
  box.append(heading,
    el('p', 'g-desc', 'The side-panel agent\'s questions offer the answers the board\'s access rules allow: Allow once, Allow for this session, and inside the board\'s folder Allow for this folder, which is kept across sessions. The chat header lists what was kept, in words, and Forget asks first; then the agent asks again. Reads and searches are asked like changes and commands, and a question waits for the person with no time limit unless approvalHold is off.'),
    meta,
    group('The question', 'The answers are the scopes the request lists (approval_request.scopes); Deny stays alone at the end.', row(['inside', 'outside', 'once', 'reads', 'kept', 'timed'])),
    group('Allowed for this folder', 'In the chat header, under the status. The button opens the list over the feed; Esc, a press outside or the button closes it.', row(['list', 'closed', 'empty'])));
  return box;
}
