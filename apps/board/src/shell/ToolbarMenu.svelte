<!-- The toolbar's "⋯" menu (toolbarMenu flag, toolbar icons and menu ruling 2): Theme, Hide answered,
     with the alignSetting flag Centre cards (the viewer's alignment, field report batch 3 ruling 4: a
     checkbox row, off by default, kept in this browser by align.ts) and Reply, each a row with its icon and its key, with the
     archiveBoard flag (`onarchive` given) Archive board…, which asks, then archives the open board (N39
     ruling 5; off, aria-disabled, while no board is open or a past version shows), with the lockBoard flag (`onlock` given)
     Lock board, or on a locked board Unlock board (N40 ruling 4: no confirm, nothing is lost either way; off like Archive
     board…), and with the openFolder flag Open folder…, which opens
     the folder picker (FolderDialog.svelte); its tooltip names the open folder; with the currentFolder flag a plain line
     under it, "Current: ~/…/name" (the middle of a long path elided, the whole path in its tooltip; not a row, so
     the menu's keys skip it). A click or Enter on "⋯" opens it and focuses the
     first row; the keys and the press outside are the shared menu's (`#ui` `openMenu`): Up, Down, Home,
     End, Esc (focus back on "⋯"), Tab; a press outside or a choice closes it. H in the menu chooses Hide
     answered, as H does on the board (keys.ts). Its look is the shared menu's (#ui base/menu.css). The
     gallery passes `open`, `placement` 'gallery', which drops the board's ids, and `locked` to draw either row.
     With `fields` (adaptiveHeader flag, a narrow bar: HeaderFields.svelte) the surface also holds what moved out of the
     bar, above the role="menu" and beside it; the keys walk both. `also` names them in the tooltip, and with
     `folderAbove` the Folder row above stands for Open folder… and its line. -->
<script lang="ts">
  import * as commonWords from '../board/words/common.ts';
  import * as toolbarWords from './words/toolbar.ts';
  import type { Snippet } from 'svelte';
  import { shell } from './shell.svelte.ts';
  import ButtonIcon from './ButtonIcon.svelte';
  import { toolbarPopup } from './toolbar-popup.svelte.ts';
  import { flagOn } from '#format';
  import { pageFlags } from '../flags.ts';
  import { keepAlign } from './align.ts';
  import { currentFolderOn } from './folder.ts';
  import { elidePath, folderPath } from './folder-path.ts';
  import type { FolderInfo } from './page-io.ts';

  let { theme, ontheme, onhide, onarchive, onlock, locked = undefined, folder = undefined, current = undefined, open: forced = false, placement = 'board', fields, also, folderAbove = false }: {
    theme: string;
    /** The next theme: system, light, dark. */
    ontheme: () => void;
    onhide: () => void;
    /** Archive board… (archiveBoard flag); left out, no such row. */
    onarchive?: (() => void) | undefined;
    /** Lock board or Unlock board (lockBoard flag), whichever the open board needs; left out, no such row. */
    onlock?: (() => void) | undefined;
    /** Draw the row for a locked board (the gallery); left out, the open board's own state. */
    locked?: boolean | undefined;
    /** The open folder (the gallery's); left out, the page's own (`shell.folder`). */
    folder?: Pick<FolderInfo, 'path' | 'name'> | null | undefined;
    /** Show the Current line (the gallery's); left out, the currentFolder flag. */
    current?: boolean | undefined;
    open?: boolean;
    placement?: 'board' | 'gallery';
    /** What moved here from the bar: drawn above the rows, given the way to close and act. */
    fields?: Snippet<[(run: () => void) => void]> | undefined;
    /** The names of what moved, for the tooltip. */
    also?: readonly string[] | undefined;
    /** The fields hold the Folder row: Open folder… and its line give way to it. */
    folderAbove?: boolean;
  } = $props();

  const uid = $props.id();
  const board = $derived(placement === 'board');
  const openFolder = flagOn('openFolder', pageFlags());
  const aligning = flagOn('alignSetting', pageFlags());
  /** Centre cards: on, rows and columns of cards are centred; off, they line up by their tops and left edges. */
  function toggleAlign() {
    shell.align = shell.align === 'center' ? 'start' : 'center';
    keepAlign(shell.align);
  }
  /** Archive board… waits for a board to be open, and for now to show (the gallery's is on). */
  const archiveOff = $derived(board && (shell.version === null || !!shell.past));
  const isLocked = $derived(locked ?? shell.locked);
  const lockTip = $derived(archiveOff ? (shell.past ? toolbarWords.goBackToNowTo(isLocked) : toolbarWords.noBoardIsOpen)
    : isLocked ? toolbarWords.letYouAndTheAgents : toolbarWords.makeThisBoardReadOnly);
  const here = $derived(folder === undefined ? shell.folder : folder);
  const folderTip = $derived(here ? toolbarWords.openAnotherFolderOpenNow(here.name) : toolbarWords.openAProjectFolder);
  const showCurrent = $derived((current ?? currentFolderOn()) && openFolder);
  /** The Current line's longest path before its middle is elided (the menu is 220 to 360px wide). */
  const CURRENT_MAX = 32;
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
  <button type="button" class="vb-btn vb-menu-btn" id={board ? 'toolbar-menu' : undefined} bind:this={button}
    title={toolbarWords.moreTitle({ centre: aligning, lock: !!onlock, locked: isLocked, archive: !!onarchive, folder: !!openFolder, also })} aria-label={toolbarWords.more} aria-haspopup="menu" aria-expanded={shown}
    aria-controls="vb-menu-{uid}" onclick={() => (popup.open ? close() : void popup.show())}><ButtonIcon name="more" /></button>
  <div class={fields ? 'vb-menu-surface vb-surface-pop' : 'vb-menu-surface'} data-fields={fields ? '' : undefined} hidden={!shown} bind:this={surface} onfocusin={(e) => { if (fields) (e.target as HTMLElement).scrollIntoView({ block: 'nearest' }); }}>
  {#if fields}<div class="vb-menu-fields" role="group" aria-label={toolbarWords.moreControls}>{@render fields(choose)}</div>{/if}
  <div class="vb-menu-list" id="vb-menu-{uid}" role="menu" aria-label={toolbarWords.more} tabindex="-1" hidden={!shown}>
    <button type="button" class="vb-menu-item" role="menuitem" tabindex="-1" id={board ? 'theme' : undefined}
      onclick={() => choose(ontheme)}>
      <ButtonIcon name="theme" /><span class="vb-menu-label">{toolbarWords.theme(theme)}</span>
    </button>
    <button type="button" class="vb-menu-item" role="menuitemcheckbox" tabindex="-1" id={board ? 'hide' : undefined}
      aria-checked={shell.hide} aria-keyshortcuts="h" onclick={() => choose(onhide)}>
      <ButtonIcon name="hide" /><span class="vb-menu-label">{commonWords.hideAnswered}</span>
      <span class="vb-menu-check" aria-hidden="true">✓</span><kbd aria-hidden="true">H</kbd>
    </button>
    {#if aligning}
      <button type="button" class="vb-menu-item" role="menuitemcheckbox" tabindex="-1" id={board ? 'align' : undefined}
        aria-checked={shell.align === 'center'} title={toolbarWords.offARowOfCards}
        onclick={() => choose(toggleAlign)}>
        <ButtonIcon name="align" /><span class="vb-menu-label">{toolbarWords.centreCards2}</span>
        <span class="vb-menu-check" aria-hidden="true">✓</span>
      </button>
    {/if}
    <button type="button" class="vb-menu-item" role="menuitem" tabindex="-1" id={board ? 'reply-toggle' : undefined}
      aria-expanded={shell.replyOpen} aria-controls={board ? 'reply' : undefined}
      onclick={() => choose(() => { shell.replyOpen = !shell.replyOpen; })}>
      <ButtonIcon name="quote" /><span class="vb-menu-label">{toolbarWords.reply2(shell.answered)}</span>
    </button>
    {#if fields && (onlock || onarchive)}<div class="vb-menu-rule" role="separator"></div>{/if}
    {#if onlock}
      <button type="button" class="vb-menu-item" role="menuitem" tabindex="-1" id={board ? 'lock-board' : undefined}
        aria-disabled={archiveOff} title={lockTip} onclick={() => { if (!archiveOff) choose(onlock); }}>
        <ButtonIcon name={isLocked ? 'unlock' : 'lock'} /><span class="vb-menu-label">{isLocked ? toolbarWords.unlockBoard : toolbarWords.lockBoard}</span>
      </button>
    {/if}
    {#if onarchive}
      <button type="button" class="vb-menu-item" role="menuitem" tabindex="-1" id={board ? 'archive-board' : undefined}
        aria-haspopup="dialog" aria-disabled={archiveOff}
        title={archiveOff ? (shell.past ? toolbarWords.goBackToNowToArchive : toolbarWords.noBoardIsOpen) : toolbarWords.hideThisBoardFromEvery}
        onclick={() => { if (!archiveOff) choose(onarchive); }}>
        <ButtonIcon name="archive" /><span class="vb-menu-label">{toolbarWords.archiveBoard2}</span>
      </button>
    {/if}
    {#if openFolder && !folderAbove}
      <button type="button" class="vb-menu-item" role="menuitem" tabindex="-1" id={board ? 'open-folder' : undefined}
        aria-haspopup="dialog" title={folderTip} onclick={() => choose(() => { shell.folderDialog = true; })}>
        <ButtonIcon name="folder" /><span class="vb-menu-label">{toolbarWords.openFolder2}</span>
      </button>
      {#if showCurrent && here}
        <p class="vb-menu-current" role="none" title={folderPath(here)}>{toolbarWords.current} <b>{elidePath(folderPath(here), CURRENT_MAX)}</b></p>
      {/if}
    {/if}
  </div>
  </div>
</div>
