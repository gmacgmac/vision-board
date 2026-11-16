// The skin layer (D-100; packages/tokens/src/skins.css): a skin is a block of token values on the board's root, one per
// name in the contract's `SKINS` (packages/format/src/view.ts, read as text: the tokens import no module) but `default`,
// which is tokens.css as it stands. A block sets only tokens tokens.css declares, so a skin is values, never a new
// property a pattern must know. That a host's colours and faces win over a skin is apps/board/tests/plugin-theme.test.ts's.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (rel: string) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const tokens = read('../src/tokens.css');
const skins = read('../src/skins.css');
const SKINS = JSON.parse(`[${/export const SKINS = \[([^\]]*)\] as const;/.exec(read('../../format/src/view.ts'))![1]!.replaceAll("'", '"')}]`) as string[];

/** Each skin block: its name and the properties it sets. */
const blocks = [...skins.matchAll(/([^{}]+)\{([^}]*)\}/g)].map((m) => ({
  selector: m[1]!.trim(),
  name: /^\.vb-board\[data-vb-skin='([a-z-]+)'\]$/.exec(m[1]!.trim())?.[1],
  sets: [...m[2]!.matchAll(/(--vb-[a-z-]+)\s*:/g)].map((d) => d[1]!),
}));

test('one block per skin the contract names, but default; none for a name it does not', () => {
  assert.deepEqual(SKINS.slice(0, 1), ['default'], 'view.ts SKINS read');
  for (const b of blocks) assert.ok(b.name, `"${b.selector}": a skin's block is .vb-board[data-vb-skin='<name>'] and nothing else`);
  assert.deepEqual(blocks.map((b) => b.name).sort(), SKINS.filter((s) => s !== 'default').sort());
});

test('a skin sets only tokens the tokens declare, each once', () => {
  const declared = new Set([...tokens.matchAll(/(--vb-[a-z-]+)\s*:/g)].map((m) => m[1]!));
  for (const b of blocks) {
    assert.ok(b.sets.length > 0, `${b.name} sets something`);
    assert.deepEqual(b.sets.filter((p) => !declared.has(p)), [], `${b.name}: every property is a token`);
    assert.equal(new Set(b.sets).size, b.sets.length, `${b.name}: no property twice`);
  }
});

test('the tokens load the skins and the faces, so the board\'s one stylesheet entry carries them', () => {
  assert.match(tokens, /^@import '\.\/fonts\.css';\n@import '\.\/skins\.css';/m);
});
