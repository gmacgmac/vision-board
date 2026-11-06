// The fake host's own looks (docs/specification/plugin.md § Theme and host styling): five bot colours, each light and
// dark, as a host would set them on the board's root. Every pair the spec's contrast table names meets its tier here
// (host-styling.spec.ts "the harness palettes"), as the spec asks of a host. Keys are the property names less `--host-`.

/** Grounds, ink and lines a host might pair with a warm or a cool accent. */
const GROUNDS = {
  warm: {
    light: { canvas: '#f7f5f2', surface: '#ffffff', 'surface-sunken': '#efebe6', ink: '#1c1917', 'ink-muted': '#57534e', line: '#e7e5e4', 'line-strong': '#a8a29e' },
    dark: { canvas: '#141210', surface: '#1c1a17', 'surface-sunken': '#27231f', ink: '#f5f5f4', 'ink-muted': '#c4bdb5', line: '#2e2a26', 'line-strong': '#8c857e' },
  },
  cool: {
    light: { canvas: '#f3f5f8', surface: '#ffffff', 'surface-sunken': '#eaedf2', ink: '#111827', 'ink-muted': '#4b5563', line: '#e5e7eb', 'line-strong': '#9ca3af' },
    dark: { canvas: '#0f1115', surface: '#171a20', 'surface-sunken': '#20242c', ink: '#f3f4f6', 'ink-muted': '#b9c0cb', line: '#2a2f38', 'line-strong': '#7f8796' },
  },
};

/** Each accent with its strong form and the ink on it; `focus` only where a host gives its own. Violet's dark fills its
 *  buttons deeper than its bright accent, as nclite does, so its `on-accent` pairs with the fill. */
const ACCENTS = {
  orange: { grounds: 'warm', light: { accent: '#c2410c', 'accent-strong': '#9a3412', 'on-accent': '#ffffff' }, dark: { accent: '#fdba74', 'accent-strong': '#fed7aa', 'on-accent': '#1c0a02' } },
  green: { grounds: 'cool', light: { accent: '#15803d', 'accent-strong': '#166534', 'on-accent': '#ffffff' }, dark: { accent: '#4ade80', 'accent-strong': '#86efac', 'on-accent': '#052e16' } },
  blue: { grounds: 'cool', light: { accent: '#1d4ed8', 'accent-strong': '#1e40af', 'on-accent': '#ffffff', focus: '#0369a1' }, dark: { accent: '#8bbcfb', 'accent-strong': '#93c5fd', 'on-accent': '#0b1530', focus: '#38bdf8' } },
  violet: { grounds: 'cool', light: { accent: '#6d28d9', 'accent-strong': '#5b21b6', 'on-accent': '#ffffff' }, dark: { accent: '#bba6fc', 'accent-strong': '#c4b5fd', 'accent-fill': '#6d28d9', 'accent-fill-hover': '#5b21b6', 'on-accent': '#ffffff' } },
  red: { grounds: 'warm', light: { accent: '#b91c1c', 'accent-strong': '#991b1b', 'on-accent': '#ffffff' }, dark: { accent: '#fa9595', 'accent-strong': '#fca5a5', 'on-accent': '#2a0505' } },
};

/** Every property of palette `name` in `mode`, by its name less `--host-`. */
export const palette = (name, mode) => ({ ...GROUNDS[ACCENTS[name].grounds][mode], ...ACCENTS[name][mode] });

export const PALETTE_NAMES = Object.keys(ACCENTS);

/** Every `--host-*` this file sets, `--host-color-scheme` too. */
const ALL = [...new Set(PALETTE_NAMES.flatMap((n) => ['light', 'dark'].flatMap((m) => Object.keys(palette(n, m)))))].concat('color-scheme');

/** Dress `root` in palette `name` (none: the board's own) and force `mode` (`light`, `dark`; none: the system's). */
export function dress(root, name, mode) {
  for (const key of ALL) root.style.removeProperty(`--host-${key}`);
  if (mode) root.style.setProperty('--host-color-scheme', mode);
  if (!name) return;
  const system = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  for (const [key, value] of Object.entries(palette(name, mode ?? system))) root.style.setProperty(`--host-${key}`, value);
}

/** The palette page (`/?palette`): two selects in the host's bar, a palette and a mode, that dress every board root. */
export function paletteSwitcher(bar) {
  const select = (label, options) => {
    const el = document.createElement('select');
    el.setAttribute('aria-label', label);
    el.append(...options.map(([value, text]) => Object.assign(document.createElement('option'), { value, textContent: text })));
    bar.append(el);
    return el;
  };
  const which = select('Host palette', [['', 'The board\'s own'], ...PALETTE_NAMES.map((n) => [n, n])]);
  const mode = select('Host mode', [['', 'The system\'s'], ['light', 'Light'], ['dark', 'Dark']]);
  const apply = () => { for (const root of document.querySelectorAll('.vb-board')) dress(root, which.value || null, mode.value || null); };
  which.addEventListener('change', apply);
  mode.addEventListener('change', apply);
  return { set(name, m) { which.value = name ?? ''; mode.value = m ?? ''; apply(); } };
}
