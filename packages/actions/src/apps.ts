// App cards in the action layer (ledger v17, api.md 150-151, D-047): the person's allow of an app's
// code at one version, folded to one allowed hash per app; the rules for an allow and a stop; and
// which cards name which app. An app is on no board and no card: the allow stays when its cards are
// retired, and whether a hash is the app's current code is the app host's to say (list_apps).
import type { ActEvent } from '../../format/src/index.ts';
import { latest } from '../../format/src/index.ts';
import type { LedgerState } from './fold.ts';

/** What the fold keeps for apps: app id -> the hash the person allowed, while it stands. */
export interface AppAllows { appAllowed: Map<string, string> }

/** Fold one `app-allow` (a newer hash replaces the one before) or `app-revoke`. */
export function foldAppAct(s: AppAllows, e: ActEvent): void {
  if (e.action === 'app-allow') s.appAllowed.set(e.app!, e.hash!);
  else s.appAllowed.delete(e.app!);
}

/** An allow names a version not allowed now; a stop, an app that is allowed. */
export function appRules(e: ActEvent, s: LedgerState, p: string[]): void {
  const allowed = s.appAllowed.get(e.app!);
  if (e.action === 'app-allow' && allowed === e.hash) p.push(`hash: this version of "${e.app}" is already allowed`);
  if (e.action === 'app-revoke' && allowed === undefined) p.push(`app: "${e.app}" isn't allowed, so there is nothing to stop`);
}

/** The app card `id` names, if it is one (card -> app). */
export function appOf(s: LedgerState, id: number): string | undefined {
  const x = s.nodes.get(id);
  const v = x && latest(x);
  return v?.kind === 'app' ? v.app?.id : undefined;
}

/** Every app a card on a board now (not retired) names, with those cards in ledger order: one pass.
 * A card whose app has no folder is an orphan the app host reports as `missing` (list_apps); adding
 * the folder back heals it. */
export function namedApps(s: LedgerState): Map<string, number[]> {
  const out = new Map<string, number[]>();
  for (const x of s.nodes.values()) {
    const app = x.retired === undefined ? appOf(s, x.id) : undefined;
    if (app !== undefined) out.set(app, [...(out.get(app) ?? []), x.id]);
  }
  return out;
}

/** The cards on a board now that name app `app`, in ledger order. */
export const appCards = (s: LedgerState, app: string): number[] => namedApps(s).get(app) ?? [];
