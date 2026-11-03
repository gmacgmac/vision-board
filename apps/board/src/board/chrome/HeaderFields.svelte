<!-- What the header holds in its "⋯" menu at half and a third of its width (adaptiveHeader flag,
     header-tier.ts): above the menu's own rows, each the same control as in the bar, as a row. A native
     select lies unseen over a row (MenuSelect, VersionPicker, OpenChip), so its list, keys and reading are the
     browser's; a choice closes the menu first (`choose`). They sit beside the role="menu", not in it,
     because a select is not a menu item; the menu's keys walk them all the same (ToolbarMenu.svelte). The
     zoom row keeps the menu open for − and +, so the level can be seen to change. The page's folder and ledger rows
     (`folderField`, `ledgerField`) come first, folder above ledger. -->
<script lang="ts">
  import * as commonWords from '../words/common.ts';
  import * as toolbarWords from '../words/toolbar.ts';
  import * as chromeCommonWords from '../words/chrome-common.ts';
  import ButtonIcon from './ButtonIcon.svelte';
  import BoardAgents from './BoardAgents.svelte';
  import FlaggedChip from './FlaggedChip.svelte';
  import PagePart from './PagePart.svelte';
  import MenuSelect from './MenuSelect.svelte';
  import OpenChip from './OpenChip.svelte';
  import VersionPicker from './VersionPicker.svelte';
  import { optionText } from './BoardPicker.svelte';
  import { inMenu, type HeaderTier } from './header-tier.ts';
  import { rowText } from '../find/index.ts';
  import { commandTitle, zoomTitle } from '../input/index.ts';
  import type { CommandId } from '../input/index.ts';
  import type { AccessHolder } from '#actions';
  import { useChrome, type ChromeState } from './chrome.svelte.ts';

  const { parts } = useChrome();

  let { tier, facts, choose, idOf, percent, holders, onversion, ongo, onopen, onflagged, oncommand, onrevoke }: {
    tier: HeaderTier;
    facts: ChromeState;
    /** Close the menu, then do this. */
    choose: (run: () => void) => void;
    /** A control's id: the board's, or a gallery sample's own. */
    idOf: (name: string) => string;
    percent: number;
    holders: AccessHolder[] | null;
    onversion: (seq: number | null) => Promise<void>;
    ongo: (container: string) => void;
    onopen: (n: number) => void;
    onflagged: () => void;
    oncommand: (id: CommandId) => void;
    onrevoke: (agent: string) => Promise<void>;
  } = $props();

  const updated = $derived(Object.keys(facts.boardMarks).length);
  const zoomName = (c: CommandId) => commandTitle(c).split(' · ')[0];
</script>

{#snippet row(icon: 'version' | 'containers' | 'open' | 'new' | 'folder', text: string, value: string | number)}
  <ButtonIcon name={icon} /><span class="vb-menu-label">{text}</span><span class="vb-menu-value">{value}</span>
{/snippet}
{#snippet versionRow()}{@render row('version', toolbarWords.version, `v${facts.past?.seq ?? facts.version}`)}{/snippet}
{#snippet containersRow()}{@render row('containers', toolbarWords.containers, facts.containers.length)}{/snippet}
{#snippet openRow()}{@render row('open', toolbarWords.openCards, facts.counts.open)}{/snippet}
{#snippet newRow()}{@render row('new', toolbarWords.newCards, facts.freshCards.length)}{/snippet}

{#if inMenu(tier, 'folder') && parts.folderField}
  <PagePart draw={parts.folderField} args={{ id: idOf('folder-chip'), choose }} />
{/if}
{#if inMenu(tier, 'ledger') && parts.ledgerField}
  <PagePart draw={parts.ledgerField} args={{ id: idOf('ledger-chip'), choose }} />
{/if}
{#if inMenu(tier, 'version') && facts.version !== null}
  <VersionPicker {facts} {onversion} id={idOf('version')} face={versionRow} kind="vb-menu-item" onpicked={choose} />
{/if}
{#if inMenu(tier, 'containers') && facts.containers.length}
  <MenuSelect id={idOf('containers')} label={toolbarWords.containers} name={toolbarWords.containers} face={containersRow} kind="vb-menu-item"
    onpick={(c) => choose(() => ongo(c))} rows={facts.containers.map((c) => ({ value: c.id, text: optionText(rowText(c)), disabled: !c.usable }))} />
{/if}
{#if facts.version !== null}
  {#if inMenu(tier, 'open')}
    <OpenChip id={idOf('open-cards')} count={facts.counts.open} cards={facts.openCards} row={openRow} onpick={(n) => choose(() => onopen(n))} />
  {/if}
  {#if inMenu(tier, 'new') && facts.freshCards.length && !facts.past}
    <OpenChip id={idOf('fresh-cards')} count={facts.freshCards.length} cards={facts.freshCards} row={newRow} onpick={(n) => choose(() => onopen(n))} word={chromeCommonWords.newWord} tone="new"
      label={toolbarWords.goToNewCard} title={toolbarWords.newAndUpdatedCardsChoose} />
  {/if}
{/if}
{#if inMenu(tier, 'flagged') && facts.version !== null && facts.flagged && !facts.past}
  <FlaggedChip id={idOf('flagged')} count={facts.flagged} row={toolbarWords.flagged} onclick={() => choose(onflagged)} />
{/if}
{#if inMenu(tier, 'zoom')}
  <div class="vb-menu-zoom" role="group" aria-label={commonWords.zoom}>
    <ButtonIcon name="zoom" /><span class="vb-menu-label" aria-hidden="true">{commonWords.zoom}</span>
    <button type="button" class="vb-btn vb-btn-small" title={zoomTitle('zoom-out', percent)} aria-label={zoomName('zoom-out')} onclick={() => oncommand('zoom-out')}>−</button>
    <span class="vb-menu-zoom-level" aria-hidden="true">{percent}%</span>
    <button type="button" class="vb-btn vb-btn-small" title={zoomTitle('zoom-in', percent)} aria-label={zoomName('zoom-in')} onclick={() => oncommand('zoom-in')}>+</button>
    <button type="button" class="vb-btn vb-btn-small" title={zoomTitle('fit', percent)} aria-label={zoomName('fit')} onclick={() => choose(() => oncommand('fit'))}>{commonWords.fit}</button>
  </div>
{/if}
{#if inMenu(tier, 'agents') && holders}
  <BoardAgents {holders} row onrevoke={(agent) => { choose(() => void onrevoke(agent)); return Promise.resolve(); }} />
{/if}
{#if inMenu(tier, 'boards-updated') && updated}
  <p class="vb-menu-line" id={idOf('boards-updated')} title={toolbarWords.boardUpdated(updated)}>
    <span class="vb-menu-label">{toolbarWords.boardsUpdatedRow(updated)}</span><span class="vb-menu-value">{updated}</span>
  </p>
{/if}
