// Nothing under `board/` assumes it owns the page (principles § The board is a plugin; PROOF_01): no
// storage of the page's, no address, no element of its own on the body. What the board keeps goes through
// `BoardHost.store`; which board opens, through `BoardHost.page`. A static check beside `verify`'s
// `checkBoardHost`, which holds its imports.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const BOARD = path.join(import.meta.dirname, '../src/board');
const STRAYS = /\b(localStorage|sessionStorage|location\.|history\.(push|replace)State|document\.body\.append|document\.title|document\.cookie)\b/;

test('the board reaches for nothing of the page\'s', () => {
  const files = (fs.readdirSync(BOARD, { recursive: true }) as string[]).filter((f) => /\.(ts|svelte)$/.test(f) && !f.startsWith('words/'));
  assert.ok(files.length > 50);
  const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->|^\s*\/\/.*$/gm, '');
  const found = files.filter((f) => STRAYS.test(code(fs.readFileSync(path.join(BOARD, f), 'utf8'))));
  assert.deepEqual(found, []);
});
