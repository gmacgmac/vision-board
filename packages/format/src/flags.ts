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
