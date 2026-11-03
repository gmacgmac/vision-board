// Which cards the Comment command writes on (KEY_01, point 394, focusLeads flag). C is the card
// the keyboard focus is on; a selection of two or more the person made on purpose counts while the
// focus is in it or on no card. N and the selection bar's button (no key) are the selection's wherever
// the focus is. With the flag off, C follows the selection alone, as it did.

/** Whether Comment is the selection's note (true) or the focused card's own (false, so the key falls
 *  through to that card's Comment action). `selected`: the selected cards that take a note;
 *  `focused`: the card the focus is on, if any. */
export function commentOnSelection(selected: readonly string[], key: string | undefined, focused: string | null | undefined, focusLeads: boolean): boolean {
  if (key !== 'c') return selected.length > 0;
  if (selected.length < 2) return false;
  return !(focusLeads && focused && !selected.includes(focused));
}
