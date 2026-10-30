// Gallery entry for attaching files to a chat message (chat-attachments COMPOSE_01, chatAttachments flag,
// D-068): the composer with the paperclip, a chip in each state (uploading, ready, refused with why), a
// name that is long or not Latin, many files, the drop target showing, Send waiting, shut; and a sent
// message with its file chips. Each a small panel (feed and composer) fed through the chat's own core, with
// the shell's own words, as the chat section does. Shown only with chatPanel and chatAttachments on, and
// after every other section, so no section above moves.
import type { ChatComposerElement, ChatEvent, ChatFeedElement, ChatHost, ComposerContext, ComposerFile } from '#chat';
import { applyEvents, composerView, EMPTY_CHAT } from '#chat';
import { renderMarkdown } from '#ui';
import { attachingFiles, fileIsTooBig, tooManyFiles } from '../shell/words/chat.ts';
import { el, group } from './dom.ts';

const SESSION = '5d2c8e41-7a36-4f0b-9c1d-3e6a8b2f4d70';
const DAY = '.visionboard/attachments/2026-10-30';
const TOO_BIG = fileIsTooBig(13_002_342);

interface Sample {
  state: string;
  caption: string;
  files?: ComposerFile[];
  words?: string;
  /** What goes from the board beside them. */
  context?: ComposerContext;
  host?: ChatHost;
  /** A file dragged over the composer. */
  drop?: boolean;
  /** The person's message in the feed, with these files. */
  sent?: Extract<ChatEvent, { kind: 'message_in' }>['files'];
  text?: string;
  height?: number;
}

const file = (id: number, name: string, state: ComposerFile['state'], reason?: string): ComposerFile =>
  ({ id: `f${id}`, name, state, ...(reason && { reason }) });

const SAMPLES: Sample[] = [
  { state: 'idle', caption: 'The paperclip before Send (Enter or Space opens the picker); its tip says a drop and a paste work too', height: 200 },
  { state: 'uploading', caption: 'Uploading: the chip says so, its mark turns (still under reduced motion), and the line says why Send waits',
    files: [file(1, 'budget-2027.pdf', 'uploading')], words: 'Here is the budget', height: 240 },
  { state: 'ready', caption: 'Ready: a picture and a document differ by their mark alone; Send takes them with no words',
    files: [file(1, 'budget-2027.pdf', 'ready'), file(2, 'whiteboard.png', 'ready')], height: 240 },
  { state: 'refused', caption: 'Refused: a row of its own, with the reason in full; it is never sent and Send takes no notice of it',
    files: [file(1, 'site-walkthrough.mov', 'refused', TOO_BIG)], height: 240 },
  { state: 'eleventh', caption: 'An eleventh file: the ten stay, and it says what to do',
    files: [...Array.from({ length: 10 }, (_, i) => file(i + 1, `scan-${i + 1}.pdf`, 'ready')), file(11, 'scan-11.pdf', 'refused', tooManyFiles)], height: 400 },
  { state: 'mixed', caption: 'All at once, beside what goes from the board; each settles on its own',
    files: [file(1, 'notes.md', 'ready'), file(2, 'photo.heic', 'uploading'), file(3, 'archive.zip', 'refused', TOO_BIG)], words: 'Three things', context: { label: '2 answers · 1 selected', text: '' }, height: 320 },
  { state: 'names', caption: 'The person\'s own name, whatever it is: long ones clip with the whole name in the tip; each reads in its own direction',
    files: [file(1, 'quarterly-board-pack-final-final-reviewed-by-everyone-v12.pdf', 'ready'), file(2, '会議のメモ.txt', 'ready'), file(3, 'مذكرة الاجتماع.txt', 'ready')], height: 280 },
  { state: 'drop', caption: 'A file dragged over the composer (only files: text or a card changes nothing)', drop: true, height: 200 },
  { state: 'shut', caption: 'Shut: the paperclip is disabled and nothing is taken; the reason is the line under the box',
    host: { blocked: 'A past version of the board is showing. Go back to now to send a message.' }, height: 200 },
  { state: 'sent', caption: 'A sent message: a chip per file, the person\'s own name, never a link (the board serves no attached file)',
    text: 'What do you make of these?', height: 300,
    sent: [
      { name: 'whiteboard.png', path: `${DAY}/1-whiteboard.png`, size: 1_204_100 },
      { name: 'file.pdf', path: `${DAY}/2-file.pdf`, size: 88_000, label: '会議のメモ.pdf' },
      { name: 'budget-2027.xlsx', path: `${DAY}/3-budget-2027.xlsx`, size: 40_960 },
    ] },
  { state: 'sent-alone', caption: 'Files with no words: the message says so itself', text: 'Attached files.', height: 240,
    sent: [{ name: 'whiteboard.png', path: `${DAY}/1-whiteboard.png`, size: 1_204_100 }] },
];

function fill(box: HTMLElement, s: Sample): void {
  const events: ChatEvent[] = s.sent
    ? [{ kind: 'message_in', text: s.text ?? '', files: s.sent, at: '2026-10-30T09:12:00Z', session: SESSION, seq: 1 }, { kind: 'system', text: '', turn: 'done', at: '2026-10-30T09:12:01Z', session: SESSION, seq: 2 }]
    : [];
  const state = applyEvents(EMPTY_CHAT, events);
  const host = s.host ?? {};
  const feed = document.createElement('chat-feed') as ChatFeedElement;
  feed.configure({ render: (src) => renderMarkdown(src), boardName: (id) => id, empty: 'No messages yet. Ask the agent about this board.' });
  feed.show(state);
  const composer = document.createElement('chat-composer') as ChatComposerElement;
  composer.show({ ...composerView(state, host), files: attachingFiles });
  composer.setFiles(s.files ?? []);
  composer.setContext(s.context ?? null);
  if (s.words) composer.text = s.words;
  if (s.drop) composer.setAttribute('data-drop', '');
  box.append(feed, composer);
}

function sample(s: Sample): HTMLElement {
  const fig = el('figure', 'g-attach-sample');
  fig.dataset.state = s.state;
  const box = el('div', 'chat-panel g-chat');
  if (s.height) box.style.height = `${s.height}px`;
  fill(box, s);
  fig.append(box, el('figcaption', 'g-note', s.caption));
  return fig;
}

export function attachSection(): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'chatAttachments';
  box.setAttribute('aria-labelledby', 'feature-chatAttachments');
  const heading = el('h2', 'g-title', 'Attaching files');
  heading.id = 'feature-chatAttachments';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, '<chat-composer> <chat-message>'), ' · packages/chat · feature flag chatAttachments, on by default · off with ?flags=-chatAttachments');
  const row = (states: string[]) => {
    const r = el('div', 'g-chats');
    r.append(...SAMPLES.filter((s) => states.includes(s.state)).map(sample));
    return r;
  };
  box.append(heading,
    el('p', 'g-desc', 'The person drops, pastes or picks files for a message (D-068). Each uploads as it comes, so a refusal shows at once; Send carries the paths and the agent opens them with its own tools. The composer takes the files and raises an event; the host uploads and says where each stands.'),
    meta,
    group('In the composer', 'Every state of a file\'s chip, in words as well as its mark. A status line tells a screen reader each change.', row(['idle', 'uploading', 'ready', 'refused', 'eleventh', 'mixed', 'names', 'drop', 'shut'])),
    group('Sent', 'The feed shows what went with the message.', row(['sent', 'sent-alone'])));
  return box;
}
