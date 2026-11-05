// Entry point of the pattern gallery (gallery.html): every pattern in every state, drawn from a
// fixture ledger (rule 11). One section per pattern, listed from the patterns' own pattern.json
// files, so a new pattern without a gallery entry shows up here as a gap and fails the page test.
import '../styles/page.ts';
import '../styles/chat.ts';
import './gallery.css';
import { flagOn } from '#format';
import { defineBoardElements, PATTERNS } from '#ui';
import type { PatternInfo } from '#ui';
import { defineChatElements } from '#chat';
import { pageFlags } from '../flags.ts';
import { keep, kept } from '../shell/kept.ts';
import { el } from './dom.ts';
import { loadFixture } from './fixture.ts';
import type { Fixture } from './fixture.ts';
import { appFrameSamples } from './app-frame-section.ts';
import { appFitSection, appSection } from './app-section.ts';
import { baseSamples } from './base-section.ts';
import { historySection } from './history-section.ts';
import { imageViewSamples } from './image-view-section.ts';
import { markdownSamples } from './markdown-section.ts';
import { nodeSamples } from './node-section.ts';
import { noteBubbleSamples } from './note-bubble-section.ts';
import { regionSamples } from './region-section.ts';
import { railSection } from './rail-section.ts';
import { freshSection } from './fresh-section.ts';
import { groupNotesSection } from './group-notes-section.ts';
import { selectionBarSamples } from './selection-bar-section.ts';
import { sizeSection } from './size-section.ts';
import { accessByBotSection, accessSection } from './access-section.ts';
import { wireSection } from './wire-section.ts';
import { versionSection } from './version-section.ts';
import { keyHelpSection } from './key-help-section.ts';
import { goToCardSection } from './go-to-card-section.ts';
import { searchSection } from './search-section.ts';
import { appIconSection } from './app-icon-section.ts';
import { parkingSection } from './parking-section.ts';
import { proposalsSection, reviewListSection } from './proposals-section.ts';
import { updatesSection } from './updates-section.ts';
import { updateSignalsSection } from './update-signals-section.ts';
import { chatSection } from './chat-section.ts';
import { alongsideSection } from './alongside-section.ts';
import { folderAccessSection } from './folder-access-section.ts';
import { attachSection } from './attach-section.ts';
import { toolbarSection } from './toolbar-section.ts';
import { folderSection } from './folder-section.ts';
import { currentFolderSection } from './current-folder-section.ts';
import { headerSection } from './header-section.ts';
import { editingSection } from './editing-section.ts';
import { readOnlyControlsSection } from './read-only-controls-section.ts';
import { ledgerSection } from './ledger-section.ts';
import { flagSection } from './flag-section.ts';
import { archiveSection } from './archive-section.ts';
import { lockSection } from './lock-section.ts';
import { removeSection } from './remove-section.ts';
import { retiredSection } from './retired-section.ts';
import { alignSection, linkLabelSection, widthsSection } from './layout-section.ts';
import { drawMiniBoards } from './mini-board.ts';

/** One entry per pattern: draws its samples. Keyed by `name` in pattern.json. */
const SAMPLES: Record<string, (body: HTMLElement, fx: Fixture) => void> = {
  'app-frame': appFrameSamples,
  base: (body) => baseSamples(body),
  'image-view': imageViewSamples,
  markdown: markdownSamples,
  node: nodeSamples,
  'note-bubble': noteBubbleSamples,
  region: regionSamples,
  // The compact bar and its pill behind their flag (stage5-follow-ups FE_02); off, today's bar.
  'selection-bar': (body, fx) => selectionBarSamples(body, fx, flagOn('selectionPill', pageFlags()), flagOn('personRemove', pageFlags())),
};

const patterns = PATTERNS.filter((p) => !p.flag || flagOn(p.flag, pageFlags())).sort((a, b) => a.name.localeCompare(b.name));
// The shared base is the last section of all, so every section above keeps its place: a section's
// screenshot depends on where its top falls, to the fraction of a pixel.
const LAST = 'base';

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
  const stored = kept('vb-theme');
  let theme: Theme = THEMES.includes(stored as Theme) ? (stored as Theme) : 'system';
  const button = el('button', 'vb-btn');
  button.type = 'button';
  button.id = 'theme';
  const apply = () => {
    if (theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    keep('vb-theme', theme);
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
    ...patterns.filter((p) => p.name !== LAST).map((p) => section(p, fx)));
  // Behind its flag, so the gallery without it (and its screenshot) is unchanged.
  const flags = pageFlags();
  main.toggleAttribute('data-title-tip', flagOn('titleTip', flags)); // the title tip (FE_03), as the board's world
  main.toggleAttribute('data-note-preview', flagOn('notePreview', flags)); // the card note preview (FE_04), as the board's world
  main.toggleAttribute('data-app-title', flagOn('appTitle', flags)); // an app card's title over its panel (card-polish FE_01), as the board's world
  main.toggleAttribute('data-fresh-cards', flagOn('freshCards', flags)); // the pink "N updates" tab (freshCards), as the board's world
  main.toggleAttribute('data-update-signals', flagOn('updateSignals', flags)); // updated in amber, the agent's reply edge (updateSignals), as the board's world
  if (flagOn('nodeSize', flags)) main.append(sizeSection(fx));
  if (flagOn('agentAccess', flags)) main.append(accessSection(fx));
  if (flagOn('wireLayers', flags)) main.append(wireSection(fx));
  if (flagOn('versionView', flags)) main.append(versionSection(fx));
  if (flagOn('keyBubble', flags)) main.append(keyHelpSection());
  if (flagOn('proposals', flags)) main.append(proposalsSection(fx));
  if (flagOn('cardUpdates', flags)) main.append(updatesSection(fx, flagOn('newCards', flags), flagOn('freshCards', flags)));
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
  if (flagOn('cardHistory', flags)) main.append(historySection(fx));
  main.append(appIconSection());
  // Last, so the sections above keep their place (and their screenshots) with the flag on or off.
  if (flagOn('toolRail', flags)) main.append(railSection(fx, flagOn('railOnHover', flags)));
  if (flagOn('freshCards', flags)) main.append(freshSection(fx)); // after the rail, so the sections above keep their place
  if (flagOn('groupNoteOnce', flags)) main.append(groupNotesSection(fx)); // last, so the sections above keep their place
  if (flagOn('openFolder', flags) && flagOn('currentFolder', flags)) main.append(currentFolderSection()); // last, so the sections above keep their place
  if (flagOn('appCards', flags)) main.append(appFitSection(fx)); // the appFit flag's entry, on or off; last, so the sections above keep their place
  main.append(...patterns.filter((p) => p.name === LAST).map((p) => section(p, fx))); // last of all, so the sections above keep their place
  if (flagOn('agentAccess', flags) && flagOn('accessByBot', flags)) main.append(accessByBotSection()); // after everything: its height is fractional, so it must move no section
  if (flagOn('proposals', flags) && flagOn('reviewList', flags)) main.append(reviewListSection(fx)); // after everything, so no section moves
  if (flagOn('goToCard', flags) && flagOn('cardSearch', flags)) main.append(searchSection(fx)); // after everything, so no section moves
  if (flagOn('chatPanel', flags) && flagOn('workAlongside', flags)) main.append(alongsideSection()); // after everything, so no section moves
  if (flagOn('chatPanel', flags) && flagOn('agentAccessRules', flags)) main.append(folderAccessSection()); // last of all, so no section moves
  if (flagOn('chatPanel', flags) && flagOn('chatAttachments', flags)) main.append(attachSection(flags)); // after everything, so no section moves
  if (flagOn('adaptiveHeader', flags) && flagOn('toolbarMenu', flags) && flagOn('versionView', flags)) main.append(headerSection(fx)); // after everything, so no section moves
  if (flagOn('ledgerFolders', flags) && flagOn('openFolder', flags) && flagOn('adaptiveHeader', flags) && flagOn('toolbarMenu', flags) && flagOn('versionView', flags)) main.append(ledgerSection(fx)); // after everything, so no section moves
  if (flagOn('readOnlyStart', flags) && flagOn('openFolder', flags) && flagOn('adaptiveHeader', flags) && flagOn('toolbarMenu', flags) && flagOn('versionView', flags)) main.append(editingSection(fx)); // after everything, so no section moves
  if (flagOn('readOnlyStart', flags) && flagOn('agentAccess', flags) && flagOn('appCards', flags)) main.append(readOnlyControlsSection(fx)); // last of all, so no section moves
  if (flagOn('updateSignals', flags)) main.append(updateSignalsSection(fx)); // last of all, so no section moves
  document.body.append(head, main);
  drawMiniBoards(); // the layout samples measure their cards, so they draw once in the document
}

defineBoardElements();
defineChatElements();
build();
