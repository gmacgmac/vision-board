// The app contract's one table (packages/format/src/apps.ts, D-047) and the doc that states it
// (docs/specification/apps.md): a panel's size is the agent's, else the manifest's, else the
// default; a panel's saved state is any JSON value up to its limit; the board's own panel methods
// can't collide with MCP Apps'; and every limit, size, state and panel message the doc lists is the
// one the code holds, so a change to either fails here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  APP_HOST_NAME, APP_LIMITS, APP_SIZE, APP_STATE_KEY, APP_STATES, appSize, appStateBytes, appStateProblem, HOST_NOTIFICATIONS, PANEL_ERRORS,
  PANEL_METHODS, PANEL_SAVE_STATE,
} from '../src/index.ts';

const DOC = fs.readFileSync(new URL('../../../docs/specification/apps.md', import.meta.url), 'utf8');
/** The rows of the table under heading `title`: each cell, backticks dropped. */
function rows(title: string): string[][] {
  const section = DOC.split(new RegExp(`^#+ ${title}$`, 'm'))[1]?.split(/^#+ /m)[0];
  assert.ok(section, `apps.md has no "${title}" section`);
  return [...section.matchAll(/^\|(.+)\|$/gm)].map((m) => m[1]!.split('|').map((c) => c.trim().replaceAll('`', '')))
    .filter((r) => !/^:?-+:?$/.test(r[0]!));
}
const body = (title: string) => rows(title).slice(1); // the header row first

test('appSize: the agent\'s size wins, then the manifest\'s, then the default', () => {
  assert.deepEqual(appSize({ id: 'calc', w: 400, h: 500 }, { w: 300, h: 300 }), { w: 400, h: 500 });
  assert.deepEqual(appSize({ id: 'calc', w: 400 }, { w: 300, h: 300 }), { w: 400, h: 300 });
  assert.deepEqual(appSize({ id: 'calc' }), { w: APP_SIZE.w.default, h: APP_SIZE.h.default });
});

test('apps.md states every limit as APP_LIMITS holds it, and nothing else', () => {
  const doc = Object.fromEntries(body('Limits').map(([name, value]) => [name, Number(value)]));
  assert.deepEqual(doc, { ...APP_LIMITS });
});

test('apps.md states the panel sizes as APP_SIZE holds them', () => {
  const doc = Object.fromEntries(body('Panel size').map(([d, min, max, def]) => [d, { min: Number(min), max: Number(max), default: Number(def) }]));
  assert.deepEqual(doc, { ...APP_SIZE });
});

test('apps.md lists every app state list_apps gives, in order', () => {
  assert.deepEqual(body('States').map(([state]) => state), [...APP_STATES]);
});

test('apps.md lists every message a panel may send and the board sends, and how each is answered', () => {
  assert.deepEqual(Object.fromEntries(body('Panel to board').map(([method, kind]) => [method, kind])), { ...PANEL_METHODS });
  assert.deepEqual(body('Board to panel').map(([method]) => method), [...HOST_NOTIFICATIONS]);
});

test('apps.md lists the JSON-RPC error codes the board answers a panel with, as PANEL_ERRORS holds them', () => {
  assert.deepEqual(body('Errors').map(([code]) => Number(code)), Object.values(PANEL_ERRORS));
});

test('apps.md lists every manifest field the schema has, in its order, and which are needed', () => {
  const schema = JSON.parse(fs.readFileSync(new URL('../schema/app/manifest.schema.json', import.meta.url), 'utf8'));
  assert.deepEqual(body('The manifest').map(([field]) => field), Object.keys(schema.properties));
  assert.deepEqual(body('The manifest').filter(([, needed]) => needed === 'yes').map(([field]) => field), schema.required);
});

test(`a panel may save any JSON value of at most ${APP_LIMITS.stateBytes} bytes of compact UTF-8 JSON, and nothing else`, () => {
  const most = APP_LIMITS.stateBytes;
  for (const ok of [null, 0, 'x', true, [], {}, { display: '36', steps: [1, 2] }]) assert.equal(appStateProblem(ok), undefined, JSON.stringify(ok));
  const fill = (bytes: number) => 'x'.repeat(bytes - 2); // a JSON string's quotes are 2 bytes
  assert.equal(appStateBytes(fill(most)), most);
  assert.equal(appStateProblem(fill(most)), undefined);
  assert.equal(appStateProblem(fill(most + 1)), `The state is ${most + 1} bytes of JSON and the most a panel may save is ${most} (${most / 1024} KB). Save less: what the panel needs to start where it was.`);
  assert.equal(appStateBytes('\u00e9'), 4, 'bytes, not characters: é is two in UTF-8');
  const loop: Record<string, unknown> = {};
  loop.self = loop;
  for (const bad of [undefined, () => 1, loop, 10n]) assert.match(appStateProblem(bad)!, /must be a JSON value/);
});

test('the board\'s own panel methods start with its host name, so none can collide with an MCP or MCP Apps method', () => {
  assert.equal(PANEL_METHODS[PANEL_SAVE_STATE], 'request');
  assert.ok(PANEL_SAVE_STATE.startsWith(`${APP_HOST_NAME}/`));
  const standard = (m: string) => m.startsWith('ui/') || m === 'tools/call' || m === 'ping';
  // `vision-board/note` is the appStage spike's (a pick in the panel becomes the person's note).
  assert.deepEqual(Object.keys(PANEL_METHODS).filter((m) => !standard(m)), [PANEL_SAVE_STATE, `${APP_HOST_NAME}/note`]);
});

test('the saved state comes back under the board\'s own host-context key, so a future MCP Apps field can\'t collide (apps.md § Host context)', () => {
  assert.equal(APP_STATE_KEY, `${APP_HOST_NAME}/state`);
  const host = DOC.split(/^### Host context$/m)[1]?.split(/^#+ /m)[0] ?? '';
  assert.ok(host.includes(`\`${APP_STATE_KEY}\``), 'apps.md § Host context names the key');
  assert.ok(!/^- `state`:/m.test(host), 'no bare `state` field');
});
