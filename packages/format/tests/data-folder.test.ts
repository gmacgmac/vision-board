// The one paths module (packages/format/src/data-folder.ts, PLAN decision 2): every data-folder path
// from a project, a ledger folder or home, joined with `/`; `projectOfLedger` undoes `ledgerFolder`;
// both layouts (D-084 1: `.visionboard/<ledger>/`, and the old `.visionboard/`); the ledger name rule;
// and the module stays pure (no `node:` import, only its words file), because the page loads `#format`.
// verify: data-folder-literal the layout seen from outside: these literals are what the module must give
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  DATA_FOLDER_NAMES, LEDGER_NAME_MAX, MAIN_LEDGER, PER_LEDGER_NAMES, homeFiles, ledgerFiles, ledgerFolder, ledgerNameProblem,
  ledgerOfFolder, projectFiles, projectOfLedger,
} from '../src/index.ts';

const P = '/Users/someone/work/project';

test('ledgerFolder: the project\'s .visionboard, today', () => {
  assert.equal(ledgerFolder(P), `${P}/.visionboard`);
  assert.equal(ledgerFolder(`${P}/`), `${P}/.visionboard`, 'a trailing slash adds no empty step');
});

test('ledgerFolder with a ledger named: .visionboard/<ledger>, beside the repo-wide files', () => {
  assert.equal(ledgerFolder(P, 'main'), `${P}/.visionboard/main`);
  assert.equal(ledgerFolder(P, 'ui'), `${P}/.visionboard/ui`);
  assert.equal(ledgerFolder('', 'ui'), '.visionboard/ui', 'relative to the project');
  assert.equal(ledgerFiles(ledgerFolder(P, 'ui')).agents, `${P}/.visionboard/ui/agents.json`);
  assert.equal(projectFiles(P).chatSessions, `${P}/.visionboard/chat-sessions.json`, 'repo-wide files stay at .visionboard/');
  assert.equal(MAIN_LEDGER, 'main');
});

test('ledgerOfFolder: the name in the new layout, none in the old', () => {
  assert.equal(ledgerOfFolder(ledgerFolder(P, 'ui')), 'ui');
  assert.equal(ledgerOfFolder(`${ledgerFolder(P, 'main')}/`), 'main');
  assert.equal(ledgerOfFolder('C:\\work\\project\\.visionboard\\ui'), 'ui');
  assert.equal(ledgerOfFolder(ledgerFolder(P)), undefined);
  assert.equal(ledgerOfFolder('.visionboard'), undefined);
});

test('ledgerNameProblem: an id like a board id, at most 40 characters, never a data-folder name', () => {
  for (const ok of ['main', 'ui', 'a', '0', 'plan-2026-11', 'x'.repeat(LEDGER_NAME_MAX)]) assert.equal(ledgerNameProblem(ok), undefined, ok);
  assert.equal(LEDGER_NAME_MAX, 40);
  assert.match(ledgerNameProblem('x'.repeat(LEDGER_NAME_MAX + 1))!, /at most 40 characters/);
  for (const bad of ['', 'Main', 'ui plans', '-ui', 'ui_x', 'ui/x', '..', '.git', 'ü', 'a.b']) {
    assert.match(ledgerNameProblem(bad)!, /lowercase letters, digits and -/, JSON.stringify(bad));
  }
  for (const taken of ['images', 'apps', 'app-state', 'attachments', 'lock']) {
    assert.match(ledgerNameProblem(taken)!, new RegExp(`"${taken}" is the name of a file or folder the board keeps`), taken);
  }
  for (const name of DATA_FOLDER_NAMES) assert.ok(ledgerNameProblem(name), `${name} is refused (dotted names by their characters)`);
});

test('PER_LEDGER_NAMES: exactly the names ledgerFiles gives', () => {
  assert.deepEqual([...PER_LEDGER_NAMES].sort(), Object.values(ledgerFiles('d')).map((f) => f.split('/').pop()).sort());
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

test('projectOfLedger inverts ledgerFolder in the new layout too', () => {
  for (const p of [P, '/x', 'relative/project']) assert.equal(projectOfLedger(ledgerFolder(p, 'ui')), p);
  assert.equal(projectOfLedger(`${ledgerFolder(P, 'main')}/`), P, 'a trailing slash');
  assert.equal(projectOfLedger('C:\\work\\project\\.visionboard\\main'), 'C:\\work\\project');
  assert.equal(projectOfLedger('/.visionboard/main'), '/');
  assert.equal(projectOfLedger('.visionboard/main'), '.');
});

test('the names: each once, and every path above ends in one of them', () => {
  assert.equal(new Set(DATA_FOLDER_NAMES).size, DATA_FOLDER_NAMES.length);
  const { root: _, ...repoWide } = projectFiles('p');
  const ends = new Set([...Object.values(ledgerFiles('d')), ...Object.values(repoWide), homeFiles('h').recent].map((f) => f.split('/').pop()));
  assert.deepEqual([...ends].sort(), [...DATA_FOLDER_NAMES].sort());
});

test('data-folder.ts is pure: only its words file imported, so no node: and nothing the page can\'t load', () => {
  const code = fs.readFileSync(new URL('../src/data-folder.ts', import.meta.url), 'utf8')
    .split('\n').filter((l) => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n');
  const imports = [...code.matchAll(/^\s*import\s.*from '([^']+)';$/gm)].map((m) => m[1]);
  assert.deepEqual(imports, ['./words/format-common.ts']);
  assert.doesNotMatch(code.replace(/^\s*import\s.*$/gm, ''), /^\s*import\s|\bimport\(|node:/m);
  assert.doesNotMatch(code, /\b(Buffer|process|require|document|window|globalThis|fetch)\b/);
});
