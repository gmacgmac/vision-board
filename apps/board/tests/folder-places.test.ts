// Where a project folder may be (D-111, folders.ts `placeProblem`, api.md 209): the home folder itself and anything
// under it, anything under the drives folder (not that folder itself), the shared folder and anything under it; never
// a hidden folder, `/` or a folder holding home or the people's home folders, another person's home, or anything else
// (a system folder). Pure: paths only, nothing on disk. The places are made-up paths; the system's are `placesOf`'s.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placeProblem, placesOf } from '../server/folders.ts';

const places = placesOf('/Users/example');

test('the system places: home, /Volumes, /Users/Shared, and /Users holding people\'s homes', () => {
  assert.deepEqual(places, { home: '/Users/example', volumes: '/Volumes', shared: '/Users/Shared', users: '/Users' });
  assert.equal(placesOf('/h', { volumes: '/t/v' }).volumes, '/t/v', 'a test passes its own');
});

test('allowed: home itself and under it, a drive or share, /Users/Shared and under it', () => {
  for (const p of ['/Users/example', '/Users/example/projects/atlas', '/Volumes/Example-Drive', '/Volumes/Share/team/atlas', '/Users/Shared', '/Users/Shared/team']) {
    assert.equal(placeProblem(places, p), undefined, p);
  }
});

test('refused, each with its reason', () => {
  const cases: [string, string][] = [
    ['/Users/example/.config/atlas', 'hidden'], ['/Volumes/.timemachine/atlas', 'hidden'], ['/Users/Shared/.cache', 'hidden'],
    ['/', 'holds-home'], ['/Users', 'holds-home'],
    ['/Users/someone', 'other-home'], ['/Users/someone/projects', 'other-home'],
    ['/Volumes', 'system'], ['/System/Library', 'system'], ['/Library', 'system'], ['/Applications', 'system'], ['/usr/local/src', 'system'],
    ['/private/var/folders', 'system'], ['/opt/atlas', 'system'], ['/Users/examples', 'other-home'],
  ];
  for (const [p, why] of cases) assert.equal(placeProblem(places, p), why, p);
});
