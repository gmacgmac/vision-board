// Entry point of the pattern gallery (gallery.html): every pattern in every state, drawn from a
// fixture ledger (rule 11). One section per pattern, listed from the patterns' own pattern.json
// files, so a new pattern without a gallery entry shows up here as a gap and fails the page test.
import '../styles/board.css';
import '../styles/access.css';
import '../../../../packages/ui/src/node/node.css';
import '../../../../packages/ui/src/markdown/markdown.css';
import '../../../../packages/ui/src/region/region.css';
import './gallery.css';
import { flagOn } from '../../../../packages/format/src/index.ts';
import { defineBoardElements } from '../../../../packages/ui/src/index.ts';
import { pageFlags } from '../flags.ts';
import { el } from './dom.ts';
import { loadFixture } from './fixture.ts';
import type { Fixture } from './fixture.ts';
import { markdownSamples } from './markdown-section.ts';
import { nodeSamples } from './node-section.ts';
import { regionSamples } from './region-section.ts';
import { sizeSection } from './size-section.ts';
import { accessSection } from './access-section.ts';

interface PatternInfo {
  name: string;
  title: string;
  /** The element, for a pattern that has one; `entry` names the function of one that draws markup only. */
  tag?: string;
  entry?: string;
  description: string;
  states: string[];
  whenToUse: string;
  whenNotToUse: string;
}

/** One entry per pattern: draws its samples. Keyed by `name` in pattern.json. */
const SAMPLES: Record<string, (body: HTMLElement, fx: Fixture) => void> = {
  markdown: markdownSamples,
  node: nodeSamples,
  region: regionSamples,
};

const files = import.meta.glob<PatternInfo>('../../../../packages/ui/src/*/pattern.json', { eager: true, import: 'default' });
const patterns = Object.values(files).sort((a, b) => a.name.localeCompare(b.name));

function section(p: PatternInfo, fx: Fixture): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.pattern = p.name;
  box.setAttribute('aria-labelledby', `pattern-${p.name}`);
  const heading = el('h2', 'g-title', p.title);
  heading.id = `pattern-${p.name}`;
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, p.tag ? `<${p.tag}>` : p.entry ?? p.name), ` · states: ${p.states.join(', ')}`);
  const body = el('div', 'g-body');
  const draw = SAMPLES[p.name];
  if (draw) draw(body, fx);
  else body.append(el('p', 'g-missing', `No gallery entry for the ${p.name} pattern yet.`));
  box.append(heading, el('p', 'g-desc', p.description), meta,
    el('p', 'g-note', `Use for: ${p.whenToUse} Not for: ${p.whenNotToUse}`), body);
  return box;
}

const THEMES = ['system', 'light', 'dark'] as const;
type Theme = (typeof THEMES)[number];

/** The same choice and storage key as the board's toolbar, so the two pages agree. */
function themeButton(): HTMLButtonElement {
  const stored = localStorage.getItem('vb-theme');
  let theme: Theme = THEMES.includes(stored as Theme) ? (stored as Theme) : 'system';
  const button = el('button', 'vb-btn');
  button.type = 'button';
  button.id = 'theme';
  const apply = () => {
    if (theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    localStorage.setItem('vb-theme', theme);
    button.textContent = `Theme: ${theme}`;
  };
  button.addEventListener('click', () => {
    theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]!;
    apply();
  });
  apply();
  return button;
}

function build(): void {
  const fx = loadFixture();
  const head = el('header', 'g-head');
  head.append(el('h1', 'g-page-title', 'Pattern gallery'), themeButton());
  const main = el('main', 'g-main');
  main.append(el('p', 'g-intro', 'Every pattern in every state, drawn from fixture data in the real ledger schema.'),
    ...patterns.map((p) => section(p, fx)));
  // Behind its flag, so the gallery without it (and its screenshot) is unchanged.
  const flags = pageFlags();
  if (flagOn('nodeSize', flags)) main.append(sizeSection(fx));
  if (flagOn('agentAccess', flags)) main.append(accessSection(fx));
  document.body.append(head, main);
}

defineBoardElements();
build();
