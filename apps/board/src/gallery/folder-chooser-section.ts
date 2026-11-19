// Gallery entry for the folder dialog's long names and the system's folder chooser (D-110; folder-chooser-setup T_01):
// the board's own FolderPicker, drawn as the folder picker section draws it (folder-section.ts `sample`): a long name
// wrapping everywhere, never cut; and, with the systemFolderChooser flag, "Choose in Finder…" with a recent folder
// outside home listed by its whole path, waiting on the system's chooser, a folder picked there with Open, and a hidden
// pick refused. Paths are examples under a made-up home folder and a made-up drive. Last in the gallery, so no section
// above moves; shown only with openFolder on.
import { flagOn } from '#format';
import type { FolderHead, FolderList } from '../shell/page-io.ts';
import { pageFlags } from '../flags.ts';
import { el, group } from './dom.ts';
import { HOME_LIST, RECENT, at, sample } from './folder-section.ts';

const LONG_NAME = 'customer-research-interviews-2026-autumn-round-with-the-whole-product-team-notes';
const LONG: FolderList = {
  path: at(`projects/${LONG_NAME}`), name: `~/projects/${LONG_NAME}`, found: true, boards: 12, parent: at('projects'), recent: RECENT,
  folders: [{ name: `${LONG_NAME}-archive-of-every-earlier-round-kept-for-reference`, path: at(`projects/${LONG_NAME}/archive`), hasBoard: true }],
};
const DRIVE = '/Volumes/Example-Drive/projects/atlas';
const WITH_CHOOSER: FolderList = { ...HOME_LIST, recent: [{ name: DRIVE, path: DRIVE, hasBoard: true }, ...RECENT], chooser: true };
const PICKED: FolderHead = { path: DRIVE, name: DRIVE, found: true, boards: 2 };
const HIDDEN = '/Volumes/Example-Drive/.archive/atlas is hidden (a part of its path starts with a dot), so it can\'t be a project folder. Choose a folder that is not hidden.';

export function folderChooserSection(): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'systemFolderChooser';
  box.setAttribute('aria-labelledby', 'feature-systemFolderChooser');
  const heading = el('h2', 'g-title', 'Folder dialog: long names and Choose in Finder…');
  heading.id = 'feature-systemFolderChooser';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'FolderDialog · FolderPicker'), ' · feature flag systemFolderChooser, on by default (needs openFolder) · off with ?flags=-systemFolderChooser');
  box.append(heading,
    el('p', 'g-desc', 'The dialog is wide (720px, never past the window) and every name and path wraps. On macOS the server offers the system\'s own folder chooser: the folder picked there opens wherever it is, unless it is hidden (D-110).'),
    meta,
    group('Long names wrap', 'Every name, the path and the heading of the list wrap; nothing is cut.', sample(LONG)));
  if (!flagOn('systemFolderChooser', pageFlags())) return box;
  const finder = { chooser: true };
  box.append(
    group('Choose in Finder…', 'Under the lists; a recent folder outside home (a drive) is listed by its whole path.', sample(WITH_CHOOSER, finder)),
    group('Waiting for Finder', 'The chooser is open: the status says so, the lists and Open wait, and Cancel closes both.', sample(WITH_CHOOSER, { ...finder, choosing: true })),
    group('Chosen in Finder', 'The pick, outside home, on its own line with Open (or Create), as a listed folder.', sample(WITH_CHOOSER, { ...finder, picked: PICKED })),
    group('A hidden pick', 'Refused, saying why; nothing changed.', sample(WITH_CHOOSER, { ...finder, problem: HIDDEN })));
  return box;
}
