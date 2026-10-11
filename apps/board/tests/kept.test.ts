// A per-viewer convenience kept in the browser (shell/kept.ts): read and kept through
// localStorage, and nothing breaks when storage is absent or refuses.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keep, kept } from '../src/shell/kept.ts';

const g = globalThis as { localStorage?: unknown };

function withStorage(storage: unknown, run: () => void): void {
  const had = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true });
  try { run(); } finally {
    if (had) Object.defineProperty(globalThis, 'localStorage', had);
    else delete g.localStorage;
  }
}

test('kept: what was kept comes back; a key never kept is null', () => {
  const map = new Map<string, string>();
  withStorage({ getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => map.set(k, v) }, () => {
    assert.equal(kept('vb.test'), null);
    keep('vb.test', '1');
    assert.equal(kept('vb.test'), '1');
  });
});

test('kept: storage that refuses reads as nothing kept and keeping does not throw', () => {
  const refuse = () => { throw new Error('SecurityError'); };
  withStorage({ getItem: refuse, setItem: refuse }, () => {
    assert.equal(kept('vb.test'), null);
    assert.doesNotThrow(() => keep('vb.test', '1'));
  });
});

test('kept: no storage at all reads as nothing kept', () => {
  withStorage(undefined, () => {
    assert.equal(kept('vb.test'), null);
    assert.doesNotThrow(() => keep('vb.test', '1'));
  });
});

// Field report batch 3 ruling 4: the viewer's alignment, kept per viewer; anything else is the default.
test('keptAlign: centre once kept, else top and left (start), whatever storage holds or refuses', async () => {
  const { ALIGN_KEY, keepAlign, keptAlign } = await import('../src/shell/align.ts');
  const map = new Map<string, string>();
  withStorage({ getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => map.set(k, v) }, () => {
    assert.equal(keptAlign(), 'start');
    keepAlign('center');
    assert.deepEqual([map.get(ALIGN_KEY), keptAlign()], ['center', 'center']);
    map.set(ALIGN_KEY, 'middle');
    assert.equal(keptAlign(), 'start');
  });
  const refuse = () => { throw new Error('SecurityError'); };
  withStorage({ getItem: refuse, setItem: refuse }, () => assert.equal(keptAlign(), 'start'));
});
