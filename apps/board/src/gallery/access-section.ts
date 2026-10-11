// Gallery entry for the person's side of agent access (agentAccess flag, D-027, D-034): the
// requests strip with two requests for a container (one with its refusing note open) and one for
// the whole board, the header's Agents list open, frames with a creator and a granted holder (at
// rest, and with Remove access revealed), and Send to agent in every state. Shown only with
// the flag on, so ?flags=-agentAccess draws the gallery as it was. The strip and the button are
// the board's own Svelte components, mounted with a forced state; the frames are real
// <vb-region> elements, updated with `regionState` from the fixture ledger's holders, exactly as
// the board does.
import { mount } from 'svelte';
import type { VbRegionElement } from '../../../../packages/ui/src/index.ts';
import { regionState } from '../../../../packages/ui/src/index.ts';
import AccessRequests from '../shell/AccessRequests.svelte';
import SendButton from '../shell/SendButton.svelte';
import BoardAgents from '../shell/BoardAgents.svelte';
import type { SendState } from '../shell/shell.svelte.ts';
import { requestRows } from '../board/access.ts';
import type { BoardData } from '../board/io.ts';
import { el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { REGIONS_HELD } from './fixture.ts';

/** The frame whose removable holder is drawn in its hover look, "Remove access" showing. */
const HOVERED = 'held-hover';

/** Every Send state, with the look a sample draws: hover, focus and pressed are CSS states. */
const SENDS: { caption: string; state: SendState; look?: 'hover' | 'focus' | 'pressed' }[] = [
  { caption: 'Idle', state: 'idle' },
  { caption: 'Hover', state: 'idle', look: 'hover' },
  { caption: 'Focus', state: 'idle', look: 'focus' },
  { caption: 'Pressed', state: 'idle', look: 'pressed' },
  { caption: 'Sending', state: 'sending' },
  { caption: 'Sent', state: 'sent' },
  { caption: 'Error', state: 'error' },
  { caption: 'Waiting: sent while the chat\'s agent works', state: 'waiting' },
  { caption: 'Disabled: nothing new to send', state: 'disabled' },
];

/** The fixture in the shape the page loads, so the strip's rows come from the same function. */
const asBoard = (fx: Fixture): BoardData => ({ head: 0, view: fx.view, state: fx.state, versions: {}, access: fx.access });

function frame(id: string, fx: Fixture): VbRegionElement {
  const region = fx.view.regions.find((r) => r.id === id)!;
  const node = document.createElement('vb-region') as VbRegionElement;
  node.render(region);
  // The frame draws no cards (D-013); its node counts as drawn, so it shows the count, not the empty message.
  const placed = new Set(fx.view.nodes.filter((n) => n.region === id).map((n) => n.id));
  node.update(regionState(region, fx.view, fx.state, placed, fx.access.holders?.[id]));
  if (id === HOVERED) node.querySelector('button.vb-holder')?.setAttribute('data-look', 'hover');
  return node;
}

function strip(fx: Fixture): HTMLElement {
  const host = el('div', 'g-access');
  const rows = requestRows(asBoard(fx));
  mount(AccessRequests, {
    target: host,
    props: { requests: rows, refusing: rows[1]?.seq ?? null, placement: 'gallery', onanswer: () => Promise.resolve(false) },
  });
  return host;
}

function agents(fx: Fixture): HTMLElement {
  const host = el('div', 'g-agents');
  mount(BoardAgents, { target: host, props: { holders: fx.boardAgents, open: true, onrevoke: () => Promise.resolve() } });
  return host;
}

function sends(): HTMLElement {
  const row = el('div', 'g-sends');
  for (const s of SENDS) {
    const cell = el('figure', 'g-send');
    mount(SendButton, { target: cell, props: { state: s.state, ...(s.look && { look: s.look }) } });
    cell.append(el('figcaption', 'g-note', s.caption));
    row.append(cell);
  }
  return row;
}

export function accessSection(fx: Fixture): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'agentAccess';
  box.setAttribute('aria-labelledby', 'feature-agentAccess');
  const heading = el('h2', 'g-title', 'Agent access');
  heading.id = 'feature-agentAccess';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'grant · deny · revoke · send'), ' · feature flag agentAccess (D-027, D-034), on by default · off with ?flags=-agentAccess');
  const frames = el('div', 'g-frames vb-ground');
  frames.append(...REGIONS_HELD.map((id) => frame(id, fx)));
  box.append(heading,
    el('p', 'g-desc', 'Agents ask before they draw on a board, or write in a container, another agent made. The person allows or refuses each request, sees who holds the board and each container, can remove an agent\'s access, and presses Send to agent when done.'),
    meta,
    group('Requests', 'The strip under the header while any request is open. Refuse opens an optional one-line note; the second request shows it open. The third asks for the whole board: an agent asks for a board it did not make before it draws there.', strip(fx)),
    group('Agents on the board', 'In the header, the agents that can draw on the open board: the one that made it (no remove control), then each agent the person allowed. Remove access asks to confirm, then takes the whole board back.', agents(fx)),
    group('Holders on a container', 'After the count: the agent that made the container (no remove control), then each agent granted access. Hover or keyboard focus shows Remove access, which asks to confirm.', frames),
    group('Send to agent', 'Every state of the button in the board header.', sends()));
  return box;
}
