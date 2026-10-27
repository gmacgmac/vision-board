// What the page knows of the project's apps (D-047 ruling 11, app-cards FE_02): the one copy of
// list_apps' answer, which the app host works out fresh each time it is asked; the page never works
// a state out itself. It is read when the page loads a ledger that names an app, when a line draws an
// app card or allows or stops an app, after the person's Allow and Stop app, on Check again and
// Restart, when a tool call is refused in a way that says the app's state moved (its code changed,
// it broke), and when an app card is selected or its frame loads (app-cards.ts), so a card follows
// its folder with no timer. Reads made while one is on its way share one more read after it, so
// nothing asked in between is missed (as live.ts `sync`). An answer that gives an app no size (its
// folder went, its app.json can't be read) keeps the last size given, so a card with no size of its
// own keeps its box (app-cards FIX_03). With the appCards flag off nothing is read.
import type { AppInfo, LedgerEvent } from '#format';
import type { LedgerState } from '#actions';
import { namedApps } from '#actions';
import type { Io } from '../io.ts';

export interface AppStates {
  /** What list_apps last said of app `id` (undefined until it named it), with the last size it gave. */
  info(id: string): AppInfo | undefined;
  /** Read list_apps again; resolves once the answer (or the one after it) is in. */
  refresh(): Promise<void>;
  /** Lines were applied to the held state (`full`: it was read afresh): read again if they touch apps. */
  lines(lines: readonly LedgerEvent[], full: boolean, state: LedgerState | null): void;
}

export interface AppStateDeps {
  /** The appCards flag. */
  on: boolean;
  /** list_apps answered something new: draw the app cards again. */
  changed(): void;
  fail(err: unknown): void;
  listApps: Io['listApps'];
}

/** A line that draws an app card, or allows or stops an app (another tab, or the person's own act). */
const touchesApps = (e: LedgerEvent): boolean =>
  (e.type === 'node' && (e.node.kind === 'app' || e.node.app !== undefined)) || (e.type === 'act' && (e.action === 'app-allow' || e.action === 'app-revoke'));

export function createAppStates(d: AppStateDeps): AppStates {
  let apps = new Map<string, AppInfo>();
  let reading: Promise<void> | null = null;
  let again = false;
  /** The answer last applied, so an answer that says the same draws nothing. */
  let last = '';

  async function readOnce(): Promise<void> {
    const { apps: list } = await d.listApps();
    const text = JSON.stringify(list);
    if (text === last) return;
    last = text;
    apps = new Map(list.map((a) => [a.id, { size: apps.get(a.id)?.size, ...a }]));
    d.changed();
  }

  function refresh(): Promise<void> {
    if (!d.on) return Promise.resolve();
    if (reading) {
      again = true;
      return reading;
    }
    reading = (async () => {
      try {
        do {
          again = false;
          await readOnce();
        } while (again);
      } catch (err) {
        d.fail(err);
      } finally {
        reading = null;
      }
    })();
    return reading;
  }

  return {
    info: (id) => apps.get(id),
    refresh,
    lines(lines, full, state) {
      if (!d.on) return;
      if (full ? state !== null && namedApps(state).size > 0 : lines.some(touchesApps)) void refresh();
    },
  };
}
