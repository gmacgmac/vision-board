// Feature flags (rule 12; docs/specification/components.md § Feature flags). The one definition:
// every flag, its default and what it switches. New behaviour checks `flagOn(name, overrides)`;
// the page builds `overrides` from the URL and localStorage (apps/board/src/flags.ts), tests and
// the gallery pass them directly. A flag is removed from here when its behaviour becomes the default.

export interface FlagDef {
  readonly default: boolean;
  readonly description: string;
}

export const FLAGS = {
  nodeSize: {
    // On by default (maintainer, 2026-10-05); ?flags=-nodeSize turns it off.
    default: true,
    description: 'Cards take one of three widths (S, M, L) from their content, with a size control on each card (D-030, U7).',
  },
  hideControlsZoomedOut: {
    // Off by default (maintainer, chat 717, tracker N13): every control stays visible at every zoom.
    default: false,
    description: 'Below the zoom FAR_K (apps/board/src/board/viewport.ts), hide the cards\' buttons, the size control and the containers\' icon row, so none draws under the 24px target size (N8, N13).',
  },
  agentAccess: {
    default: true,
    description: 'The person\'s side of agent access: allow or refuse grant requests, see and remove each container\'s holders, and Send to agent (D-027, U4 2_FE_01).',
  },
  wireLayers: {
    // On by default (maintainer, 2026-10-06, D-032); ?flags=-wireLayers turns it off.
    default: true,
    description: 'Connectors draw behind container frames and cards, cards are see-through (--vb-card-fill) so a connector behind one still shows, and the focused card\'s connectors draw above the cards (D-032).',
  },
  keepView: {
    // On by default (maintainer, 2026-10-07, found-in-use FE_02); ?flags=-keepView turns it off.
    default: true,
    description: 'Each board\'s zoom and position are kept in sessionStorage (vb.view.<board>) and restored when the board opens, so a reload keeps the view; off, a board always fits on open.',
  },
  titleTip: {
    // On by default (maintainer, 2026-10-07, found-in-use FE_03); ?flags=-titleTip turns it off.
    default: true,
    description: 'A container title cut at two lines shows its full text in a tip below the title, on hover of the title and on keyboard focus in the label group (WCAG 1.4.13); off, a cut title ends in an ellipsis with no tip.',
  },
  notePreview: {
    // On by default (maintainer, 2026-10-07, found-in-use FE_04); ?flags=-notePreview turns it off.
    default: true,
    description: 'A card note cut at three lines shows its full text, as Markdown, in a box beside the card on hover and on keyboard focus (WCAG 1.4.13: hoverable, persistent, Esc dismisses); a click still opens the note bubble; off, a cut note has no preview.',
  },
  versionView: {
    // On by default (maintainer, 2026-10-07, navigation FE_01); ?flags=-versionView turns it off.
    default: true,
    description: 'The toolbar shows each fact once: the picker holds titles only, the title heading is for screen readers, and a version dropdown lists the board\'s own versions; choosing a past one shows the board as it was, read-only, under a "Back to now" banner. Off, the toolbar shows the title and the ledger\'s latest line as before.',
  },
  containerFinder: {
    // On by default (maintainer, 2026-10-07, navigation FE_02); ?flags=-containerFinder turns it off.
    default: true,
    description: 'A Containers dropdown in the toolbar lists every container on the board with its card count, Later always last (greyed when empty); choosing one zooms to it and focuses its title; it works in a past version too (N18).',
  },
  keyBubble: {
    // On by default (maintainer, 2026-10-07, navigation FE_04); ?flags=-keyBubble turns it off.
    default: true,
    description: 'The key help along the bottom is a small "?" bubble at the bottom left: hover, focus or the ? key lists every command (grouped Items, Selection, Board, View), generated from the command table and the action registry; Esc closes it. Off, the board shows no key help (N20).',
  },
  boardEdit: {
    // On by default (maintainer, 2026-10-07, navigation BE_01 ruling 3); ?flags=-boardEdit turns it off.
    default: true,
    description: 'The board picker ends with New board… and Rename board…, each opening a small dialog (title, optional summary) that writes the person\'s `board` line through `put_board` (api.md 90); a new board\'s id is made from its title and it opens at once. Off while a past version shows. Off, only agents make boards and nobody renames them (N22).',
  },
} as const satisfies Record<string, FlagDef>;

export type FlagName = keyof typeof FLAGS;
export type FlagOverrides = Partial<Record<FlagName, boolean>>;

export const isFlag = (name: string): name is FlagName => Object.hasOwn(FLAGS, name);

/** Whether a flag is on: an override when given, else its default. An unknown name throws. */
export function flagOn(name: FlagName, overrides: FlagOverrides = {}): boolean {
  if (!isFlag(name)) throw new Error(`unknown feature flag "${String(name)}"`);
  return overrides[name] ?? FLAGS[name].default;
}

/**
 * Reads a flag list as the URL (`?flags=nodeSize`) and localStorage (`vb.flags`) write it: names
 * separated by commas, each one turning a flag on, or off with a leading minus. The last mention
 * wins. Unknown names are refused (listed, never applied).
 */
export function parseFlags(text: string | null | undefined): { overrides: FlagOverrides; refused: string[] } {
  const overrides: FlagOverrides = {};
  const refused: string[] = [];
  for (const part of (text ?? '').split(',')) {
    const word = part.trim();
    if (!word) continue;
    const off = word.startsWith('-');
    const name = off ? word.slice(1) : word;
    if (isFlag(name)) overrides[name] = !off;
    else refused.push(name);
  }
  return { overrides, refused };
}
