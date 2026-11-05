// The "N new" chip's tone (OpenChip.svelte; packages/ui chip.css `.vb-chip[data-tone]`), one home for the
// toolbar, the "⋯" menu's row and the gallery: 'fresh', the teal of new, with the updateSignals flag (D-088,
// one colour per meaning; FIX_01); 'new', the accent's pink, without.
export const newTone = (updateSignals: boolean): string => (updateSignals ? 'fresh' : 'new');
