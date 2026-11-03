// A per-viewer convenience kept in the browser (shell/kept.ts): read and kept through
// localStorage, and nothing breaks when storage is absent or refuses. `pageStore` is the board's store
// on the standalone page: a view for this tab only, the rest as above, under the keys it always had while no folder is
// read, else under keys of the folder's and the ledger's (M52, PLAN decisions 4 and 11, `ledgerScope`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ledgerFolder } from '#format';
import { keep, kept, ledgerScope, pageStore } from '../src/shell/kept.ts';

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

test('pageStore: a board\'s view goes in sessionStorage, the rest in localStorage, each under `vb.`; refused, nothing kept', () => {
  const local = new Map<string, string>();
  const session = new Map<string, string>();
  const area = (m: Map<string, string>) => ({ getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => m.set(k, v) });
  const had = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', { value: area(session), configurable: true, writable: true });
  try {
    withStorage(area(local), () => {
      const store = pageStore(() => null);
      store.set('view.plans', '{}');
      store.set('proposals-hidden', '1');
      assert.deepEqual([...session], [['vb.view.plans', '{}']]);
      assert.deepEqual([...local], [['vb.proposals-hidden', '1']]);
      assert.equal(store.get('view.plans'), '{}');
    });
    withStorage(undefined, () => {
      const store = pageStore(() => null);
      assert.equal(store.get('proposals-hidden'), null);
      assert.doesNotThrow(() => store.set('proposals-hidden', '1'));
    });
  } finally {
    if (had) Object.defineProperty(globalThis, 'sessionStorage', had);
    else delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
  }
});

// M52 (PLAN decisions 4 and 11; VERIFY_01 F15; point 418): the page's memory per folder and ledger, `main` too. A key
// from before (`vb.<key>`) is read once, by `main` of the folder open, and kept under that folder's key from then on.
const ATLAS = '/work/atlas';
const OTHER = '/work/other';

test('ledgerScope: the folder for its main and its old layout, the ledger\'s folder for another; \'\' with no folder', () => {
  for (const f of [null, undefined]) assert.equal(ledgerScope(f), '');
  assert.equal(ledgerScope({ path: ATLAS }), ATLAS);
  assert.equal(ledgerScope({ path: ATLAS, ledger: 'main' }), ATLAS);
  assert.equal(ledgerScope({ path: ATLAS, ledger: 'ui' }), ledgerFolder(ATLAS, 'ui'));
  assert.notEqual(ledgerScope({ path: ATLAS, ledger: 'ui' }), ledgerScope({ path: OTHER, ledger: 'ui' }));
});

/** Run with both storage areas as maps, given what each holds at first. */
function withAreas(run: (local: Map<string, string>, session: Map<string, string>) => void, local0: Record<string, string> = {}, session0: Record<string, string> = {}) {
  const local = new Map(Object.entries(local0));
  const session = new Map(Object.entries(session0));
  const area = (m: Map<string, string>) => ({ getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => m.set(k, v), removeItem: (k: string) => m.delete(k) });
  const had = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', { value: area(session), configurable: true, writable: true });
  try { withStorage(area(local), () => run(local, session)); } finally {
    if (had) Object.defineProperty(globalThis, 'sessionStorage', had);
    else delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
  }
}

test('pageStore: each folder\'s main and each ledger keep their own, read when asked', () => {
  withAreas((local, session) => {
    let open: { path: string; ledger?: string } | null = { path: ATLAS, ledger: 'main' };
    const store = pageStore(() => open);
    store.set('view.plan', 'atlas main');
    store.set('proposals-hidden', '1');
    open = { path: OTHER, ledger: 'main' };
    assert.equal(store.get('view.plan'), null, 'main/plan of another folder does not read atlas\'s');
    assert.equal(store.get('proposals-hidden'), null);
    store.set('view.plan', 'other main');
    open = { path: ATLAS, ledger: 'ui' };
    assert.equal(store.get('view.plan'), null, 'ui/plan does not read main/plan\'s');
    store.set('view.plan', 'atlas ui');
    assert.deepEqual(Object.fromEntries(session), {
      [`vb.view.plan:${ATLAS}`]: 'atlas main', [`vb.view.plan:${OTHER}`]: 'other main', [`vb.view.plan:${ledgerFolder(ATLAS, 'ui')}`]: 'atlas ui',
    });
    assert.deepEqual(Object.fromEntries(local), { [`vb.proposals-hidden:${ATLAS}`]: '1' });
    open = { path: ATLAS, ledger: 'main' };
    assert.equal(store.get('view.plan'), 'atlas main');
    open = null; // no folder read: the keys from before
    store.set('proposals-hidden', '0');
    assert.equal(local.get('vb.proposals-hidden'), '0');
  });
});

test('pageStore: a value from before is read once, by main of the folder open, then kept under its key; nothing is lost', () => {
  withAreas((local, session) => {
    let open: { path: string; ledger?: string } | null = { path: ATLAS, ledger: 'ui' };
    const store = pageStore(() => open);
    assert.equal(store.get('view.plan'), null, 'another ledger never reads the old key');
    assert.equal(store.get('proposals-hidden'), null);
    open = { path: ATLAS, ledger: 'main' };
    assert.equal(store.get('view.plan'), 'before');
    assert.equal(store.get('proposals-hidden'), '1');
    assert.deepEqual(Object.fromEntries(session), { [`vb.view.plan:${ATLAS}`]: 'before' });
    assert.deepEqual(Object.fromEntries(local), { [`vb.proposals-hidden:${ATLAS}`]: '1' });
    open = { path: OTHER }; // the old layout of another folder: its main, after the one that read it
    assert.equal(store.get('view.plan'), null);
    assert.equal(store.get('proposals-hidden'), null);
  }, { 'vb.proposals-hidden': '1' }, { 'vb.view.plan': 'before' });
  // Set before any read: the new value wins, and the old key goes.
  withAreas((local) => {
    const store = pageStore(() => ({ path: ATLAS }));
    store.set('proposals-hidden', '0');
    assert.deepEqual(Object.fromEntries(local), { [`vb.proposals-hidden:${ATLAS}`]: '0' });
  }, { 'vb.proposals-hidden': '1' });
});
