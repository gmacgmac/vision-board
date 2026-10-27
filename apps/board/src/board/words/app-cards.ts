// Words: app-cards. The confirms before Allow and Stop app, the toasts after, and what Check again and Restart found.
// Where: an app card's buttons (app-cards FE_02). The action registry marks Allow and Stop app
// `needsConfirmation`. Plain and short: the person reads them, not the agent.
// Keys: board.app-cards.<name>. Plain code: no imports but other words files and types.
import type { ActionId, AppState } from '#format';

/** What an app's code may do once allowed (apps.md § Where it runs), in the person's words. */
const REACH = 'It runs on this computer and can use the internet, but it can\'t change your files.';

/** The confirm before Allow (`changed`: the code changed since the last Allow) or Stop app:
 * heading, body, and the confirming button. */
export function appAsk(action: ActionId, name: string, changed: boolean): [string, string, string] {
  if (action === 'app-revoke') return [`Stop ${name}?`, 'It stops now and won\'t run until you allow it again.', 'Stop app'];
  return changed
    ? [`Allow ${name} again?`, `The agent changed this app since you allowed it. ${REACH}`, 'Allow']
    : [`Allow ${name} to run?`, `The agent wrote this app. ${REACH}`, 'Allow'];
}

/** The toast once Allow or Stop app is recorded. */
export const appDone = (action: ActionId, name: string): string => `${name} ${action === 'app-revoke' ? 'stopped' : 'allowed'}`;

/** What Check again (missing, invalid) or Restart (broken) found: the state before, and after. A
 * folder gone since is "not found", as its card says (app-cards FIX_04). */
export function retryDone(name: string, before: AppState | undefined, after: AppState | undefined): string {
  if (after !== before) return `${name} ${before === 'missing' ? 'found' : after === 'missing' ? 'not found' : 'updated'}`;
  return `${name} ${after === 'broken' ? 'is still stopped.' : after === 'missing' ? 'still not found.' : 'still has problems.'}`;
}
