// Gallery entry for the person's side of agent access (agentAccess flag, D-027, D-034): the
// requests strip, grouped by bot (accessByBot flag), with two requests for a container (one with its
// refusing note open) and one for the whole board, the header's Agents list open, frames with a creator and a granted holder (at
// rest, and with Remove access revealed), and Send to agent in every state. Shown only with
// the flag on, so ?flags=-agentAccess draws the gallery as it was. The strip and the button are
// the board's own Svelte components, mounted with a forced state; the frames are real
// <vb-region> elements, updated with `regionState` from the fixture ledger's holders, exactly as
// the board does. With accessByBot a second section shows the strip with three bots, two of them
// sharing a label.
import { mount } from 'svelte';
import { flagOn } from '#format';
import { pageFlags } from '../flags.ts';
import type { VbRegionElement } from '#ui';
import { regionState } from '#ui';
import { AccessRequests } from '../board/chrome/index.ts';
import { SendButton } from '../board/chrome/index.ts';
import { BoardAgents } from '../board/chrome/index.ts';
import type { SendState } from '../board/chrome/index.ts';
import type { AccessRequestRow } from '../board/access/index.ts';
import { requestRows } from '../board/access/index.ts';
import type { BoardData } from '#actions';
import { el, group, ownIds } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { REGIONS_HELD } from './fixture.ts';

/** The frame whose holders chip is drawn in its hover look, its list open. */
const HOVERED = 'held-hover';

type Holders = NonNullable<Fixture['access']['holders']>[string];
/** How a sample draws its chip: the list `open` (as hover or focus opens it), the chip's look, and the holders it has. */
interface Look { holders?: Holders; look?: 'hover' | 'focus'; open?: boolean }

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

function frame(id: string, fx: Fixture, o: Look = {}): VbRegionElement {
  const region = fx.view.regions.find((r) => r.id === id)!;
  const node = document.createElement('vb-region') as VbRegionElement;
  node.render(region, ownIds());
  // The frame draws no cards (D-013); its node counts as drawn, so it shows the count, not the empty message.
  const placed = new Set(fx.view.nodes.filter((n) => n.region === id).map((n) => n.id));
  node.update(regionState(region, fx.view, fx.state, placed, 'holders' in o ? o.holders : fx.access.holders?.[id]));
  const look = id === HOVERED ? 'hover' : o.look;
  if (look) node.querySelector('.vb-holders-chip')?.setAttribute('data-look', look);
  node.toggleAttribute('data-holders-open', o.open === true || id === HOVERED);
  return node;
}

export function strip(fx: Fixture, readOnly = false): HTMLElement {
  const host = el('div', 'g-access');
  const rows = requestRows(asBoard(fx));
  mount(AccessRequests, {
    target: host,
    props: { requests: rows, refusing: readOnly ? null : rows[1]?.seq ?? null, readOnly, scope: readOnly ? 'read-only' : '', placement: 'gallery', byBot: flagOn('accessByBot', pageFlags()), onanswer: () => Promise.resolve(false) },
  });
  return host;
}

/** Two bots that joined with one label (two chats in one folder) and a third, asking for several
 * containers and for the whole board: the strip counts 3 bots, numbers the two alike, and gives each
 * bot with more than one request its Allow all. Plain rows, in the shape `requestRows` gives. */
const BOTS: AccessRequestRow[] = [
  { seq: 1, agent: 'bot-a', label: 'pricing-site', container: 'Pricing thread', reason: 'I keep the price table in step with the plans.' },
  { seq: 2, agent: 'bot-b', label: 'pricing-site', reason: 'I add the launch checklist to a board of its own.' },
  { seq: 3, agent: 'bot-a', label: 'pricing-site', container: 'Launch plan', reason: 'The launch date depends on the price decisions.' },
  { seq: 4, agent: 'bot-a', label: 'pricing-site', container: 'Support questions', reason: 'Customers ask about the price change here.' },
  { seq: 5, agent: 'bot-c', label: 'docs', container: 'Help pages', reason: 'I rewrite the help pages when the prices change.' },
];

function byBot(): HTMLElement {
  const host = el('div', 'g-access');
  mount(AccessRequests, { target: host, props: { requests: BOTS, byBot: true, placement: 'gallery', scope: 'bots', onanswer: () => Promise.resolve(false) } });
  return host;
}

export function agents(fx: Fixture, readOnly = false): HTMLElement {
  const host = el('div', 'g-agents');
  mount(BoardAgents, { target: host, props: { holders: fx.boardAgents, open: true, readOnly, onrevoke: () => Promise.resolve() } });
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

/** The requests by bot (accessByBot flag, rulings 320/321), a section of its own. The gallery puts it
 * last of all (main.ts): its height is not a whole pixel, so anywhere else it would move every
 * section below it to another sub-pixel offset and change their screenshots. */
export function accessByBotSection(): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'accessByBot';
  box.setAttribute('aria-labelledby', 'feature-accessByBot');
  const heading = el('h2', 'g-title', 'Access requests by bot');
  heading.id = 'feature-accessByBot';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'grant · deny'), ' · feature flag accessByBot (rulings 320, 321), on by default · off with ?flags=-accessByBot');
  box.append(heading,
    el('p', 'g-desc', 'One group per bot, named by its folder; the heading counts bots, not requests. Each group lists the containers the bot asks for and why, with Allow and Refuse on each row, and one Allow all for a bot with more than one request: it sends one grant per request. Two bots with one label are numbered in the order they asked, never shown by id.'),
    meta,
    group('Three bots', 'The first two share a label: one asks for three containers, the other for the whole board. The third asks for one container, so it has no Allow all.', byBot()));
  return box;
}

/** The holders chip's states (PLAN decision 7 of Access Clarity), a section of its own: one holder (the creator alone, no
 * Remove), many (the list open, a long label wrapping), the chip with keyboard focus (list open) and no holders (no chip).
 * The gallery puts it last of all (main.ts), so it moves no section above it. The first two samples of the Agent access
 * section show the chip at rest and hovered. */
export function holdersChipSection(fx: Fixture): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'holdersChip';
  box.setAttribute('aria-labelledby', 'feature-holdersChip');
  const heading = el('h2', 'g-title', 'Holders chip');
  heading.id = 'feature-holdersChip';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'revoke'), ' · feature flag agentAccess (D-027, Access Clarity decision 7), on by default · off with ?flags=-agentAccess');
  const creator = { agent: 'a-aaaa1111', label: 'Pricing chat', creator: true as const };
  const others = ['Docs chat', 'Launch chat', 'Support chat with a long name that wraps in the list'].map((label, i) => ({ agent: `a-bbbb222${i}`, label }));
  const frames = el('div', 'g-frames g-holders vb-ground');
  frames.append(frame('held', fx, { holders: [creator] }), frame('held', fx, { holders: [creator, ...others], open: true }),
    frame('held', fx, { look: 'focus', open: true }), frame('held', fx, { holders: [] }));
  box.append(heading,
    el('p', 'g-desc', 'Who holds a container is one chip after its count: a person icon and the number of agents. Hovering or focusing it lists them; Enter, Space or a click keeps the list open and Esc closes it. The creator is marked and has no Remove; every other holder has one, which asks to confirm.'),
    meta,
    group('States', 'One holder; many, the list open and a long label wrapping; the chip with keyboard focus, its list open; no holders, no chip.', frames));
  return box;
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
    group('Requests', 'The strip under the header while any request is open, grouped by bot. Refuse opens an optional one-line note; the second request shows it open. The first bot asks for a container and for the whole board, so it has Allow all.', strip(fx)),
    group('Agents on the board', 'In the header, the agents that can draw on the open board: the one that made it (no remove control), then each agent the person allowed. Remove access asks to confirm, then takes the whole board back.', agents(fx)),
    group('Holders on a container', 'After the count, one chip: a person icon and how many agents hold it. Hover or focus lists them, each but the creator with Remove, which asks to confirm.', frames),
    group('Send to agent', 'Every state of the button in the board header.', sends()));
  return box;
}
