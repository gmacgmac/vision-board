// The one paths module (packages/format/src/data-folder.ts, PLAN decision 2): every data-folder path
// from a project, a ledger folder or home, joined with `/`; `projectOfLedger` undoes `ledgerFolder`;
// and the module stays pure (no `node:` import, no import at all), because the page loads `#format`.
// verify: data-folder-literal the layout seen from outside: these literals are what the module must give
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  DATA_FOLDER_NAMES, homeFiles, ledgerFiles, ledgerFolder, projectFiles, projectOfLedger,
} from '../src/index.ts';

const P = '/Users/someone/work/project';

test('ledgerFolder: the project\'s .visionboard, today', () => {
  assert.equal(ledgerFolder(P), `${P}/.visionboard`);
  assert.equal(ledgerFolder(`${P}/`), `${P}/.visionboard`, 'a trailing slash adds no empty step');
});

test('ledgerFiles: every file of one ledger folder', () => {
  const d = `${P}/.visionboard`;
  assert.deepEqual(ledgerFiles(d), {
    ledger: `${d}/ledger.jsonl`, agents: `${d}/agents.json`, lock: `${d}/lock`, images: `${d}/images`,
    apps: `${d}/apps`, appState: `${d}/app-state`, gitignore: `${d}/.gitignore`,
  });
});

test('projectFiles: the repo-wide files, absolute or relative to the project', () => {
  assert.deepEqual(projectFiles(P), {
    root: `${P}/.visionboard`, gitignore: `${P}/.visionboard/.gitignore`, chatSessions: `${P}/.visionboard/chat-sessions.json`,
    permissions: `${P}/.visionboard/permissions.json`, attachments: `${P}/.visionboard/attachments`,
  });
  assert.equal(projectFiles('').attachments, '.visionboard/attachments', 'what an agent is told');
});

test('homeFiles: the person\'s recent folders', () => {
  assert.deepEqual(homeFiles('/Users/someone'), { recent: '/Users/someone/.visionboard/recent.json' });
});

test('projectOfLedger inverts ledgerFolder, on POSIX, Windows-style and edge paths', () => {
  for (const p of [P, '/x', 'relative/project']) assert.equal(projectOfLedger(ledgerFolder(p)), p);
  assert.equal(projectOfLedger(`${ledgerFolder(P)}/`), P, 'a trailing slash');
  assert.equal(projectOfLedger('C:\\work\\project\\.visionboard'), 'C:\\work\\project');
  assert.equal(projectOfLedger('/.visionboard'), '/');
  assert.equal(projectOfLedger('.visionboard'), '.');
});

test('the names: each once, and every path above ends in one of them', () => {
  assert.equal(new Set(DATA_FOLDER_NAMES).size, DATA_FOLDER_NAMES.length);
  const { root: _, ...repoWide } = projectFiles('p');
  const ends = new Set([...Object.values(ledgerFiles('d')), ...Object.values(repoWide), homeFiles('h').recent].map((f) => f.split('/').pop()));
  assert.deepEqual([...ends].sort(), [...DATA_FOLDER_NAMES].sort());
});

test('data-folder.ts is pure: no import at all, so no node: and nothing the page can\'t load', () => {
  const code = fs.readFileSync(new URL('../src/data-folder.ts', import.meta.url), 'utf8')
    .split('\n').filter((l) => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n');
  assert.doesNotMatch(code, /^\s*import\s|\bimport\(|node:/m);
  assert.doesNotMatch(code, /\b(Buffer|process|require|document|window|globalThis|fetch)\b/);
});
