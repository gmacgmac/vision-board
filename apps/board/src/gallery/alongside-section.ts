// Gallery entry for working alongside the agent (workAlongside flag, point 328; WORK_01): the toolbar's
// Chat button as the board's mark of the chat's agent (ChatButton.svelte) — working, waiting for the
// person's OK, a count of replies not seen, and both — wide and narrow (the sample carries data-narrow as
// a window of 1500px or less does); Send to agent queued while the agent works (SendButton.svelte); and
// the toast a reply brings, with Open chat (Toast.svelte). Each drawn by the page's own component in the
// page flow, with no board ids. Shown only with chatPanel and workAlongside on, and last in the gallery,
// so no section above moves.
import { mount } from 'svelte';
import ChatButton from '../shell/ChatButton.svelte';
import SendButton from '../shell/SendButton.svelte';
import Toast from '../shell/Toast.svelte';
import type { AgentWork } from '../shell/chat-news.ts';
import * as chatWords from '../shell/words/chat.ts';
import { el, group } from './dom.ts';

const MARKS: { work: AgentWork; news: number; label: string }[] = [
  { work: 'idle', news: 0, label: 'Idle' },
  { work: 'working', news: 0, label: 'Working' },
  { work: 'asking', news: 0, label: 'Waiting for your OK' },
  { work: 'idle', news: 1, label: 'A reply not seen' },
  { work: 'working', news: 2, label: 'Working, two replies not seen' },
];

/** The toolbar's end group in the toolbar's look, holding what `fill` draws. */
function strip(narrow: boolean, fill: (end: HTMLElement) => void): HTMLElement {
  const host = el('div', 'g-toolbar g-alongside');
  host.toggleAttribute('data-narrow', narrow);
  const end = el('div', 'vb-toolbar-end');
  host.append(end);
  fill(end);
  return host;
}

function marks(narrow: boolean): HTMLElement {
  const rows = el('div', 'g-alongside-rows');
  for (const m of MARKS) {
    const row = el('div', 'g-row');
    row.dataset.state = `${m.work}-${m.news}`;
    row.append(el('p', 'g-row-label', m.label),
      strip(narrow, (target) => { mount(ChatButton, { target, props: { menu: true, work: m.work, news: m.news, placement: 'gallery' } }); }));
    rows.append(row);
  }
  return rows;
}

export function alongsideSection(): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'workAlongside';
  box.setAttribute('aria-labelledby', 'feature-workAlongside');
  const heading = el('h2', 'g-title', 'Working alongside the agent');
  heading.id = 'feature-workAlongside';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'ChatButton · SendButton · Toast'), ' · feature flag workAlongside, on by default · off with ?flags=-workAlongside');
  const queued = strip(false, (target) => { mount(SendButton, { target, props: { state: 'waiting', queue: true } }); });
  const toast = el('div', 'g-alongside-toast');
  mount(Toast, { target: toast, props: { placement: 'gallery', toast: { text: chatWords.theAgentReplied, tone: 'info', seq: 1, action: { label: chatWords.openChat, run: () => {} } } } });
  box.append(heading,
    el('p', 'g-desc', 'While the chat\'s agent works the person keeps working on the board. The Chat button is the board\'s one mark of it: "Agent working" while its turn runs, "Waiting for your OK" while it asks before a file change or a command, and a count of the replies that landed while the chat was closed or scrolled away, until the person sees them. Send to agent pressed meanwhile is queued, and every answer given until the turn ends goes with it. A reply that lands out of sight brings a toast whose Open chat shows it.'),
    meta,
    group('Chat button, wide', 'A window wider than 1500px: the mark\'s words and the count after "Chat". The working dot pulses, and is still under reduced motion.', marks(false)),
    group('Chat button, narrow', 'A window of 1500px or less: the icon, with the dot and the number as badges; the words stay for screen readers.', marks(true)),
    group('Send to agent, queued', 'Pressed while the agent works: it goes when the turn ends, with what the person answers meanwhile.', queued),
    group('A reply landed out of sight', 'Polite: a screen reader hears it after what it is saying. Open chat shows the chat at the reply; the count on the Chat button stays until then.', toast));
  return box;
}
