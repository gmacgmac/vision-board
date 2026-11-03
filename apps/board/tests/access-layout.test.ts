// The agent's file rules and the paths module, held equal (PLAN decision 2, D-084 2): `packages/agent`
// keeps its own table (`ACCESS_RULES`, D-037), so this test asks it about every file the paths module
// names, in both layouts (`.visionboard/<file>` and `.visionboard/<ledger>/<file>`, at the project and in
// a nested project), and expects the verdicts PLAN decision 2 and ACCESS_01 set: the secrets refused both
// ways, the ledger and the board's files read-only, pictures and apps writable. A file added to the module
// without a verdict here fails; so does a table row naming a data-folder file the module does not hold.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AccessVerdict } from '#agent';
import { ACCESS_RULES, accessFor } from '#agent';
import type { LedgerFiles, ProjectFiles } from '#format';
import { CHAT_SESSIONS_FILE, DATA_DIR, DATA_FOLDER_NAMES, MAIN_LEDGER, PER_LEDGER_NAMES, RECENT_FILE, ledgerFiles, ledgerFolder, projectFiles } from '#format';

type Verdicts = readonly [read: AccessVerdict, write: AccessVerdict];
const REFUSED: Verdicts = ['refuse', 'refuse'];
const READ_ONLY: Verdicts = ['allow', 'refuse'];
const WRITABLE: Verdicts = ['allow', 'allow'];

/** Each file of a ledger folder, and what an agent may do with it (a folder: with a file inside it). */
const PER_LEDGER: Record<keyof LedgerFiles, Verdicts> = {
  ledger: READ_ONLY, agents: REFUSED, lock: READ_ONLY, images: WRITABLE, apps: WRITABLE, appState: REFUSED, gitignore: READ_ONLY,
};
/** Each repo-wide file, at `.visionboard/` only. */
const REPO_WIDE: Record<Exclude<keyof ProjectFiles, 'root'>, Verdicts> = {
  gitignore: READ_ONLY, chatSessions: REFUSED, permissions: READ_ONLY, attachments: READ_ONLY,
};
/** The folders among them: the rules are asked about a file inside. */
const FOLDERS = new Set<string>(['images', 'apps', 'appState', 'attachments']);
/** Refused wherever it sits: its rows reach a nested project too (`**`). */
const SECRET = new Set<string>(['agents', 'appState', 'chatSessions']);

const verdicts = (rel: string): Verdicts => [accessFor(rel, 'read').verdict, accessFor(rel, 'write').verdict];
const target = (key: string, p: string) => (FOLDERS.has(key) ? `${p}/x/1.json` : p);

/** Every ledger folder the rules must know, as an agent names it (relative to the board's folder). */
const LEDGER_DIRS = [ledgerFolder(''), ledgerFolder('', MAIN_LEDGER), ledgerFolder('', 'ui')];

test('every file the paths module names has a verdict here: none added without a rule', () => {
  assert.deepEqual(Object.keys(ledgerFiles('d')).sort(), Object.keys(PER_LEDGER).sort());
  assert.deepEqual(Object.keys(projectFiles('p')).filter((k) => k !== 'root').sort(), Object.keys(REPO_WIDE).sort());
  const named = new Set([...Object.values(ledgerFiles('d')), ...Object.values(projectFiles('p'))].map((f) => f.split('/').pop()));
  assert.deepEqual(DATA_FOLDER_NAMES.filter((n) => !named.has(n)), [RECENT_FILE], 'only the home folder\'s recent list is not a project file');
});

test('a ledger\'s files, in both layouts and every ledger: the verdicts PLAN decision 2 set', () => {
  for (const dir of LEDGER_DIRS) {
    for (const [key, want] of Object.entries(PER_LEDGER)) {
      const rel = target(key, ledgerFiles(dir)[key as keyof LedgerFiles]);
      assert.deepEqual(verdicts(rel), want, rel);
    }
  }
});

test('the repo-wide files at .visionboard/: the person\'s, never written by an agent; the chat index never read', () => {
  for (const [key, want] of Object.entries(REPO_WIDE)) {
    const rel = target(key, projectFiles('')[key as keyof typeof REPO_WIDE]);
    assert.deepEqual(verdicts(rel), want, rel);
  }
  for (const dir of LEDGER_DIRS.slice(1)) {
    assert.deepEqual(verdicts(`${dir}/${CHAT_SESSIONS_FILE}`), REFUSED, 'the chat index is closed in a ledger folder too (ACCESS_01)');
  }
});

test('the secrets in a nested project, in both layouts: refused both ways', () => {
  for (const dir of [ledgerFolder('sub'), ledgerFolder('sub', MAIN_LEDGER)]) {
    for (const key of SECRET) {
      if (!(key in PER_LEDGER)) continue;
      const rel = target(key, ledgerFiles(dir)[key as keyof LedgerFiles]);
      assert.deepEqual(verdicts(rel), REFUSED, rel);
    }
  }
  assert.deepEqual(verdicts(projectFiles('sub').chatSessions), REFUSED);
});

test('every row of the table that names the data folder names a file the paths module holds, in both layouts', () => {
  const rows = ACCESS_RULES.map((r) => r.path).filter((p) => p.includes(DATA_DIR));
  const names = new Set<string>(DATA_FOLDER_NAMES);
  for (const row of rows) {
    const after = row.slice(row.indexOf(DATA_DIR) + DATA_DIR.length + 1).split('/');
    const [first, second] = after;
    if (first === '**') continue; // `.visionboard/**`: the board's files, read-only
    const name = first === '*' ? second! : first!;
    assert.ok(names.has(name), `${row}: ${name} is a data-folder name`);
    // A ledger-folder row (`*/`) names a per-ledger file, or the chat index closed there too (ACCESS_01).
    if (first === '*') assert.ok((PER_LEDGER_NAMES as readonly string[]).includes(name) || name === CHAT_SESSIONS_FILE, `${row}: per ledger`);
  }
  const twinned = (name: string) => rows.some((r) => r.includes(`${DATA_DIR}/${name}`)) && rows.some((r) => r.includes(`${DATA_DIR}/*/${name}`));
  for (const name of PER_LEDGER_NAMES.filter((n) => rows.some((r) => r.includes(`${DATA_DIR}/${n}`)))) assert.ok(twinned(name), `${name}: a row in both layouts`);
});
