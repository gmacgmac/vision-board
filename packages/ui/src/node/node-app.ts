// Node pattern, app cards (D-047; app-cards ruling 10): what an app card shows in each state, from
// the app as list_apps gives it (the app host's one state function, ruling 11) and what the page
// knows of the card. No DOM: node-core.ts adds its words to the card's name, node-template.ts draws
// it, vb-node.ts applies it in place. Every state keeps the panel's size and the room of the row over
// it, so neither a state change nor the frame coming and going (ruling 14) moves the card.
import type { AppInfo, AppProblem, AppSize, ViewNode } from '../../../format/src/index.ts';
import { ACTIONS } from '../../../actions/src/index.ts';
import { panelSize } from '../app-frame/app-frame-core.ts';

/** Every state an app card draws: `checking` until list_apps has answered, the app host's five
 * states with `changed` apart from a first `needs-approval`, and `past` (a past version of the
 * board: read-only, no frame). */
export const APP_CARD_STATES = ['checking', 'missing', 'invalid', 'needs-approval', 'changed', 'ready', 'broken', 'past'] as const;
export type AppCardState = (typeof APP_CARD_STATES)[number];

/** The states in which the panel shows (and calls answer `needs-approval` until Allow). */
const FRAME_STATES: ReadonlySet<AppCardState> = new Set(['needs-approval', 'changed', 'ready']);

/** What the page knows of an app card, passed in like the conditions: its app from list_apps
 * (absent until list_apps has answered) and whether a past version of the board is showing. */
export interface AppCardInput { info?: AppInfo; past?: boolean }

export interface AppCardView {
  state: AppCardState;
  /** The panel's size (`panelSize`): the agent's, else the manifest's, else the default. */
  size: AppSize;
  /** The app's name: the manifest's title, else the card's. The frame's title. */
  name: string;
  /** The panel shows: the page loads the frame while the card is on screen and near (ruling 14). */
  frame: boolean;
  /** In the row over the panel, beside Allow: why its tools wait. */
  ask?: string;
  /** In place of the panel: a line in bold, a line under it, the problems, a button to try again.
   * Over a ready panel, `text` is the row's line instead (beside Stop app, or with nothing to allow). */
  head?: string;
  text?: string;
  problems?: string[];
  retry?: string;
  /** Stop app shows in the row over the panel: the person allowed this version of the app's tools. */
  stop: boolean;
  /** The buttons' names: Allow, Stop app and the try-again button, each with the app's name. */
  names: { allow: string; stop: string; retry?: string };
  /** What the card's name adds after its title (node-core.ts `nodeLabel`). */
  words: string;
}

/** The plain card the flag off draws (ruling 13). */
export const APPS_OFF = 'App cards are off.';

/** One problem as the card lists it, for the agent to fix: the file and what (the server names the
 * field in its words and sends no pointer, app-cards FIX_01). */
export const problemLine = (p: AppProblem): string => `${p.file}: ${p.detail}`;

/** The words of each state that draws no panel, and what each adds to the card's name. Plain and
 * short: the person reads them; the problems are the agent's to fix. */
const COPY: Record<AppCardState, { head?: (id: string, name: string) => string; text?: string; ask?: string; retry?: string; words: string }> = {
  checking: { text: 'Loading…', words: ', loading' },
  missing: { head: (id) => `App ${id} not found`, text: 'Ask the agent to add it.', retry: 'Check again', words: ', app not found' },
  invalid: { head: () => 'This app has problems', text: 'Ask the agent to fix them.', retry: 'Check again', words: ', app has problems' },
  'needs-approval': { ask: 'Allow this app to run?', words: ', not allowed yet' },
  changed: { ask: 'Code changed. Allow it again?', words: ', code changed, not allowed yet' },
  ready: { text: 'Nothing to allow', words: '' },
  broken: { head: () => 'This app stopped', text: 'It kept crashing. Restart once the agent fixes it.', retry: 'Restart', words: ', app stopped' },
  past: { head: (_id, name) => name, text: 'Apps don\'t run in past versions.', words: ', not running in a past version' },
};

/** The state an app card is in: a past version first, then whether list_apps has answered. */
function cardState(input: AppCardInput): AppCardState {
  if (input.past) return 'past';
  const info = input.info;
  if (!info) return 'checking';
  return info.state === 'needs-approval' && info.changed ? 'changed' : info.state;
}

/** What app card `n` shows (ruling 10); `input` is what the page knows of it. */
export function appView(n: ViewNode, input: AppCardInput = {}): AppCardView {
  const { info } = input;
  const id = n.app?.id ?? '';
  const name = info?.title ?? n.title;
  const state = cardState(input);
  const c = COPY[state];
  const problems = state === 'invalid' ? (info?.problems ?? []).map(problemLine) : [];
  // Only a version with tools can be allowed; list_apps names the tools only after their first call.
  const stop = state === 'ready' && info!.allowed;
  const text = stop ? 'Allowed to run' : c.text;
  return {
    state, name, size: panelSize(n.app ?? { id }, info?.size), frame: FRAME_STATES.has(state),
    ...(c.ask && { ask: c.ask }), ...(c.head && { head: c.head(id, name) }), ...(text && { text }),
    ...(problems.length > 0 && { problems }), ...(c.retry && { retry: c.retry }),
    stop,
    names: {
      allow: `${ACTIONS['app-allow'].label}: ${name}`, stop: `${ACTIONS['app-revoke'].label}: ${name}`,
      ...(c.retry && { retry: `${c.retry}: ${name}` }),
    },
    words: c.words,
  };
}
