// Entry point of the pattern gallery (gallery.html): every pattern in every state, drawn from a
// fixture ledger (rule 11). One section per pattern, listed from the patterns' own pattern.json
// files, so a new pattern without a gallery entry shows up here as a gap and fails the page test.
import '../styles/board.css';
import '../styles/access.css';
import '../styles/key-help.css';
import '../styles/go-to-card.css';
import '../styles/proposals.css';
import '../../../../packages/ui/src/node/node.css';
import '../../../../packages/ui/src/node/node-popover.css';
import '../../../../packages/ui/src/node/node-steps.css';
import '../../../../packages/ui/src/node/node-parking.css';
import '../../../../packages/ui/src/node/node-app.css';
import '../../../../packages/ui/src/app-frame/app-frame.css';
import '../../../../packages/ui/src/markdown/markdown.css';
import '../../../../packages/ui/src/region/region.css';
import '../../../../packages/ui/src/region/region-narrow.css';
import '../../../../packages/ui/src/region/region-note.css';
import '../../../../packages/ui/src/tip/tip.css';
import '../../../../packages/ui/src/paused/paused.css';
import '../../../../packages/ui/src/note-bubble/note-bubble.css';
import '../../../../packages/ui/src/selection-bar/selection-bar.css';
import '../../../../packages/chat/src/chat.css';
import '../styles/chat-host.css';
import '../styles/chat-sidebar.css';
import '../styles/folder-dialog.css';
import '../styles/archived-dialog.css';
import '../styles/lock.css';
import './gallery.css';
import { flagOn } from '../../../../packages/format/src/index.ts';
import { defineBoardElements } from '../../../../packages/ui/src/index.ts';
import { defineChatElements } from '../../../../packages/chat/src/index.ts';
import { pageFlags } from '../flags.ts';
import { el } from './dom.ts';
import { loadFixture } from './fixture.ts';
import type { Fixture } from './fixture.ts';
import { appFrameSamples } from './app-frame-section.ts';
import { appSection } from './app-section.ts';
import { markdownSamples } from './markdown-section.ts';
import { nodeSamples } from './node-section.ts';
import { noteBubbleSamples } from './note-bubble-section.ts';
import { regionSamples } from './region-section.ts';
import { selectionBarSamples } from './selection-bar-section.ts';
import { sizeSection } from './size-section.ts';
import { accessSection } from './access-section.ts';
import { wireSection } from './wire-section.ts';
import { versionSection } from './version-section.ts';
import { keyHelpSection } from './key-help-section.ts';
import { goToCardSection } from './go-to-card-section.ts';
import { appIconSection } from './app-icon-section.ts';
import { parkingSection } from './parking-section.ts';
import { proposalsSection } from './proposals-section.ts';
import { updatesSection } from './updates-section.ts';
import { chatSection } from './chat-section.ts';
import { toolbarSection } from './toolbar-section.ts';
import { folderSection } from './folder-section.ts';
import { flagSection } from './flag-section.ts';
import { archiveSection } from './archive-section.ts';
import { lockSection } from './lock-section.ts';
import { removeSection } from './remove-section.ts';
import { retiredSection } from './retired-section.ts';
import { alignSection, linkLabelSection, widthsSection } from './layout-section.ts';
import { drawMiniBoards } from './mini-board.ts';

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
  'app-frame': appFrameSamples,
  markdown: markdownSamples,
  node: nodeSamples,
  'note-bubble': noteBubbleSamples,
  region: regionSamples,
  // The compact bar and its pill behind their flag (stage5-follow-ups FE_02); off, today's bar.
  'selection-bar': (body, fx) => selectionBarSamples(body, fx, flagOn('selectionPill', pageFlags()), flagOn('personRemove', pageFlags())),
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
  main.toggleAttribute('data-title-tip', flagOn('titleTip', flags)); // the title tip (FE_03), as the board's world
  main.toggleAttribute('data-note-preview', flagOn('notePreview', flags)); // the card note preview (FE_04), as the board's world
  if (flagOn('nodeSize', flags)) main.append(sizeSection(fx));
  if (flagOn('agentAccess', flags)) main.append(accessSection(fx));
  if (flagOn('wireLayers', flags)) main.append(wireSection(fx));
  if (flagOn('versionView', flags)) main.append(versionSection(fx));
  if (flagOn('keyBubble', flags)) main.append(keyHelpSection());
  if (flagOn('proposals', flags)) main.append(proposalsSection(fx));
  if (flagOn('cardUpdates', flags)) main.append(updatesSection(fx, flagOn('newCards', flags)));
  if (flagOn('handover', flags) || flagOn('cardReplies', flags)) main.append(parkingSection(fx));
  if (flagOn('chatPanel', flags)) main.append(chatSection(fx));
  if (flagOn('toolbarMenu', flags)) main.append(toolbarSection(fx));
  if (flagOn('openFolder', flags)) main.append(folderSection());
  if (flagOn('cardFlag', flags)) main.append(flagSection(fx));
  if (flagOn('retiredMarker', flags)) main.append(retiredSection(fx));
  if (flagOn('linkLabels', flags)) main.append(linkLabelSection(fx));
  if (flagOn('alignSetting', flags)) main.append(alignSection(fx));
  if (flagOn('widthsControl', flags)) main.append(widthsSection(fx));
  if (flagOn('archiveBoard', flags)) main.append(archiveSection());
  if (flagOn('lockBoard', flags)) main.append(lockSection(fx));
  if (flagOn('personRemove', flags)) main.append(removeSection(fx));
  if (flagOn('goToCard', flags)) main.append(goToCardSection());
  if (flagOn('appCards', flags)) main.append(appSection(fx));
  main.append(appIconSection());
  document.body.append(head, main);
  drawMiniBoards(); // the layout samples measure their cards, so they draw once in the document
}

defineBoardElements();
defineChatElements();
build();
