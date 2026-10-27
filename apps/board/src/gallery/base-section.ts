// Gallery entry for the shared base (UI_01, packages/ui/src/base/): the button, the chip, the menu
// and the dialog in every state, the two surfaces, a key and the focus ring, drawn from the recipes
// every screen reuses. States the pointer or the keys would draw carry data-look (the gallery's
// samples only). The menu at the end is live: the shared menu's keys, a press outside and focus back
// (`#ui` `openMenu`), as every menu on the board has them. The dismissable layer draws nothing of
// its own; the menu and the tips show it.
import { openMenu } from '#ui';
import type { OpenMenu } from '#ui';
import { el, group } from './dom.ts';

type Look = 'hover' | 'focus' | 'pressed';

function button(text: string, cls = '', set: (b: HTMLButtonElement) => void = () => {}): HTMLButtonElement {
  const b = el('button', `vb-btn ${cls}`.trim(), text);
  b.type = 'button';
  set(b);
  return b;
}
const look = (l: Look) => (b: HTMLElement) => b.setAttribute('data-look', l);
// Placed through the CSSOM: the page's CSP refuses style attributes, and the gallery's sheet is the page's.
const row = (...items: HTMLElement[]) => {
  const r = el('div', 'g-base-row');
  Object.assign(r.style, { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 'var(--vb-space-2)', marginBottom: 'var(--vb-space-2)' });
  r.append(...items);
  return r;
};

function buttons(): HTMLElement {
  return group('Button', 'Idle, hover, focus, pressed, on (aria-pressed), busy (aria-busy), disabled; the primary action; small.',
    row(button('Idle'), button('Hover', '', look('hover')), button('Focus', '', look('focus')), button('Pressed', '', look('pressed')),
      button('On', '', (b) => b.setAttribute('aria-pressed', 'true')), button('Busy…', '', (b) => b.setAttribute('aria-busy', 'true')),
      button('Disabled', '', (b) => { b.disabled = true; })),
    row(button('Primary', 'vb-btn-primary'), button('Primary hover', 'vb-btn-primary', look('hover')), button('Small', 'vb-btn-small'),
      button('Small primary', 'vb-btn-small vb-btn-primary')));
}

function chips(): HTMLElement {
  const chip = (text: string, tone?: string) => {
    const c = el('span', 'vb-chip', text);
    if (tone) c.dataset.tone = tone;
    return c;
  };
  const chipButton = (text: string, l?: Look) => {
    const b = el('button', 'vb-chip vb-chip-btn', text);
    b.type = 'button';
    if (l) b.setAttribute('data-look', l);
    return b;
  };
  return group('Chip', 'A count or a state, toned by what it says; a chip that is a button: idle, hover, focus, pressed.',
    row(chip('3 open'), chip('2 replied', 'agent'), chip('5 answered', 'answered'), chip('1 later', 'later'), chip('4 new', 'new')),
    row(chipButton('2 flagged'), chipButton('Hover', 'hover'), chipButton('Focus', 'focus'), chipButton('Pressed', 'pressed')));
}

/** A menu drawn open in place: rows idle, hover, focus, pressed, a ticked checkbox row with its key, disabled. */
function menuList(label: string): HTMLElement {
  const list = el('div', 'vb-menu-list g-base-menu');
  // Drawn in place, where a live menu hangs under its button.
  Object.assign(list.style, { position: 'relative', top: 'auto', right: 'auto', left: 'auto' });
  list.setAttribute('role', 'menu');
  list.setAttribute('aria-label', label);
  const item = (text: string, set: (b: HTMLButtonElement) => void = () => {}, role = 'menuitem') => {
    const b = el('button', 'vb-menu-item');
    b.type = 'button';
    b.tabIndex = -1;
    b.setAttribute('role', role);
    b.append(el('span', 'vb-menu-label', text));
    set(b);
    return b;
  };
  const ticked = item('Ticked, with its key', (b) => {
    b.setAttribute('aria-checked', 'true');
    const tick = el('span', 'vb-menu-check', '✓');
    const key = el('kbd', undefined, 'H');
    for (const x of [tick, key]) x.setAttribute('aria-hidden', 'true');
    b.append(tick, key);
  }, 'menuitemcheckbox');
  list.append(item('Idle'), item('Hover', look('hover')), item('Focus', look('focus')), item('Pressed', look('pressed')), ticked,
    item('Disabled', (b) => b.setAttribute('aria-disabled', 'true')));
  return list;
}

/** The live menu: a button that opens a menu with the shared menu's keys and dismiss. */
function liveMenu(): HTMLElement {
  const host = el('div', 'g-base-live');
  Object.assign(host.style, { position: 'relative', display: 'inline-block' });
  const opener = button('Open the menu', '', (b) => {
    b.setAttribute('aria-haspopup', 'menu');
    b.setAttribute('aria-expanded', 'false');
  });
  const menu = menuList('A live menu');
  menu.id = 'g-base-live-menu';
  Object.assign(menu.style, { position: '', top: '', right: '', left: '' });
  opener.setAttribute('aria-controls', menu.id);
  menu.hidden = true;
  for (const b of menu.querySelectorAll('[data-look]')) b.removeAttribute('data-look');
  let open: OpenMenu | null = null;
  opener.addEventListener('click', () => {
    if (open) return open.close();
    menu.hidden = false;
    open = openMenu({ menu, opener, onClose: () => { open = null; menu.hidden = true; } });
  });
  menu.addEventListener('click', (e) => {
    const b = (e.target as Element).closest('[role^="menuitem"]');
    if (b && b.getAttribute('aria-disabled') !== 'true') open?.close();
  });
  host.append(opener, menu);
  return host;
}

function dialog(): HTMLElement {
  const box = el('div', 'vb-dialog g-base-dialog');
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', 'Dialog sample');
  const title = el('label', 'vb-field', 'Title');
  title.htmlFor = 'g-base-title';
  const input = el('input', 'vb-input');
  input.id = 'g-base-title';
  input.value = 'Next steps';
  const actions = el('div', 'vb-dialog-actions');
  actions.append(button('Cancel'), button('Create', 'vb-btn-primary'));
  box.append(el('p', 'g-confirm-head', 'A dialog'), el('p', 'vb-dialog-item', 'Its words, a labelled field, a problem it was refused with, then its buttons.'),
    title, input, el('p', 'vb-dialog-problem', 'A board with this title is already open.'), el('p', 'vb-dialog-hint', 'Esc or a click outside closes it.'), actions);
  return box;
}

function textAndFocus(): HTMLElement {
  const keys = el('p', 'vb-dialog-item g-base-keys');
  keys.append('Keys: ', el('kbd', undefined, 'Enter'), ' go · ', el('kbd', undefined, 'Esc'), ' close · ', el('code', undefined, 'code'));
  return group('Key, code and the focus ring', 'A key as a small outlined cap; code in the mono face; the ring every focusable thing takes.', keys);
}

export function baseSamples(body: HTMLElement): void {
  body.append(buttons(), chips(),
    group('Menu', 'Rows idle, hover, focus, pressed, ticked with its key, disabled, on the popover surface. The live menu: Up and Down, Home and End, Esc (focus back), Tab, a press outside.',
      row(menuList('Menu sample'), liveMenu())),
    group('Dialog', 'On the panel surface over a scrim (base/dialog.css; opened by `syncModal`).', dialog()),
    textAndFocus());
}
