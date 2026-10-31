// The page's theme (system, light or dark; the "⋯" menu's Theme, ThemeControl.svelte), kept in this
// browser. The page's own: a host has its theme, and the board reads tokens.
import { keep, kept } from './kept.ts';

const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];
const KEY = 'vb-theme';

export const keptTheme = (): Theme => { const t = kept(KEY) as Theme | null; return t && THEMES.includes(t) ? t : 'system'; };
export const nextTheme = (t: Theme): Theme => THEMES[(THEMES.indexOf(t) + 1) % THEMES.length]!;

/** Show `theme` on the page, and keep it. */
export function applyTheme(theme: Theme): void {
  if (theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  keep(KEY, theme);
}
