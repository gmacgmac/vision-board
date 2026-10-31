// Counts what the page's document and window hold, so a test can see `unmount` leave nothing. Runs before the
// plugin's bundle is imported (host.js).
const live = { count: 0 };
const names = [];
const ids = new WeakMap();
let next = 0;
const idOf = (fn) => {
  if (!fn || (typeof fn !== 'object' && typeof fn !== 'function')) return 0;
  if (!ids.has(fn)) ids.set(fn, ++next);
  return ids.get(fn);
};
for (const target of [document, window]) {
  const [add, remove] = [target.addEventListener.bind(target), target.removeEventListener.bind(target)];
  const held = new Set();
  names.push(held);
  const key = (type, fn, opts) => `${type}|${typeof opts === 'boolean' ? opts : !!opts?.capture}|${idOf(fn)}`;
  target.addEventListener = (type, fn, opts) => {
    const k = key(type, fn, opts);
    if (!held.has(k)) { held.add(k); live.count += 1; }
    add(type, fn, opts);
  };
  target.removeEventListener = (type, fn, opts) => {
    if (held.delete(key(type, fn, opts))) live.count -= 1;
    remove(type, fn, opts);
  };
}
export const listenerCount = () => live.count;
/** What is held now, by type, for a failure's message. */
export const listenerNames = () => names.flatMap((held, i) => [...held].map((k) => `${i ? 'window' : 'document'} ${k}`)).sort();
