// Who may call the app operations (D-047 rulings 6 and 12, api.md 152): `list_apps` takes an agent's
// secret or the person's cookie and refuses a call with neither (a stale cookie gets `forbidden`, so
// the page reloads, api.md 20); `call_app_tool` is the person's alone. A project with no apps folder
// lists no app; an app id that is not an id is refused before anything is looked up.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '#client';
import type { Harness, Joined } from './api-harness.ts';
import { startBoard } from './api-harness.ts';

let h: Harness;
let A: Joined;
before(async () => {
  h = await startBoard();
  A = await h.join('Apps chat');
});
after(() => h.close());

test('list_apps: an agent with its secret, or the person; nobody else', async () => {
  assert.deepEqual(await h.ok('list_apps', {}, { as: A.client }), { apps: [] });
  assert.deepEqual(await h.ok('list_apps', {}, { as: h.person }), { apps: [] });
  const none = await h.fails('list_apps', {}, 401, 'not-authenticated', h.client);
  assert.match(none.detail, /agent secret/);
  await h.fails('list_apps', {}, 401, 'not-authenticated', h.agent('not-a-secret-the-server-knows'));
  const stale = createClient({ base: h.base, fetch: (url, init) => fetch(url, { ...init, headers: { ...(init?.headers as Record<string, string>), Cookie: 'vb_person=stale' } }) });
  await assert.rejects(stale.call('list_apps', {}), (err: { status?: number; code?: string }) => err.status === 403 && err.code === 'forbidden');
});

test('call_app_tool: the person only; an agent is refused, and a bad app id is a bad request', async () => {
  await h.fails('call_app_tool', { app: 'calculator', body: { tool: 'evaluate', arguments: { expression: '1+1' } } }, 403, 'forbidden', A.client);
  await h.fails('call_app_tool', { app: 'Calculator', body: { tool: 'evaluate' } }, 400, 'bad-request', h.person);
  try { await h.person.call('call_app_tool', { app: 'calculator', body: { tool: 'evaluate' } }); } catch { /* checked by status */ }
  assert.equal(h.last().status, 404, 'no such app in this project');
});
