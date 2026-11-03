// The samples show the server's own words (app-cards FIX_06, findings 31 and 32; rules 6 and 11): the
// gallery's invalid app cards (src/gallery/gallery.apps.json) and the OpenAPI examples of an invalid
// app are what list_apps and call_app_tool answer for the same files, through the real server; so is
// the list_apps example's calculator before Allow, which names no tools (FIX_07, finding 34), and the
// needs-approval example, the call's answer for it then (FIX_08, tracker row 40). The
// example calculator, broken two ways: its app.json, and a tools.mjs that imports a file (seen once
// the person allowed it and pressed =; a schema problem and a load problem never come in one answer).
// A hash is of the files written here, so only its shape is compared.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { AppInfo } from '#format';
import type { Harness } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import { allow, apps, refused } from './app-support.ts';
import { doc, read, ROOT } from './openapi-ajv.ts';
import { ledgerFiles, ledgerFolder } from '#format';

const GALLERY = JSON.parse(read('apps/board/src/gallery/gallery.apps.json')) as Record<'files' | 'tools', AppInfo>;
const LISTED = doc.paths['/api/apps'].get.responses['200'].content['application/json'].example.apps as AppInfo[];
const INVALID = doc.components.responses.appInvalid.content['application/problem+json'].example as { detail: string };
const FORBIDDEN = doc.components.responses.appForbidden.content['application/problem+json'].example as { detail: string };

let h: Harness;
before(async () => { h = await startBoard(); });
after(async () => { await h.close(); });

/** App `id`'s folder in the project. */
const folder = (id: string): string => path.join(ledgerFiles(ledgerFolder(h.project)).apps, id);
/** The example calculator as the skill ships it. */
const CALCULATOR = path.join(ROOT, 'skills/vision-board/examples/apps/calculator');

/** list_apps' answer for `id`, its hash checked to be one, then set to the sample's. */
async function listed(id: string, sample: AppInfo): Promise<AppInfo> {
  const got = (await apps(h)).get(id)!;
  assert.match(got.hash ?? '', /^[0-9a-f]{64}$/);
  return { ...got, hash: sample.hash };
}

// First, while nothing is allowed: the third test allows the calculator.
test('the list_apps example\'s calculator is the answer for the calculator as the skill ships it, and no example names tools on an app the person has not allowed (finding 34)', async () => {
  for (const a of LISTED) assert.ok(a.allowed || !a.tools.length, `${a.id}: tools are named only once the person allowed the app and it ran`);
  fs.cpSync(CALCULATOR, folder('calculator'), { recursive: true });
  const sample = LISTED.find((a) => a.id === 'calculator')!;
  assert.deepEqual(await listed('calculator', sample), sample);
});

test('the needs-approval example is the call\'s answer for the calculator before the person allowed it (tracker row 40)', async () => {
  const called = await refused(h, 'calculator', 'evaluate', 403, 'needs-approval', { expression: '12*3' });
  assert.equal(called.detail, FORBIDDEN.detail);
});

test('the gallery\'s invalid app cards are list_apps\' answers for a broken app.json and for a tools.mjs that imports a file (finding 31); the app-invalid example is the call\'s (finding 32)', async () => {
  const dir = folder('calculator');
  fs.cpSync(CALCULATOR, dir, { recursive: true });
  const manifest = fs.readFileSync(path.join(dir, 'app.json'), 'utf8');
  const tools = fs.readFileSync(path.join(dir, 'tools.mjs'), 'utf8');
  fs.writeFileSync(path.join(dir, 'app.json'), JSON.stringify({ ...JSON.parse(manifest), size: { w: 1200, h: 440 }, colour: 'teal' }));
  assert.deepEqual(await listed('calculator', GALLERY.files), GALLERY.files);
  fs.writeFileSync(path.join(dir, 'app.json'), manifest);
  fs.writeFileSync(path.join(dir, 'tools.mjs'), `import './parser.mjs';\n${tools}`);
  await allow(h, 'calculator');
  const called = await refused(h, 'calculator', 'evaluate', 422, 'app-invalid', { expression: '12*3' });
  assert.equal(called.detail, INVALID.detail, 'the OpenAPI app-invalid example');
  assert.deepEqual(await listed('calculator', GALLERY.tools), GALLERY.tools);
});

test('the list_apps example\'s invalid app is the answer for its app.json: the field as a person writes it, no pointer (finding 32)', async () => {
  const sample = LISTED.find((a) => a.state === 'invalid')!;
  fs.mkdirSync(folder(sample.id), { recursive: true });
  fs.writeFileSync(path.join(folder(sample.id), 'app.json'), JSON.stringify({ id: sample.id, title: 'Release notes', version: '1.0.0', panel: 'pages/notes.html' }));
  assert.deepEqual(await listed(sample.id, sample), sample);
});
