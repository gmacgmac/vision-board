// The remote door (D-117, api.md 20, 28): a second door on 127.0.0.1 that only Tailscale Serve reaches. Every request
// there needs Serve's `Tailscale-User-Login` on the allow list, the remote address as its Host, no Funnel header, and
// on a write the remote page's exact origin; the person cookie it sets is `Secure`; it offers no folder chooser. The
// local door is unchanged and ignores every Tailscale header. Requests go through node:http, so a test can send any Host.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { remoteDoorOf } from '../server/remote.ts';
import type { TestBoard } from './test-board.ts';
import { startTestBoard } from './test-board.ts';
import * as httpWords from '../server/words/http.ts';
import * as serverFoldersWords from '../server/words/server-folders.ts';

const HOST = 'board-mac.example.ts.net:4466';
const ORIGIN = `https://${HOST}`;
const USER = 'person@example.com';
const door = remoteDoorOf(ORIGIN, ` ${USER.toUpperCase()} , other@example.com`)!;

let board: TestBoard;
let remotePort = 0;
before(async () => {
  board = await startTestBoard({ remote: door, chooser: async () => undefined });
  const remote = (board.server as typeof board.server & { remote?: http.Server }).remote;
  assert.ok(remote, 'a remote door is built when asked for');
  await new Promise<void>((resolve) => remote.listen(0, '127.0.0.1', resolve));
  remotePort = (remote.address() as AddressInfo).port;
});
after(() => board.close());

interface Reply { status: number; headers: http.IncomingHttpHeaders; body: any }

/** One request with exactly these headers, to a door's port; a stream answers its first chunk. */
function call(port: number, method: string, p: string, headers: Record<string, string>, body?: unknown): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? undefined : JSON.stringify(body);
    const req = http.request({ host: '127.0.0.1', port, method, path: p, headers: {
      ...headers, ...(data && { 'Content-Type': 'application/json', 'Content-Length': String(Buffer.byteLength(data)) }),
    } }, (res) => {
      if ((res.headers['content-type'] ?? '').startsWith('text/event-stream')) {
        res.once('data', (chunk: Buffer) => { req.destroy(); resolve({ status: res.statusCode!, headers: res.headers, body: chunk.toString() }); });
        return;
      }
      let text = '';
      res.on('data', (c) => { text += c; });
      res.on('end', () => {
        const json = (res.headers['content-type'] ?? '').includes('json');
        resolve({ status: res.statusCode!, headers: res.headers, body: json && text ? JSON.parse(text) : text });
      });
    });
    req.on('error', reject);
    req.end(data);
  });
}

const signedIn = (extra: Record<string, string> = {}) => ({ Host: HOST, 'Tailscale-User-Login': USER, ...extra });
const remote = (method: string, p: string, headers: Record<string, string>, body?: unknown) => call(remotePort, method, p, headers, body);
const local = (method: string, p: string, headers: Record<string, string>, body?: unknown) => call(board.port, method, p, headers, body);
const cookieOf = (r: Reply) => /^(vb_person=[^;]+)/.exec(String(r.headers['set-cookie'] ?? ''))?.[1] ?? '';
const newBoard = { title: 'From the other Mac' };

test('remote door, an allowed login: the page loads with a Secure cookie, and a write succeeds', async () => {
  const page = await remote('GET', '/', signedIn());
  assert.equal(page.status, 200);
  assert.match(String(page.headers['set-cookie']), /; HttpOnly; SameSite=Strict; Path=\/api; Secure$/);
  const cookie = cookieOf(page);
  const localPage = await local('GET', '/', { Host: `127.0.0.1:${board.port}` });
  assert.equal(cookie, cookieOf(localPage), 'one person token for both doors');
  const w = await remote('PUT', '/api/boards/remote-door', signedIn({ Cookie: cookie, Origin: ORIGIN }), newBoard);
  assert.equal(w.status, 201, JSON.stringify(w.body));
});

test('remote door: no login, a login not on the list, or a Funnel request is refused, naming no header', async () => {
  for (const headers of [
    { Host: HOST },
    signedIn({ 'Tailscale-User-Login': 'stranger@example.com' }),
    signedIn({ 'Tailscale-Funnel-Request': '?1' }),
  ]) {
    const r = await remote('GET', '/api/boards', headers);
    assert.equal(r.status, 403, JSON.stringify(headers));
    assert.equal(r.body.detail, httpWords.thisDoorLetsInOnly);
    assert.doesNotMatch(r.body.detail, /Tailscale-User|header/i);
  }
  const page = await remote('GET', '/', { Host: HOST });
  assert.equal(page.status, 403);
  assert.equal(page.headers['set-cookie'], undefined, 'no cookie for a refused caller');
});

test('remote door: a local Host is refused there, so no header makes a remote request local', async () => {
  for (const host of [`127.0.0.1:${board.port}`, `localhost:${board.port}`, 'other.example.ts.net:4466']) {
    const r = await remote('GET', '/api/boards', signedIn({ Host: host }));
    assert.equal(r.status, 403, host);
    assert.equal(r.body.detail, httpWords.thisDoorAnswersOnlyOn);
  }
});

test('remote door writes: only from exactly the remote origin', async () => {
  const cookie = cookieOf(await remote('GET', '/', signedIn()));
  for (const origin of ['https://evil.example', `http://${HOST}`, `https://${HOST.replace(':4466', ':4467')}`, `http://127.0.0.1:${board.port}`]) {
    const r = await remote('PUT', '/api/boards/remote-door-2', signedIn({ Cookie: cookie, Origin: origin }), newBoard);
    assert.equal(r.status, 403, origin);
    assert.equal(r.body.detail, httpWords.writesAreAcceptedOnlyFrom);
  }
  const none = await remote('PUT', '/api/boards/remote-door-2', signedIn({ Cookie: cookie }), newBoard);
  assert.equal(none.status, 403, 'a write with no Origin is refused at the remote door');
});

test('local door: Tailscale headers are ignored; the cookie has no Secure; remote Hosts are refused', async () => {
  const page = await local('GET', '/', { Host: `127.0.0.1:${board.port}`, 'Tailscale-User-Login': 'stranger@example.com', 'Tailscale-Funnel-Request': '?1' });
  assert.equal(page.status, 200);
  assert.match(String(page.headers['set-cookie']), /; Path=\/api$/);
  const r = await local('GET', '/api/boards', signedIn());
  assert.equal(r.status, 403);
  assert.equal(r.body.detail, httpWords.thisServerAnswersOnlyOn);
});

test('remote door: list_folders offers no chooser and choose_folder is refused; the local door still offers it', async () => {
  const cookie = cookieOf(await remote('GET', '/', signedIn()));
  const there = await remote('GET', '/api/folders', signedIn({ Cookie: cookie }));
  assert.equal(there.status, 200);
  assert.equal(there.body.chooser, undefined);
  const choose = await remote('POST', '/api/folders/choose', signedIn({ Cookie: cookie, Origin: ORIGIN }), {});
  assert.equal(choose.status, 404);
  assert.equal(choose.body.detail, serverFoldersWords.chooserNotOffered);
  const here = await local('GET', '/api/folders', { Host: `127.0.0.1:${board.port}`, Cookie: cookie });
  assert.equal(here.body.chooser, true);
});

test('remote door: an event stream delivers', async () => {
  const cookie = cookieOf(await remote('GET', '/', signedIn()));
  const r = await remote('GET', '/api/events', signedIn({ Cookie: cookie }));
  assert.equal(r.status, 200);
  assert.match(String(r.headers['content-type']), /^text\/event-stream/);
  assert.match(r.body, /\S/);
});

test('remote access off: no second door is built', async () => {
  const plain = await startTestBoard();
  try { assert.equal((plain.server as typeof plain.server & { remote?: http.Server }).remote, undefined); } finally { await plain.close(); }
});

test('the settings: both or neither; an https address with its port and nothing after it', () => {
  assert.equal(remoteDoorOf(undefined, undefined), undefined);
  assert.deepEqual([...door.users], [USER, 'other@example.com']);
  assert.equal(door.host, HOST);
  assert.equal(door.origin, ORIGIN);
  assert.throws(() => remoteDoorOf(ORIGIN, undefined), { message: httpWords.remoteNeedsBoth });
  assert.throws(() => remoteDoorOf(ORIGIN, ' , '), { message: httpWords.remoteNeedsBoth });
  assert.throws(() => remoteDoorOf(undefined, USER), { message: httpWords.remoteNeedsBoth });
  for (const url of [`http://${HOST}`, 'https://board-mac.example.ts.net', `${ORIGIN}/board`, `${ORIGIN}?x=1`, 'not a url', `https://u:p@${HOST}`])
    assert.throws(() => remoteDoorOf(url, USER), { message: httpWords.remoteUrlNotHttps(url) }, url);
  assert.equal(remoteDoorOf(`${ORIGIN}/`, USER)?.origin, ORIGIN, 'a trailing slash is the same address');
});
