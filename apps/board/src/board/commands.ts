// The board page's view commands (3_FE_02 ruling 5): zoom out, Fit and zoom in in the header; the
// selection bar's Comment, Zoom to selection and Clear; the area bar's Zoom to this area. ONE table
// drives the header buttons, the bars and the keys, so nothing is wired twice. They change only
// what the person sees (or open the note bubble), so none is a ledger event (rule 8 covers the
// note itself, which is written through the action layer when it is saved).

export const COMMAND_IDS = ['zoom-out', 'fit', 'zoom-in', 'comment', 'zoom-selection', 'clear', 'zoom-area'] as const;
export type CommandId = (typeof COMMAND_IDS)[number];

export interface CommandDef {
  label: string;
  /** Keys that run it (`KeyboardEvent.key`, lower case), the first one shown in hints. */
  keys: readonly string[];
  /** Drawn as the bar's primary button. */
  primary?: boolean;
  /** The header button's text, when it is a symbol rather than the label. */
  glyph?: string;
}

export const COMMANDS: Record<CommandId, CommandDef> = {
  'zoom-out': { label: 'Zoom out', keys: ['-'], glyph: '−' },
  fit: { label: 'Fit', keys: ['f'] },
  'zoom-in': { label: 'Zoom in', keys: ['+', '='], glyph: '+' },
  // N, and C when two or more are selected (C alone is a card's own comment, keys.ts).
  comment: { label: 'Comment', keys: ['n', 'c'], primary: true },
  'zoom-selection': { label: 'Zoom to selection', keys: ['z'] },
  clear: { label: 'Clear', keys: [] },
  'zoom-area': { label: 'Zoom to this area', keys: [] },
};

/** Where each command shows: the header's zoom group, the selection bar, the area bar. */
export const HEADER_COMMANDS: readonly CommandId[] = ['zoom-out', 'fit', 'zoom-in'];
export const SELECTION_COMMANDS: readonly CommandId[] = ['comment', 'zoom-selection', 'clear'];
export const AREA_COMMANDS: readonly CommandId[] = ['zoom-area'];

const BY_KEY = new Map(COMMAND_IDS.flatMap((id) => COMMANDS[id].keys.map((k) => [k, id] as const)));

/** The command a key runs, if any. */
export const commandForKey = (key: string): CommandId | undefined => BY_KEY.get(key);

export const isCommand = (s: string | undefined): s is CommandId => COMMAND_IDS.includes(s as CommandId);

/** A button's tooltip: its label and its key ("Zoom in · +"). */
export function commandTitle(id: CommandId): string {
  const key = COMMANDS[id].keys[0];
  return key ? `${COMMANDS[id].label} · ${key.toUpperCase()}` : COMMANDS[id].label;
}

/** The bar's buttons for a list of commands. */
export const barButtons = (ids: readonly CommandId[]) =>
  ids.map((id) => ({ id, label: COMMANDS[id].label, ...(COMMANDS[id].primary && { primary: true }) }));
