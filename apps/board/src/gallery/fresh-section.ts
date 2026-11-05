// Gallery entry for new and updated cards at board scale (freshCards flag, new-and-updated task),
// shown by default (gallery.html?flags=-freshCards hides it): the updates board's container drawn by
// the board's own drawing, its cards' NEW and amber "N updates" tabs (pink with updateSignals off), its teal border and its
// "1 new · 3 updated" pill, at 100% and zoomed out (the pill keeps its size); its frame alone on a
// narrow line, where the pill leaves whole, and once engaged (plain border, no pill); and the
// toolbar's "N new" chip (board/chrome/OpenChip.svelte) at rest, hovered, focused, pressed and narrow. Every
// number is worked out from the fixture ledger as the board does (packages/actions `pageConditions`).
import { mount } from 'svelte';
import { flagOn } from '#format';
import type { ViewNode } from '#format';
import type { CardConditions, VbRegionElement } from '#ui';
import { regionFresh, regionState } from '#ui';
import { pageConditions } from '#actions';
import { OpenChip } from '../board/chrome/index.ts';
import { pageFlags } from '../flags.ts';
import { el, group, ownIds } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { UPDATES_BOARD } from './fixture.ts';
import { miniBoard } from './mini-board.ts';

/** The updates board's one container. */
const REGION = 'ups';

type Look = 'hover' | 'focus' | 'pressed';

/** The frame alone, `width` wide, fresh or (engaged) not; its id takes `suffix`. */
function frame(fx: Fixture, suffix: string, width: string, fresh: boolean): HTMLElement {
  const { view, state } = fx.updates;
  const region = view.regions.find((r) => r.id === REGION)!;
  const count = pageConditions(fx.ledger, UPDATES_BOARD).freshIn.get(REGION);
  const pill = fresh && count ? regionFresh(count.added, count.updated) : undefined;
  const f = document.createElement('vb-region') as VbRegionElement;
  f.render({ ...region, id: `${REGION}${suffix}` }, ownIds());
  f.update({ ...regionState(region, view, state, new Set(view.nodes.map((n) => n.id))), ...(pill && { fresh: pill }) });
  f.querySelector<HTMLElement>('.vb-region-empty')!.hidden = true;
  f.style.width = width;
  return f;
}

function chip(fx: Fixture, id: string, look?: Look, narrow = false): HTMLElement {
  const cards = pageConditions(fx.ledger, UPDATES_BOARD).freshCards;
  const host = el('div', 'g-toolbar vb-counts');
  host.toggleAttribute('data-narrow', narrow);
  mount(OpenChip, { target: host, props: {
    id, count: cards.length, cards, onpick: () => undefined, word: 'new', tone: 'new', label: 'Go to a new or updated card',
    title: 'New and updated cards: choose one to go to it', ...(look && { look }),
  } });
  return host;
}

export function freshSection(fx: Fixture): HTMLElement {
  const c = pageConditions(fx.ledger, UPDATES_BOARD);
  const facts = (n: ViewNode): CardConditions => {
    if (n.n === undefined) return {};
    const count = fx.updates.cards.get(n.n)?.count;
    return c.fresh.has(n.n) ? { new: true } : count ? { updates: { count } } : {};
  };
  const board = (suffix: string, zoom?: number) =>
    miniBoard(fx.updates, REGION, { label: `New and updated cards${zoom ? ' at 40%' : ''}`, suffix, facts, fresh: c.freshIn, ...(zoom && { zoom }) });
  const frames = el('div', 'g-frames vb-ground');
  frames.append(frame(fx, '-fresh-wide', 'calc(var(--vb-card-w) * 3)', true), frame(fx, '-fresh-narrow', 'calc(var(--vb-card-w) * 1.1)', true),
    frame(fx, '-fresh-engaged', 'calc(var(--vb-card-w) * 3)', false));
  const looks = el('div', 'g-row');
  looks.append(chip(fx, 'g-fresh-rest'), ...(['hover', 'focus', 'pressed'] as const).map((l) => chip(fx, `g-fresh-${l}`, l)));
  const box = el('section', 'g-section');
  box.dataset.feature = 'freshCards';
  box.setAttribute('aria-labelledby', 'feature-freshCards');
  const heading = el('h2', 'g-title', 'New and updated cards');
  heading.id = 'feature-freshCards';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'container.fresh, freshCards'), ' · feature flag freshCards (api.md 158), on by default · off with ?flags=-freshCards');
  box.append(heading,
    el('p', 'g-desc', 'On a large board the person finds what the agent added or changed: the cards\' tabs, the containers holding them, and a list in the toolbar.'),
    meta,
    group('A fresh container', `A NEW card and three updated ones, their "N updates" tabs outlined in ${flagOn('updateSignals', pageFlags()) ? 'amber' : 'pink'}. The container's border is teal and its title line says `
      + '"1 new · 3 updated" until the person selects or acts on one of its cards. Zoomed out the pill keeps its size on screen.', board('-fresh'), board('-fresh-far', 0.4)),
    group('The pill on the title line', 'It follows the label\'s shrink order: the holders give way first, then the pill, whole, then the title. '
      + 'Once a card in the container is engaged, the border is plain and the pill gone; the cards keep their own tabs.', frames),
    group('"N new" in the toolbar', 'Beside "N open": the new and updated cards as "12 · title", updated ones ending "· updated", in board order; '
      + 'choosing one goes to it as Go to card does. At rest, hovered, focused and pressed; hidden with none.', looks),
    group('"N new", narrow', 'At 1500px and below the chip shows its number only; screen readers still hear "new".', chip(fx, 'g-fresh-narrow', undefined, true)));
  return box;
}
