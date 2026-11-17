// The icon set (FE_01, decision 24): every built-in name and every mark has one drawing, each a path the library's own
// check passes; a library icon draws from the checked paths the page passes in, and a missing one, or one with a path
// that fails, draws nothing (the plain tile). Nothing from a drawing reaches the markup but path data the code wraps.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ICON_LIMITS, ICON_NAMES, iconPathProblem } from '#format';
import { icon, iconLibrary, iconPaths, ICONS, MARK_ICONS } from '../src/index.ts';

test('every built-in name and every mark has a drawing, and nothing else does', () => {
  assert.deepEqual(Object.keys(ICONS).sort(), [...ICON_NAMES, ...MARK_ICONS].sort());
});

test('every drawing passes the library\'s own check: path data only, within its limits', () => {
  for (const [name, paths] of Object.entries(ICONS)) {
    assert.ok(paths.length > 0 && paths.length <= ICON_LIMITS.paths, `${name}: ${paths.length} paths`);
    for (const d of paths) assert.equal(iconPathProblem(d), undefined, `${name}: ${d}`);
  }
});

test('a built-in draws as paths on the 24 box in the set\'s stroke class, hidden from assistive tech', () => {
  const svg = icon('signal', 'vb-x');
  assert.match(svg, /^<svg class="vb-icon vb-x" viewBox="0 0 24 24" aria-hidden="true" focusable="false">(<path d="[^"<>]+"\/>)+<\/svg>$/);
  assert.equal((svg.match(/<path /g) ?? []).length, ICONS.signal.length);
});

test('a library icon draws from the paths the page passes in; missing, failing or too many draw nothing', () => {
  const lib = iconLibrary([
    { name: 'x-dish', title: 'Dish', paths: ['M4 20l4-9 4 9', 'M6 16h4'] },
    { name: 'x-bad', title: 'Bad', paths: ['M4 4L20 20"/><script>alert(1)</script>'] },
    { name: 'x-bad-late', title: 'Bad second path', paths: ['M4 4h2', 'url(x)'] },
    { name: 'x-many', title: 'Too many', paths: Array.from({ length: ICON_LIMITS.paths + 1 }, () => 'M1 1h1') },
    { name: 'x-unpathed', title: 'Listed without paths' },
  ]);
  assert.equal(icon('x-dish', 't', lib), '<svg class="vb-icon t" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 20l4-9 4 9"/><path d="M6 16h4"/></svg>');
  for (const name of ['x-bad', 'x-bad-late', 'x-many', 'x-unpathed', 'x-gone']) assert.equal(icon(name, 't', lib), '', name);
  assert.equal(icon('x-dish', 't'), '', 'no library given');
  assert.equal(iconPaths('x-dish', new Map([['x-dish', []]])), undefined, 'no paths at all');
});

test('a name that is neither drawn nor a library name draws nothing, inherited keys included', () => {
  for (const name of ['rocket', 'constructor', '__proto__', 'toString', '']) assert.equal(icon(name, 't'), '', name);
});

test('a library name never reaches a built-in drawing, even when it echoes one', () => {
  assert.equal(iconPaths('x-signal', new Map()), undefined);
});
