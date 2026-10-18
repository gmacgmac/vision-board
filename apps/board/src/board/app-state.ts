// What the page knows of the project's apps (D-047 ruling 11, app-cards FE_02): the one copy of
// list_apps' answer, which the app host works out fresh each time it is asked; the page never works
// a state out itself. It is read when the page loads a ledger that names an app, when a line draws an
// app card or allows or stops an app, after the person's Allow and Stop app, on Check again and
// Restart, and when a tool call is refused in a way that says the app's state moved (its code
// changed, it broke). Reads made while one is on its way share one more read after it, so nothing
// asked in between is missed (as live.ts `sync`). With the appCards flag off nothing is read.
import type { AppInfo, LedgerEvent } from '../../../../packages/format/src/index.ts';
import type { LedgerState } from '../../../../packages/actions/src/index.ts';
import { namedApps } from '../../../../packages/actions/src/index.ts';
import { listApps } from './io.ts';

export interface AppStates {
  /** list_apps has answered at least once. */
  readonly known: boolean;
  /** What list_apps last said of app `id` (undefined until it named it). */
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
}

/** A line that draws an app card, or allows or stops an app (another tab, or the person's own act). */
const touchesApps = (e: LedgerEvent): boolean =>
  (e.type === 'node' && (e.node.kind === 'app' || e.node.app !== undefined)) || (e.type === 'act' && (e.action === 'app-allow' || e.action === 'app-revoke'));

export function createAppStates(d: AppStateDeps): AppStates {
  let apps = new Map<string, AppInfo>();
  let known = false;
  let reading: Promise<void> | null = null;
  let again = false;
  /** The answer last applied, so an answer that says the same draws nothing. */
  let last = '';

  async function readOnce(): Promise<void> {
    const { apps: list } = await listApps();
    const text = JSON.stringify(list);
    known = true;
    if (text === last) return;
    last = text;
    apps = new Map(list.map((a) => [a.id, a]));
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
    get known() { return known; },
    info: (id) => apps.get(id),
    refresh,
    lines(lines, full, state) {
      if (!d.on) return;
      if (full ? state !== null && namedApps(state).size > 0 : lines.some(touchesApps)) void refresh();
    },
  };
}
