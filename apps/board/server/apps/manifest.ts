// An app's folder, read and checked (D-047 rulings 2 and 9, apps.md § The folder, § The manifest).
// Only `<project>/.visionboard/apps/<id>/` is ever read, and only when `id` fits the id pattern. The
// manifest is checked against its schema (server/schema.ts, compiled once); its file names are plain
// names, so they stay in the folder; every file's real path must too (a link out is refused), and
// none may be over `APP_LIMITS.fileBytes`. What is wrong is a problem for the agent to fix, in plain
// words: a field as a person writes it (`fieldWords`), no code marks, no JSON Pointer, and for JSON
// that doesn't parse, only the line near the slip (never the parser's sentence). A problem's `file`
// names the file, and the card puts it first, so its words never name it again.
import fs from 'node:fs';
import path from 'node:path';
import type { AppManifest, AppProblem, AppSize } from '#format';
import { APP_FILES, APP_ID, APP_LIMITS, APPS_DIR, appSize } from '#format';
import { DATA_DIR } from '../ledger.ts';
import { sizeWords } from '../problem.ts';
import type { SchemaProblem } from '../schema.ts';
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
  /** The panel size for a card that gives none: the manifest's `size`, else the default. There
   * whenever that field is good, even when something else is wrong, so such a card keeps its size
   * while the agent fixes the rest (app-cards FIX_03). */
  size?: AppSize;
  panel?: string;
  tools?: AppFile;
  problems: AppProblem[];
}

/** The project's apps folder. */
export const appsDir = (project: string): string => path.join(project, DATA_DIR, APPS_DIR);

const inside = (root: string, file: string) => file.startsWith(root + path.sep);
const real = (p: string): string | undefined => { try { return fs.realpathSync(p); } catch { return undefined; } };

/** A schema problem of an app's files in plain words: the field as a person writes it (`size.w`,
 * `env[0]`; the whole value is "it") in place of the code-marked name, and no other code mark. The
 * other operations keep their pointer errors (server/schema.ts); only app problems read this. */
export function fieldWords({ pointer, detail }: SchemaProblem): string {
  const field = pointer.split('/').slice(1).map((k) => k.replace(/~1/g, '/').replace(/~0/g, '~'))
    .reduce((at, k) => (at && /^\d+$/.test(k) ? `${at}[${k}]` : at ? `${at}.${k}` : k), '');
  return detail.replace(/`[^`]*`/, () => field || 'it').replaceAll('`', '');
}

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
  if (!inside(dir, file)) return refuse('links outside the app\'s folder. Make it a real file.');
  const stat = fs.statSync(file);
  if (!stat.isFile()) return refuse('not a file.');
  if (stat.size > APP_LIMITS.fileBytes) return refuse(`over the ${sizeWords(APP_LIMITS.fileBytes)} limit. Make it smaller.`);
  return file;
}

/** A schema problem with the whole manifest (not an object) or with its `size`. */
const SIZE_AT = /^(\/size(\/|$)|$)/;
/** The line where the JSON parser noticed a slip, read from the end of its message only (some of its
 * messages quote the file before that). Its message itself never reaches the problem. */
const PARSED_AT = / \(line (\d+) column \d+\)$/;
/** A byte-order mark some editors put first: not part of the JSON, but the hash keeps it (ruling 7). */
const MARK = /^\uFEFF/;
/** A file the folder should hold but doesn't. */
const NOT_THERE = 'not in the app\'s folder. Write it there';

/** The manifest, when it is JSON, fits its schema and names this folder; `folder.size` once its
 * `size` field is good, whatever else is wrong. */
function manifestOf(folder: AppFolder, bytes: Buffer): AppManifest | undefined {
  const { id, problems } = folder;
  const file = APP_FILES.manifest;
  let value: unknown;
  try { value = JSON.parse(bytes.toString('utf8').replace(MARK, '')); } catch (err) {
    const line = PARSED_AT.exec((err as SyntaxError).message)?.[1];
    problems.push({ file, detail: `not valid JSON${line ? ` near line ${line}` : ''}` });
    return undefined;
  }
  const found = schemaProblems(MANIFEST_ID, value);
  for (const p of found) problems.push({ file, detail: fieldWords(p) });
  if (!found.some((p) => SIZE_AT.test(p.pointer))) folder.size = appSize({ id }, (value as AppManifest).size);
  if (problems.length) return undefined;
  const manifest = value as AppManifest;
  if (manifest.id === id) return manifest;
  problems.push({ file, detail: `id is "${manifest.id}", but the folder is "${id}": make them the same.` });
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
    problems.push({ file: `${id}/`, detail: 'links outside .visionboard/apps/. Make it a real folder.' });
    return folder;
  }
  const manifestFile = locate(dir, APP_FILES.manifest, problems);
  if (manifestFile === null) problems.push({ file: APP_FILES.manifest, detail: `${NOT_THERE}.` });
  if (!manifestFile) return folder;
  folder.manifestBytes = fs.readFileSync(manifestFile);
  const manifest = manifestOf(folder, folder.manifestBytes);
  if (!manifest) return folder;
  const panelName = manifest.panel ?? APP_FILES.panel;
  const panel = locate(dir, panelName, problems);
  if (panel === null) problems.push({ file: panelName, detail: `${NOT_THERE}${manifest.panel ? ', or fix the panel field in app.json' : ''}.` });
  const toolsName = manifest.tools ?? APP_FILES.tools;
  const tools = locate(dir, toolsName, problems);
  if (tools === null && manifest.tools) problems.push({ file: toolsName, detail: `${NOT_THERE}, or fix the tools field in app.json.` });
  if (problems.length || !panel) return folder;
  folder.manifest = manifest;
  folder.panel = panel;
  if (tools) folder.tools = { name: toolsName, file: tools, bytes: fs.readFileSync(tools) };
  return folder;
}
