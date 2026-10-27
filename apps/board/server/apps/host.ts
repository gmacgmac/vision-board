// The app host of one open folder (D-047 rulings 6-13): it asks the one state function (state.ts)
// for an app each time, never keeping a copy; lists the apps for list_apps; runs a tool for the
// person's panel only when the app is allowed at this version; stops a process whose code changed
// or whose allow was taken back; and stops every process when the folder closes. With the
// `appCards` flag off it runs nothing (the routes answer not-found).
import type { AppInfo, AppToolResult, FlagOverrides } from '#format';
import { flagOn } from '#format';
import { namedApps } from '#actions';
import type { Ledger } from '../ledger.ts';
import { problem } from '../problem.ts';
import { readEnv } from './env.ts';
import { appIds } from './manifest.ts';
import type { AppStatus } from './state.ts';
import { appState } from './state.ts';
import type { AppLimits } from './supervisor.ts';
import { appInvalid, createSupervisor } from './supervisor.ts';
import * as appsHostWords from '../words/apps-host.ts';
import * as serverCommonWords from '../words/server-common.ts';

/** What the routes say when app cards are off. */
export const APPS_OFF = appsHostWords.appCardsAreOffOn;

export interface AppHostOptions {
  /** The open folder (its real path) and its ledger, for what the person allowed. */
  dir: () => string;
  ledger: Ledger;
  flags?: FlagOverrides | undefined;
  /** Shorter limits than APP_LIMITS, for tests. */
  limits?: Partial<AppLimits> | undefined;
}

export interface AppHost {
  /** The `appCards` flag. */
  readonly on: boolean;
  /** Every app folder and every app a card names, by id, in its state now. */
  list(): AppInfo[];
  /** One app's state now, and its folder. */
  status(id: string): AppStatus;
  /** Run one of the app's tools for its panel; a problem when it may not or did not. */
  call(id: string, tool: string, args: Record<string, unknown>, signal?: AbortSignal): Promise<AppToolResult>;
  close(): void;
}

export function createAppHost({ dir, ledger, flags, limits }: AppHostOptions): AppHost {
  const on = flagOn('appCards', flags);
  const runs = createSupervisor(limits);
  // A stop takes the allow back now: the app's process goes with it.
  const unsubscribe = ledger.onAppend((e) => { if (e.type === 'act' && e.action === 'app-revoke' && e.app) runs.seen(e.app, undefined); });

  function status(id: string): AppStatus {
    const s = appState(dir(), id, ledger.state().appAllowed.get(id), runs.known);
    runs.seen(id, s.info.allowed && s.folder?.tools ? s.info.hash : undefined);
    return s;
  }

  return {
    on,
    status,
    list() {
      const ids = new Set([...appIds(dir()), ...namedApps(ledger.state()).keys()]);
      return [...ids].sort().map((id) => status(id).info);
    },
    async call(id, tool, args, signal) {
      if (!on) throw problem('not-found', APPS_OFF);
      const { info, folder } = status(id);
      if (info.state === 'missing') throw problem('app-not-found', `There is no app "${id}" in this folder's .visionboard/apps/.`);
      if (info.state === 'invalid') throw appInvalid(id, info.problems);
      if (info.state === 'needs-approval') {
        throw problem('needs-approval', info.changed
          ? appsHostWords.theCodeOfTheApp(id)
          : appsHostWords.thePersonHasNotAllowed(id));
      }
      if (info.state === 'broken') throw problem('app-failed', serverCommonWords.theAppCrashedTooOften(id));
      const tools = folder?.tools;
      if (!tools || !info.hash) throw problem('invalid', appsHostWords.theAppHasAPanel(id), { errors: [{ pointer: '/tool', detail: appsHostWords.thisAppHasNoTools }] });
      const spec = { id, hash: info.hash, dir: folder.dir, file: tools.file, fileName: tools.name, env: () => readEnv(dir(), folder.manifest?.env ?? []) };
      return runs.call(spec, tool, args, signal);
    },
    close() {
      unsubscribe();
      runs.close();
    },
  };
}
