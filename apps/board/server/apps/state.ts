// The one state function (D-047 ruling 11, apps.md § States): what an app is now, worked out fresh
// from its folder, the hash the person allowed, and what running it found. list_apps, the panel
// route and call_app_tool all ask this; nothing keeps a copy. In order: no folder is `missing`;
// problems in the files are `invalid`; tools the person has not allowed at this version are
// `needs-approval` (`changed` when an earlier one was); then, for this version, a tools module that
// didn't load is `invalid` and one that crashed too often `broken`; else `ready`.
import type { AppInfo, AppProblem } from '#format';
import { appHash } from './hash.ts';
import type { AppFolder } from './manifest.ts';
import { readApp } from './manifest.ts';

/** What running an app at one version found (the supervisor's): its tools' names once its module
 * loaded, the problems when it didn't, and why it is broken. */
export interface AppRun { tools?: string[]; problems?: AppProblem[]; broken?: AppProblem }

/** What the supervisor knows of app `id` at version `hash`, if anything. */
export type RunFacts = (id: string, hash: string) => AppRun | undefined;

/** An app's state, and its folder when it has one. */
export interface AppStatus { info: AppInfo; folder?: AppFolder }

export function appState(project: string, id: string, allowed: string | undefined, run?: RunFacts, ledger?: string): AppStatus {
  const folder = readApp(project, id, ledger);
  if (!folder) return { info: { id, state: 'missing', tools: [], allowed: false } };
  const { manifest, manifestBytes, problems } = folder;
  const hash = manifestBytes && appHash(manifestBytes, folder.tools?.bytes);
  const info: AppInfo = {
    id, state: 'ready', tools: [], allowed: hash !== undefined && hash === allowed,
    ...(manifest && { title: manifest.title, version: manifest.version }),
    // The size also while the manifest has other problems (manifest.ts `AppFolder.size`).
    ...(folder.size && { size: folder.size }),
    ...(hash && { hash }),
  };
  if (problems.length || !hash) return { info: { ...info, state: 'invalid', problems }, folder };
  if (folder.tools && !info.allowed) return { info: { ...info, state: 'needs-approval', ...(allowed !== undefined && { changed: true }) }, folder };
  const facts = folder.tools && run?.(id, hash);
  if (facts?.tools) info.tools = facts.tools;
  if (facts?.problems?.length) return { info: { ...info, state: 'invalid', problems: facts.problems }, folder };
  if (facts?.broken) return { info: { ...info, state: 'broken', problems: [facts.broken] }, folder };
  return { info, folder };
}
