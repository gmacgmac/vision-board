// Gallery entry for the open folder always on show (currentFolder flag, current-folder task): the
// toolbar's FolderChip at rest, hovered, pressed and focused, and cut short on a narrow strip; the
// "⋯" menu's Current line (a short path whole, a long one with its middle elided); and the folder
// dialog's Current folder line with Copy (FolderPicker, drawn in the dialog's box in the page flow).
// Paths are examples under a made-up home folder. Shown only with both the flag and openFolder on, so
// ?flags=-currentFolder (or -openFolder) draws the gallery as it was.
import { mount } from 'svelte';
import FolderChip from '../shell/FolderChip.svelte';
import FolderPicker from '../shell/FolderPicker.svelte';
import ToolbarMenu from '../shell/ToolbarMenu.svelte';
import type { FolderList } from '../shell/page-io.ts';
import { el, group } from './dom.ts';

const none = () => undefined;
const SHORT = { path: '/home/example/projects/atlas', name: '~/projects/atlas' };
const LONG = {
  path: '/home/example/Library/CloudStorage/Cloud-Example/work/atlas-customer-research',
  name: '~/Library/CloudStorage/Cloud-Example/work/atlas-customer-research',
};
const LISTING: FolderList = {
  path: '/home/example/projects', name: '~/projects', found: false, parent: '/home/example', recent: [],
  folders: [{ name: 'atlas', path: SHORT.path, hasBoard: true }, { name: 'website', path: '/home/example/projects/website', hasBoard: false }],
};

function chip(folder: typeof SHORT, look?: 'hover' | 'focus' | 'pressed', narrow = false): HTMLElement {
  const host = el('div', narrow ? 'g-toolbar g-folder-narrow' : 'g-toolbar');
  mount(FolderChip, { target: host, props: { folder, onclick: none, look } });
  return host;
}

function menu(folder: typeof SHORT): HTMLElement {
  const host = el('div', 'g-toolbar g-archive-menu');
  host.toggleAttribute('data-menu-open', true);
  mount(ToolbarMenu, { target: host, props: { theme: 'system', ontheme: none, onhide: none, folder, current: true, open: true, placement: 'gallery' } });
  return host;
}

let samples = 0;
function dialog(folder: typeof SHORT): HTMLElement {
  const host = el('div', 'vb-dialog vb-folder-dialog g-folder');
  mount(FolderPicker, {
    target: host,
    props: { listing: LISTING, current: folder.path, here: folder, uid: `g-current-${(samples += 1)}`, onchoose: none, onaccept: none, oncancel: none },
  });
  return host;
}

export function currentFolderSection(): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'currentFolder';
  box.setAttribute('aria-labelledby', 'feature-currentFolder');
  const heading = el('h2', 'g-title', 'Current folder');
  heading.id = 'feature-currentFolder';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'FolderChip · ToolbarMenu · FolderPicker'), ' · feature flag currentFolder, on by default (needs openFolder) · off with ?flags=-currentFolder');
  box.append(heading,
    el('p', 'g-desc', 'The folder the board has open is always on show: a chip at the far left of the toolbar with its name, a "Current:" line in the "⋯" menu, and a "Current folder" line with Copy in the folder dialog. The full path, with the home folder as ~, is in the chip\'s and the line\'s tooltips.'),
    meta,
    group('Chip at rest', 'A folder icon and the folder\'s name; a press opens the folder dialog.', chip(SHORT)),
    group('Hover', 'The chip draws the toolbar chips\' hover look.', chip(SHORT, 'hover')),
    group('Pressed and focused', 'Pressed sinks a pixel; focus is the board\'s ring.', chip(SHORT, 'pressed'), chip(SHORT, 'focus')),
    group('Narrow', 'A long name is cut with "…" and never leaves the toolbar; the whole path is its tooltip.', chip(LONG, undefined, true)),
    group('In the "⋯" menu', 'Under Open folder…, a plain line, not a row: a short path whole.', menu(SHORT)),
    group('In the "⋯" menu, a long path', 'The middle of a long path is elided; the whole path is the line\'s tooltip.', menu(LONG)),
    group('In the folder dialog', 'Apart from the lists: the whole path and Copy, which copies the path and says "Copied".', dialog(SHORT)));
  return box;
}
