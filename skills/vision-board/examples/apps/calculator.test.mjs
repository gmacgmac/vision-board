// Tests for the example calculator app (apps.md, "The example"). They sit beside the app's folder,
// not inside it, so the folder holds only what an app holds (app.json, panel.html, tools.mjs) and
// is copied as it is. `npm test` runs this file (the root `test` glob).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { compileSchema } from '../../../../apps/board/server/schema.ts';
import tools, { calculate } from './calculator/tools.mjs';

const dir = (name) => fileURLToPath(new URL(`./calculator/${name}`, import.meta.url));
const read = (name) => fs.readFileSync(dir(name), 'utf8');
const fails = (text, message) => assert.throws(() => calculate(text), { name: 'Error', message });
const cant = (ch) => `Can't use "${ch}"`;
const badNumber = (text) => `Check the number "${text}"`;

// ---- Parser: numbers and operators -------------------------------------------------------------

test('numbers: whole, decimal, leading and trailing dot, exponent, spaces', () => {
  assert.equal(calculate('42'), 42);
  assert.equal(calculate('3.14'), 3.14);
  assert.equal(calculate('.5'), 0.5);
  assert.equal(calculate('5.'), 5);
  assert.equal(calculate('1e3'), 1000);
  assert.equal(calculate('2E-2'), 0.02);
  assert.equal(calculate('1e+21+1'), 1e21);
  assert.equal(calculate('  2 +  2 '), 4);
});

test('every operator, in both spellings', () => {
  assert.equal(calculate('7+3'), 10);
  assert.equal(calculate('7-3'), 4);
  assert.equal(calculate('7\u22123'), 4);
  assert.equal(calculate('7*3'), 21);
  assert.equal(calculate('7\u00d73'), 21);
  assert.equal(calculate('7/2'), 3.5);
  assert.equal(calculate('7\u00f72'), 3.5);
});

test('precedence and order: times and divide first, left to right', () => {
  assert.equal(calculate('2+3*4'), 14);
  assert.equal(calculate('2*3+4*5'), 26);
  assert.equal(calculate('10-4-3'), 3);
  assert.equal(calculate('100/10/5'), 2);
  assert.equal(calculate('2+12/4*3'), 11);
});

test('unary minus and plus', () => {
  assert.equal(calculate('-5'), -5);
  assert.equal(calculate('--5'), 5);
  assert.equal(calculate('5--3'), 8);
  assert.equal(calculate('2*-3'), -6);
  assert.equal(calculate('-2*-3'), 6);
  assert.equal(calculate('-(2+3)'), -5);
  assert.equal(calculate('+5'), 5);
  assert.equal(calculate('\u22125+2'), -3);
});

// ---- Parser: percent, brackets ----------------------------------------------------------------

test('percent: alone it is a hundredth; after + or - it is a share of the left value', () => {
  assert.equal(calculate('10%'), 0.1);
  assert.equal(calculate('50+10%'), 55);
  assert.equal(calculate('50-10%'), 45);
  assert.equal(calculate('200*10%'), 20);
  assert.equal(calculate('200/50%'), 400);
  assert.equal(calculate('50%%'), 0.005);
  assert.equal(calculate('-10%'), -0.1);
  assert.equal(calculate('50+-10%'), 45);
  assert.equal(calculate('(50+10)%'), 0.6);
});

test('percent: the left value is everything worked out so far', () => {
  assert.equal(calculate('100+10%+10%'), 121);
  assert.equal(calculate('2*50+10%'), 110);
  assert.equal(calculate('50+10%*2'), 50.2);
  assert.equal(calculate('50+(10%)'), 50.1);
});

test('brackets: nesting and depth limit of 32', () => {
  assert.equal(calculate('(2+3)*4'), 20);
  assert.equal(calculate('2*(3+(4-1))'), 12);
  assert.equal(calculate('((2))'), 2);
  assert.equal(calculate('('.repeat(32) + '1' + ')'.repeat(32)), 1);
  fails('('.repeat(33) + '1' + ')'.repeat(33), 'Too many brackets');
  fails('('.repeat(5000), 'Too long: 200 characters at most');
});

// ---- Parser: limits, errors, rounding ---------------------------------------------------------

test('length: 200 characters is the most', () => {
  assert.equal(calculate('1+'.repeat(99) + '1'), 100);
  assert.equal(calculate('1'.repeat(200)).toString().startsWith('1.11111111111e+199'), true);
  fails('1'.repeat(201), 'Too long: 200 characters at most');
});

test('division by zero, however it comes about', () => {
  for (const text of ['1/0', '5\u00f70', '1/(2-2)', '0/0', '1/0%', '3/0.0']) fails(text, "Can't divide by zero");
});

test('numbers too big for a calculator', () => {
  fails('1e200*1e200', 'Number too big');
  fails('1e308+1e308', 'Number too big');
  fails('1/1e-320', 'Number too big');
  fails('1e999', 'Number too big');
});

test('junk input gets a short plain message and never anything else', () => {
  fails('', 'Type a sum first');
  fails('   ', 'Type a sum first');
  fails('2+', 'Finish the sum');
  fails('(', 'Finish the sum');
  fails('(1', 'Check the brackets');
  fails('1)', 'Check the brackets');
  fails('()', 'Check the brackets');
  fails('2+)', 'Check the brackets');
  fails('*3', 'Check the sum');
  fails('2 3', 'Check the sum');
  fails('2(3)', 'Check the sum');
  fails('5%3', 'Check the sum');
  fails('abc', cant('a'));
  fails('2^3', cant('^'));
  fails('1,5', cant(','));
  fails('1e', cant('e'));
  fails('\uff12+\uff12', cant('\uff12'));
  fails('1..2', badNumber('1..2'));
  fails('1.2.3', badNumber('1.2.3'));
  fails('.', badNumber('.'));
  for (const junk of ['__proto__', 'alert(1)', 'Math.max(1,2)', '"2+2"', '1;process.exit()', '\u0000', '\u{1F600}']) {
    assert.throws(() => calculate(junk), (e) => e instanceof Error && e.message.length > 0 && e.message.length < 80);
  }
  for (const nope of [undefined, null, 5, {}, []]) fails(nope, 'Type a sum first');
});

test('rounded to 12 significant digits', () => {
  assert.equal(calculate('0.1+0.2'), 0.3);
  assert.equal(calculate('1/3'), 0.333333333333);
  assert.equal(calculate('2/3'), 0.666666666667);
  assert.equal(calculate('100*1.1'), 110);
  assert.equal(calculate('999999999999*999999999999'), 9.99999999998e23);
  assert.equal(calculate('0.1*3'), 0.3);
  assert.equal(calculate('0-0'), 0);
  assert.equal(Object.is(calculate('0*-1'), -0), false);
});

// ---- The app's files: manifest, tools module, one file ----------------------------------------

const MANIFEST_ID = 'https://vision-board.invalid/schema/app/manifest.schema.json';
const ajv = new Ajv2020({ strict: true, allErrors: true });
const ctx = () => ({ env: {}, signal: new AbortController().signal });
const tool = (name, list = tools.tools) => list.find((t) => t.name === name);

test('the folder holds the three files of an app and nothing else', () => {
  assert.deepEqual(fs.readdirSync(dir('')).sort(), ['app.json', 'panel.html', 'tools.mjs']);
});

test('app.json fits the manifest schema and names its folder', () => {
  const manifest = JSON.parse(read('app.json'));
  const validate = compileSchema(MANIFEST_ID);
  assert.equal(validate(manifest), true, JSON.stringify(validate.errors));
  assert.equal(manifest.id, 'calculator');
  assert.deepEqual(manifest.size, { w: 360, h: 440 });
  assert.equal('env' in manifest, false);
  assert.equal('csp' in manifest, false);
});

test('tools: the shape apps.md asks for', () => {
  assert.deepEqual(Object.keys(tools), ['tools']);
  assert.deepEqual(tools.tools.map((t) => t.name), ['evaluate', 'history']);
  const validate = compileSchema(`${MANIFEST_ID}#/$defs/tool`);
  for (const { run, ...shape } of tools.tools) {
    assert.equal(typeof run, 'function');
    assert.equal(validate(shape), true, JSON.stringify(validate.errors));
    assert.ok(shape.outputSchema, `${shape.name} has an output schema`);
    ajv.compile(shape.inputSchema);
    ajv.compile(shape.outputSchema);
  }
});

test('the tools module is one file: it imports only Node built-ins', () => {
  const text = read('tools.mjs');
  const specifiers = [...text.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)['"]([^'"]+)['"]/g)].map((m) => m[1]);
  for (const specifier of specifiers) assert.match(specifier, /^node:/);
});

test('no eval, no Function, no network and no outside file in the app', () => {
  for (const name of ['panel.html', 'tools.mjs']) {
    assert.doesNotMatch(read(name), /\beval\s*\(|\bFunction\s*\(|new\s+Function/, name);
  }
  assert.doesNotMatch(read('panel.html'), /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|https?:\/\/|<link\b|\bsrc\s*=/i);
});

// ---- The two tools ----------------------------------------------------------------------------

test('evaluate: works a sum out, and refuses bad input in plain words', async () => {
  const { run, inputSchema, outputSchema } = tool('evaluate');
  const accepts = ajv.compile(inputSchema);
  const answers = ajv.compile(outputSchema);
  const answer = await run({ expression: ' 2+3*4 ' }, ctx());
  assert.deepEqual(answer, { value: 14, expression: '2+3*4' });
  assert.equal(answers(answer), true);
  assert.equal(accepts({ expression: '1+1' }), true);
  assert.equal(accepts({ expression: 'x'.repeat(201) }), false);
  assert.equal(accepts({}), false);
  assert.equal(accepts({ expression: '1', extra: 1 }), false);
  await assert.rejects(run({ expression: '1/0' }, ctx()), { name: 'Error', message: "Can't divide by zero" });
  await assert.rejects(run({ expression: '2+' }, ctx()), { message: 'Finish the sum' });
});

test('history: the last 20 that worked, newest first, kept in the process', async () => {
  const fresh = (await import('./calculator/tools.mjs?history')).default.tools;
  const call = (name, input) => tool(name, fresh).run(input, ctx());
  const { inputSchema, outputSchema } = tool('history', fresh);
  const answers = ajv.compile(outputSchema);
  assert.equal(ajv.compile(inputSchema)({}), true);
  assert.deepEqual(await call('history', {}), { items: [] });
  await call('evaluate', { expression: '1+1' });
  await assert.rejects(call('evaluate', { expression: '1/0' }));
  await call('evaluate', { expression: '2+2' });
  assert.deepEqual(await call('history', {}), { items: [{ expression: '2+2', value: 4 }, { expression: '1+1', value: 2 }] });
  for (let i = 0; i < 25; i++) await call('evaluate', { expression: `${i}+0` });
  const answer = await call('history', {});
  assert.equal(answers(answer), true, JSON.stringify(answers.errors));
  assert.equal(answer.items.length, 20);
  assert.deepEqual(answer.items[0], { expression: '24+0', value: 24 });
  assert.deepEqual(answer.items[19], { expression: '5+0', value: 5 });
});
