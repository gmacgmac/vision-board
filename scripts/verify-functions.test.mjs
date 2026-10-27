// Proves the function-length rule (verify-functions.mjs) finds every kind of function, counts a
// factory's inner functions on their own, warns past the limit, and takes a reason in the header.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkFunctionLength, functionsOf, mask } from './verify-functions.mjs';

const body = (n) => Array.from({ length: n }, (_, i) => `  step(${i});`).join('\n');
const summary = (text) => functionsOf(text).map((f) => `${f.name}:${f.lines}/${f.own}`);

test('mask: comments, strings, regular expressions and template text hide braces; ${} stays code', () => {
  const text = "const a = '{'; // }\n/* { */ const r = /\\{[}]/; const t = `x{${y}}z`;\nconst f = () => { return `}`; };\n";
  assert.equal(mask(text).length, text.length);
  assert.deepEqual(summary(text), ['f:1/1']);
});

test('functions: declarations, arrows, async, methods and callbacks are found with their names', () => {
  const text = [
    'function plain(a) {', '  return a;', '}',
    'export async function* gen() {', '  yield 1;', '}',
    'const arrow = (x: number): number => {', '  return x;', '};',
    'const obj = {', '  method(a) {', '    return a;', '  },', '  key: async () => {', '    await 1;', '  },', '};',
    'class K {', '  static make(a: string): K {', '    return new K();', '  }', '  get size() {', '    return 1;', '  }', '}',
    'list.map((n) => {', '  return n;', '});',
  ].join('\n');
  assert.deepEqual(summary(text), ['plain:3/3', 'gen:3/3', 'arrow:3/3', 'method:3/3', 'key:3/3', 'make:3/3', 'size:3/3', '(anonymous):3/3']);
});

test('control flow is not a function: if, for, while, switch, catch, else and try blocks', () => {
  const text = 'function f(a) {\n  if (a) {\n    go();\n  } else {\n    stop();\n  }\n  for (const x of a) {\n    use(x);\n  }\n  try {\n    t();\n  } catch (e) {\n    c();\n  }\n}\n';
  assert.deepEqual(summary(text), ['f:15/15']);
});

test('a factory counts only its own lines: its inner functions count on their own', () => {
  const inner = (name, n) => `  function ${name}() {\n${body(n)}\n  }`;
  const text = `export function createThing() {\n  const x = 1;\n${inner('one', 10)}\n${inner('two', 60)}\n  return { one, two };\n}\n`;
  const found = Object.fromEntries(functionsOf(text).map((f) => [f.name, f]));
  assert.equal(found.createThing.lines, 78);
  assert.equal(found.createThing.own, 4);
  assert.equal(found.two.own, 62);
  assert.deepEqual(checkFunctionLength('apps/a.ts', text).map((r) => r.message.split(' ')[0]), ['two']);
});

test('blank lines do not count', () => {
  const text = `function f() {\n${Array.from({ length: 40 }, (_, i) => `  step(${i});\n`).join('\n')}}\n`;
  assert.equal(functionsOf(text)[0].lines, 42);
  assert.deepEqual(checkFunctionLength('a.ts', text), []);
});

test('warn past 50 lines of its own, silent at 50; a reason in the header is shown; tests and generated files are not scanned', () => {
  const at = (n) => `function f() {\n${body(n - 2)}\n}\n`;
  assert.deepEqual(checkFunctionLength('a.ts', at(50)), []);
  const over = checkFunctionLength('a.ts', at(51));
  assert.deepEqual(over.map((r) => r.level), ['warn']);
  assert.match(over[0].message, /f \(line 1\) runs 51 lines/);
  const why = checkFunctionLength('a.ts', `/** One pass over a table.\n * verify: long-function the rows read top to bottom, a split would hide the order */\n${at(60)}`);
  assert.match(why[0].message, /long-function: the rows read top to bottom/);
  assert.deepEqual(checkFunctionLength('a.test.ts', at(80)), []);
  assert.deepEqual(checkFunctionLength('tests/pages/a.ts', at(80)), []);
  assert.deepEqual(checkFunctionLength('api.generated.ts', at(80)), []);
  assert.deepEqual(checkFunctionLength('a.css', at(80)), []);
});
