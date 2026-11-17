<!-- The board's flow direction, in the header (flowDirection flag, D-100 5, points 260 and 309): one button showing the
     board's choice in its icon and words ("Flows: Auto"; a narrow bar shows the icon, board.css `.vb-btn-iconic`), a menu of Across, Down and Auto with it ticked, the person's board-wide `direction` act
     (controller.setDirection); choosing the ticked row closes it and writes nothing. From the header's half form its
     rows are in "⋯" (ToolbarMenu, header-tier.ts). A container's own choice is its layout control (packages/ui/src/region). Off, with
     Archive board…'s reasons, while no board is open, a past version shows or the ledger is read-only. The keys and the
     press outside are the shared menu's (toolbar-popup.svelte.ts). `open` draws it open: the gallery's sample only. -->
<script lang="ts">
  import * as toolbarWords from '../words/toolbar.ts';
  import { useChrome } from './chrome.svelte.ts';
  import ButtonIcon from './ButtonIcon.svelte';
  import { toolbarPopup } from './toolbar-popup.svelte.ts';
  import { READ_ONLY_PERSON } from '#actions';
  import type { ActDirection } from '#format';
  import { ACT_DIRECTIONS } from '#format';

  const { state: view, id: idIn } = useChrome();
  let { ondirection, open: forced = false, placement = 'board' }: {
    ondirection: (direction: ActDirection) => void;
    open?: boolean;
    placement?: 'board' | 'gallery';
  } = $props();

  const uid = $props.id();
  const board = $derived(placement === 'board');
  const idOf = (name: string) => (board ? idIn(name) : undefined);
  const off = $derived(board && (view.version === null || !!view.past));
  const readOnly = $derived(!off && view.readOnly);
  let root: HTMLElement;
  let button: HTMLButtonElement;
  let list: HTMLElement;
  const popup = toolbarPopup({ surface: () => list, opener: () => button, root: () => root });
  const shown = $derived(forced || popup.open);
  // Nothing outlives the menu: closed with it.
  $effect(() => () => popup.close(false));
</script>

<div class="vb-menu vb-flow-menu" bind:this={root}>
  <button type="button" class="vb-btn vb-menu-btn vb-btn-iconic" id={idOf('flow-menu')} bind:this={button} title={toolbarWords.directionTitle(view.direction ?? 'auto')}
    aria-label={toolbarWords.directionTitle(view.direction ?? 'auto')} aria-haspopup="menu" aria-expanded={shown} aria-controls={idIn(`vb-flow-${uid}`)}
    onclick={() => (popup.open ? popup.close() : void popup.show())}><ButtonIcon name={view.direction ?? 'auto'} /><span class="vb-btn-text">{toolbarWords.directionName(view.direction ?? 'auto')}</span></button>
  <div class="vb-menu-list" id={idIn(`vb-flow-${uid}`)} role="menu" aria-label={toolbarWords.directionGroup} tabindex="-1" hidden={!shown} bind:this={list}>
    {#each ACT_DIRECTIONS as direction (direction)}
      <button type="button" class="vb-menu-item" role="menuitemradio" tabindex="-1" id={idOf(`direction-${direction}`)} aria-checked={view.direction === direction}
        aria-disabled={off || readOnly} title={readOnly ? READ_ONLY_PERSON : toolbarWords.directionTip(direction)}
        onclick={() => { if (!off && !readOnly) popup.choose(() => { if (view.direction !== direction) ondirection(direction); }); }}>
        <ButtonIcon name={direction} /><span class="vb-menu-label">{toolbarWords.directionName(direction)}</span><span class="vb-menu-check" aria-hidden="true">✓</span>
      </button>
    {/each}
  </div>
</div>
