// Project rule checks, one command, zero dependencies (D-016). Run: npm run verify.
// Rules: steering rule 1 (layers; front doors: a module is reached only by its name, D-059), rule 2
// (file length), rule 15 (the board page's weight, from the last `npm run build`), rule 20 and
// cortex-rules 11 (exact versions, dependency register), the generated module map
// (docs/specification/modules.md), and the style and layer rules in verify-style.mjs (colour
// literals only in the tokens, I/O only in its layers, scoped board stylesheets; UI_01).
// Each check is a pure function over strings, so scripts/verify.test.mjs proves every rule fails
// when broken. `--write-map` regenerates the module map instead of checking it.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { checkStyleAndLayers } from './verify-style.mjs';

export const LIMITS = { warn: 300, fail: 500 };
export const ROOTS = ['apps', 'packages', 'scripts', 'tests', 'skills'];
export const MAP_FILE = 'docs/specification/modules.md';
export const REGISTER = 'docs/specification/dependencies.md';
/** Rule 15: the board page's JS and CSS, gzipped (docs/specification/performance.md § Budgets). */
export const PAGE = { html: 'apps/board/dist/index.html', budgetKb: 200 };

/** Which packages each package may import (D-016, D-029). Apps may import any package; nothing imports an app. */
export const LAYERS = {
  format: [],
  tokens: [],
  actions: ['format'],
  layout: ['format'],
  ui: ['format', 'actions', 'tokens'],
  agent: [],
  chat: [],
  client: ['format'],
  mcp: ['format', 'client'],
  cli: ['format', 'actions', 'agent', 'client'],
};

const SOURCE = /\.(?:ts|mjs|js|svelte|css|html)$/;
const CODE = /\.(?:ts|mjs|js|svelte)$/;
// Every way one file reaches another. Imports: `from` (import, export, import type), a bare
// side-effect import, a dynamic import. Paths: `new URL(…, import.meta.url)` (a template's static
// start), Vite's import.meta.glob, an HTML href or src, a CSS @import.
const IMPORT = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|^\s*import\s*['"]([^'"]+)['"]/gm;
const URL_PATH = /new URL\(\s*['"`]([^'"`$]+)/g;
const GLOB = /import\.meta\.glob(?:<[^>]*>)?\(\s*['"`]([^'"`]+)/g;
const LINK = /\s(?:href|src)="([^"]+)"/g;
const CSS_IMPORT = /@import\s+(?:url\(\s*)?['"]([^'"]+)['"]/g;
/** Test code that may import the app it tests: the page suite, and a skill's own tests. */
const APP_TESTS = /^(?:tests\/|skills\/.*\.test\.m?[jt]s$)/;
const EXACT = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
// verify.test.mjs holds import strings as fixtures, so it is not scanned for imports.
const FIXTURE_HOST = /^scripts\/.*\.test\.mjs$/;
const LONG_FILE = /verify: long-file[ \t]+(\S[^\n]*)/;
const fail = (file, message) => ({ level: 'fail', file, message });
const warn = (file, message) => ({ level: 'warn', file, message });

/** Rule 2: warn over 300 lines, fail over 500 unless the file says why. */
export function checkLength(file, text) {
  const lines = text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
  if (lines <= LIMITS.warn) return [];
  const reason = LONG_FILE.exec(text)?.[1].trim();
  if (lines > LIMITS.fail && !reason) return [fail(file, `${lines} lines (limit ${LIMITS.fail}): split it, or add "verify: long-file <reason>"`)];
  return [warn(file, `${lines} lines (aim for about ${LIMITS.warn})${reason ? ` (long-file: ${reason})` : ''}`)];
}

/** The module a repo path belongs to: { kind: 'package'|'app'|'skill'|'scripts'|'tests', name }, or null. */
export function ownerOf(rel) {
  const [top, name] = rel.split('/');
  if (top === 'packages' && name) return { kind: 'package', name };
  if (top === 'apps' && name) return { kind: 'app', name };
  if (top === 'skills' && name) return { kind: 'skill', name };
  if (top === 'scripts' || top === 'tests') return { kind: top, name: top };
  return null;
}

/** The module names (D-059): the root package.json `imports` map, each name to its repo path. */
export function namesOf(pkg) {
  return new Map(Object.entries(pkg.imports ?? {}).map(([name, target]) => [name, path.posix.normalize(target)]));
}

/** Every reference in a file: { how: 'import'|'path', spec }. An import loads code or CSS; a path
 * names a file (new URL, glob, href/src). A CSS @import is an import. */
export function referencesOf(rel, text) {
  const all = (re, how) => [...text.matchAll(re)].map((m) => ({ how, spec: m[1] ?? m[2] ?? m[3] }));
  if (rel.endsWith('.html')) return all(LINK, 'path');
  if (rel.endsWith('.css')) return all(CSS_IMPORT, 'import');
  return [...all(IMPORT, 'import'), ...all(URL_PATH, 'path'), ...all(GLOB, 'path')];
}

/** The repo path a reference reaches: a module name through `names`, a relative path from the
 * file. undefined for a name not in the map; null for node:, bare and absolute specifiers. */
export function targetOf(fromRel, spec, names) {
  if (spec.startsWith('#')) return names.get(spec);
  if (!spec.startsWith('.')) return null;
  return path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), spec));
}

const same = (a, b) => a.kind === b.kind && a.name === b.name;

/** Rule 1 / D-016, D-059: a module is reached only by its name (code, CSS, HTML, file paths);
 * names follow the layers; nothing but test code imports an app; nothing imports scripts/. */
export function checkReferences(fromRel, text, names, layers = LAYERS) {
  const from = ownerOf(fromRel);
  if (!from) return [];
  const out = [];
  for (const { how, spec } of referencesOf(fromRel, text)) {
    const named = spec.startsWith('#');
    const target = targetOf(fromRel, spec, names);
    if (target === undefined) out.push(fail(fromRel, `${spec} is not a module name (package.json "imports", D-059)`));
    const to = target && ownerOf(target);
    if (!to) continue;
    if (same(from, to)) {
      if (named) out.push(fail(fromRel, `imports its own module's name (${spec}); use a relative path inside a module`));
    } else if (to.kind === 'package') {
      if (!named) out.push(fail(fromRel, `back door into packages/${to.name} (${spec}): reach it by its name, #${to.name} (package.json "imports", D-059)`));
      else if (from.kind === 'package' && !(layers[from.name] ?? []).includes(to.name)) {
        out.push(fail(fromRel, `packages/${from.name} may not depend on packages/${to.name} (${spec}); see LAYERS / D-016`));
      }
    } else if (how === 'import' && to.kind === 'app' && !APP_TESTS.test(fromRel)) {
      out.push(fail(fromRel, `imports an app (${spec}); apps are never imported`));
    } else if (how === 'import' && to.kind === 'scripts') {
      out.push(fail(fromRel, `imports scripts/ (${spec})`));
    } else if (how === 'import' && from.kind === 'package' && !named) {
      out.push(warn(fromRel, `imports ${spec} from outside its module by path: give it a home in a module and import it by name`));
    }
  }
  return out;
}

/** The board's own folder: what any host mounts (board/mount.ts, ARCH_03). */
export const BOARD_DIR = 'apps/board/src/board/';

/** Principles § The board is a plugin: nothing under the board's folder imports the page around it
 * (the standalone shell, its flags, its gallery) or Svelte, so the board mounts in any host. */
export function checkBoardHost(fromRel, text) {
  if (!fromRel.startsWith(BOARD_DIR)) return [];
  const out = [];
  for (const { how, spec } of referencesOf(fromRel, text)) {
    if (how !== 'import') continue;
    const target = spec.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), spec)) : null;
    if (target?.startsWith('apps/board/src/') && !target.startsWith(BOARD_DIR)) {
      out.push(fail(fromRel, `imports its host (${spec}): the board takes what it needs from \`mount(root, host)\` (board/host.ts), never from the page around it`));
    } else if (spec === 'svelte' || spec.startsWith('svelte/') || spec.endsWith('.svelte') || spec.includes('.svelte.')) {
      out.push(fail(fromRel, `imports Svelte (${spec}): the board is framework-free and hostable; no Svelte type crosses its host interface`));
    }
  }
  return out;
}

/** The board page's assets at start: what its HTML loads from /assets/, and every file those import
 * statically. A chunk reached only through `import()` is not loaded at start (the chat panel's drawing,
 * board/chat-view.ts), so it is not counted. `read(name)` gives an asset's text, or null. */
export function pageAssets(html, read) {
  const seen = new Set();
  const queue = [...html.matchAll(/(?:src|href)="\/assets\/([\w.-]+\.(?:js|css))"/g)].map((m) => m[1]);
  while (queue.length) {
    const name = queue.shift();
    if (seen.has(name)) continue;
    seen.add(name);
    if (name.endsWith('.js')) for (const m of (read(name) ?? '').matchAll(/(?:\bfrom|\bimport)\s*["']\.\/([\w.-]+\.(?:js|css))["']/g)) queue.push(m[1]);
  }
  return [...seen];
}

/** Rule 15: the page's gzipped weight against its budget. */
export function checkWeight(file, gzipBytes, budgetKb) {
  if (gzipBytes <= budgetKb * 1024) return [];
  return [fail(file, `the board page is ${(gzipBytes / 1024).toFixed(1)} KB gzip (JS + CSS), budget ${budgetKb} KB (docs/specification/performance.md)`)];
}

/** The built board page's gzipped weight in bytes, or null when it has not been built. */
export function pageWeight(root) {
  const html = path.join(root, PAGE.html);
  if (!existsSync(html)) return null;
  const dir = path.join(path.dirname(html), 'assets');
  const read = (name) => (existsSync(path.join(dir, name)) ? readFileSync(path.join(dir, name), 'utf8') : null);
  return pageAssets(readFileSync(html, 'utf8'), read)
    .reduce((sum, name) => sum + gzipSync(readFileSync(path.join(dir, name))).length, 0);
}

function weightOf(root) {
  const bytes = pageWeight(root);
  if (bytes === null) return [warn(PAGE.html, 'not built, so the page weight was not checked: run npm run build')];
  return checkWeight(PAGE.html, bytes, PAGE.budgetKb);
}

/** Rule 20: exact versions only, and every dependency listed in the register. */
export function checkManifest(file, json, registerText) {
  const out = [];
  const names = [];
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const [name, version] of Object.entries(json[field] ?? {})) {
      names.push(name);
      if (!EXACT.test(version)) out.push(fail(file, `${name}@${version} is not an exact version`));
    }
  }
  for (const name of names) {
    if (registerText === null) out.push(fail(file, `${name} has no dependency register (${REGISTER})`));
    else if (!registerText.includes(`\`${name}\``)) out.push(fail(file, `${name} is missing from ${REGISTER}`));
  }
  return out;
}

/** The module map: who depends on whom (from real imports, by name or path) and each package's
 * public API. Test-only folders (tests/, skills/) are left out. */
export function buildMap(files, names = new Map()) {
  const deps = new Map();
  const ensure = (key) => deps.get(key) ?? deps.set(key, new Set()).get(key);
  for (const { rel, text } of files) {
    const from = ownerOf(rel);
    if (!from || !['package', 'app', 'scripts'].includes(from.kind) || !CODE.test(rel)) continue;
    const key = `${from.kind === 'package' ? 'packages' : from.kind === 'app' ? 'apps' : ''}/${from.name}`.replace(/^\//, '');
    ensure(key);
    for (const { how, spec } of referencesOf(rel, text)) {
      const target = how === 'import' && targetOf(rel, spec, names);
      const to = target && ownerOf(target);
      if (to?.kind === 'package' && !(from.kind === 'package' && to.name === from.name)) ensure(key).add(`packages/${to.name}`);
    }
  }
  const usedBy = (mod) => [...deps].filter(([, set]) => set.has(mod)).map(([k]) => k).sort();
  const api = (mod) => {
    const index = files.find((f) => f.rel === `${mod}/src/index.ts`);
    if (!index) return '—';
    const names = [...index.text.matchAll(/export\s+(?:type\s+)?(\*|\{[^}]*\})\s+from\s+['"]\.\/([^'"]+)['"]/g)]
      .map(([, what, src]) => (what === '*' ? `* from ${src}` : what.replace(/\s+/g, ' ').trim()));
    return names.join('; ') || '—';
  };
  const rows = [...deps.keys()].sort().map((mod) =>
    `| \`${mod}\` | ${[...deps.get(mod)].sort().map((d) => `\`${d}\``).join(', ') || '—'} | ${usedBy(mod).map((d) => `\`${d}\``).join(', ') || '—'} | ${api(mod)} |`);
  return [
    '# Module map',
    '',
    '> Generated by `npm run map` from the real imports. Do not edit by hand: `npm run verify` fails',
    '> when this file is out of date. Allowed layers are `LAYERS` in `scripts/verify.mjs` (D-016).',
    '',
    '| Module | Depends on | Used by | Public API (`src/index.ts`) |',
    '|---|---|---|---|',
    ...rows,
    '',
  ].join('\n');
}

function walk(root, dir, out) {
  for (const name of readdirSync(path.join(root, dir))) {
    if (name === 'node_modules' || name.startsWith('.') || name === 'dist') continue;
    const rel = path.posix.join(dir, name);
    if (statSync(path.join(root, rel)).isDirectory()) walk(root, rel, out);
    else if (SOURCE.test(name)) out.push({ rel, text: readFileSync(path.join(root, rel), 'utf8') });
  }
  return out;
}

export function verify(root, { writeMap = false } = {}) {
  const files = ROOTS.filter((r) => existsSync(path.join(root, r))).flatMap((r) => walk(root, r, []));
  const names = namesOf(JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')));
  const results = files.flatMap(({ rel, text }) => [...checkLength(rel, text), ...(FIXTURE_HOST.test(rel) ? [] : checkReferences(rel, text, names)),
    ...checkStyleAndLayers(rel, text), ...checkBoardHost(rel, text)]);
  const registerPath = path.join(root, REGISTER);
  const register = existsSync(registerPath) ? readFileSync(registerPath, 'utf8') : null;
  const manifests = ['package.json', ...['apps', 'packages'].flatMap((r) =>
    existsSync(path.join(root, r)) ? readdirSync(path.join(root, r)).map((n) => `${r}/${n}/package.json`) : [])];
  for (const m of manifests.filter((m) => existsSync(path.join(root, m)))) {
    results.push(...checkManifest(m, JSON.parse(readFileSync(path.join(root, m), 'utf8')), register));
  }
  results.push(...weightOf(root));
  const map = buildMap(files.filter((f) => !FIXTURE_HOST.test(f.rel)), names);
  const mapPath = path.join(root, MAP_FILE);
  if (writeMap) writeFileSync(mapPath, map);
  else if (!existsSync(mapPath) || readFileSync(mapPath, 'utf8') !== map) results.push(fail(MAP_FILE, 'out of date: run npm run map'));
  return results;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const results = verify(root, { writeMap: process.argv.includes('--write-map') });
  for (const r of results) console.log(`${r.level === 'fail' ? 'FAIL' : 'warn'}  ${r.file}: ${r.message}`);
  const fails = results.filter((r) => r.level === 'fail').length;
  console.log(fails ? `\n${fails} failure(s).` : `\nverify: ok (${results.length} warning(s))`);
  process.exit(fails ? 1 : 0);
}
