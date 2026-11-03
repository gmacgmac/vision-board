<!-- The toolbar's "⋯" menu (toolbarMenu flag, toolbar icons and menu ruling 2): the page's Theme, Hide answered,
     the page's Centre cards (`BoardPageParts`; a host has neither) and Reply, each a row with its icon and its key, with the
     archiveBoard flag (`onarchive` given) Archive board…, which asks, then archives the open board (N39
     ruling 5; off, aria-disabled, while no board is open or a past version shows), with the lockBoard flag (`onlock` given)
     Lock board, or on a locked board Unlock board (N40 ruling 4: no confirm, nothing is lost either way; off like Archive
     board…), the page's Open folder… (`folderRow`) and New ledger… (`ledgerRow`, ledgerFolders flag). A click or Enter on "⋯" opens it and focuses the
     first row; the keys and the press outside are the shared menu's (`#ui` `openMenu`): Up, Down, Home,
     End, Esc (focus back on "⋯"), Tab; a press outside or a choice closes it. H in the menu chooses Hide
     answered, as H does on the board (keys.ts). Its look is the shared menu's (#ui base/menu.css). The
     gallery passes `open`, `placement` 'gallery', which drops the board's ids, and `locked` to draw either row.
     With `fields` (adaptiveHeader flag, a narrow bar: HeaderFields.svelte) the surface also holds what moved out of the
     bar, above the role="menu" and beside it; the keys walk both. `also` names them in the tooltip, and with
     `folderAbove` the Folder row above stands for Open folder… and its line, and with `ledgerAbove` the Ledger row above, whose
     list ends in New ledger…, stands for New ledger…. -->
<script lang="ts">
  import * as commonWords from '../words/common.ts';
  import * as toolbarWords from '../words/toolbar.ts';
  import type { Snippet } from 'svelte';
  import { useChrome } from './chrome.svelte.ts';
  import ButtonIcon from './ButtonIcon.svelte';
  import PagePart from './PagePart.svelte';
  import { toolbarPopup } from './toolbar-popup.svelte.ts';

  const { state: view, parts, id: idIn } = useChrome();

  let { onhide, onarchive, onlock, locked = undefined, open: forced = false, placement = 'board', fields, also, folderAbove = false, ledgerAbove = false }: {
    onhide: () => void;
    /** Archive board… (archiveBoard flag); left out, no such row. */
    onarchive?: (() => void) | undefined;
    /** Lock board or Unlock board (lockBoard flag), whichever the open board needs; left out, no such row. */
    onlock?: (() => void) | undefined;
    /** Draw the row for a locked board (the gallery); left out, the open board's own state. */
    locked?: boolean | undefined;
    open?: boolean;
    placement?: 'board' | 'gallery';
    /** What moved here from the bar: drawn above the rows, given the way to close and act. */
    fields?: Snippet<[(run: () => void) => void]> | undefined;
    /** The names of what moved, for the tooltip. */
    also?: readonly string[] | undefined;
    /** The fields hold the Folder row: Open folder… and its line give way to it. */
    folderAbove?: boolean;
    /** The fields hold the Ledger row: New ledger… gives way to it. */
    ledgerAbove?: boolean;
  } = $props();

  const uid = $props.id();
  const board = $derived(placement === 'board');
  /** A control's id: none on a gallery's sample. */
  const idOf = (name: string) => (board ? idIn(name) : undefined);
  /** Archive board… waits for a board to be open, and for now to show (the gallery's is on). */
  const archiveOff = $derived(board && (view.version === null || !!view.past));
  const isLocked = $derived(locked ?? view.locked);
  const lockTip = $derived(archiveOff ? (view.past ? toolbarWords.goBackToNowTo(isLocked) : toolbarWords.noBoardIsOpen)
    : isLocked ? toolbarWords.letYouAndTheAgents : toolbarWords.makeThisBoardReadOnly);
  let root: HTMLElement;
  let button: HTMLButtonElement;
  let surface: HTMLElement;
  /** What the keys walk: the rows, and with `fields` every control above them that shows. */
  const items = () => [...surface.querySelectorAll<HTMLElement>('[role^="menuitem"], .vb-menu-fields :is(button, select, summary)')].filter((e) => e.getClientRects().length);
  const popup = toolbarPopup({ surface: () => surface, opener: () => button, root: () => root, key: keys, items });
  const shown = $derived(forced || popup.open);
  const close = popup.close;
  const choose = popup.choose;
  // Nothing outlives the menu: closed with it.
  $effect(() => () => popup.close(false));
  /** Enter on a select opens its list, as Space does (some browsers leave Enter to the form). */
  function keys(e: KeyboardEvent): boolean {
    if (hide(e)) return true;
    if (e.key !== 'Enter' || !(e.target instanceof HTMLSelectElement)) return false;
    e.stopPropagation();
    e.preventDefault();
    e.target.showPicker?.();
    return true;
  }
  /** H in the menu chooses Hide answered, before the menu's own keys. */
  function hide(e: KeyboardEvent): boolean {
    if (e.key.toLowerCase() !== 'h' || e.metaKey || e.ctrlKey || e.altKey) return false;
    e.stopPropagation();
    e.preventDefault();
    choose(onhide);
    return true;
  }
</script>

<div class="vb-menu" bind:this={root}>
  <button type="button" class="vb-btn vb-menu-btn" id={idOf('toolbar-menu')} bind:this={button}
    title={toolbarWords.moreTitle({ theme: !!parts.theme, centre: !!parts.alignRow, lock: !!onlock, locked: isLocked, archive: !!onarchive, folder: !!parts.folderRow, also })} aria-label={toolbarWords.more} aria-haspopup="menu" aria-expanded={shown}
    aria-controls={idIn(`vb-menu-${uid}`)} onclick={() => (popup.open ? close() : void popup.show())}><ButtonIcon name="more" /></button>
  <div class={fields ? 'vb-menu-surface vb-surface-pop' : 'vb-menu-surface'} data-fields={fields ? '' : undefined} hidden={!shown} bind:this={surface} onfocusin={(e) => { if (fields) (e.target as HTMLElement).scrollIntoView({ block: 'nearest' }); }}>
  {#if fields}<div class="vb-menu-fields" role="group" aria-label={toolbarWords.moreControls}>{@render fields(choose)}</div>{/if}
  <div class="vb-menu-list" id={idIn(`vb-menu-${uid}`)} role="menu" aria-label={toolbarWords.more} tabindex="-1" hidden={!shown}>
    {#if parts.theme}<PagePart draw={parts.theme} args={{ choose }} />{/if}
    <button type="button" class="vb-menu-item" role="menuitemcheckbox" tabindex="-1" id={idOf('hide')}
      aria-checked={view.hide} aria-keyshortcuts="h" onclick={() => choose(onhide)}>
      <ButtonIcon name="hide" /><span class="vb-menu-label">{commonWords.hideAnswered}</span>
      <span class="vb-menu-check" aria-hidden="true">✓</span><kbd aria-hidden="true">H</kbd>
    </button>
    {#if parts.alignRow}<PagePart draw={parts.alignRow} args={{ choose }} />{/if}
    <button type="button" class="vb-menu-item" role="menuitem" tabindex="-1" id={idOf('reply-toggle')}
      aria-expanded={view.replyOpen} aria-controls={idOf('reply')}
      onclick={() => choose(() => { view.replyOpen = !view.replyOpen; })}>
      <ButtonIcon name="quote" /><span class="vb-menu-label">{toolbarWords.reply2(view.answered)}</span>
    </button>
    {#if fields && (onlock || onarchive)}<div class="vb-menu-rule" role="separator"></div>{/if}
    {#if onlock}
      <button type="button" class="vb-menu-item" role="menuitem" tabindex="-1" id={idOf('lock-board')}
        aria-disabled={archiveOff} title={lockTip} onclick={() => { if (!archiveOff) choose(onlock); }}>
        <ButtonIcon name={isLocked ? 'unlock' : 'lock'} /><span class="vb-menu-label">{isLocked ? toolbarWords.unlockBoard : toolbarWords.lockBoard}</span>
      </button>
    {/if}
    {#if onarchive}
      <button type="button" class="vb-menu-item" role="menuitem" tabindex="-1" id={idOf('archive-board')}
        aria-haspopup="dialog" aria-disabled={archiveOff}
        title={archiveOff ? (view.past ? toolbarWords.goBackToNowToArchive : toolbarWords.noBoardIsOpen) : toolbarWords.hideThisBoardFromEvery}
        onclick={() => { if (!archiveOff) choose(onarchive); }}>
        <ButtonIcon name="archive" /><span class="vb-menu-label">{toolbarWords.archiveBoard2}</span>
      </button>
    {/if}
    {#if parts.folderRow && !folderAbove}<PagePart draw={parts.folderRow} args={{ choose }} />{/if}
    {#if parts.ledgerRow && !ledgerAbove}<PagePart draw={parts.ledgerRow} args={{ choose }} />{/if}
  </div>
  </div>
</div>
