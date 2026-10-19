// App cards' saved panel states on the page (app-state-kept FE_02; apps.md § Saving the panel's
// state, D-050). A panel's `vision-board/save-state` lands here (through its frame,
// app-cards.ts `wire`): the latest value per card is held in memory at once, and written to the
// board's server debounced (`SAVE_DELAY_MS`), one write in flight per card, the latest winning;
// each save is answered by the write that carried it or a later one. A panel that starts again gets
// its card's value from memory, else from one read of the server, waited for at most
// `LOAD_WAIT_MS` (then it starts without). The reads and writes are io.ts' (`panelState`,
// `savePanelState`), passed in, so this runs under plain Node in tests. Nothing here tells the
// person: a refused save goes back to the panel only.
import type { AppStateValue } from '../../../../packages/format/src/index.ts';

/** One app card's panel: its board, its number there, the app it shows. */
export interface PanelKey { board: string; n: number; app: string }

/** How long the page waits after a panel's last save before it writes, in ms. */
export const SAVE_DELAY_MS = 500;
/** The longest a starting panel waits for its card's value from the server, in ms. */
export const LOAD_WAIT_MS = 2000;

export interface PanelStatesDeps {
  read(key: PanelKey): Promise<AppStateValue | undefined>;
  /** Rejects with the panel's refusal (`{ problem, detail? }`). */
  write(key: PanelKey, state: AppStateValue): Promise<unknown>;
  delayMs?: number;
  waitMs?: number;
}

export interface PanelStates {
  /** Hold `state` for the card and write it soon; resolves once a write carrying it (or a later
   * value) is done, rejects with that write's refusal. */
  save(key: PanelKey, state: AppStateValue): Promise<void>;
  /** The card's value for a panel that starts: memory first, else one bounded read; undefined: none. */
  load(key: PanelKey): Promise<AppStateValue | undefined>;
}

interface Waiter { resolve(): void; reject(e: unknown): void }
/** One card's writes: the value not yet written, who waits on it, the timer, a write in flight. */
interface Slot { key: PanelKey; value?: { v: AppStateValue }; waiters: Waiter[]; timer?: ReturnType<typeof setTimeout>; flying: boolean }

const cardOf = (k: PanelKey) => `${k.board}\n${k.n}`;
const panelOf = (k: PanelKey) => `${cardOf(k)}\n${k.app}`;

export function createPanelStates(d: PanelStatesDeps): PanelStates {
  const delay = d.delayMs ?? SAVE_DELAY_MS;
  const wait = d.waitMs ?? LOAD_WAIT_MS;
  /** The latest value per card and app, as `{ v }`: a card read as having none (v undefined) is not read again. */
  const held = new Map<string, { v: AppStateValue | undefined }>();
  const slots = new Map<string, Slot>();

  function schedule(slot: Slot): void {
    clearTimeout(slot.timer);
    if (!slot.flying) slot.timer = setTimeout(() => flush(slot), delay);
  }

  function flush(slot: Slot): void {
    const pending = slot.value;
    if (slot.flying || !pending) return;
    const waiters = slot.waiters.splice(0);
    slot.value = undefined;
    slot.flying = true;
    d.write(slot.key, pending.v).then(
      () => { for (const w of waiters) w.resolve(); },
      (e: unknown) => { for (const w of waiters) w.reject(e); },
    ).finally(() => {
      slot.flying = false;
      if (slot.value) schedule(slot);
    });
  }

  function save(key: PanelKey, state: AppStateValue): Promise<void> {
    held.set(panelOf(key), { v: state });
    const id = cardOf(key);
    const slot = slots.get(id) ?? { key, waiters: [], flying: false };
    slots.set(id, slot);
    slot.key = key;
    slot.value = { v: state };
    const done = new Promise<void>((resolve, reject) => slot.waiters.push({ resolve, reject }));
    schedule(slot);
    return done;
  }

  async function load(key: PanelKey): Promise<AppStateValue | undefined> {
    const id = panelOf(key);
    const known = held.get(id);
    if (known) return known.v;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const late = new Promise<'late'>((resolve) => { timer = setTimeout(() => resolve('late'), wait); });
    const read = d.read(key).then((v) => ({ v }), () => 'failed' as const);
    const got = await Promise.race([read, late]);
    clearTimeout(timer);
    // A save while the read was out is newer: the latest wins.
    const now = held.get(id);
    if (now) return now.v;
    if (typeof got === 'string') return undefined;
    held.set(id, got);
    return got.v;
  }

  return { save, load };
}
