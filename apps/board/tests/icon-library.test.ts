// The project's icon library through the engine (api.md 185-186; node-overhaul BE_04; ledger review § 4 O4): add_icon
// reduces an agent's svg to paths and writes it once per name; a replay writes nothing; a clash points at the icon
// there; a read-only ledger refuses. Every hostile svg is refused on add, and a hostile file put in the folder by hand is
// never served, by list_icons or to a node. A node's first use of a library icon writes its `icon` line first; two
// ledgers of one project share the files and keep their own lines; the person accepts a changed drawing.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ICONS_DIR, iconFileText, ledgerFiles, ledgerFolder, projectFiles } from '#format';
import { makeTempDir } from '#format/testing';
import type { Caller, Engine, EngineOptions } from '../server/engine/index.ts';
import { createEngine } from '../server/engine/index.ts';
import { acceptIcon, reduceSvg } from '../server/icons.ts';
import * as iconsWords from '../server/words/icons.ts';
import { startBoard } from './api-harness.ts';

const PERSON: Caller = { by: 'person' };
const dirs: string[] = [];
after(() => { for (const d of dirs) fs.rmSync(d, { recursive: true, force: true }); });

function folder(): string {
  const dir = makeTempDir('vb-icons-');
  dirs.push(dir);
  return dir;
}

const open = (dir: string, more: Partial<EngineOptions> = {}): Engine => createEngine({ dir, warn: () => {}, ...more });

async function join(engine: Engine): Promise<Caller> {
  const r = await engine.route({ method: 'POST', path: 'agents', body: { label: 'Icon chat' } });
  return { by: 'agent', agent: (r!.body as { agent: string }).agent };
}

type Reply = { status: number; body: any };
const add = async (engine: Engine, caller: Caller | undefined, body: Record<string, unknown>): Promise<Reply> =>
  (await engine.route({ method: 'POST', path: 'icons', body }, { caller }))! as Reply;
const list = async (engine: Engine, paths = false): Promise<any> =>
  (await engine.route({ method: 'GET', path: 'icons', query: new URLSearchParams(paths ? 'paths=true' : '') }, { caller: PERSON }))!.body;
const write = async (engine: Engine, caller: Caller, items: unknown[]): Promise<any> =>
  (await engine.route({ method: 'POST', path: 'boards/plans/write', body: { items } }, { caller }))!.body;

const SVG = (inner: string, attrs = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"') => `<svg ${attrs}>${inner}</svg>`;
const ENCODER = SVG('<path d="M4 6h16v12H4z"/><path d="M8 10h8"/>');
const PLANS = [
  { type: 'board', title: 'Plans', key: 'plans' },
  { type: 'region', region: { id: 'now', title: 'Now', mode: 'grid' }, key: 'now' },
];
const card = (icon: string, key: string) => ({ type: 'node', node: { region: 'now', kind: 'topic', title: `Uses ${icon}`, icon }, key });
const iconLines = (engine: Engine) => engine.ledger.events().filter((e) => e.type === 'icon');

test('add_icon: a drawing reduced to the fixed form in dir/icons, then its icon line, which names no board', async () => {
  const dir = folder();
  const engine = open(dir);
  const bot = await join(engine);
  await write(engine, bot, PLANS);
  const head = engine.ledger.state().boards.get('plans');
  const r = await add(engine, bot, { name: 'x-encoder', title: 'A video encoder', svg: ENCODER, key: 'icon-encoder' });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const file = path.join(dir, ICONS_DIR, 'x-encoder.svg');
  assert.equal(fs.readFileSync(file, 'utf8'), iconFileText(['M4 6h16v12H4z', 'M8 10h8'], 'A video encoder'), 'the default folder, the fixed form');
  const line = iconLines(engine)[0];
  assert.ok(line?.type === 'icon');
  assert.deepEqual([line.name, line.hash, line.by, line.key], ['x-encoder', r.body.hash, 'agent', 'icon-encoder']);
  assert.equal(engine.ledger.state().boards.get('plans'), head, 'no board moved');
  assert.deepEqual((await list(engine)).library, [{ name: 'x-encoder', title: 'A video encoder' }], 'no paths unless asked');
  assert.deepEqual((await list(engine, true)).library, [{ name: 'x-encoder', title: 'A video encoder', paths: ['M4 6h16v12H4z', 'M8 10h8'] }]);
});

test('a replay writes nothing; a key retry gets the first answer; a clash and a reused key are refused', async () => {
  const dir = folder();
  const engine = open(dir);
  const bot = await join(engine);
  const first = await add(engine, bot, { name: 'x-encoder', title: 'A video encoder', svg: ENCODER, key: 'k1' });
  const file = path.join(dir, ICONS_DIR, 'x-encoder.svg');
  const bytes = fs.readFileSync(file);
  const seq = engine.ledger.state().seq;
  const again = await add(engine, bot, { name: 'x-encoder', title: 'A video encoder', svg: ENCODER, key: 'k1' });
  assert.deepEqual([again.status, again.body], [200, { ...first.body, replayed: true }]);
  const nokey = await add(engine, bot, { name: 'x-encoder', title: 'A video encoder', svg: ` ${ENCODER}\n` });
  assert.deepEqual([nokey.status, nokey.body.replayed], [200, true], 'the same drawing, however it was written');
  assert.equal(engine.ledger.state().seq, seq, 'no second line');
  const clash = await add(engine, bot, { name: 'x-encoder', title: 'Another', svg: SVG('<path d="M1 1h4"/>') });
  assert.equal(clash.status, 409);
  assert.equal(clash.body.detail, iconsWords.nameTaken('x-encoder'));
  const reused = await add(engine, bot, { name: 'x-other', title: 'Other', svg: ENCODER, key: 'k1' });
  assert.deepEqual([reused.status, reused.body.detail], [409, iconsWords.keyUsedBefore('k1')]);
  assert.deepEqual(fs.readFileSync(file), bytes, 'never replaced');
  assert.deepEqual(fs.readdirSync(path.dirname(file)), ['x-encoder.svg'], 'nothing else written, no temp file left');
  assert.equal(engine.ledger.state().seq, seq);
});

test('a read-only ledger refuses add_icon and writes nothing (D-085)', async () => {
  const dir = folder();
  let closed = false;
  const engine = open(dir, { readOnly: () => closed });
  const bot = await join(engine);
  closed = true;
  const r = await add(engine, bot, { name: 'x-encoder', title: 'A video encoder', svg: ENCODER });
  assert.equal(r.status, 409);
  assert.match(r.body.type, /read-only$/);
  assert.equal(fs.existsSync(path.join(dir, ICONS_DIR)), false);
  assert.equal(iconLines(engine).length, 0);
});

/** Hostile drawings an agent could send, each refused on add with words that say what it held. */
const HOSTILE: [string, string, RegExp][] = [
  ['script', SVG('<path d="M0 0h4"/><script>alert(1)</script>'), /a "script" element/],
  ['an on* attribute', SVG('<path d="M0 0h4" onclick="alert(1)"/>'), /path element has "onclick"/],
  ['onload on the svg', SVG('<path d="M0 0h4"/>', 'viewBox="0 0 24 24" onload="alert(1)"'), /svg element has "onload"/],
  ['a style element', SVG('<style>path{fill:red}</style><path d="M0 0h4"/>'), /a "style" element/],
  ['a style attribute', SVG('<path d="M0 0h4" style="fill:red"/>'), /has "style"/],
  ['use and href', SVG('<use href="#a"/><path d="M0 0h4"/>'), /a "use" element/],
  ['xlink:href', SVG('<path d="M0 0h4" xlink:href="javascript:alert(1)"/>'), /has "xlink:href"/],
  ['an image', SVG('<image href="x.png"/><path d="M0 0h4"/>'), /an? "image" element/],
  ['foreignObject', SVG('<foreignObject><div>hi</div></foreignObject>'), /a "foreignObject" element/],
  ['text', SVG('<text>Hi</text><path d="M0 0h4"/>'), /a "text" element/],
  ['a gradient', SVG('<defs><linearGradient id="g"/></defs><path d="M0 0h4"/>'), /a "defs" element/],
  ['a pattern', SVG('<pattern id="p"/><path d="M0 0h4"/>'), /a "pattern" element/],
  ['a filter', SVG('<filter id="f"/><path d="M0 0h4"/>'), /a "filter" element/],
  ['a transform', SVG('<path d="M0 0h4" transform="scale(9)"/>'), /has "transform"/],
  ['a group', SVG('<g><path d="M0 0h4"/></g>'), /a "g" element/],
  ['a DOCTYPE with an entity', `<!DOCTYPE svg [<!ENTITY x "y">]>${SVG('<path d="M0 0h4"/>')}`, /"<!DOCTYPE s/],
  ['an entity in the title', SVG('<title>&x;</title><path d="M0 0h4"/>'), /title holds "&x;"/],
  ['CDATA', SVG('<![CDATA[x]]><path d="M0 0h4"/>'), /"<!\[CDATA\[x]/],
  ['a comment', SVG('<!-- hi --><path d="M0 0h4"/>'), /"<!-- hi -->/],
  ['a processing instruction', SVG('<?php x ?><path d="M0 0h4"/>'), /"<\?php/],
  ['a d holding url(', SVG('<path d="M0 0 url(#a)"/>'), /Path 1: .*U\+0075/],
  ['a d holding a quote', SVG(`<path d='M0 0"'/>`), /Path 1: .*U\+0022/],
  ['an entity in a d', SVG('<path d="M0 0&#x4c;1 1"/>'), /Path 1: .*U\+0026/],
  ['a look-alike letter', SVG('<path d="М0 0h4"/>'), /U\+041C/],
  ['a number past sane size', SVG('<path d="M1e999 0"/>'), /number 1e999/],
  ['a nested svg', SVG(SVG('<path d="M0 0h4"/>')), /svg element inside svg/],
  ['two roots', `${SVG('<path d="M0 0h4"/>')}${SVG('<path d="M0 0h4"/>')}`, /one svg element/],
  ['another box', SVG('<path d="M0 0h4"/>', 'viewBox="0 0 48 48"'), /viewBox is "0 0 48 48"/],
  ['no box', SVG('<path d="M0 0h4"/>', 'xmlns="http://www.w3.org/2000/svg"'), /no viewBox/],
  ['another namespace', SVG('<path d="M0 0h4"/>', 'xmlns="http://example.invalid/" viewBox="0 0 24 24"'), /xmlns is/],
  ['a d given twice', SVG('<path d="M0 0h4" d="M1 1h4"/>'), /names "d" twice/],
  ['text outside a title', SVG('Encoder<path d="M0 0h4"/>'), /text outside a title/],
  ['a path with no d', SVG('<path/>'), /no d/],
  ['no path', SVG('<title>Nothing</title>'), /no path/],
  ['an unclosed svg', '<svg viewBox="0 0 24 24"><path d="M0 0h4"/>', /never closed/],
  ['a tag the board can\'t read', SVG('<path d="M0 0h4" fill=red/>'), /can't read/],
  ['one path over', SVG('<path d="M0 0h1"/>'.repeat(9)), /9 paths/],
  ['a path one character over', SVG(`<path d="M0 0${'h1'.repeat(998)}1"/>`), /2001 characters/],
];

test('every hostile svg is refused on add with what it held, and nothing is written', async () => {
  const dir = folder();
  const engine = open(dir);
  const bot = await join(engine);
  for (const [what, svg, why] of HOSTILE) {
    const r = await add(engine, bot, { name: 'x-hostile', title: 'Hostile', svg });
    assert.equal(r.status, 422, `${what}: ${JSON.stringify(r.body)}`);
    assert.match(r.body.detail, why, what);
    assert.deepEqual(r.body.errors.map((e: { pointer: string }) => e.pointer), ['/svg'], what);
  }
  const title = await add(engine, bot, { name: 'x-hostile', title: 'abc‮def', svg: ENCODER });
  assert.deepEqual([title.status, title.body.errors[0].pointer], [422, '/title'], 'a direction-changing mark in the title');
  assert.equal(fs.existsSync(path.join(dir, ICONS_DIR)), false);
  assert.equal(iconLines(engine).length, 0);
});

test('what is merely untidy is cleaned: an XML declaration, a byte-order mark, line ends, presentation attributes', () => {
  const messy = `﻿<?xml version="1.0" encoding="UTF-8"?>\r\n<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0,0,24,24"
    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\r\n  <title>Old title &amp; more</title>
    <path stroke="red" d="M4 6
      h16v12H4z"></path>\r\n</svg>\r\n`;
  assert.deepEqual(reduceSvg(messy), ['M4 6 h16v12H4z']);
});

/** Put `text` in the library by hand, as a person, git or a sync would. */
const drop = (library: string, name: string, text: string | Buffer) => {
  fs.mkdirSync(library, { recursive: true });
  fs.writeFileSync(path.join(library, `${name}.svg`), text);
};

test('a hostile file put in the folder by hand is never served: listed as a problem, refused to a node', async () => {
  const dir = folder();
  const library = path.join(dir, ICONS_DIR);
  const engine = open(dir);
  const bot = await join(engine);
  await write(engine, bot, PLANS);
  drop(library, 'x-evil', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h4"/><script>alert(1)</script></svg>\n`);
  drop(library, 'x-crlf', iconFileText(['M0 0h4']).replace('\n', '\r\n'));
  drop(library, 'x-latin1', Buffer.from([...Buffer.from(iconFileText(['M0 0h4'], 'caf')), 0xe9]));
  drop(library, 'x-good', iconFileText(['M0 0h4'], 'Good'));
  fs.symlinkSync(path.join(library, 'x-good.svg'), path.join(library, 'x-link.svg'));
  drop(library, 'not-library', iconFileText(['M0 0h4']));
  const listed = await list(engine, true);
  assert.deepEqual(listed.library, [{ name: 'x-good', title: 'Good', paths: ['M0 0h4'] }]);
  assert.deepEqual(listed.problems.map((p: { name: string }) => p.name), ['x-crlf', 'x-evil', 'x-latin1', 'x-link']);
  assert.match(JSON.stringify(listed.problems), /element \\"script\\"/);
  assert.doesNotMatch(JSON.stringify(listed), /<script|alert\(/, 'the file\'s text never reaches an answer');
  const r = await write(engine, bot, [card('x-evil', 'evil')]);
  assert.equal(r.results[0].ok, false);
  assert.match(r.results[0].problem.detail, /not in the icon library/);
  assert.deepEqual(r.results[0].problem.errors[0].pointer, '/items/0/node/icon');
  assert.equal(iconLines(engine).length, 0, 'no icon line for a refused file');
  assert.equal(engine.ledger.state().nodes.size, 0, 'and no node');
});

test('first use: a node naming a library icon this ledger has no line for writes the line first, once', async () => {
  const dir = folder();
  const engine = open(dir);
  const bot = await join(engine);
  drop(path.join(dir, ICONS_DIR), 'x-dropped', iconFileText(['M2 2h20'], 'Put there by a person'));
  const r = await write(engine, bot, [...PLANS, card('x-dropped', 'c1'), card('x-dropped', 'c2')]);
  assert.ok(r.results.every((x: { ok: boolean }) => x.ok), JSON.stringify(r.results));
  const types = engine.ledger.events().filter((e) => e.type !== 'join').map((e) => e.type);
  assert.deepEqual(types, ['board', 'region', 'icon', 'node', 'node'], 'the icon line before the first node, and only once');
  const [line] = iconLines(engine);
  assert.deepEqual([line!.by, line!.agent, line!.key], ['agent', bot.by === 'agent' && bot.agent, undefined]);
  const missing = await write(engine, bot, [card('x-missing', 'c3')]);
  assert.match(missing.results[0].problem.detail, /not in the icon library/);
  assert.match(missing.results[0].problem.detail, new RegExp(iconsWords.fileMissing));
});

test('a file that no longer matches its hash is a problem, never served; the person accepts the drawing as it is now', async () => {
  const dir = folder();
  const library = path.join(dir, ICONS_DIR);
  const engine = open(dir);
  const bot = await join(engine);
  await add(engine, bot, { name: 'x-encoder', title: 'A video encoder', svg: ENCODER });
  drop(library, 'x-encoder', iconFileText(['M1 1h22'], 'Edited by hand'));
  const listed = await list(engine, true);
  assert.deepEqual([listed.library, listed.problems], [[], [{ name: 'x-encoder', detail: iconsWords.fileChanged }]]);
  const stale = engine.ledger.state().index.icons.get('x-encoder');
  assert.throws(() => engine.ledger.append({ type: 'icon', name: 'x-encoder', hash: 'a'.repeat(64) }, bot), 'an agent never changes a held name');
  const accepted = acceptIcon(engine.ledger, library, 'x-encoder');
  assert.equal(accepted.by, 'person');
  assert.notEqual(engine.ledger.state().index.icons.get('x-encoder'), stale);
  assert.deepEqual((await list(engine, true)).library, [{ name: 'x-encoder', title: 'Edited by hand', paths: ['M1 1h22'] }]);
  drop(library, 'x-encoder', 'not an icon');
  assert.throws(() => acceptIcon(engine.ledger, library, 'x-encoder'), /can't be accepted/, 'a failing file is never accepted');
  assert.throws(() => acceptIcon(engine.ledger, library, 'x-gone'), /can't be accepted/);
});

test('two ledgers of one project share the files, and each keeps its own lines', async () => {
  const project = folder();
  const icons = path.join(project, 'shared-icons');
  const a = open(path.join(project, 'a'), { icons });
  const b = open(path.join(project, 'b'), { icons });
  const [botA, botB] = [await join(a), await join(b)];
  assert.equal((await add(a, botA, { name: 'x-encoder', title: 'A video encoder', svg: ENCODER })).status, 201);
  assert.deepEqual((await list(b)).library, [{ name: 'x-encoder', title: 'A video encoder' }], 'b lists it with no line of its own');
  assert.equal(iconLines(b).length, 0);
  const r = await write(b, botB, [...PLANS, card('x-encoder', 'c1')]);
  assert.ok(r.results.every((x: { ok: boolean }) => x.ok), JSON.stringify(r.results));
  assert.equal(iconLines(b).length, 1, 'b took it on first use');
  assert.equal(iconLines(a).length, 1, 'a is untouched');
  assert.equal((await add(b, botB, { name: 'x-encoder', title: 'A video encoder', svg: ENCODER })).body.replayed, true);
  assert.deepEqual(fs.readdirSync(icons), ['x-encoder.svg']);
  assert.equal(fs.existsSync(path.join(project, 'a', ICONS_DIR)), false, 'the given folder, not dir/icons');
});

test('standalone: the project\'s .visionboard/icons, shared by its ledgers, over HTTP and as the spec says', async () => {
  const home = fs.realpathSync(folder());
  const project = path.join(home, 'icons-project');
  for (const l of ['main', 'ui']) {
    fs.mkdirSync(ledgerFolder(project, l), { recursive: true });
    fs.writeFileSync(ledgerFiles(ledgerFolder(project, l)).ledger, '');
  }
  const h = await startBoard({ home, flags: { ledgerFolders: true } });
  try {
    await h.ok('open_project', { body: { path: project } });
    const bot = await h.join('Icon chat');
    const added = await h.ok('add_icon', { body: { name: 'x-encoder', title: 'A video encoder', svg: ENCODER, key: 'enc' } }, { as: bot.client });
    assert.equal(h.last().status, 201);
    assert.ok(fs.existsSync(path.join(projectFiles(project).icons, 'x-encoder.svg')), 'the project\'s folder');
    assert.equal(fs.existsSync(path.join(ledgerFolder(project, 'main'), ICONS_DIR)), false, 'not the ledger\'s');
    await h.ok('add_icon', { body: { name: 'x-encoder', title: 'A video encoder', svg: ENCODER, key: 'enc' } }, { as: bot.client });
    assert.equal(h.last().status, 200, 'a retry, as the spec says');
    await h.fails('add_icon', { body: { name: 'x-encoder', title: 'Other', svg: SVG('<path d="M1 1h2"/>') } }, 409, 'conflict', bot.client);
    await h.fails('add_icon', { body: { name: 'x-bad', title: 'Bad', svg: SVG('<script/>') } }, 422, 'invalid', bot.client);
    await h.ok('open_project', { body: { path: project, ledger: 'ui' } });
    const listed = await h.ok('list_icons', { paths: true }, { as: h.person });
    assert.deepEqual(listed.library, [{ name: 'x-encoder', title: 'A video encoder', paths: ['M4 6h16v12H4z', 'M8 10h8'] }], 'the other ledger reads it');
    assert.equal(added.hash.length, 64);
  } finally { await h.close(); }
});
