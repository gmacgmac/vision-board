// An app's folder, read and checked (D-047 rulings 2 and 9, apps.md § The folder, § The manifest).
// Only `<project>/.visionboard/apps/<id>/` is ever read, and only when `id` fits the id pattern. The
// manifest is checked against its schema (server/schema.ts, compiled once); its file names are plain
// names, so they stay in the folder; every file's real path must too (a link out is refused), and
// none may be over `APP_LIMITS.fileBytes`. What is wrong is a problem for the agent to fix.
import fs from 'node:fs';
import path from 'node:path';
import type { AppManifest, AppProblem } from '../../../../packages/format/src/index.ts';
import { APP_FILES, APP_ID, APP_LIMITS, APPS_DIR } from '../../../../packages/format/src/index.ts';
import { DATA_DIR } from '../ledger.ts';
import { SCHEMA_BASE, schemaProblems } from '../schema.ts';

export const MANIFEST_ID = `${SCHEMA_BASE}schema/app/manifest.schema.json`;

/** One file of an app, as read now: its name in the manifest, its real path and its bytes. */
export interface AppFile { name: string; file: string; bytes: Buffer }

/** An app's folder as read now. `manifest`, `panel` and `tools` are there only when they have no
 * problems; `tools` is absent for a panel-only app. */
export interface AppFolder {
  id: string;
  /** The folder's real path. */
  dir: string;
  manifest?: AppManifest;
  manifestBytes?: Buffer;
  panel?: string;
  tools?: AppFile;
  problems: AppProblem[];
}

/** The project's apps folder. */
export const appsDir = (project: string): string => path.join(project, DATA_DIR, APPS_DIR);

const inside = (root: string, file: string) => file.startsWith(root + path.sep);
const real = (p: string): string | undefined => { try { return fs.realpathSync(p); } catch { return undefined; } };
const KIB = 1024;

/** The ids of the app folders in the project: every folder whose name is an id, sorted. */
export function appIds(project: string): string[] {
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(appsDir(project), { withFileTypes: true }); } catch { return []; }
  return entries.filter((e) => (e.isDirectory() || e.isSymbolicLink()) && APP_ID.test(e.name)).map((e) => e.name).sort();
}

/** File `name`'s real path in folder `dir`: null when there is none; undefined when it is refused
 * (a link out of the folder, not a file, too large), with the problem pushed. */
function locate(dir: string, name: string, problems: AppProblem[]): string | null | undefined {
  const file = real(path.join(dir, name));
  if (file === undefined) return null;
  const refuse = (detail: string) => void problems.push({ file: name, detail });
  if (!inside(dir, file)) return refuse(`${name} links to a file outside the app's folder. Put the file itself in the folder.`);
  const stat = fs.statSync(file);
  if (!stat.isFile()) return refuse(`${name} is not a file.`);
  if (stat.size > APP_LIMITS.fileBytes) return refuse(`${name} is over the ${APP_LIMITS.fileBytes / KIB} KiB limit. Make it smaller.`);
  return file;
}

/** The manifest, when it is JSON, fits its schema and names this folder. */
function manifestOf(bytes: Buffer, id: string, problems: AppProblem[]): AppManifest | undefined {
  const file = APP_FILES.manifest;
  let value: unknown;
  try { value = JSON.parse(bytes.toString('utf8')); } catch (err) {
    problems.push({ file, detail: `app.json is not valid JSON: ${err instanceof Error ? err.message : String(err)}.` });
    return undefined;
  }
  for (const p of schemaProblems(MANIFEST_ID, value)) problems.push({ file, ...(p.pointer && { pointer: p.pointer }), detail: p.detail });
  if (problems.length) return undefined;
  const manifest = value as AppManifest;
  if (manifest.id === id) return manifest;
  problems.push({ file, pointer: '/id', detail: `\`id\` is "${manifest.id}", but the folder is "${id}": make them the same.` });
  return undefined;
}

/** App `id`'s folder in the project, read and checked now; undefined when there is no such folder
 * (or `id` is not an id: then no path is built at all). */
export function readApp(project: string, id: string): AppFolder | undefined {
  if (!APP_ID.test(id)) return undefined;
  const root = real(appsDir(project));
  const dir = root && real(path.join(root, id));
  if (!root || !dir || !fs.statSync(dir).isDirectory()) return undefined;
  const problems: AppProblem[] = [];
  const folder: AppFolder = { id, dir, problems };
  if (!inside(root, dir)) {
    problems.push({ file: `${id}/`, detail: 'The folder links to somewhere outside .visionboard/apps/. Put the app\'s files in the folder itself.' });
    return folder;
  }
  const manifestFile = locate(dir, APP_FILES.manifest, problems);
  if (manifestFile === null) problems.push({ file: APP_FILES.manifest, detail: 'The folder has no app.json: write the app\'s manifest there.' });
  if (!manifestFile) return folder;
  folder.manifestBytes = fs.readFileSync(manifestFile);
  const manifest = manifestOf(folder.manifestBytes, id, problems);
  if (!manifest) return folder;
  const panelName = manifest.panel ?? APP_FILES.panel;
  const panel = locate(dir, panelName, problems);
  if (panel === null) problems.push({ file: panelName, detail: `There is no ${panelName} in the app's folder: write the panel there${manifest.panel ? ', or fix `panel` in app.json' : ''}.` });
  const toolsName = manifest.tools ?? APP_FILES.tools;
  const tools = locate(dir, toolsName, problems);
  if (tools === null && manifest.tools) problems.push({ file: toolsName, detail: `There is no ${toolsName} in the app's folder: write it there, or fix \`tools\` in app.json.` });
  if (problems.length || !panel) return folder;
  folder.manifest = manifest;
  folder.panel = panel;
  if (tools) folder.tools = { name: toolsName, file: tools, bytes: fs.readFileSync(tools) };
  return folder;
}
