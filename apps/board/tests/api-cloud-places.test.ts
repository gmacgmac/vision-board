// The Cloud storage group (folder-links-cloud task, N32, api.md 110): the home folder's listing
// adds `places`, the real folders in `~/Library/CloudStorage` under their real names, each checked
// like any folder (realpath under home, no hidden part, a folder, not a link); none without that
// folder, and only on the home listing. The home folder's links to them stay out of every listing
// (ruling 1). A folder reached by its link and by its real path is one folder: one recent entry,
// one lock, the real path everywhere, and an agent working through the link matches (D-039). Home
// itself is still refused. The home folder is a temp folder here: no test reads or writes the
// real one, nor the real Library/CloudStorage.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { projectOf } from '#client';
import { ledgerPath, openLedger } from '../server/ledger.ts';
import { LOCK_FILE } from '../server/lock.ts';
import { RECENT_FILE } from '../server/recent.ts';
import type { Harness } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import { makeTempDir } from '#format/testing';

const home = fs.realpathSync(makeTempDir('vb-cloud-home-'));
const outside = fs.realpathSync(makeTempDir('vb-cloud-outside-'));
const library = path.join(home, 'Library');
const cloud = path.join(library, 'CloudStorage');
const place = path.join(cloud, 'Cloud-Example');
const team = path.join(cloud, 'Cloud-Team');
const repo = path.join(place, 'repo');
const other = path.join(home, 'projects', 'a');
/** The home folder's link to the place, as macOS makes one (`~/Cloud-Example`). */
const homeLink = path.join(home, 'Cloud-Example');
const repoByLink = path.join(homeLink, 'repo');
const unreadable = path.join(cloud, 'Cloud-Locked');
const recentFile = path.join(home, '.visionboard', RECENT_FILE);
const entry = (dir: string, hasBoard = false) => ({ name: path.basename(dir), path: dir, hasBoard });
let h: Harness;

/** A folder with a ledger holding one board the person made. */
function withBoard(dir: string, board: string): void {
  fs.mkdirSync(dir, { recursive: true });
  openLedger(ledgerPath(dir), () => {}).append({ type: 'board', board, title: 'Plans' }, { by: 'person' });
}

before(async () => {
  withBoard(repo, 'cloud-plans');
  withBoard(other, 'plans-a');
  fs.mkdirSync(team, { recursive: true });
  fs.mkdirSync(unreadable, { recursive: true });
  fs.chmodSync(unreadable, 0o000);
  // Left out of places: a link out of home, a link to a folder under home, home itself by a link,
  // a hidden folder, node_modules and a file.
  fs.symlinkSync(outside, path.join(cloud, 'Cloud-Out'));
  fs.symlinkSync(other, path.join(cloud, 'Cloud-Link'));
  fs.symlinkSync(home, path.join(cloud, 'Cloud-Home'));
  for (const d of ['.Cloud-Hidden', 'node_modules']) fs.mkdirSync(path.join(cloud, d));
  fs.writeFileSync(path.join(cloud, 'Cloud-File.txt'), 'not a folder\n');
  fs.symlinkSync(place, homeLink);
  h = await startBoard({ home });
});
after(async () => {
  await h.close();
  fs.chmodSync(unreadable, 0o700);
  for (const d of [home, outside]) fs.rmSync(d, { recursive: true, force: true });
});

test('the home listing: places are the real cloud folders by their real names; the home link stays out', async () => {
  const listed = await h.ok('list_folders');
  assert.deepEqual(listed.places, [entry(place), entry(unreadable), entry(team)]);
  assert.deepEqual(listed.folders.map((f: { name: string }) => f.name), ['Library', 'projects'], 'no link in home is listed');
});

test('places only on the home listing: not on any other, and browsing a place goes on under real names', async () => {
  for (const dir of [path.join(home, 'projects'), library, cloud, place]) {
    assert.equal('places' in await h.ok('list_folders', { path: dir }), false, dir);
  }
  const inPlace = await h.ok('list_folders', { path: place });
  assert.deepEqual([inPlace.name, inPlace.parent, inPlace.folders], ['~/Library/CloudStorage/Cloud-Example', cloud, [entry(repo, true)]]);
  // The cloud folder's own listing holds its real folders only, never its links or hidden ones.
  assert.deepEqual((await h.ok('list_folders', { path: cloud })).folders, [entry(place), entry(unreadable), entry(team)]);
  // By the home folder's link: the real folder, under its real name (ruling 3).
  const byLink = await h.ok('list_folders', { path: repoByLink });
  assert.deepEqual([byLink.path, byLink.name, byLink.found, byLink.boards], [repo, '~/Library/CloudStorage/Cloud-Example/repo', true, 1]);
});

test('no places without ~/Library/CloudStorage, or when it leads out of home', async () => {
  const aside = path.join(library, 'Elsewhere');
  fs.renameSync(cloud, aside);
  try {
    assert.equal('places' in await h.ok('list_folders'), false, 'no cloud folder, no places');
    fs.mkdirSync(path.join(outside, 'Cloud-Outside'));
    fs.symlinkSync(outside, cloud);
    assert.equal('places' in await h.ok('list_folders'), false, 'a cloud folder that is a link out of home');
    await h.fails('list_folders', { path: path.join(cloud, 'Cloud-Outside') }, 403, 'forbidden');
  } finally {
    fs.rmSync(cloud, { force: true });
    fs.renameSync(aside, cloud);
  }
  assert.equal((await h.ok('list_folders')).places.length, 3);
});

test('a place macOS will not let the server read: forbidden, with the Files and Folders hint', async () => {
  const p = await h.fails('list_folders', { path: unreadable }, 403, 'forbidden');
  assert.match(p.detail, /not allowed to read this folder/);
  assert.match(p.detail, /macOS may need Files and Folders access for the app that started the board/);
});

test('home itself stays refused, also by a link in the cloud folder', async () => {
  for (const p of [home, path.join(cloud, 'Cloud-Home')]) {
    const refused = await h.fails('open_project', { body: { path: p, create: true } }, 403, 'forbidden');
    assert.match(refused.detail, /not the home folder itself/, p);
  }
  await h.fails('open_project', { body: { path: path.join(cloud, 'Cloud-Out'), create: true } }, 403, 'forbidden');
  assert.equal(fs.existsSync(path.join(home, '.visionboard', 'ledger.jsonl')), false);
  assert.equal(fs.existsSync(path.join(outside, '.visionboard')), false);
});

test('a folder opened by its link and by its real path is one folder: one recent entry, one lock', async () => {
  const opened = await h.ok('open_project', { body: { path: repoByLink } });
  assert.deepEqual(opened, { path: repo, name: '~/Library/CloudStorage/Cloud-Example/repo', found: true, boards: 1 });
  assert.deepEqual(await h.ok('open_project', { body: { path: repo } }), opened, 'the real path is the folder already open');
  await h.ok('open_project', { body: { path: other } });
  await h.ok('open_project', { body: { path: repoByLink } });
  assert.deepEqual(JSON.parse(fs.readFileSync(recentFile, 'utf8')), { folders: [repo, other] });
  assert.deepEqual((await h.ok('list_folders')).recent.map((f: { name: string }) => f.name), ['~/Library/CloudStorage/Cloud-Example/repo', '~/projects/a']);
  const lock = JSON.parse(fs.readFileSync(path.join(repo, '.visionboard', LOCK_FILE), 'utf8')) as { pid: number };
  assert.equal(lock.pid, process.pid);
  assert.equal(fs.existsSync(path.join(other, '.visionboard', LOCK_FILE)), false);
  assert.deepEqual(await h.ok('get_project'), opened);
});

test('an agent working through the home link matches the open folder (its board MCP sends the link path)', async () => {
  const header = projectOf({}, path.join(repoByLink, 'src'), { fs, path });
  assert.equal(header, repoByLink, 'the upward search keeps the link path');
  const joined = await h.ok('join', { body: { label: 'Cloud agent' } }, { as: h.agent(undefined, header) });
  assert.equal(joined.project, '~/Library/CloudStorage/Cloud-Example/repo');
  await h.ok('write_board', { board: 'cloud-own', body: { items: [{ type: 'board', key: 'cloud-1', title: 'Drawn through the link' }] } },
    { as: h.agent(joined.secret, header) });
  assert.match(fs.readFileSync(ledgerPath(repo), 'utf8'), /"cloud-1"/);
  assert.equal((await h.ok('list_boards', {}, { as: h.agent(undefined, repo) })).project, '~/Library/CloudStorage/Cloud-Example/repo');
  await h.fails('list_boards', {}, 409, 'wrong-folder', h.agent(undefined, other));
});
