// The chip tones of new and updated (OpenChip.svelte; packages/ui chip.css `.vb-chip[data-tone]`), one home for
// the toolbar, the "⋯" menu's row, the narrowest bar's dot and the gallery. With the updateSignals flag (D-088,
// one colour per meaning; FIX_01): new is 'fresh', the teal; updated is 'updated', the amber. Without: 'new',
// the accent's pink, for both.
export const newTone = (updateSignals: boolean): string => (updateSignals ? 'fresh' : 'new');
export const updatedTone = (updateSignals: boolean): string => (updateSignals ? 'updated' : 'new');
