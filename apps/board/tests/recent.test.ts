// The recent folders and the folder the server starts in (open-folder task, api.md 110, 112): the
// list lives in the person's `recent.json` (`homeFiles`), newest first, at most 10, readable by this user
// only; a bad file is ignored, never fatal. At start VB_PROJECT wins, then the newest recent folder
// if it is still a folder under home, or outside it one the server vouches for (D-110: still its own real path) that
// may be a project (D-111: a drive, not hidden, not above home, not a system folder), then this repo. The home folder,
// and the drives folder standing in for /Volumes, are temp folders here.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { RECENT_MAX, addRecent, lastLedger, readRecent, recentPath, startFolder } from '../server/recent.ts';
import { makeTempDir } from '#format/testing';
import { homeFiles } from '#format';

const home = fs.realpathSync(makeTempDir('vb-recent-'));
const outside = fs.realpathSync(makeTempDir('vb-recent-out-'));
after(() => { for (const d of [home, outside]) fs.rmSync(d, { recursive: true, force: true }); });
const folder = (name: string) => {
  const dir = path.join(home, 'projects', name);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};
const write = (text: string) => {
  fs.mkdirSync(path.dirname(recentPath(home)), { recursive: true });
  fs.writeFileSync(recentPath(home), text);
};

test('no file: no recent folders, and reading makes nothing', () => {
  assert.deepEqual(readRecent(home), []);
  assert.equal(fs.existsSync(path.dirname(homeFiles(home).recent)), false);
});

test('add: newest first, each once, at most 10, written for this user only', () => {
  const [a, b] = [folder('a'), folder('b')];
  addRecent(home, a);
  addRecent(home, b);
  addRecent(home, a);
  assert.deepEqual(readRecent(home), [a, b]);
  assert.deepEqual(JSON.parse(fs.readFileSync(recentPath(home), 'utf8')), { folders: [a, b] });
  assert.equal(fs.statSync(recentPath(home)).mode & 0o777, 0o600);
  for (let i = 0; i < 12; i++) addRecent(home, folder(`f${i}`));
  const list = readRecent(home);
  assert.equal(list.length, RECENT_MAX);
  assert.equal(list[0], path.join(home, 'projects', 'f11'));
});

test('a bad file is ignored, never fatal, and the next add replaces it', () => {
  for (const bad of ['not json', '[]', '{"folders": "x"}', '{"folders": [1]}', '{"folders": ["relative/path"]}', '{"folders": ["/a\\nb"]}', '{"folders": [], "more": 1}']) {
    write(bad);
    assert.deepEqual(readRecent(home), [], bad);
  }
  const a = folder('a');
  addRecent(home, a);
  assert.deepEqual(readRecent(home), [a]);
});

test('start: VB_PROJECT wins, then the newest recent folder under home, then the fallback', () => {
  const fallback = outside;
  const [a, b] = [folder('a'), folder('b')];
  write(JSON.stringify({ folders: [a, b] }));
  assert.equal(startFolder({ project: 'some/project', home, fallback }), path.resolve('some/project'));
  assert.equal(startFolder({ home, fallback }), a);
  fs.rmSync(a, { recursive: true });
  assert.equal(startFolder({ home, fallback }), fallback, 'the newest is gone: the fallback, not an older one');
  write('not json');
  assert.equal(startFolder({ home, fallback }), fallback);
});

test('start outside home (D-110, D-111): a recent folder on a drive opens, unless hidden, above home, a system folder, or now a link', () => {
  const fallback = folder('fallback');
  const picked = path.join(outside, 'drive', 'project');
  const hidden = path.join(outside, '.hidden', 'project');
  for (const d of [picked, hidden]) fs.mkdirSync(d, { recursive: true });
  const link = path.join(outside, 'link-to-project');
  fs.symlinkSync(picked, link);
  const roots = { volumes: outside };
  const start = (dir: string) => { write(JSON.stringify({ folders: [dir] })); return startFolder({ home, fallback, roots }); };
  assert.equal(start(picked), picked, 'a folder the person picked, in the recent list');
  assert.equal(startFolder({ home, fallback }), fallback, 'the same folder, where it is no drive: a system folder');
  assert.equal(start(home), home, 'the home folder itself (D-111)');
  assert.equal(start(hidden), fallback, 'hidden');
  assert.equal(start(path.dirname(home)), fallback, 'a folder holding home');
  assert.equal(start(link), fallback, 'not its own real path');
  assert.equal(start(path.join(outside, 'gone')), fallback, 'gone');
});

test('the last ledger is found by the folder\'s real path too: a link to it, or /var for /private/var (FIX_01 F14)', () => {
  const real = folder('linked');
  const link = path.join(home, 'linked-here');
  fs.symlinkSync(real, link);
  addRecent(home, real, 'ui');
  assert.equal(lastLedger(home, link), 'ui');
  assert.equal(lastLedger(home, real), 'ui');
  assert.equal(lastLedger(home, path.join(home, 'projects', 'gone')), undefined);
});
