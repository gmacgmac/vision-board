// Proves the data-folder rule in verify-data-folder.mjs fails when broken and passes when kept: only
// the paths module names `.visionboard` or a data-folder file as a path (PATHS_01, PLAN decision 2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODULE, PENDING, checkDataFolder, dataFolderPaths } from './verify-data-folder.mjs';

const levels = (r) => r.map((x) => x.level);
const DOT = '.vision' + 'board'; // built, so this file names no path itself

test('a data-folder path outside the module fails, in source and in tests, however it is built', () => {
  for (const code of [
    `const d = path.join(project, '${DOT}');`,
    `const f = path.join(dir, '${DOT}', 'ledger.jsonl');`,
    `const f = \`\${project}/${DOT}/lock\`;`,
    `const f = path.join(dir, "agents.json");`,
    `const f = '${DOT}/attachments/2026-10-30/1-a.txt';`,
    `const f = path.join(home, 'recent.json');`,
  ]) {
    assert.deepEqual(levels(checkDataFolder('apps/board/server/a.ts', code)), ['fail'], code);
    assert.deepEqual(levels(checkDataFolder('apps/board/tests/a.test.ts', code)), ['fail'], code);
    assert.deepEqual(levels(checkDataFolder('packages/client/src/a.ts', code)), ['fail'], code);
  }
});

test('the module, sentences, comments, other names and other roots pass', () => {
  const path = `const f = path.join(dir, '${DOT}', 'ledger.jsonl');`;
  assert.deepEqual(checkDataFolder(MODULE, `export const DATA_DIR = '${DOT}';`), []);
  assert.deepEqual(checkDataFolder('apps/board/server/a.ts', `// ${DOT}/ledger.jsonl\n/* '${DOT}' */ const x = 1;`), [], 'comments');
  assert.deepEqual(checkDataFolder('apps/board/server/a.ts', `const s = "There is no app in this folder's ${DOT}/apps/.";`), [], 'a sentence is the words rule\'s');
  assert.deepEqual(checkDataFolder('apps/board/server/a.ts', "const f = 'roadmap.ledger.jsonl'; const g = '%2e%2e%2fledger.jsonl';"), [], 'a name inside another name');
  assert.deepEqual(checkDataFolder('apps/board/server/a.ts', "import { ledgerFiles } from '#format'; const f = ledgerFiles(dir).ledger;"), []);
  for (const rel of ['apps/board/server/words/a.ts', 'packages/format/schema/a.schema.json', 'packages/cli/src/a.generated.ts',
    'packages/agent/src/access-rules.ts', 'packages/agent/tests/a.test.ts', 'scripts/a.mjs', 'tests/pages/a.spec.ts', 'apps/board/src/a.css']) {
    assert.deepEqual(checkDataFolder(rel, path), [], rel);
  }
});

test('a test of the layout seen from outside passes with its marker and a reason, not without the reason', () => {
  const code = `const f = '${DOT}/attachments/2026-10-30/1-a.txt';`;
  assert.deepEqual(checkDataFolder('apps/board/tests/a.test.ts', `// verify: data-folder-literal what an agent is told\n${code}`), []);
  assert.deepEqual(levels(checkDataFolder('apps/board/tests/a.test.ts', `// verify: data-folder-literal\n${code}`)), ['fail']);
});

test('no file is pending any more: the gallery\'s attachment sample takes its path from the module, so a literal there fails', () => {
  assert.deepEqual(PENDING, []);
  assert.deepEqual(levels(checkDataFolder('apps/board/src/gallery/attach-section.ts', `const DAY = '${DOT}/attachments/2026-10-30';`)), ['fail']);
});

test('dataFolderPaths: each path literal once, a template\'s ${} parts left out', () => {
  assert.deepEqual(dataFolderPaths(`a('${DOT}'); b(\`\${x}/${DOT}/lock\`); c('ledger.jsonl.bak');`), [DOT, `/${DOT}/lock`]);
});
