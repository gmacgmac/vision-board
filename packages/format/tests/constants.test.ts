// Names defined once: every environment variable name is in ENV, once, with the `VB_` prefix; the
// port and the folder header are generated from openapi.json and agree with the default server.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENV } from '../src/constants.ts';
import { DEFAULT_PORT, DEFAULT_SERVER, PROJECT_HEADER } from '../src/index.ts';

test('each environment name once, each VB_-prefixed', () => {
  const names = Object.values(ENV);
  assert.equal(new Set(names).size, names.length);
  for (const name of names) assert.match(name, /^VB_[A-Z_]+$/);
});

test('the default server is on the default port; the folder header is VB-Project', () => {
  assert.equal(DEFAULT_SERVER, `http://127.0.0.1:${DEFAULT_PORT}`);
  assert.equal(PROJECT_HEADER, 'VB-Project');
});
