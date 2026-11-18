// The zoom rules' one home (FIX_02, the maintainer's points 444 and 445; packages/ui/src/zoom-rules.ts): the table's numbers are
// the tokens' and viewport.ts's, every variable it says the page writes is read by the CSS and set nowhere else, and no
// zoom number is declared outside the table.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { ZOOM_RULES } from '#ui';
import { APP_FIT, BOX_MAX_K, BOX_MIN_K, FAR_K, MARK_H, MARK_MIN, SELECTION_FIT, boxScale } from '../src/board/canvas/viewport.ts';

const root = new URL('../../../', import.meta.url);
const files = (dir: string, ext: RegExp): string[] => readdirSync(new URL(dir, root), { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile() && ext.test(e.name)).map((e) => `${e.parentPath}/${e.name}`);
const sources = [...files('apps/board/src/', /\.(ts|svelte)$/), ...files('packages/ui/src/', /\.ts$/)];
const styles = [...files('apps/board/src/', /\.css$/), ...files('packages/ui/src/', /\.css$/)];
const tokens = readFileSync(new URL(import.meta.resolve('#tokens/styles.css')), 'utf8');
const px = (name: string) => Number(new RegExp(`${name}:\\s*(\\d+)px`).exec(tokens)![1]);

test('the table\'s numbers are the tokens\' and the ones viewport.ts uses', () => {
  assert.equal(ZOOM_RULES.marks.numbers.minPx, px('--vb-mark-min'));
  assert.equal(ZOOM_RULES.marks.numbers.heightPx, px('--vb-mark-h'));
  assert.deepEqual([MARK_MIN, MARK_H, FAR_K, BOX_MIN_K, BOX_MAX_K, SELECTION_FIT.fill, APP_FIT.fill],
    [14, 22, ZOOM_RULES.farControls.numbers.below, 0.8, 1.2, ZOOM_RULES.selectionFit.numbers.fill, ZOOM_RULES.appFit.numbers.fill]);
});

test('the conversation box: one size below 80%, with the board to 120%, one size above (points 444, 445)', () => {
  assert.deepEqual([0.2, 0.79, 0.8, 1, 1.2, 1.5, 2.5].map(boxScale), [0.8, 0.8, 0.8, 1, 1.2, 1.2, 1.2]);
});

test('one row for every box beside a node: the conversation, history and proposal boxes (point 484, D-104)', () => {
  const rows = ZOOM_RULES as Record<string, { rule: string; numbers: Record<string, number>; writes?: string }>;
  assert.deepEqual(rows.boxes, { rule: 'clamped', numbers: { min: 0.8, max: 1.2 }, writes: '--vb-box-scale' });
  assert.equal(Object.values(rows).filter((r) => r.writes === '--vb-box-scale').length, 1, 'no second box row');
});

test('every variable the table writes is read by the CSS, and no CSS sets it', () => {
  const css = styles.map((f) => readFileSync(f, 'utf8')).join('\n');
  for (const row of Object.values(ZOOM_RULES)) {
    const v = 'writes' in row ? row.writes : undefined;
    if (!v?.startsWith('--')) continue;
    assert.ok(css.includes(`var(${v}`), `${v} is read`);
    assert.doesNotMatch(css, new RegExp(`${v}\\s*:`), `${v} is the page's to write`);
  }
});

test('no zoom number lives outside the table', () => {
  const named = /\b(?:const|let)\s+([A-Z][A-Z0-9_]*(?:_K|ZOOM\w*|_FIT|GROW\w*|_STEP\w*|MARK_MIN|MARK_H|BOX_SCALE))\s*(?::[^=]+)?=\s*-?[\d.(]/g;
  for (const f of sources) {
    if (f.endsWith('ui/src/zoom-rules.ts')) continue;
    const text = readFileSync(f, 'utf8');
    for (const m of text.matchAll(named)) assert.fail(`${f}: ${m[1]} is a zoom number: put it in zoom-rules.ts`);
    assert.doesNotMatch(text, /zoom(?:Centre|At)\([^)]*\b\d*\.?\d+\s*\)|deltaY\s*\*\s*\d/, `${f}: a zoom step or speed belongs in zoom-rules.ts`);
  }
  const viewport = readFileSync(new URL('apps/board/src/board/canvas/viewport.ts', root), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  assert.deepEqual(viewport.match(/(?<![\w.])\d*\.\d+(?!e)/g)?.filter((n) => !['1e-9', '1e-6'].includes(n)) ?? [], [], 'viewport.ts reads its numbers from the table');
});
