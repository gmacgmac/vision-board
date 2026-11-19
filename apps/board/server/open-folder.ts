// The open-folder operations (open-folder task, api.md 109-111): the open folder, the folders
// under home with the recent list (on home's own listing, also the cloud storage places), and
// opening another folder. The caller check has already run: all three are the person's (the
// `vb_person` cookie). Paths are checked in folders.ts; the switch itself is project.ts's. With ledger
// folders (D-084) the open folder's answer also names its open ledger and lists its ledgers (ledgers.ts). Edit and Stop
// editing (D-085 2) are the project's (project.ts `edit`, `stopEditing`); every answer about the open folder says
// whether its ledger is read-only and who is writing it (`readOnly`, `editing`).
// The system's folder chooser (D-110, api.md 208-210): `choose_folder` opens it (chooser.ts) and answers the pick as
// list_folders heads one, keeping it as trusted for this run; `open_project` opens a folder outside home only when the
// server vouches for that path (picked this run, or in its own recent list: folders.ts `resolveVouched`), and the
// recent list shows such a folder too. Every other path keeps the home-only rule.
import path from 'node:path';
import { boardList } from '#actions';
import type { OperationInput } from '#format';
import type { Handler, HandlerTable } from './dispatch.ts';
import type { FolderEntry } from './folders.ts';
import { childFolders, cloudPlaces, countBoards, displayName, hasBoard, resolveFolder, resolvePicked, resolveVouched } from './folders.ts';
import { ledgerEntries } from './ledgers.ts';
import type { EditingInfo } from './editing.ts';
import type { OpenFolder, Project } from './project.ts';
import { problem } from './problem.ts';
import { readRecent } from './recent.ts';
import { sendJson } from './respond.ts';
import { body } from './body.ts';
import * as serverFoldersWords from './words/server-folders.ts';

/** A folder as get_project and open_project show it, and as list_folders heads its listing. */
function shown(project: Project, dir: string): { path: string; name: string; found: boolean; boards?: number } {
  const open: OpenFolder = project.current();
  const found = hasBoard(dir);
  const boards = !found ? undefined : dir === open.dir ? boardList(open.ledger.state()).length : countBoards(dir);
  return { path: dir, name: displayName(project.home, dir), found, ...(boards !== undefined && { boards }) };
}

type Shown = ReturnType<typeof shown> & { ledger?: string; ledgers?: ReturnType<typeof ledgerEntries>; readOnly?: true; editing?: EditingInfo };

/** The open folder as get_project, open_project, edit_ledger and stop_editing show it: with ledger folders, its ledger and
 * ledgers too; whether its ledger is read-only, and who is writing it. */
function shownOpen(project: Project): Shown {
  const open = project.current();
  // In edit mode (read-only opening off, or `--edit`) the answer is as it was while writable: neither is said.
  const say = open.editing.startsReadOnly || open.editing.readOnly();
  const editing = say ? open.editing.info(path.dirname(open.ledger.file)) : undefined;
  const head: Shown = { ...shown(project, open.dir), ...(open.editing.readOnly() && { readOnly: true as const }), ...(editing && { editing }) };
  if (open.ledgerName === undefined) return head;
  const boards = boardList(open.ledger.state()).length;
  return { ...head, ledger: open.ledgerName, ledgers: ledgerEntries(open.dir, { name: open.ledgerName, boards }) };
}

/** The recent folders still there, under home or vouched for outside it (D-110), with their display names. */
function recent(home: string): FolderEntry[] {
  return readRecent(home).flatMap((p) => {
    try {
      const dir = resolveVouched(home, p, () => true); // the server's own list
      return [{ name: displayName(home, dir), path: dir, hasBoard: hasBoard(dir) }];
    } catch { return []; }
  });
}

const getProject: Handler = ({ res, project }) => {
  sendJson(res, 200, shownOpen(project));
};

const listFolders: Handler = ({ res, params, project, chooser }) => {
  const { home } = project;
  const dir = resolveFolder(home, typeof params.path === 'string' ? params.path : home);
  const { folders, more } = childFolders(dir);
  const places = dir === home ? cloudPlaces(home) : undefined;
  sendJson(res, 200, {
    ...shown(project, dir), ...(dir !== home && { parent: path.dirname(dir) }),
    folders, recent: recent(home), ...(places && { places }), ...(chooser.offered && { chooser: true as const }), ...(more && { more: true }),
  });
};

const HOME_ITSELF = serverFoldersWords.chooseAProjectFolderUnder;

const openProject: Handler = async ({ req, res, project, chooser }) => {
  const b = await body('open_project', req) as OperationInput<'open_project'>['body'];
  const { home } = project;
  // Outside home only the server's own: a path its chooser returned this run, or one its recent list holds (D-110).
  const dir = resolveVouched(home, b.path, (raw) => chooser.picked(raw) || readRecent(home).includes(raw));
  // A board in home itself would be every folder's nearest board (the board MCP's upward search).
  if (dir === project.home) throw problem('forbidden', HOME_ITSELF);
  project.open(dir, { create: b.create === true, ledger: b.ledger, keepOutOfGit: b.keepOutOfGit === true });
  sendJson(res, 200, shownOpen(project));
};

/** The system's folder chooser (D-110): open it in the open folder; the pick, checked (`resolvePicked`: anywhere but
 * hidden, never home or above it) and trusted for this run, as list_folders heads it; or `cancelled`. The caller going
 * away closes it. A pick that can't be a project is `invalid` (it fails D-110's rule), not `forbidden`, which says the
 * caller may not call this (and makes the page fetch a fresh cookie). */
const chooseFolder: Handler = async ({ res, project, chooser }) => {
  const gone = new AbortController();
  const end = () => gone.abort();
  res.on('close', end);
  let raw: string | undefined;
  try { raw = await chooser.choose(project.current().dir, gone.signal); } finally { res.off('close', end); }
  if (res.destroyed || res.writableEnded) return;
  if (raw === undefined) return sendJson(res, 200, { cancelled: true });
  const dir = resolvePicked(project.home, raw, 'invalid');
  chooser.trust(dir);
  sendJson(res, 200, shown(project, dir));
};

/** Edit: the open ledger's lock taken now, or `conflict` naming who holds it; it stays read-only then. */
const editLedger: Handler = ({ res, project }) => {
  project.edit();
  sendJson(res, 200, shownOpen(project));
};

/** Stop editing: the lock let go; the ledger is read-only. */
const stopEditing: Handler = ({ res, project }) => {
  project.stopEditing();
  sendJson(res, 200, shownOpen(project));
};

export const OPEN_FOLDER: Pick<HandlerTable, 'get_project' | 'list_folders' | 'open_project' | 'choose_folder' | 'edit_ledger' | 'stop_editing'> = {
  get_project: getProject,
  list_folders: listFolders,
  open_project: openProject,
  choose_folder: chooseFolder,
  edit_ledger: editLedger,
  stop_editing: stopEditing,
};
