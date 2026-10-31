// The header's form by its own width (adaptiveHeader flag): three tiers, and what sits where in each.
// The bar reads its width (Toolbar.svelte, a ResizeObserver), not the window's, so it works in a host's
// pane as nclite's chat header does. One table, so the bar, the "⋯" menu and the tests agree. Plain code.

export type HeaderTier = 'full' | 'half' | 'third';

/** The bar's width from which everything shows with its words, every chip that comes and goes (bare), Send's
 *  longest word and Chat's marks included (measured: a long name, all of them at once, the board's name still 100px). */
export const FULL_MIN = 1300;
/** The bar's width from which the half form holds, with every chip that comes and goes (measured the same way, 80px). */
export const HALF_MIN = 620;

export const headerTier = (width: number): HeaderTier => (width >= FULL_MIN ? 'full' : width >= HALF_MIN ? 'half' : 'third');

/** Everything the header holds that moves or goes. The board picker, Send, Chat, "⋯" and Locked stay. */
export type HeaderControl = 'app-icon' | 'folder' | 'board' | 'version' | 'locked' | 'containers' | 'open' | 'new'
  | 'boards-updated' | 'replied' | 'flagged' | 'zoom' | 'agents' | 'send' | 'chat' | 'more';

export const HEADER_CONTROLS: readonly HeaderControl[] = ['app-icon', 'folder', 'board', 'version', 'locked', 'containers', 'open', 'new',
  'boards-updated', 'replied', 'flagged', 'zoom', 'agents', 'send', 'chat', 'more'];

/** What moves into "⋯" at each tier: a row there does what the control does in the bar. */
const IN_MENU: Record<HeaderTier, readonly HeaderControl[]> = {
  full: [],
  half: ['version', 'containers'],
  third: ['folder', 'version', 'containers', 'open', 'new', 'flagged', 'zoom', 'agents', 'boards-updated'],
};

/** What no longer shows at a tier: decoration, or a count that says nothing a person can act on there. */
const GONE: Record<HeaderTier, readonly HeaderControl[]> = {
  full: [],
  half: ['app-icon'],
  third: ['app-icon', 'replied'],
};

export const inMenu = (tier: HeaderTier, c: HeaderControl): boolean => IN_MENU[tier].includes(c);
export const inBar = (tier: HeaderTier, c: HeaderControl): boolean => !inMenu(tier, c) && !GONE[tier].includes(c);
