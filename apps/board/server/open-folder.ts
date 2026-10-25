// The open-folder operations (open-folder task, api.md 109-111): the open folder, the folders
// under home with the recent list (on home's own listing, also the cloud storage places), and
// opening another folder. The caller check has already run: all three are the person's (the
// `vb_person` cookie). Paths are checked in folders.ts; the switch itself is project.ts's.
import path from 'node:path';
import { boardList } from '../../../packages/actions/src/index.ts';
import type { Handler, HandlerTable } from './dispatch.ts';
import type { FolderEntry } from './folders.ts';
import { childFolders, cloudPlaces, countBoards, displayName, hasBoard, resolveFolder } from './folders.ts';
import type { OpenFolder, Project } from './project.ts';
import { problem } from './problem.ts';
import { readRecent } from './recent.ts';
import { sendJson } from './respond.ts';
import { body } from './writes.ts';

/** A folder as get_project and open_project show it, and as list_folders heads its listing. */
function shown(project: Project, dir: string): { path: string; name: string; found: boolean; boards?: number } {
  const open: OpenFolder = project.current();
  const found = hasBoard(dir);
  const boards = !found ? undefined : dir === open.dir ? boardList(open.ledger.state()).length : countBoards(dir);
  return { path: dir, name: displayName(project.home, dir), found, ...(boards !== undefined && { boards }) };
}

/** The recent folders still there and under home, with their display names. */
function recent(home: string): FolderEntry[] {
  return readRecent(home).flatMap((p) => {
    try {
      const dir = resolveFolder(home, p);
      return [{ name: displayName(home, dir), path: dir, hasBoard: hasBoard(dir) }];
    } catch { return []; }
  });
}

const getProject: Handler = ({ res, project }) => {
  sendJson(res, 200, shown(project, project.current().dir));
};

const listFolders: Handler = ({ res, params, project }) => {
  const { home } = project;
  const dir = resolveFolder(home, typeof params.path === 'string' ? params.path : home);
  const { folders, more } = childFolders(dir);
  const places = dir === home ? cloudPlaces(home) : undefined;
  sendJson(res, 200, {
    ...shown(project, dir), ...(dir !== home && { parent: path.dirname(dir) }),
    folders, recent: recent(home), ...(places && { places }), ...(more && { more: true }),
  });
};

const HOME_ITSELF = 'Choose a project folder under ~, not the home folder itself.';

const openProject: Handler = async ({ req, res, project }) => {
  const b = await body('open_project', req) as { path: string; create?: boolean };
  const dir = resolveFolder(project.home, b.path);
  // A board in home itself would be every folder's nearest board (the board MCP's upward search).
  if (dir === project.home) throw problem('forbidden', HOME_ITSELF);
  const open = project.open(dir, b.create === true);
  sendJson(res, 200, shown(project, open.dir));
};

export const OPEN_FOLDER: Pick<HandlerTable, 'get_project' | 'list_folders' | 'open_project'> = {
  get_project: getProject,
  list_folders: listFolders,
  open_project: openProject,
};
