// The open folder as the toolbar, the "⋯" menu and the folder dialog name it (current-folder task,
// board/folder-path.ts): its own name, its path with the home folder as `~`, and a long path with
// its middle elided. Example paths use a made-up user.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { elidePath, folderName, folderPath } from '../src/shell/folder-path.ts';

const UNDER_HOME = { path: '/Users/alex/projects/atlas', name: '~/projects/atlas' };
const OUTSIDE = { path: '/srv/sites/atlas', name: '/srv/sites/atlas' };

test('folderName: the last part of the path', () => {
  assert.equal(folderName(UNDER_HOME), 'atlas');
  assert.equal(folderName(OUTSIDE), 'atlas');
});

test('folderPath: under the home folder the server\'s name with `~`; outside it the whole path', () => {
  assert.equal(folderPath(UNDER_HOME), '~/projects/atlas');
  assert.equal(folderPath(OUTSIDE), '/srv/sites/atlas');
  assert.equal(folderPath({ path: '/Users/alex', name: '~' }), '~');
});

test('elidePath: a path that fits is left whole', () => {
  assert.equal(elidePath('~/projects/atlas', 28), '~/projects/atlas');
  assert.equal(elidePath('~/atlas', 3), '~/atlas');
});

test('elidePath: a long path keeps its first and last parts and elides the middle', () => {
  assert.equal(elidePath('~/Library/CloudStorage/Cloud-Example/work/atlas', 28), '~/…/atlas');
  assert.equal(elidePath('/srv/sites/clients/north/atlas', 20), '/srv/…/atlas');
});

test('elidePath: nothing to elide when only two parts remain', () => {
  assert.equal(elidePath('~/a-very-long-folder-name-indeed', 10), '~/a-very-long-folder-name-indeed');
  assert.equal(elidePath('/srv/atlas-with-a-long-name', 10), '/srv/atlas-with-a-long-name');
});

test('elidePath: when eliding would not shorten it, the path stays whole', () => {
  assert.equal(elidePath('~/a/b', 3), '~/a/b');
  assert.equal(elidePath('~/ab/cd/efgh', 8), '~/…/efgh');
});
