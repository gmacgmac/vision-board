/// <reference types="vite/client" />
// The browser side of board-host.spec.ts: the board mounted by a fake host, with no Svelte and no
// server (ARCH_03; nclite's plugin contract, docs/plugins.md § The view and its host). Each fake
// host serves a ledger from memory through `api`, records every chip, confirmation and notice, and
// can append lines and say so through `events`. Bundled by the spec (Vite, in memory) and run in a
// blank page; `window.vbHost` is what the spec drives. The listeners on the document and the window
// are counted, so the spec can see that `unmount` leaves none behind.
import '#tokens/styles.css';
import '../../apps/board/src/styles/board.css';
import '#ui/styles.css';
import type { Chip } from '#actions';
import { defineBoardElements } from '#ui';
import type { BoardEvent, BoardHost, ConfirmAsk } from '../../apps/board/src/board/host.ts';
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

/** A fake host over `lines` (the ledger's JSON lines), of which the first `shown` are written. */
function fakeHost(lines: readonly object[], shown: number) {
  let written = shown;
  const listeners = new Set<(e: BoardEvent) => void>();
  const settings = new Set<() => void>();
  const record = {
    chips: [] as Chip[], confirms: [] as ConfirmAsk[], notices: [] as { text: string; tone?: string }[], calls: [] as string[],
    /** What the fake confirm answers. */
    answer: false,
    subscribers: () => listeners.size + settings.size,
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
    addToChat: (chip) => { record.chips.push(chip); },
    settings: {
      get: () => undefined,
      on(listener) { settings.add(listener); return () => { settings.delete(listener); }; },
    },
    notify: (text, tone) => { record.notices.push({ text, ...(tone && { tone }) }); },
    confirm: async (ask) => { record.confirms.push(ask); return record.answer; },
  };
  /** Write the rest of the lines, and say so as one change event. */
  const appendRest = () => {
    written = lines.length;
    for (const l of listeners) l({ plugin: 'board', ref: { board: 'roadmap', head: written } });
  };
  return { host, record, appendRest };
}

defineBoardElements();

const mounted = new Map<string, { view: MountedBoard; record: ReturnType<typeof fakeHost>['record']; appendRest(): void; root: HTMLElement }>();

/** What the spec drives. */
(window as unknown as { vbHost: unknown }).vbHost = {
  listeners: () => live.count,
  mount(rootId: string, lines: object[], shown: number) {
    const root = document.getElementById(rootId)!;
    const fake = fakeHost(lines, shown);
    mounted.set(rootId, { view: mount(root, fake.host), record: fake.record, appendRest: fake.appendRest, root });
  },
  idle: (rootId: string) => mounted.get(rootId)!.view.board.idle(),
  send: (rootId: string) => mounted.get(rootId)!.view.send(),
  status: (rootId: string) => ({ ...mounted.get(rootId)!.view.status.now }),
  record: (rootId: string) => {
    const r = mounted.get(rootId)!.record;
    return { chips: r.chips, confirms: r.confirms, notices: r.notices, calls: r.calls, subscribers: r.subscribers() };
  },
  answer: (rootId: string, ok: boolean) => { mounted.get(rootId)!.record.answer = ok; },
  appendRest: (rootId: string) => mounted.get(rootId)!.appendRest(),
  pageChip: (rootId: string) => mounted.get(rootId)!.view.pageChip(),
  reveal: (rootId: string, ref: { board?: string; n?: number; seq?: number }) => mounted.get(rootId)!.view.reveal(ref),
  unmount: (rootId: string) => mounted.get(rootId)!.view.unmount(),
};
