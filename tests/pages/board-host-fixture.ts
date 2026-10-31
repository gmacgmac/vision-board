/// <reference types="vite/client" />
// The browser side of board-host.spec.ts: the whole board, its controls too, mounted by a fake host, with no
// server (ARCH_03; nclite's plugin contract, docs/plugins.md § The view and its host). Each fake
// host serves a ledger from memory through `api`, keeps a fake chat (`BoardChat`) that holds its chips
// by key, records every Send, confirmation and notice, and can append lines and say so through `events`.
// It imports nothing from `shell/`: the seam is all it has. Bundled by the spec (Vite, in memory) and run in a
// blank page; `window.vbHost` is what the spec drives. The listeners on the document and the window
// are counted, so the spec can see that `unmount` leaves none behind.
import '#tokens/styles.css';
import '../../apps/board/src/styles/board-sheets.ts';
import type { Chip } from '#actions';
import { defineBoardElements } from '#ui';
import type { BoardEvent, BoardHost, ChatWork, ConfirmAsk } from '../../apps/board/src/board/host.ts';
import { mount, type MountedBoard } from '../../apps/board/src/board/mount.ts';

/** Listeners on the document and the window now: added minus removed, each (type, capture, function) once. */
const live = { count: 0 };
const ids = new WeakMap<object, number>();
let next = 0;
const idOf = (fn: unknown): number => {
  if (!fn || (typeof fn !== 'object' && typeof fn !== 'function')) return 0;
  if (!ids.has(fn)) ids.set(fn, ++next);
  return ids.get(fn)!;
};
for (const target of [document, window] as EventTarget[]) {
  const [add, remove] = [target.addEventListener.bind(target), target.removeEventListener.bind(target)];
  const held = new Set<string>();
  const key = (type: string, fn: unknown, opts?: boolean | EventListenerOptions) => `${type}|${typeof opts === 'boolean' ? opts : !!opts?.capture}|${idOf(fn)}`;
  target.addEventListener = (type: string, fn: EventListenerOrEventListenerObject | null, opts?: boolean | AddEventListenerOptions) => {
    const k = key(type, fn, opts);
    if (!held.has(k)) { held.add(k); live.count += 1; }
    add(type, fn, opts);
  };
  target.removeEventListener = (type: string, fn: EventListenerOrEventListenerObject | null, opts?: boolean | EventListenerOptions) => {
    if (held.delete(key(type, fn, opts))) live.count -= 1;
    remove(type, fn, opts);
  };
}

const json = (body: unknown, status = 200, type = 'application/json') =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': type } });

/** What a spec may vary in one host: its settings, where it serves pictures, and its folder, whose store
 *  outlives a mount, as a host's own place for a board would (two folders: two stores, one board name). */
interface HostOptions { settings?: Record<string, unknown>; imageRoute?: string; folder?: string }

/** Each folder's store (`BoardHost.store`), and every key the hosts' documents heard. */
const stores = new Map<string, Map<string, string>>();
const heard: { key: string; prevented: boolean }[] = [];

/** A fake host over `lines` (the ledger's JSON lines), of which the first `shown` are written. */
function fakeHost(lines: readonly object[], shown: number, o: HostOptions = {}) {
  let written = shown;
  const listeners = new Set<(e: BoardEvent) => void>();
  const settings = new Set<() => void>();
  const hearing = new Set<() => void>();
  const record = {
    /** The chips staged now, by key; every `attach`; what each Send took. */
    chips: {} as Record<string, Chip>, attaches: [] as { key: string; chip: Chip | null }[], sends: [] as Chip[][],
    confirms: [] as ConfirmAsk[], notices: [] as { text: string; tone?: string }[], calls: [] as string[],
    /** What the fake confirm answers. */
    answer: false,
    /** What the fake chat says its agent is doing. */
    work: 'idle' as ChatWork,
    subscribers: () => listeners.size + settings.size + hearing.size,
  };
  const host: BoardHost = {
    async api(path, init) {
      record.calls.push(`${init.method ?? 'GET'} ${path}`);
      const url = new URL(path, 'http://host/');
      if (url.pathname === '/ledger') {
        const after = Number(url.searchParams.get('after') ?? 0);
        const events = lines.slice(0, written).filter((l) => (l as { seq: number }).seq > after);
        return json({ events, head: written });
      }
      if (url.pathname.endsWith('/seen')) return json({});
      return json({ type: 'about:blank', title: 'Refused', status: 422, code: 'bad-request', detail: 'The fake host refuses it.' }, 422, 'application/problem+json');
    },
    events(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    chat: {
      attach(key, chip) {
        record.attaches.push({ key, chip });
        if (chip) record.chips[key] = chip; else delete record.chips[key];
      },
      // A host with no server of its own: the message goes through its chat, then the board records the Send.
      send(sendAct) {
        record.sends.push(Object.values(record.chips));
        return sendAct();
      },
      status: {
        get now() { return record.work; },
        on(listener) { hearing.add(listener); return () => { hearing.delete(listener); }; },
      },
    },
    settings: {
      get: (key) => o.settings?.[key],
      on(listener) { settings.add(listener); return () => { settings.delete(listener); }; },
    },
    notify: (text, tone) => { record.notices.push({ text, ...(tone && { tone }) }); },
    confirm: async (ask) => { record.confirms.push(ask); return record.answer; },
    ...(o.imageRoute && { imageRoute: o.imageRoute }),
    ...(o.folder && { store: storeOf(o.folder) }),
  };
  /** Write the rest of the lines, and say so as one change event. */
  const appendRest = () => {
    written = lines.length;
    for (const l of listeners) l({ plugin: 'board', ref: { board: 'roadmap', head: written } });
  };
  /** The fake chat's agent turns to `w`. */
  const work = (w: ChatWork) => {
    record.work = w;
    for (const l of hearing) l();
  };
  return { host, record, appendRest, work };
}

defineBoardElements();

/** The store of folder `name`, made when first asked for. */
function storeOf(name: string): NonNullable<BoardHost['store']> {
  const kept = stores.get(name) ?? new Map<string, string>();
  stores.set(name, kept);
  return { get: (key) => kept.get(key) ?? null, set: (key, value) => { kept.set(key, value); } };
}

const mounted = new Map<string, { view: MountedBoard; record: ReturnType<typeof fakeHost>['record']; appendRest(): void; work(w: ChatWork): void; root: HTMLElement }>();

/** What the spec drives. */
(window as unknown as { vbHost: unknown }).vbHost = {
  listeners: () => live.count,
  mount(rootId: string, lines: object[], shown: number, o?: HostOptions) {
    const root = document.getElementById(rootId)!;
    const fake = fakeHost(lines, shown, o);
    mounted.set(rootId, { view: mount(root, fake.host), record: fake.record, appendRest: fake.appendRest, work: fake.work, root });
  },
  /** The host's own controls, outside both boards: a button and a text input (M10, keys stay inside the board). */
  addHostControls(parentId: string) {
    const parent = document.getElementById(parentId)!;
    const button = Object.assign(document.createElement('button'), { id: 'host-button', textContent: 'Host button' });
    const input = Object.assign(document.createElement('input'), { id: 'host-input', type: 'text' });
    input.setAttribute('aria-label', 'Host input');
    parent.append(button, input);
  },
  /** The host's own shortcut keys: what its document hears, and whether the board marked it used (M22). */
  hearKeys() { document.addEventListener('keydown', (e) => heard.push({ key: e.key, prevented: e.defaultPrevented })); },
  heard: () => heard.splice(0),
  store: (folder: string) => Object.fromEntries(stores.get(folder) ?? []),
  /** The host's Close for one board, outside both (M11): it asks the board first, then unmounts. */
  addClose(parentId: string, rootId: string) {
    const close = Object.assign(document.createElement('button'), { id: `close-${rootId}`, textContent: `Close ${rootId}` });
    close.addEventListener('click', async () => {
      const { view } = mounted.get(rootId)!;
      if (await view.leave()) view.unmount();
    });
    document.getElementById(parentId)!.append(close);
  },
  unsaved: (rootId: string) => mounted.get(rootId)!.view.unsaved(),
  idle: (rootId: string) => mounted.get(rootId)!.view.board.idle(),
  send: (rootId: string) => mounted.get(rootId)!.view.send(),
  status: (rootId: string) => ({ ...mounted.get(rootId)!.view.status.now }),
  record: (rootId: string) => {
    const r = mounted.get(rootId)!.record;
    return { chips: r.chips, attaches: r.attaches, sends: r.sends, confirms: r.confirms, notices: r.notices, calls: r.calls, subscribers: r.subscribers() };
  },
  answer: (rootId: string, ok: boolean) => { mounted.get(rootId)!.record.answer = ok; },
  appendRest: (rootId: string) => mounted.get(rootId)!.appendRest(),
  pageChip: (rootId: string) => mounted.get(rootId)!.view.pageChip(),
  reveal: (rootId: string, ref: { board?: string; n?: number; seq?: number; cards?: number[] }) => mounted.get(rootId)!.view.reveal(ref),
  work: (rootId: string, w: ChatWork) => mounted.get(rootId)!.work(w),
  unmount: (rootId: string) => mounted.get(rootId)!.view.unmount(),
};
