// The board page's view commands (3_FE_02 ruling 5): zoom out, Fit and zoom in in the header; the
// selection bar's Comment, Move to (3_FE_03 ruling 8), Zoom to selection and Clear; the area bar's
// Zoom to this area. ONE table drives the header buttons, the bars and the keys, so nothing is
// wired twice. They change only what the person sees (or open the note bubble or the move list),
// so none is a ledger event (rule 8 covers the note and the move themselves, which are written
// through the action layer).

export const COMMAND_IDS = ['zoom-out', 'fit', 'zoom-in', 'comment', 'move', 'zoom-selection', 'clear', 'zoom-area', 'container-note'] as const;
export type CommandId = (typeof COMMAND_IDS)[number];

export interface CommandDef {
  label: string;
  /** Keys that run it (`KeyboardEvent.key`, lower case, `shift+` in front for a Shift
   *  combination), the first one shown in hints. */
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
  // The list of the board's containers, Later last (3_FE_03 ruling 8, move-menu.ts).
  move: { label: 'Move to', keys: ['shift+m'] },
  'zoom-selection': { label: 'Zoom to selection', keys: ['z'] },
  clear: { label: 'Clear', keys: [] },
  'zoom-area': { label: 'Zoom to this area', keys: [] },
  // C or N with focus on a container's title line or its controls (3_FE_04 ruling 8): the
  // container's note, a comment as N is for the selection. Those keys mean this only there.
  'container-note': { label: 'Comment on container', keys: ['c', 'n'] },
};

/** Where each command shows: the header's zoom group, the selection bar, the area bar. */
export const HEADER_COMMANDS: readonly CommandId[] = ['zoom-out', 'fit', 'zoom-in'];
export const SELECTION_COMMANDS: readonly CommandId[] = ['comment', 'move', 'zoom-selection', 'clear'];
export const AREA_COMMANDS: readonly CommandId[] = ['zoom-area'];
/** The commands whose keys apply on a focused container's title line, before any other meaning. */
export const REGION_COMMANDS: readonly CommandId[] = ['container-note'];

const byKey = (ids: readonly CommandId[]) => new Map(ids.flatMap((id) => COMMANDS[id].keys.map((k) => [k, id] as const)));
const BY_KEY = byKey(COMMAND_IDS.filter((id) => !REGION_COMMANDS.includes(id)));
const ON_REGION = byKey(REGION_COMMANDS);

/** The command a key runs, if any. */
export const commandForKey = (key: string): CommandId | undefined => BY_KEY.get(key);

/** The command a key runs with focus on a container's title line, if any. */
export const regionCommandForKey = (key: string): CommandId | undefined => ON_REGION.get(key);

export const isCommand = (s: string | undefined): s is CommandId => COMMAND_IDS.includes(s as CommandId);

/** A key as a hint shows it: "Shift+M", "Z". */
const keyText = (key: string) => key.split('+').filter(Boolean).map((k) => (k === 'shift' ? 'Shift' : k.toUpperCase())).join('+')
  || key;

/** A button's tooltip: its label and its key ("Zoom in · +"). */
export function commandTitle(id: CommandId): string {
  const key = COMMANDS[id].keys[0];
  return key ? `${COMMANDS[id].label} · ${keyText(key)}` : COMMANDS[id].label;
}

/** The bar's buttons for a list of commands. */
export const barButtons = (ids: readonly CommandId[]) =>
  ids.map((id) => ({ id, label: COMMANDS[id].label, ...(COMMANDS[id].primary && { primary: true }) }));
