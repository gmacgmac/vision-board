<!-- The toolbar's "⋯" menu (toolbarMenu flag, toolbar icons and menu ruling 2): the page's Theme, with
     `onskin` given a row per skin with the board's ticked (D-100 2; off with Archive board…'s reasons), Hide answered (the board-wide
     flow direction is FlowMenu.svelte, in the header at full; from half, `ondirection` given, its rows are here, FIX_01),
     the page's Centre cards (`BoardPageParts`; a host has neither) and Reply, each a row with its icon and its key, with the
     archiveBoard flag (`onarchive` given) Archive board…, which asks, then archives the open board (N39
     ruling 5; off, aria-disabled, while no board is open or a past version shows), with the lockBoard flag (`onlock` given)
     Lock board, or on a locked board Unlock board (N40 ruling 4: no confirm, nothing is lost either way; off like Archive
     board…; both off, saying why, while the ledger is read-only, D-085), the page's Open folder… (`folderRow`) and New ledger… (`ledgerRow`, ledgerFolders flag). A click or Enter on "⋯" opens it and focuses the
     first row; the keys and the press outside are the shared menu's (`#ui` `openMenu`): Up, Down, Home,
     End, Esc (focus back on "⋯"), Tab; a press outside or a choice closes it. H in the menu chooses Hide
     answered, as H does on the board (keys.ts). Its look is the shared menu's (#ui base/menu.css). The
     gallery passes `open`, `placement` 'gallery', which drops the board's ids, and `locked` to draw either row.
     With `fields` (adaptiveHeader flag, a narrow bar: HeaderFields.svelte) the surface also holds what moved out of the
     bar, above the role="menu" and beside it; the keys walk both. `also` names them in the tooltip, and with
     `folderAbove` the Folder row above stands for Open folder… and its line, and with `ledgerAbove` the Ledger row above, whose
     list ends in New ledger…, stands for New ledger…. With `onfiles` given, a section of its own, after
     the board's rows: Save as PDF…, Export… and Import… (D-107, PLAN decision 12), each only when the host gives its hook
     (chrome.svelte.ts `files`), each opening the files dialog for the whole board; Save as PDF… and Export… off while no board is
     open, Export… also while a past version shows (an export holds now), Import… while the ledger is read-only. With
     `onfolders` (otherFolders flag, a page that opens folders) "Let agents from other folders in", a checkbox ticked while
     the open ledger lets them in (D-120), off like Lock board, just above Open folder…. -->
<script lang="ts">
  import * as commonWords from '../words/common.ts';
  import * as toolbarWords from '../words/toolbar.ts';
  import * as filesWords from '../words/chrome-files.ts';
  import type { Snippet } from 'svelte';
  import { useChrome } from './chrome.svelte.ts';
  import ButtonIcon from './ButtonIcon.svelte';
  import PagePart from './PagePart.svelte';
  import { toolbarPopup } from './toolbar-popup.svelte.ts';
  import { HIDE_KEY } from '../input/index.ts';
  import { ACTIONS, READ_ONLY_PERSON } from '#actions';
  import type { ActDirection, Skin } from '#format';
  import { ACT_DIRECTIONS, SKINS } from '#format';

  const { state: view, parts, id: idIn, flag, files } = useChrome();

  let { onhide, onarchive, onlock, onfolders, onskin, ondirection, onfiles, locked = undefined, open: forced = false, placement = 'board', fields, also, folderAbove = false, ledgerAbove = false }: {
    onhide: () => void;
    /** Archive board… (archiveBoard flag); left out, no such row. */
    onarchive?: (() => void) | undefined;
    /** Lock board or Unlock board (lockBoard flag), whichever the open board needs; left out, no such row. */
    onlock?: (() => void) | undefined;
    /** Let agents from other folders in, or stop that (D-120); left out, no such row. */
    onfolders?: (() => void) | undefined;
    /** The board's skin (D-100 2): a row per skin, the board's ticked; left out (the gallery), no such rows. */
    onskin?: ((skin: Skin) => void) | undefined;
    /** Which way the board's flows run (D-100 5), when the header has no room for Flows (header-tier.ts): a row
     *  per direction, the board's ticked; left out, no such rows. */
    ondirection?: ((direction: ActDirection) => void) | undefined;
    /** Save as PDF…, Export… and Import… : open the files dialog for the whole board; left out, no such rows. */
    onfiles?: ((kind: 'print' | 'export' | 'import') => void) | undefined;
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
  /** The ledger is read-only (D-085): neither row can write, and says why (the gallery draws it with its sample's state). */
  const readOnly = $derived(!archiveOff && view.readOnly);
  const isLocked = $derived(locked ?? view.locked);
  const lockTip = $derived(archiveOff ? (view.past ? toolbarWords.goBackToNowTo(isLocked) : toolbarWords.noBoardIsOpen)
    : readOnly ? READ_ONLY_PERSON : isLocked ? toolbarWords.letYouAndTheAgents : toolbarWords.makeThisBoardReadOnly);
  const foldersTip = $derived(archiveOff ? (view.past ? toolbarWords.backToNow : toolbarWords.noBoardIsOpen) : readOnly ? READ_ONLY_PERSON : undefined);
  /** The files rows that show: the host gives each one's hook (the gallery's sample draws all three). */
  const filing = $derived(onfiles ? (['print', 'export', 'import'] as const).filter((k) => files[k] || !board) : []);
  /** Save as PDF… and Export… wait for a board; Export… for now too; Import… for an editable ledger. */
  const fileOff = (k: 'print' | 'export' | 'import') => (k === 'import' ? board && view.readOnly : board && (view.version === null || (k === 'export' && !!view.past)));
  const fileTip = (k: 'print' | 'export' | 'import') => (k === 'import' ? (fileOff(k) ? READ_ONLY_PERSON : filesWords.importTip)
    : fileOff(k) ? (view.past ? filesWords.goBackToNowToExport : toolbarWords.noBoardIsOpen) : k === 'print' ? filesWords.printTip : filesWords.exportTip);
  const FILE_ROW = { print: filesWords.print, export: filesWords.exportBoard, import: filesWords.importBoard } as const;
  const FILE_NAME = { print: filesWords.printName, export: filesWords.exportName, import: filesWords.importName } as const;
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
  /** Shift+H in the menu chooses Hide answered (H is a node's history), before the menu's own keys. */
  function hide(e: KeyboardEvent): boolean {
    if (e.key.toLowerCase() !== 'h' || e.metaKey || e.ctrlKey || e.altKey || !e.shiftKey) return false;
    e.stopPropagation();
    e.preventDefault();
    choose(onhide);
    return true;
  }
</script>

<div class="vb-menu" bind:this={root}>
  <button type="button" class="vb-btn vb-menu-btn" id={idOf('toolbar-menu')} bind:this={button}
    title={toolbarWords.moreTitle({ theme: !!parts.theme, centre: !!parts.alignRow, lock: !!onlock, locked: isLocked, archive: !!onarchive, folder: !!parts.folderRow, ledger: !!parts.ledgerRow && !ledgerAbove, also, files: filing.map((k) => FILE_NAME[k]) })} aria-label={toolbarWords.more} aria-haspopup="menu" aria-expanded={shown}
    aria-controls={idIn(`vb-menu-${uid}`)} onclick={() => (popup.open ? close() : void popup.show())}><ButtonIcon name="more" /></button>
  <div class={fields ? 'vb-menu-surface vb-surface-pop' : 'vb-menu-surface'} data-fields={fields ? '' : undefined} hidden={!shown} bind:this={surface} onfocusin={(e) => { if (fields) (e.target as HTMLElement).scrollIntoView({ block: 'nearest' }); }}>
  {#if fields}<div class="vb-menu-fields" role="group" aria-label={toolbarWords.moreControls}>{@render fields(choose)}</div>{/if}
  <div class="vb-menu-list" id={idIn(`vb-menu-${uid}`)} role="menu" aria-label={toolbarWords.more} tabindex="-1" hidden={!shown}>
    {#if parts.theme}<PagePart draw={parts.theme} args={{ choose }} />{/if}
    {#if onskin && view.skin}
      <div role="group" aria-label={toolbarWords.skinGroup}>
        {#each SKINS as skin (skin)}
          <button type="button" class="vb-menu-item" role="menuitemradio" tabindex="-1" id={idOf(`skin-${skin}`)} aria-checked={view.skin === skin}
            aria-disabled={archiveOff || readOnly} title={readOnly ? READ_ONLY_PERSON : toolbarWords.skinTip}
            onclick={() => { if (!archiveOff && !readOnly && view.skin !== skin) choose(() => onskin(skin)); }}>
            <ButtonIcon name="theme" /><span class="vb-menu-label">{toolbarWords.skinName(skin)}</span><span class="vb-menu-check" aria-hidden="true">✓</span>
          </button>
        {/each}
      </div>
    {/if}
    {#if ondirection && view.direction}
      <div role="group" aria-label={toolbarWords.directionGroup}>
        {#each ACT_DIRECTIONS as direction (direction)}
          <button type="button" class="vb-menu-item" role="menuitemradio" tabindex="-1" id={idOf(`direction-${direction}`)} aria-checked={view.direction === direction}
            aria-disabled={archiveOff || readOnly} title={readOnly ? READ_ONLY_PERSON : toolbarWords.directionTip(direction)}
            onclick={() => { if (!archiveOff && !readOnly) choose(() => { if (view.direction !== direction) ondirection(direction); }); }}>
            <ButtonIcon name={direction} /><span class="vb-menu-label">{toolbarWords.directionName(direction)}</span><span class="vb-menu-check" aria-hidden="true">✓</span>
          </button>
        {/each}
      </div>
    {/if}
    <button type="button" class="vb-menu-item" role="menuitemcheckbox" tabindex="-1" id={idOf('hide')}
      aria-checked={view.hide} aria-keyshortcuts="Shift+H" onclick={() => choose(onhide)}>
      <ButtonIcon name="hide" /><span class="vb-menu-label">{commonWords.hideAnswered}</span>
      <span class="vb-menu-check" aria-hidden="true">✓</span><kbd aria-hidden="true">{HIDE_KEY}</kbd>
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
        aria-disabled={archiveOff || readOnly} title={lockTip} onclick={() => { if (!archiveOff && !readOnly) choose(onlock); }}>
        <ButtonIcon name={isLocked ? 'unlock' : 'lock'} /><span class="vb-menu-label">{isLocked ? toolbarWords.unlockBoard : toolbarWords.lockBoard}</span>
      </button>
    {/if}
    {#if onarchive}
      <button type="button" class="vb-menu-item" role="menuitem" tabindex="-1" id={idOf('archive-board')}
        aria-haspopup="dialog" aria-disabled={archiveOff || readOnly}
        title={archiveOff ? (view.past ? toolbarWords.goBackToNowToArchive : toolbarWords.noBoardIsOpen) : readOnly ? READ_ONLY_PERSON : toolbarWords.hideThisBoardFromEvery}
        onclick={() => { if (!archiveOff && !readOnly) choose(onarchive); }}>
        <ButtonIcon name="archive" /><span class="vb-menu-label">{toolbarWords.archiveBoard2}</span>
      </button>
    {/if}
    {#if filing.length}
      <div class="vb-menu-rule" role="separator"></div>
      {#each filing as k (k)}
        <button type="button" class="vb-menu-item" role="menuitem" tabindex="-1" id={idOf(`${k}-board`)} aria-haspopup="dialog"
          aria-disabled={fileOff(k)} title={fileTip(k)} onclick={() => { if (!fileOff(k)) choose(() => onfiles?.(k)); }}>
          <ButtonIcon name={k} /><span class="vb-menu-label">{FILE_ROW[k]}</span>
        </button>
      {/each}
    {/if}
    {#if onfolders}
      <button type="button" class="vb-menu-item" role="menuitemcheckbox" tabindex="-1" id={idOf('other-folders')} aria-checked={view.otherFolders}
        aria-disabled={archiveOff || readOnly} title={foldersTip} onclick={() => { if (!archiveOff && !readOnly) choose(onfolders); }}>
        <ButtonIcon name="folder" /><span class="vb-menu-label">{ACTIONS['folders-allow'].label}</span><span class="vb-menu-check" aria-hidden="true">✓</span>
      </button>
    {/if}
    {#if parts.folderRow && !folderAbove}<PagePart draw={parts.folderRow} args={{ choose }} />{/if}
    {#if parts.ledgerRow && !ledgerAbove}<PagePart draw={parts.ledgerRow} args={{ choose }} />{/if}
  </div>
  </div>
</div>
