// The fake host's page, from docs/specification/plugin.md alone: it reads the built folder's manifest, loads the
// styles and the view by the manifest's paths, gives `mount` a `BoardHost`, and draws its own pane and chat in its
// own Svelte. `window.fakeHost` is what the contract test drives. It imports nothing of the board but the folder.
import { listenerCount, listenerNames } from './listeners.js';
import { createChat } from './chat.js';

const link = (href) => document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href }));
const manifest = await (await fetch('/plugin/manifest.json')).json();
for (const sheet of manifest.view.styles) link(`/plugin/${sheet}`);
link('/host/host.css');
const { mount } = await import(`/plugin/${manifest.view.module}`);
const { drawPane } = await import('/host/host-svelte.js');

const boardListeners = new Set();
const lineListeners = new Set();
const stream = new EventSource('/stream');
stream.onmessage = (m) => {
  const e = JSON.parse(m.data);
  if (e.type === 'board') for (const l of boardListeners) l({ plugin: manifest.id, ref: e.ref });
  if (e.type === 'chat') for (const l of lineListeners) l(e.line);
};

/** A host for one board. */
function hostFor(o = {}) {
  const settings = { appCards: false, ...o.settings };
  const settingsHeard = new Set();
  const heardBoard = new Set();
  const kept = new Map();
  let muted = !!o.muted;
  let badRead = o.firstRead;
  const made = createChat(o);
  const record = { notices: [], confirms: [], answer: true, calls: [], refused: [] };
  const host = {
    async api(path, init) {
      if (badRead && path.startsWith('ledger')) {
        const how = badRead;
        badRead = undefined;
        record.calls.push(`${init.method ?? 'GET'} ${path}`);
        if (how === 'reject') throw new Error('The engine is starting');
        return how === 'html' ? new Response('<html></html>', { headers: { 'content-type': 'text/html' } }) : new Response('{}', { status: how });
      }
      const r = await fetch(`/api/board/${path.replace(/^\/+/, '')}`, init);
      record.calls.push(`${init.method ?? 'GET'} ${path}`);
      if (!r.ok) record.refused.push(`${r.status} ${path}`);
      return r;
    },
    events(listener) {
      const l = (e) => { if (!muted) listener(e); };
      boardListeners.add(l); heardBoard.add(l);
      return () => { boardListeners.delete(l); heardBoard.delete(l); };
    },
    chat: made.chat,
    settings: {
      get: (key) => settings[key],
      on(listener) {
        if (o.plainOn) return undefined;
        settingsHeard.add(listener);
        return o.offThrows ? () => { throw new Error('This host\'s unsubscribe fails'); } : () => settingsHeard.delete(listener);
      },
    },
    notify(text, tone) { record.notices.push({ text, ...(tone && { tone }) }); },
    async confirm(ask) { record.confirms.push(ask); return record.answer; },
    ...(!o.noStore && { store: { get: (key) => kept.get(key) ?? null, set(key, value) { kept.set(key, value); } } }),
    ...(!o.noImageRoute && { imageRoute: '/pics/' }),
  };
  /** Change events stop, as a dropped stream's would; `catchUp` says a ref with no head. */
  const mute = () => { muted = true; };
  const catchUp = () => { muted = false; for (const l of heardBoard) l({ plugin: manifest.id, ref: {} }); };
  const changeSetting = (key, value) => { settings[key] = value; for (const l of settingsHeard) l(); };
  const subscribers = () => heardBoard.size + settingsHeard.size + made.statusListeners();
  return { host, made, record, kept, changeSetting, subscribers, mute, catchUp };
}

let current = null;
const second = [];
const keys = { heard: [], order: [], mine: 0 };
let hearingKeys = false;
let held = null;
let statusHeard = 0;

/** Mounts the board in the host's own Svelte pane. */
function open(o = {}) {
  const parts = hostFor(o);
  lineListeners.clear();
  lineListeners.add((line) => parts.made.addLine(line));
  let view = null;
  const opened = new Promise((done) => {
    drawPane(document.getElementById('host'), {
      chat: parts.made, board: () => view,
      onroot(root) {
        if (o.position) root.style.position = o.position;
        if (o.size) Object.assign(root.style, { width: `${o.size[0]}px`, height: `${o.size[1]}px` });
        const start = () => {
          view = mount(root, parts.host);
          view.status.on(() => { statusHeard += 1; });
          current = { ...parts, view, root };
        };
        if (o.hold) held = start; else start();
        done();
      },
    });
  });
  return opened;
}

/** The host's own shortcuts (plugin.md § Keys): a capture listener on the window hears first; on the document, it skips what the board used. */
function hearKeys() {
  if (hearingKeys) return;
  hearingKeys = true;
  window.addEventListener('keydown', (e) => keys.order.push({ key: e.key, prevented: e.defaultPrevented }), { capture: true });
  document.addEventListener('keydown', (e) => {
    keys.heard.push({ key: e.key, prevented: e.defaultPrevented });
    if (!e.defaultPrevented && e.key === 'q') keys.mine += 1;
  });
}

window.fakeHost = {
  open, hearKeys,
  /** Mounts the board an `open({ hold: true })` left out, so a test can count what the pane alone holds. */
  mountHeld() { held(); },
  keys: () => ({ ...keys, heard: [...keys.heard], order: [...keys.order] }),
  listeners: listenerCount,
  listenerNames,
  /** The same bundle under a second address, as a page with two copies would hold it, in a plain root. */
  async mountSecondCopy() {
    const before = customElements.get('vb-node');
    const copy = await import(`/plugin/${manifest.view.module}?second`);
    const root = Object.assign(document.createElement('div'), { className: 'plain-root' });
    document.getElementById('host').append(root);
    const parts = hostFor({});
    const view = copy.mount(root, parts.host);
    second.push({ view, root });
    return { sameElements: customElements.get('vb-node') === before };
  },
  /** A plain second mount in this page, for two boards at once. */
  mountPlain() {
    const root = Object.assign(document.createElement('div'), { className: 'plain-root', id: 'plain' });
    document.getElementById('host').append(root);
    const parts = hostFor({});
    const view = mount(root, parts.host);
    second.push({ view, root, ...parts });
  },
  unmountSecond() { for (const s of second.splice(0)) { s.view.unmount(); s.root.remove(); } },
  view: () => current.view,
  record: () => {
    const r = current.record;
    return { notices: r.notices, confirms: r.confirms, calls: r.calls, refused: r.refused, attaches: current.made.log.attaches, sends: current.made.log.sends, reveals: current.made.log.reveals, problems: current.made.log.problems, chips: current.made.chips() };
  },
  answer(ok) { current.record.answer = ok; },
  subscribers: () => current.subscribers(),
  setting: (key, value) => current.changeSetting(key, value),
  store: () => Object.fromEntries(current.kept),
  status: (patch) => current.made.setStatus(patch),
  boardStatus: () => ({ ...current.view.status.now }),
  statusHeard: () => statusHeard,
  mute: () => current.mute(),
  catchUp: () => current.catchUp(),
  pageChip: () => current.view.pageChip(),
  reveal: (ref) => current.view.reveal(ref),
  send: () => current.view.send(),
  unsaved: () => current.view.unsaved(),
  leave: () => current.view.leave(),
  unmount: () => current.view.unmount(),
  viewKeys: () => Object.keys(current.view).sort(),
  rootState: () => ({ children: current.root.childElementCount, classes: current.root.className, attrs: current.root.getAttributeNames() }),
  pageStorage: () => ({ local: localStorage.length, session: sessionStorage.length }),
};
