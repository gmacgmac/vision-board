// The app contract's one table (packages/format/src/apps.ts, D-047) and the doc that states it
// (docs/specification/apps.md): a panel's size is the agent's, else the manifest's, else the
// default; and every limit, size, state and panel message the doc lists is the one the code holds,
// so a change to either fails here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { APP_LIMITS, APP_SIZE, APP_STATES, appSize, HOST_NOTIFICATIONS, PANEL_ERRORS, PANEL_METHODS } from '../src/index.ts';

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
