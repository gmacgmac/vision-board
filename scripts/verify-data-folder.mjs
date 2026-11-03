// The data-folder rule verify.mjs runs (PATHS_01, PLAN decision 2, D-084 2): only the paths module,
// packages/format/src/data-folder.ts, names `.visionboard` or a file in it as a path, so a change of
// layout is a change of that one file. A path is a string literal with no white space (a sentence
// with spaces is the words rule's, scripts/words-homes.mjs); comments never count. The names come
// from the module itself, so the rule and the layout can't disagree. Proven by verify-data-folder.test.mjs.
import { DATA_DIR, DATA_FOLDER_NAMES } from '#format';

const fail = (file, message) => ({ level: 'fail', file, message });
const warn = (file, message) => ({ level: 'warn', file, message });

const CODE = /\.(?:ts|mjs|js|svelte)$/;
/** The paths module: the one home. */
export const MODULE = 'packages/format/src/data-folder.ts';
/** A file that names the layout as seen from outside (a test of what an agent is told, or of the
 * folder on disk) carries this marker with its reason, as a long file carries `verify: long-file`. */
const MARKER = /verify: data-folder-literal[ \t]+\S/;

/** Files that may name the layout, each with why. Words files, schemas, openapi.json and generated
 * files say it in sentences a reader sees, which change with the layout in the same task. */
export const ALLOWED = [
  { path: MODULE, why: 'the one home' },
  { path: 'packages/agent/src/access-rules.ts', why: 'the agent\'s file rules are their own table: packages/agent imports nothing from this repo (D-037); a test holds them equal to the module' },
  { path: 'packages/agent/tests/', why: 'the access rules\' tests name paths as the agent sends them, and packages/agent imports nothing from this repo (D-037)' },
];
const SAYS_IT = /\/words\/|\.schema\.json$|(?:^|\/)openapi\.json$|\.generated\.(?:ts|json)$/;

/** Files not this task's to change yet: a warning each, until their owner moves them onto the module. */
export const PENDING = [
  { path: 'apps/board/src/gallery/attach-section.ts', why: 'a sample attachment path (PATHS_01 request R1: use projectFiles(\'\').attachments)' },
];

/** Comments out, so a citation of the layout never counts (as verify-style.mjs `uncomment`). */
const uncomment = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[\s;{}(,])\/\/.*$/gm, '$1');
/** Every string literal's text, a template's `${…}` parts left out. */
const LITERAL = /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g;
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** `.visionboard`, or a file name of the data folder (one with a dot), as a whole step of a path. */
const NAMES = [DATA_DIR, ...DATA_FOLDER_NAMES.filter((n) => n.includes('.'))];
const AS_PATH = new RegExp(`(?:^|[\\\\/])(?:${NAMES.map(escape).join('|')})(?=$|[\\\\/])`);

/** The literals in `text` that name the data folder as a path. */
export function dataFolderPaths(text) {
  return [...uncomment(text).matchAll(LITERAL)]
    .map(([lit]) => lit.slice(1, -1).replace(/\$\{[^}]*\}/g, ''))
    .filter((lit) => !/\s/.test(lit) && AS_PATH.test(lit));
}

/** A data-folder path outside the paths module fails (PLAN decision 2). */
export function checkDataFolder(rel, text) {
  if (!/^(?:apps|packages)\//.test(rel) || !CODE.test(rel) || SAYS_IT.test(rel) || MARKER.test(text)) return [];
  if (ALLOWED.some((a) => rel === a.path || (a.path.endsWith('/') && rel.startsWith(a.path)))) return [];
  const found = dataFolderPaths(text);
  if (!found.length) return [];
  const pending = PENDING.find((p) => rel === p.path);
  if (pending) return [warn(rel, `${found.length} data-folder path(s): ${pending.why}`)];
  return [fail(rel, `names the data folder as a path ("${found[0].slice(0, 60)}"): take it from ${MODULE} (ledgerFolder, ledgerFiles, projectFiles, homeFiles), or mark a test of the layout seen from outside "verify: data-folder-literal <reason>"`)];
}
