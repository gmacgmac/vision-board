// Gallery entry for the write controls a read-only ledger pauses (readOnlyStart flag, D-085; FE_01, tracker N44): the requests
// strip's Allow all, Allow and Refuse, the Agents panel's Remove access, and an app card's Allow and Stop app. Each is quiet,
// still in the tab order, aria-disabled, its tip the reason; a press does nothing (a card's says it in a toast). The enabled
// states are in the Agent access and App cards sections; the card toolbar's paused answers are in the read-only section.
// Appended after every other section (main.ts), so no section above it moves.
import { el, group, cardList } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { agents, strip } from './access-section.ts';
import { readOnlyCards } from './app-frame-section.ts';

export function readOnlyControlsSection(fx: Fixture): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'readOnlyControls';
  box.setAttribute('aria-labelledby', 'feature-readOnlyControls');
  const heading = el('h2', 'g-title', 'Write controls on a read-only ledger');
  heading.id = 'feature-readOnlyControls';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'grant · deny · revoke · app-allow · app-revoke'), ' · feature flag readOnlyStart (D-085) · FE_01');
  const app = fx.view.nodes.find((x) => x.kind === 'app')!;
  box.append(heading,
    el('p', 'g-desc', 'A control that can\'t act looks it, and says why before anyone presses it: quiet ink, the pointer says no, the tip is "Read-only: press Edit to change it", and it stays where it is and in the tab order. A press does nothing. Edit gives the controls back.'),
    meta,
    group('Requests', 'The strip stays, so the person sees what waits. Allow all, Allow and Refuse are paused.', strip(fx, true)),
    group('Agents on the board', 'Remove access is paused; the agent that made the board has none.', agents(fx, true)),
    group('App card', 'Allow, then "Allowed ▾" with its menu open: Stop app is paused too.', cardList('App status, read-only', ...readOnlyCards(app, fx))));
  return box;
}
