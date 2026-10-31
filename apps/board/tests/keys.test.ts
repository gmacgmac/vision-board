// Whose key it is (keys.ts `bindKeys`, M10): under a host the board acts only on a key whose target
// is inside its own root; a key in another board's root is never its; on the board's own page
// (`pageWide`, the standalone app) a target outside every board still reaches it. A fake document and
// fake targets stand in for the page: `route` reads only `closest` and `localName` off the target. Under a
// host it listens on the root, so the mark on a key it used is there before any listener of the host's.
import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import type { KeyHandlers } from '../src/board/input/keys.ts';
import { bindKeys } from '../src/board/input/keys.ts';

type Fake = { closest(sel: string): Fake | null; localName: string; dataset: Record<string, string> };
/** A target that sits in `board` (a `.vb-board` root) or in none; it matches no other selector. */
const target = (board: Fake | null): Fake => ({
  localName: 'div', dataset: {},
  closest: (sel) => (sel === '.vb-board' ? board : null),
});
let listener: ((e: KeyboardEvent) => void) | null = null;
const hears = {
  addEventListener: (_: string, fn: (e: KeyboardEvent) => void) => { listener = fn; },
  removeEventListener: () => { listener = null; },
};
const root = (): Fake => ({ localName: 'div', dataset: {}, closest: () => null, ...hears });

const realDocument = (globalThis as { document?: unknown }).document;
(globalThis as { document?: unknown }).document = hears;
afterEach(() => { listener = null; });
process.on('exit', () => { (globalThis as { document?: unknown }).document = realDocument; });

/** Press `key` on `at`; the keys the board acted on. */
function press(key: string, at: Fake, own: Fake, pageWide?: boolean): string[] {
  const acted: string[] = [];
  const h = { toggleHide: () => acted.push('hide'), escape: () => acted.push('escape') } as unknown as KeyHandlers;
  const unbind = bindKeys(h, own as unknown as HTMLElement, pageWide);
  listener!({ target: at, key, defaultPrevented: false, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, preventDefault() {} } as unknown as KeyboardEvent);
  unbind();
  return acted;
}

test('under a host, a key inside the root acts; outside every board or in another board it does not', () => {
  const mine = root();
  const other = root();
  assert.deepEqual(press('h', target(mine), mine), ['hide']);
  assert.deepEqual(press('h', target(null), mine), [], 'a host control is not the board\'s');
  assert.deepEqual(press('h', target(other), mine), [], 'another board\'s root is not this one\'s');
});

test('under a host, Esc follows the same rule', () => {
  const mine = root();
  assert.deepEqual(press('Escape', target(mine), mine), ['escape']);
  assert.deepEqual(press('Escape', target(null), mine), [], 'a host\'s own Esc is the host\'s');
  assert.deepEqual(press('Escape', target(root()), mine), []);
});

test('on the board\'s own page, a key outside every board still acts; one in another board never does', () => {
  const mine = root();
  assert.deepEqual(press('h', target(mine), mine, true), ['hide']);
  assert.deepEqual(press('h', target(null), mine, true), ['hide'], 'the standalone page keeps its page-wide keys');
  assert.deepEqual(press('Escape', target(null), mine, true), ['escape']);
  assert.deepEqual(press('h', target(root()), mine, true), []);
});

// Search (cardSearch flag, SEARCH_02): `/` is the go command's key, so it follows the same rule.
test('under a host, / opens the search only inside the board\'s root', () => {
  const pressSlash = (at: Fake, own: Fake): string[] => {
    const acted: string[] = [];
    const h = { command: (id: string, key: string) => { acted.push(`${id} ${key}`); return true; } } as unknown as KeyHandlers;
    const unbind = bindKeys(h, own as unknown as HTMLElement);
    listener!({ target: at, key: '/', defaultPrevented: false, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, preventDefault() {} } as unknown as KeyboardEvent);
    unbind();
    return acted;
  };
  const mine = root();
  assert.deepEqual(pressSlash(target(mine), mine), ['go-to-card /']);
  assert.deepEqual(pressSlash(target(null), mine), [], 'a host control keeps its /');
  assert.deepEqual(pressSlash(target(root()), mine), []);
});

test('every key it acts on is marked used, and one it leaves is not: an Esc with nothing to escape stays the host\'s', () => {
  const mine = root();
  const marked = (key: string, handlers: Partial<KeyHandlers>, id?: string) => {
    let used = false;
    const unbind = bindKeys({ toggleHide() {}, unpin() {}, escape: () => false, command: () => false, ...handlers } as KeyHandlers, mine as unknown as HTMLElement);
    const at: Fake = { ...target(mine), closest: (sel) => (sel === '.vb-board' ? mine : sel === 'vb-node' && id ? { ...target(mine), dataset: { id } } : null) };
    listener!({ target: at, key, defaultPrevented: false, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, preventDefault() { used = true; } } as unknown as KeyboardEvent);
    unbind();
    return used;
  };
  assert.equal(marked('h', {}), true, 'H');
  assert.equal(marked('r', {}, '4'), true, 'R on a card');
  assert.equal(marked('r', {}), false, 'R with no card');
  assert.equal(marked('Escape', { escape: () => true }), true, 'Esc that did something');
  assert.equal(marked('Escape', {}), false, 'Esc with nothing to escape');
  assert.equal(marked('q', {}), false, 'a key the board has not');
});

test('typing is typing: a key in a contenteditable fires no shortcut', () => {
  const mine = root();
  const editing: Fake = { ...target(mine), closest: (sel) => (sel === '.vb-board' ? mine : sel.includes('[contenteditable]') ? editing : null) };
  assert.deepEqual(press('h', editing, mine), []);
});
