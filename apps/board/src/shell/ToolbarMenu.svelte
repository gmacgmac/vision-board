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
     first row; the keys are the Move to list's (board/menu-keys.ts): Up, Down, Home, End, Esc
     (focus back on "⋯"), Tab; a press outside or a choice closes it. H in the menu chooses Hide
     answered, as H does on the board (keys.ts). Its look is the Move to list's (board.css). The
     gallery passes `open`, `placement` 'gallery', which drops the board's ids, and `locked` to draw either row. -->
<script lang="ts">
  import { tick } from 'svelte';
  import { shell } from './shell.svelte.ts';
  import ButtonIcon from './ButtonIcon.svelte';
  import { menuKeydown } from '../board/menu-keys.ts';
  import { flagOn } from '../../../../packages/format/src/index.ts';
  import { pageFlags } from '../flags.ts';
  import { keepAlign } from './align.ts';
  import { currentFolderOn } from '../board/folder.ts';
  import { elidePath, folderPath } from '../board/folder-path.ts';
  import type { FolderInfo } from '../board/io.ts';

  let { theme, ontheme, onhide, onarchive, onlock, locked = undefined, folder = undefined, current = undefined, open: forced = false, placement = 'board' }: {
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
  const lockTip = $derived(archiveOff ? (shell.past ? `Go back to now to ${isLocked ? 'unlock' : 'lock'} this board` : 'No board is open')
    : isLocked ? 'Let you and the agents change this board again' : 'Make this board read-only for everyone, agents included, until you unlock it');
  const here = $derived(folder === undefined ? shell.folder : folder);
  const folderTip = $derived(here ? `Open another folder (open now: ${here.name})` : 'Open a project folder');
  const showCurrent = $derived((current ?? currentFolderOn()) && openFolder);
  /** The Current line's longest path before its middle is elided (the menu is 220 to 360px wide). */
  const CURRENT_MAX = 32;
  let open = $state(false);
  const shown = $derived(forced || open);
  let root: HTMLElement;
  let button: HTMLButtonElement;
  let list: HTMLElement;

  const items = () => [...list.querySelectorAll<HTMLElement>('[role^="menuitem"]')];
  async function show() {
    open = true;
    await tick();
    items()[0]?.focus({ preventScroll: true });
  }
  function close(focusBack = true) {
    if (!open) return;
    open = false;
    if (focusBack) button.focus({ preventScroll: true });
  }
  /** Close, then do the row's job (Reply's panel then takes focus, ReplyPanel.svelte). */
  function choose(run: () => void) {
    close();
    run();
  }
  function onkey(e: KeyboardEvent) {
    if (e.key.toLowerCase() === 'h' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.stopPropagation();
      e.preventDefault();
      return choose(onhide);
    }
    menuKeydown(e, items(), close);
  }

  $effect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => { if (!root.contains(e.target as Node)) close(false); };
    document.addEventListener('pointerdown', outside, true);
    return () => document.removeEventListener('pointerdown', outside, true);
  });
</script>

<div class="vb-menu" bind:this={root}>
  <button type="button" class="vb-btn vb-menu-btn" id={board ? 'toolbar-menu' : undefined} bind:this={button}
    title="More: Theme, Hide answered{aligning ? ', Centre cards' : ''}, Reply{onlock ? `, ${isLocked ? 'Unlock' : 'Lock'} board` : ''}{onarchive ? ', Archive board' : ''}{openFolder ? ', Open folder' : ''}" aria-label="More" aria-haspopup="menu" aria-expanded={shown}
    aria-controls="vb-menu-{uid}" onclick={() => (open ? close() : void show())}><ButtonIcon name="more" /></button>
  <div class="vb-menu-list" id="vb-menu-{uid}" role="menu" aria-label="More" tabindex="-1" hidden={!shown}
    bind:this={list} onkeydown={onkey}>
    <button type="button" class="vb-menu-item" role="menuitem" tabindex="-1" id={board ? 'theme' : undefined}
      onclick={() => choose(ontheme)}>
      <ButtonIcon name="theme" /><span class="vb-menu-label">Theme: {theme}</span>
    </button>
    <button type="button" class="vb-menu-item" role="menuitemcheckbox" tabindex="-1" id={board ? 'hide' : undefined}
      aria-checked={shell.hide} aria-keyshortcuts="h" onclick={() => choose(onhide)}>
      <ButtonIcon name="hide" /><span class="vb-menu-label">Hide answered</span>
      <span class="vb-menu-check" aria-hidden="true">✓</span><kbd aria-hidden="true">H</kbd>
    </button>
    {#if aligning}
      <button type="button" class="vb-menu-item" role="menuitemcheckbox" tabindex="-1" id={board ? 'align' : undefined}
        aria-checked={shell.align === 'center'} title="Off: a row of cards lines up by its tops, a column by its left edges"
        onclick={() => choose(toggleAlign)}>
        <ButtonIcon name="align" /><span class="vb-menu-label">Centre cards</span>
        <span class="vb-menu-check" aria-hidden="true">✓</span>
      </button>
    {/if}
    <button type="button" class="vb-menu-item" role="menuitem" tabindex="-1" id={board ? 'reply-toggle' : undefined}
      aria-expanded={shell.replyOpen} aria-controls={board ? 'reply' : undefined}
      onclick={() => choose(() => { shell.replyOpen = !shell.replyOpen; })}>
      <ButtonIcon name="quote" /><span class="vb-menu-label">Reply{shell.answered ? ` (${shell.answered})` : ''}</span>
    </button>
    {#if onlock}
      <button type="button" class="vb-menu-item" role="menuitem" tabindex="-1" id={board ? 'lock-board' : undefined}
        aria-disabled={archiveOff} title={lockTip} onclick={() => { if (!archiveOff) choose(onlock); }}>
        <ButtonIcon name={isLocked ? 'unlock' : 'lock'} /><span class="vb-menu-label">{isLocked ? 'Unlock board' : 'Lock board'}</span>
      </button>
    {/if}
    {#if onarchive}
      <button type="button" class="vb-menu-item" role="menuitem" tabindex="-1" id={board ? 'archive-board' : undefined}
        aria-haspopup="dialog" aria-disabled={archiveOff}
        title={archiveOff ? (shell.past ? 'Go back to now to archive this board' : 'No board is open') : 'Hide this board from every agent and from the picker; restore it from the picker'}
        onclick={() => { if (!archiveOff) choose(onarchive); }}>
        <ButtonIcon name="archive" /><span class="vb-menu-label">Archive board…</span>
      </button>
    {/if}
    {#if openFolder}
      <button type="button" class="vb-menu-item" role="menuitem" tabindex="-1" id={board ? 'open-folder' : undefined}
        aria-haspopup="dialog" title={folderTip} onclick={() => choose(() => { shell.folderDialog = true; })}>
        <ButtonIcon name="folder" /><span class="vb-menu-label">Open folder…</span>
      </button>
      {#if showCurrent && here}
        <p class="vb-menu-current" role="none" title={folderPath(here)}>Current: <b>{elidePath(folderPath(here), CURRENT_MAX)}</b></p>
      {/if}
    {/if}
  </div>
</div>
