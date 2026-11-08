// The standalone page's flags (src/flags.ts `pageFlags`): a host-only flag (`HOST_FLAGS`) never comes from the
// address or the page's storage, so `?flags=singleAgent` cannot unscope the standalone app's answers chip (D-096).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOST_FLAGS } from '#format';
import { FLAGS_KEY, pageFlags } from '../src/flags.ts';

test('the page takes its own flags from the address and storage, never a host-only flag', () => {
  const g = globalThis as Record<string, unknown>;
  const stored = new Map([[FLAGS_KEY, 'followOtherWriters,-cardImages']]);
  g.localStorage = { getItem: (k: string) => stored.get(k) ?? null };
  g.location = { search: `?flags=${HOST_FLAGS.join(',')},svgImages` };
  try {
    const flags = pageFlags();
    assert.equal(flags.svgImages, true, 'the address still sets the page\'s own flags');
    assert.equal(flags.cardImages, false, 'and so does storage');
    for (const name of HOST_FLAGS) assert.equal(name in flags, false, `${name} is the host's alone`);
  } finally {
    delete g.localStorage;
    delete g.location;
  }
});
