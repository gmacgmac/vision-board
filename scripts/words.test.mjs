// Holds the words homes true (cortex-architecture rule 7; docs/specification/words.md): the doc and
// the code list the same homes, no sentence stands outside one, every sentence has one unique key,
// and a words file imports nothing but other words files. A planted literal fails: words-scan.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DEVELOPER_TEXT, EXEMPT, NOT_SCANNED, OTHER_HOMES, PARTS, sentencesOutside } from './words-homes.mjs';

const DOC = 'docs/specification/words.md';
const doc = readFileSync(DOC, 'utf8');

/** The first cells (the backticked paths) of the table under a heading of the doc. */
function rows(heading) {
  const body = doc.split(/^## /m).find((s) => s.startsWith(heading));
  assert.ok(body, `${DOC} has no "## ${heading}" section`);
  return body.split('\n').filter((l) => /^\|\s*`/.test(l)).map((l) => l.split('|').slice(1, -1).map((c) => c.trim().replace(/^`|`$/g, '')));
}

const wordsFiles = PARTS.flatMap((p) => readdirSync(p.words).filter((f) => f.endsWith('.ts')).map((f) => `${p.words}/${f}`)).sort();

test('the doc lists every words file, and every file it lists exists', () => {
  assert.deepEqual(rows('Homes').map((r) => r[0]).sort(), wordsFiles);
});

test('the doc lists the other homes, the unscanned roots and the exemptions the code holds', () => {
  assert.deepEqual(rows('Other homes').map((r) => r[0]).sort(), OTHER_HOMES.map((h) => h.path).sort());
  assert.deepEqual(rows('Developer text').map((r) => r[0]).sort(), DEVELOPER_TEXT.map((h) => h.path).sort());
  assert.deepEqual(rows('Not scanned yet').map((r) => r[0]).sort(), NOT_SCANNED.map((h) => h.path).sort());
  assert.deepEqual(rows('Exemptions').map((r) => `${r[0]} ${r[1]}`).sort(), EXEMPT.map((e) => `${e.file} ${e.text}`).sort());
});

test('every other home and every file of developer text exists', () => {
  for (const h of [...OTHER_HOMES, ...DEVELOPER_TEXT]) assert.ok(readdirSync(path.dirname(h.path)).includes(path.basename(h.path)), `${h.path} is gone`);
});

test('no sentence a person or an agent reads stands outside a words file', () => {
  assert.deepEqual(sentencesOutside(), []);
});

/** `board.<area>.<name>` for each export of a words file; an object's members are dotted on. */
async function keysOf(file) {
  const area = path.basename(file, '.ts');
  const keys = [];
  const walk = (prefix, value) => {
    if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) walk(`${prefix}.${k}`, v);
    else keys.push(prefix);
  };
  for (const [name, value] of Object.entries(await import(pathToFileURL(path.resolve(file)).href))) walk(`board.${area}.${name}`, value);
  return keys;
}

test('every sentence has a key, board.<area>.<name>, and no two share one', async () => {
  const all = (await Promise.all(wordsFiles.map(keysOf))).flat();
  assert.ok(all.length > 0, 'no words found');
  assert.deepEqual(all.filter((k) => !/^board\.[a-z0-9-]+\.[A-Za-z0-9.]+$/.test(k)), []);
  const twice = all.filter((k, i) => all.indexOf(k) !== i);
  assert.deepEqual(twice, [], 'a key is used twice: two words files share an area name');
});

test('a words file imports only other words files, and types', () => {
  for (const f of wordsFiles) {
    const bad = [...readFileSync(f, 'utf8').matchAll(/^import (?!type\b)[^\n]*from\s*'([^']+)'/gm)].filter((m) => !/^\.\/[\w-]+\.ts$/.test(m[1]));
    assert.deepEqual(bad.map((m) => m[1]), [], `${f} imports code that is not a words file`);
  }
});

test('a fixed sentence has one home in a group of parts: shared text lives in a common.ts', async () => {
  for (const group of new Set(PARTS.map((p) => p.group))) {
    const seen = new Map();
    for (const f of wordsFiles.filter((w) => PARTS.some((p) => p.group === group && w.startsWith(`${p.words}/`)))) {
      for (const [name, value] of Object.entries(await import(pathToFileURL(path.resolve(f)).href))) {
        if (typeof value !== 'string') continue;
        assert.ok(!seen.has(value), `"${value}" is in ${seen.get(value)} and ${f}; say it once, in a common.ts`);
        seen.set(value, `${f} ${name}`);
      }
    }
  }
});
