// Gallery entry for the folder picker (openFolder flag, open-folder task): the board's own
// FolderPicker, drawn in the dialog's box in the page flow (not modal) from fixture listings, in each
// state: the home folder with its Cloud storage places (folder-links-cloud task), a folder with a
// Vision Board (Open), one without (Create), reading the first listing, a refusal kept in the
// dialog, and Open on its way. Paths are examples under a made-up home folder.
// Shown only with the flag on, so ?flags=-openFolder draws the gallery as it was.
import { mount } from 'svelte';
import FolderPicker from '../shell/FolderPicker.svelte';
import type { FolderList } from '../board/io.ts';
import { el, group } from './dom.ts';

const HOME = '/home/example';
const at = (rel: string) => `${HOME}/${rel}`;
const RECENT = [
  { name: '~/projects/example', path: at('projects/example'), hasBoard: true },
  { name: '~/notes/2026-plans', path: at('notes/2026-plans'), hasBoard: true },
];
const CLOUD = `${HOME}/Library/CloudStorage`;
const HOME_LIST: FolderList = {
  path: HOME, name: '~', found: false, recent: RECENT,
  places: [{ name: 'Cloud-Example', path: `${CLOUD}/Cloud-Example`, hasBoard: false }, { name: 'Cloud-Team', path: `${CLOUD}/Cloud-Team`, hasBoard: false }],
  folders: [{ name: 'Library', path: at('Library'), hasBoard: false }, { name: 'notes', path: at('notes'), hasBoard: false }, { name: 'projects', path: at('projects'), hasBoard: false }],
};
const PROJECTS: FolderList = {
  path: at('projects'), name: '~/projects', found: false, parent: HOME, recent: RECENT,
  folders: [
    { name: 'example', path: at('projects/example'), hasBoard: true },
    { name: 'new-app', path: at('projects/new-app'), hasBoard: false },
    { name: 'website', path: at('projects/website'), hasBoard: false },
  ],
};
const EXAMPLE: FolderList = {
  path: at('projects/example'), name: '~/projects/example', found: true, boards: 3, parent: at('projects'), recent: RECENT,
  folders: [{ name: 'docs', path: at('projects/example/docs'), hasBoard: false }, { name: 'src', path: at('projects/example/src'), hasBoard: false }],
};
const NEW_APP: FolderList = { path: at('projects/new-app'), name: '~/projects/new-app', found: false, parent: at('projects'), recent: RECENT, folders: [] };
const CONFLICT = 'Another board server holds this ledger: computer "example-laptop", process 4242, port 4466, running since 2026-10-09T09:00:00.000Z. Stop that server first.';

let samples = 0;
function sample(listing: FolderList | null, opts: { loading?: boolean; problem?: string; busy?: boolean } = {}): HTMLElement {
  const host = el('div', 'vb-dialog vb-folder-dialog g-folder');
  const none = () => undefined;
  mount(FolderPicker, {
    target: host,
    props: { listing, current: at('notes/2026-plans'), uid: `g-folder-${(samples += 1)}`, onchoose: none, onaccept: none, oncancel: none, ...opts },
  });
  return host;
}

export function folderSection(): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'openFolder';
  box.setAttribute('aria-labelledby', 'feature-openFolder');
  const heading = el('h2', 'g-title', 'Folder picker');
  heading.id = 'feature-openFolder';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'FolderDialog · FolderPicker'), ' · feature flag openFolder, on by default · off with ?flags=-openFolder');
  box.append(heading,
    el('p', 'g-desc', 'Open folder… in the "⋯" menu: the folders under the home folder, cloud storage and recent first, a folder with a Vision Board marked. Choosing one lists it and says whether it has a Vision Board, with Open or Create; the folder open now is never offered again.'),
    meta,
    group('Home', 'The first listing: the Cloud storage places (the real folders in ~/Library/CloudStorage, by their real names), recent, then the folders in ~; no board is made in ~ itself.', sample(HOME_LIST)),
    group('A folder and what is in it', 'Recent first (the folder open now left out), then the folders in ~/projects; choosing one lists it.', sample(PROJECTS)),
    group('Found', 'The chosen folder has a Vision Board: Open, focused.', sample(EXAMPLE)),
    group('Not found', 'No Vision Board here: Create makes .visionboard and an empty ledger, then the board opens on it.', sample(NEW_APP)),
    group('Loading', 'The first listing is on its way.', sample(null, { loading: true })),
    group('Refused', 'The server could not open it; the words stay in the dialog and nothing changed.', sample(EXAMPLE, { problem: CONFLICT })),
    group('Opening', 'Open is on its way; the page then reloads onto the folder.', sample(EXAMPLE, { busy: true })));
  return box;
}
