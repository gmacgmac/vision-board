// Node pattern, app cards (D-047; app-cards ruling 10): what an app card shows in each state, from
// the app as list_apps gives it (the app host's one state function, ruling 11) and what the page
// knows of the card. No DOM: node-core.ts adds its words to the card's name, node-template.ts draws
// it, vb-node.ts applies it in place. Every state keeps the panel's size, and Allow or "Allowed ▾"
// sits in the footer (card-polish FE_01), so neither a state change nor the frame coming and going
// (ruling 14) moves the card. Only a new size does: a card with no `w`/`h` is the default until
// list_apps first gives the manifest's size (components.md § App card 2).
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

/** The footer's app status (card-polish FE_01): Allow while the app's tools wait for the person,
 * "Allowed ▾" (a menu holding Stop app) once they allowed this version, else nothing. */
export type AppControl = 'allow' | 'allowed' | 'none';

export interface AppCardView {
  state: AppCardState;
  /** The panel's size (`panelSize`): the agent's, else the manifest's, else the default. */
  size: AppSize;
  /** The app's name: the manifest's title, else the card's. The frame's title. */
  name: string;
  /** The panel shows: the page loads the frame while the card is on screen and near (ruling 14). */
  frame: boolean;
  /** The footer's app status: Allow, "Allowed ▾" or nothing. */
  control: AppControl;
  /** Why Allow shows ("Not allowed yet", "Code changed"): its tip, and the end of its name. */
  reason?: string;
  /** In place of the panel: a line in bold, a line under it, the problems, a button to try again. */
  head?: string;
  text?: string;
  problems?: string[];
  retry?: string;
  /** The controls' names, each with the app's name: Allow (with its reason), "Allowed ▾", the
   * Stop app item in its menu, and the try-again button. */
  names: { allow: string; allowed: string; stop: string; retry?: string };
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
const COPY: Record<AppCardState, { head?: (id: string, name: string) => string; text?: string; reason?: string; retry?: string; words: string }> = {
  checking: { text: 'Loading…', words: ', loading' },
  missing: { head: (id) => `App ${id} not found`, text: 'Ask the agent to add it.', retry: 'Check again', words: ', app not found' },
  invalid: { head: () => 'This app has problems', text: 'Ask the agent to fix them.', retry: 'Check again', words: ', app has problems' },
  'needs-approval': { reason: 'Not allowed yet', words: ', not allowed yet' },
  changed: { reason: 'Code changed', words: ', code changed, not allowed yet' },
  ready: { words: '' },
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
  // Ready and allowed: Stop app in a menu. Ready and not allowed is an app with no tools, which has
  // nothing to allow (list_apps names the tools only after their first call), so nothing shows.
  const control: AppControl = c.reason ? 'allow' : state === 'ready' && info!.allowed ? 'allowed' : 'none';
  const allow = `${ACTIONS['app-allow'].label}: ${name}`;
  return {
    state, name, size: panelSize(n.app ?? { id }, info?.size), frame: FRAME_STATES.has(state), control,
    ...(c.reason && { reason: c.reason }), ...(c.head && { head: c.head(id, name) }), ...(c.text && { text: c.text }),
    ...(problems.length > 0 && { problems }), ...(c.retry && { retry: c.retry }),
    names: {
      allow: c.reason ? `${allow}. ${c.reason}` : allow, allowed: `App allowed: ${name}`, stop: `${ACTIONS['app-revoke'].label}: ${name}`,
      ...(c.retry && { retry: `${c.retry}: ${name}` }),
    },
    words: c.words,
  };
}
