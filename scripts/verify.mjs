// Project rule checks, one command, zero dependencies (D-016). Run: npm run verify.
// Rules: steering rule 1 (layers + front doors), rule 2 (file length), rule 15 (the board page's
// weight, from the last `npm run build`), rule 20 and cortex-rules 11 (exact versions, dependency
// register), and the generated module map (docs/specification/modules.md).
// Each check is a pure function over strings, so scripts/verify.test.mjs proves every rule fails
// when broken. `--write-map` regenerates the module map instead of checking it.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

export const LIMITS = { warn: 300, fail: 500 };
export const ROOTS = ['apps', 'packages', 'scripts'];
export const MAP_FILE = 'docs/specification/modules.md';
export const REGISTER = 'docs/specification/dependencies.md';
/** Rule 15: the board page's JS and CSS, gzipped (docs/specification/performance.md § Budgets). */
export const PAGE = { html: 'apps/board/dist/index.html', budgetKb: 150 };

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
const IMPORT = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
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

/** The module a repo path belongs to: { kind: 'package'|'app'|'scripts', name }, or null. */
export function ownerOf(rel) {
  const [top, name] = rel.split('/');
  if (top === 'packages' && name) return { kind: 'package', name };
  if (top === 'apps' && name) return { kind: 'app', name };
  if (top === 'scripts') return { kind: 'scripts', name: 'scripts' };
  return null;
}

/** Repo-relative target of an import, or null for node:/bare specifiers. `/pkg/x/...` is the browser alias for packages/x/. */
export function resolveImport(fromRel, spec) {
  if (spec.startsWith('/pkg/')) return path.posix.join('packages', spec.slice(5));
  if (!spec.startsWith('.')) return null;
  return path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), spec));
}

export function importsOf(text) {
  return [...text.matchAll(IMPORT)].map((m) => m[1] ?? m[2]);
}

/** Rule 1 / D-016: layer direction, no package imports an app, cross-module imports use the front door. */
export function checkImports(fromRel, text, layers = LAYERS) {
  const from = ownerOf(fromRel);
  if (!from) return [];
  const out = [];
  for (const spec of importsOf(text)) {
    const target = resolveImport(fromRel, spec);
    if (!target) continue;
    const to = ownerOf(target);
    if (!to || (to.kind === from.kind && to.name === from.name)) continue;
    if (to.kind === 'app') {
      out.push(fail(fromRel, `imports an app (${spec}); apps are never imported`));
      continue;
    }
    if (to.kind === 'scripts') {
      out.push(fail(fromRel, `imports scripts/ (${spec})`));
      continue;
    }
    if (from.kind === 'package' && !(layers[from.name] ?? []).includes(to.name)) {
      out.push(fail(fromRel, `packages/${from.name} may not depend on packages/${to.name} (${spec}); see LAYERS / D-016`));
    }
    if (target !== `packages/${to.name}/src/index.ts`) {
      out.push(fail(fromRel, `back-door import ${spec}; import packages/${to.name}/src/index.ts instead`));
    }
  }
  return out;
}

/** The board page's assets: what its HTML loads from /assets/, and every file those import,
 * statically or lazily. `read(name)` gives an asset's text, or null. */
export function pageAssets(html, read) {
  const seen = new Set();
  const queue = [...html.matchAll(/(?:src|href)="\/assets\/([\w.-]+\.(?:js|css))"/g)].map((m) => m[1]);
  while (queue.length) {
    const name = queue.shift();
    if (seen.has(name)) continue;
    seen.add(name);
    if (name.endsWith('.js')) for (const m of (read(name) ?? '').matchAll(/["']\.\/([\w.-]+\.(?:js|css))["']/g)) queue.push(m[1]);
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

/** The module map: who depends on whom (from real imports) and each package's public API. */
export function buildMap(files) {
  const deps = new Map();
  const ensure = (key) => deps.get(key) ?? deps.set(key, new Set()).get(key);
  for (const { rel, text } of files) {
    const from = ownerOf(rel);
    if (!from || !CODE.test(rel)) continue;
    const key = `${from.kind === 'package' ? 'packages' : from.kind === 'app' ? 'apps' : ''}/${from.name}`.replace(/^\//, '');
    ensure(key);
    for (const spec of importsOf(text)) {
      const target = resolveImport(rel, spec);
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
  const results = files.flatMap(({ rel, text }) => [...checkLength(rel, text), ...(CODE.test(rel) && !FIXTURE_HOST.test(rel) ? checkImports(rel, text) : [])]);
  const registerPath = path.join(root, REGISTER);
  const register = existsSync(registerPath) ? readFileSync(registerPath, 'utf8') : null;
  const manifests = ['package.json', ...['apps', 'packages'].flatMap((r) =>
    existsSync(path.join(root, r)) ? readdirSync(path.join(root, r)).map((n) => `${r}/${n}/package.json`) : [])];
  for (const m of manifests.filter((m) => existsSync(path.join(root, m)))) {
    results.push(...checkManifest(m, JSON.parse(readFileSync(path.join(root, m), 'utf8')), register));
  }
  results.push(...weightOf(root));
  const map = buildMap(files.filter((f) => !FIXTURE_HOST.test(f.rel)));
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
