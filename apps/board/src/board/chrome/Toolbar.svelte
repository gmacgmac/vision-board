<!-- The toolbar: board picker, board title and version, counts, the zoom group and the board-wide
     buttons. With the versionView flag (navigation FE_01) each fact shows once: the picker holds
     titles only, the title heading is for screen readers, and the version dropdown lists the open
     board's own versions, "now" first, then each past one with its time (board/boards/versions.ts);
     choosing one shows the board as it was, read-only (VersionBanner), with no Agents or Send.
     With the containerFinder flag a Containers dropdown follows (board/find/finder.ts): choosing one zooms to it.
     With the openList flag the "N open" chip lists the open cards and goes to the one chosen (OpenChip;
     both dropdowns are MenuSelect). With the freshCards flag the "N new" chip beside it lists the new and
     updated cards (`freshCards`, board/cards/attention.ts) the same way, while there are any and no past
     version shows. The picker marks a board the person has not opened " · new" and one an agent wrote on
     since they last looked " · changed", never the open one, and a chip counts both (the conditions
     table, board/cards/attention.ts; FE_01 ruling 1); the chip sits in the counts' live region.
     The end group (ToolbarEnd): zoom, then Send to agent and the board's Agents list with the agentAccess
     flag, the page's Chat button (`BoardPageParts.chat`), and with the toolbarMenu flag the "⋯" menu
     (ToolbarMenu) holding Theme, Hide answered and Reply.
     With the cardFlag flag the counts end in "N flagged" (board/cards/flag-flow.ts) while any card is flagged
     and no past version shows: a button that focuses the next flagged card, wrapping.
     With the boardEdit flag the picker ends with New board… and Rename board… (navigation BE_01,
     BOARD_ACTIONS): each opens BoardDialog; both are off while a past version shows. With the archiveBoard
     flag it ends with "Archived (N)…" while any board is archived (N39 ruling 6), opening the Archived
     list (ArchivedDialog), and the "⋯" menu has Archive board… (ruling 5, ToolbarMenu). A locked board
     shows "Locked" after its name and version (LockedChip, N40 ruling 4); with the lockBoard flag the
     "⋯" menu has Lock board or Unlock board.
     The page's folder chip (`BoardPageParts.folderChip`), when it gives one, sits first, after the app icon;
     a host has none, and the bar reflows.
     The picker never goes under 220px from a 1024px window up; at 1500px and below the toolbar
     carries data-narrow, and the end group's text buttons shrink to icon buttons (ButtonIcon) and the
     counts show their numbers only (title and screen readers keep the words), all in board.css; "with
     agent" keeps the agent's mark (the Agents bot) beside its number there, so it never reads as
     "board updated", which shares its pink (review polish FIX_01).
     With the adaptiveHeader flag (needs versionView and toolbarMenu; off, all of the above holds as it was) the
     bar takes one of three forms by its own width, read by a ResizeObserver, not the window's (header-tier.ts,
     the one table of what sits where; styles/header.css): one copy of each control, in the bar or as a row
     of "⋯" (HeaderFields). The path "folder / board / version" (nav) replaces the title: the picker's face is
     the board's name, and the visually hidden h1 stays the page's heading. The gallery passes `placement`
     'gallery' (ids of its own), `form` (the form to draw), `facts` (what to show) and the looks. -->
<script lang="ts">
  import * as commonWords from '../words/common.ts';
  import * as toolbarWords from '../words/toolbar.ts';
  import * as chromeCommonWords from '../words/chrome-common.ts';
  import { useChrome, type ChromeState, type SendState } from './chrome.svelte.ts';
  import { MediaQuery } from 'svelte/reactivity';
  import AppIcon from './AppIcon.svelte';
  import BoardPicker, { optionText as label } from './BoardPicker.svelte';
  import ButtonIcon from './ButtonIcon.svelte';
  import FlaggedChip from './FlaggedChip.svelte';
  import PagePart from './PagePart.svelte';
  import HeaderFields from './HeaderFields.svelte';
  import LockedChip from './LockedChip.svelte';
  import MenuSelect from './MenuSelect.svelte';
  import OpenChip from './OpenChip.svelte';
  import ToolbarEnd from './ToolbarEnd.svelte';
  import VersionPicker from './VersionPicker.svelte';
  import { headerTier, inBar, inMenu, type HeaderControl, type HeaderTier } from './header-tier.ts';
  import { rowText } from '../find/index.ts';
  import type { CommandId } from '../input/index.ts';
  import type { AccessHolder } from '#actions';
  import * as chromeBoardsWords from '../words/chrome-boards.ts';

  const chrome = useChrome();
  const { parts, flag } = chrome;

  let { onboard, onversion, ongo, onopen, oncommand, onhide, onsend, onrevoke, onflagged, onarchive, onlock, placement = 'board', form, facts = chrome.state, holders: givenHolders, zoom, menuOpen = false, zoomOpen = false, look, send }: {
    onboard: (id: string) => unknown;
    /** Show a past version of the open board, or now with null (versionView flag). */
    onversion: (seq: number | null) => Promise<void>;
    /** Zoom to a container (containerFinder flag, board/find/finder.ts). */
    ongo: (container: string) => void;
    /** Go to card `n`: an open one (openList flag) or a new or updated one (freshCards flag), OpenChip. */
    onopen: (n: number) => void;
    oncommand: (id: CommandId) => void;
    onhide: () => void;
    onsend: () => Promise<string | null>;
    /** Remove an agent's access to the open board (BoardAgents). */
    onrevoke: (agent: string) => Promise<void>;
    /** The "N flagged" chip: the next flagged card (cardFlag flag). */
    onflagged: () => void;
    /** Archive board… in the "⋯" menu: ask, then archive the open board (archiveBoard flag). */
    onarchive: () => void;
    /** Lock board or Unlock board in the "⋯" menu (lockBoard flag): the open board. */
    onlock: () => void;
    placement?: 'board' | 'gallery';
    /** The form to draw (the gallery's); left out, the bar's own width says. */
    form?: HeaderTier;
    /** What it shows; left out, the board's status. The gallery passes a sample. */
    facts?: ChromeState;
    /** The holders the gallery's sample shows. */
    holders?: AccessHolder[] | null;
    zoom?: number;
    menuOpen?: boolean;
    zoomOpen?: boolean;
    look?: 'hover' | 'focus' | 'pressed';
    /** The state Send draws (the gallery's). */
    send?: SendState;
  } = $props();

  const uid = $props.id();
  const board = $derived(placement === 'board');
  /** A control's id: the board's, or under the gallery a sample's own, so none is on a page twice. */
  const idOf = (name: string) => (board ? chrome.id(name) : `g-${name}-${uid}`);

  const updated = $derived(Object.keys(facts.boardMarks).length);

  const toolbarMenu = flag('toolbarMenu');
  const answeredLater = flag('answeredLaterChips');
  const archiving = flag('archiveBoard');
  const locking = flag('lockBoard');
  const openList = flag('openList');
  /** A narrow toolbar shows the end group's icons and bare counts (board.css `[data-narrow]`). */
  const narrow = new MediaQuery('max-width: 1500px');
  /** The bar's form by its own width (adaptiveHeader flag); the window's width is only its first guess, so a page loads in its form. */
  const adaptive = flag('adaptiveHeader') && toolbarMenu && flag('versionView');
  let width = $state(window.innerWidth);
  let bar: HTMLElement;
  const tier = $derived(form ?? headerTier(width));
  $effect(() => {
    if (!adaptive || form) return;
    const seen = new ResizeObserver(() => { width = bar.getBoundingClientRect().width; });
    seen.observe(bar);
    return () => seen.disconnect();
  });
  const here = (c: HeaderControl) => !adaptive || inBar(tier, c);
  const holders = $derived(givenHolders !== undefined ? givenHolders : facts.agentAccess && facts.version !== null && !facts.past ? facts.boardHolders : null);
  /** What "⋯" also holds at this form, for its tooltip. */
  const ALSO: readonly (readonly [HeaderControl, string])[] = [['folder', toolbarWords.folder], ['version', toolbarWords.version], ['containers', toolbarWords.containers],
    ['open', toolbarWords.openCards], ['new', toolbarWords.newCards], ['zoom', commonWords.zoom], ['agents', chromeBoardsWords.agents]];
  const also = $derived(adaptive ? ALSO.filter(([c]) => inMenu(tier, c) && (c !== 'folder' || parts.folderRow)).map(([, name]) => name) : []);
</script>

{#snippet chevron()}<ButtonIcon name="chevron" />{/snippet}
{#snippet boardFace()}<span class="vb-path-name">{facts.boards.length ? facts.title : toolbarWords.noBoardsYet}</span>{@render chevron()}{/snippet}
{#snippet versionFace()}v{facts.past?.seq ?? facts.version}{@render chevron()}{/snippet}
{#snippet containersFace()}{toolbarWords.containers}{@render chevron()}{/snippet}
{#snippet fields(choose: (run: () => void) => void)}
  <HeaderFields {tier} {facts} {choose} {idOf} {holders} percent={zoom ?? facts.zoom} {onversion} {ongo} {onopen} {onflagged} {oncommand} {onrevoke} />
{/snippet}

<header class="vb-toolbar" bind:this={bar} data-tier={adaptive ? tier : undefined} data-narrow={(adaptive ? tier !== 'full' : narrow.current) || undefined} data-menu={toolbarMenu || undefined}>
  {#if here('app-icon')}<AppIcon />{/if}
  {#if !adaptive && parts.folderChip}<PagePart draw={parts.folderChip} args={{ id: idOf('folder-chip') }} />{/if}
  {#if board && facts.versionView}<h1 id={idOf('title')} class="vb-visually-hidden">{facts.title}</h1>{/if}
  {#if adaptive}
    <nav class="vb-path" aria-label={toolbarWords.whereYouAre}>
      {#if here('folder') && parts.folderChip}
        <PagePart draw={parts.folderChip} args={{ id: idOf('folder-chip'), look }} />
        {#if tier === 'full'}<span class="vb-path-sep" aria-hidden="true">/</span>{/if}
      {/if}
      <BoardPicker {facts} {onboard} id={idOf('board')} face={boardFace} {look} />
      {#if here('version') && facts.version !== null}
        <span class="vb-path-sep" aria-hidden="true">/</span>
        <VersionPicker {facts} {onversion} id={idOf('version')} face={versionFace} {look} />
      {/if}
    </nav>
  {:else}
    <BoardPicker {facts} {onboard} id={idOf('board')} />
    {#if !facts.versionView}
      <h1 id={idOf('title')} class="vb-title">{facts.title}</h1>
      <span id={idOf('version')} class="vb-chip" hidden={facts.version === null} title={facts.summary}>v{facts.version}</span>
    {:else if facts.version !== null}
      <VersionPicker {facts} {onversion} id={idOf('version')} />
    {/if}
  {/if}
  <LockedChip id={idOf('locked')} locked={facts.locked} />
  {#if adaptive && tier === 'full'}<span class="vb-bar-rule" aria-hidden="true"></span>{/if}
  {#if here('containers') && facts.containers.length}
    <MenuSelect id={idOf('containers')} label={toolbarWords.containers} name={toolbarWords.containers} onpick={ongo} {look}
      face={adaptive ? containersFace : undefined} kind="vb-path-part" title={adaptive ? toolbarWords.containers : undefined}
      rows={facts.containers.map((c) => ({ value: c.id, text: label(rowText(c)), disabled: !c.usable }))} />
  {/if}
  <div id={idOf('counts')} class="vb-counts" aria-live="polite">
    {#if adaptive && tier === 'third'}
      {#if facts.version !== null}
        {@const fresh = facts.past ? 0 : facts.freshCards.length}
        <span class="vb-chip vb-count" title={toolbarWords.compactCount(facts.counts.open, fresh)}>
          <b>{facts.counts.open}</b> <span class="vb-visually-hidden">{toolbarWords.openWord}</span>
          {#if fresh}<span class="vb-count-dot" aria-hidden="true"></span> <span class="vb-visually-hidden">{toolbarWords.freshCount(fresh)}</span>{/if}
        </span>
      {/if}
      {#if updated}<span class="vb-visually-hidden">{toolbarWords.boardUpdated(updated)}</span>{/if}
    {:else}
      {#if updated}<span id={idOf('boards-updated')} class="vb-chip" data-tone="new" title={toolbarWords.boardUpdated(updated)}><b>{updated}</b> <span class="vb-chip-word">{toolbarWords.boardUpdatedWord(updated)}</span></span>{/if}
      {#if facts.version !== null}
        <OpenChip id={idOf('open-cards')} count={facts.counts.open} cards={openList ? facts.openCards : []} onpick={onopen} />
        {#if facts.freshCards.length && !facts.past}
          <OpenChip id={idOf('fresh-cards')} count={facts.freshCards.length} cards={facts.freshCards} onpick={onopen} word={chromeCommonWords.newWord} tone="new"
            label={toolbarWords.goToNewCard} title={toolbarWords.newAndUpdatedCardsChoose} />
        {/if}
        {#if facts.counts.withAgent}<span class="vb-chip" data-tone="agent" title={toolbarWords.repliedItems}><ButtonIcon name="agents" /><b>{facts.counts.withAgent}</b> <span class="vb-chip-word">{toolbarWords.replied}</span></span>{/if}
        <span class="vb-chip" data-tone="answered" hidden={!answeredLater} title={toolbarWords.answeredItems}><b>{facts.counts.answered}</b> <span class="vb-chip-word">{toolbarWords.answered}</span></span>
        <span class="vb-chip" data-tone="later" hidden={!answeredLater} title={toolbarWords.laterItems}><b>{facts.counts.later}</b> <span class="vb-chip-word">{toolbarWords.later}</span></span>
        {#if facts.flagged && !facts.past}
          <FlaggedChip id={idOf('flagged')} count={facts.flagged} onclick={onflagged} />
        {/if}
      {/if}
    {/if}
  </div>
  <ToolbarEnd {oncommand} {onhide} {onsend} {onrevoke} onarchive={archiving ? onarchive : undefined} onlock={locking ? onlock : undefined} menu={toolbarMenu}
    {holders} {placement} {zoom} {menuOpen} {zoomOpen} {look} {send} tier={adaptive ? tier : undefined} {also} folderAbove={adaptive && inMenu(tier, 'folder') && !!parts.folderField}
    fields={adaptive && tier !== 'full' ? fields : undefined} />
</header>
