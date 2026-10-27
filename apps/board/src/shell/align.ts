// The viewer's alignment (field report batch 3 ruling 4, alignSetting flag): how a row of cards lines
// up (by its tops, or centred) and a column (by its left edges, or centred). Per viewer and never
// sent to an agent: kept in this browser (kept.ts); a value it does not know reads as the default,
// `start` (top and left). The "⋯" menu's Centre cards sets it (ToolbarMenu.svelte).
import type { Align } from '#layout';
import { keep, kept } from './kept.ts';

export const ALIGN_KEY = 'vb.align';

export const keptAlign = (): Align => (kept(ALIGN_KEY) === 'center' ? 'center' : 'start');
export const keepAlign = (align: Align): void => keep(ALIGN_KEY, align);
