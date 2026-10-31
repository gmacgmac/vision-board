<!-- The zoom as a small menu (adaptiveHeader flag, the half-width bar): the level with a chevron on the
     button, Zoom out, Zoom in and Fit as rows with their keys, the same commands as the zoom group
     (ToolbarEnd.svelte). Zoom out and Zoom in leave it open, so they can be pressed again and the level
     seen to change; Fit is a choice and closes it. The keys and the press outside are the shared menu's
     (toolbar-popup.svelte.ts). A polite status says the level once it settles (ZoomLevel), open or
     closed. `open` and `look` draw it without acting: the gallery's samples only. -->
<script lang="ts">
  import * as commonWords from '../board/words/common.ts';
  import * as toolbarWords from './words/toolbar.ts';
  import ButtonIcon from './ButtonIcon.svelte';
  import ZoomLevel from './ZoomLevel.svelte';
  import { commandTitle, zoomTitle } from '../board/input/index.ts';
  import type { CommandId } from '../board/input/index.ts';
  import { toolbarPopup } from './toolbar-popup.svelte.ts';

  let { percent, oncommand, id, open: forced = false, look }: {
    percent: number;
    oncommand: (id: CommandId) => void;
    id?: string | undefined;
    open?: boolean;
    look?: 'hover' | 'focus' | 'pressed' | undefined;
  } = $props();

  /** The rows, smallest first; a press on any but Fit leaves the menu open. */
  const ROWS: readonly CommandId[] = ['zoom-out', 'zoom-in', 'fit'];
  const uid = $props.id();
  let root: HTMLElement;
  let button: HTMLButtonElement;
  let list: HTMLElement;
  const popup = toolbarPopup({ surface: () => list, opener: () => button, root: () => root });
  const shown = $derived(forced || popup.open);
  // Nothing outlives the menu: closed with it.
  $effect(() => () => popup.close(false));
  /** What a row says: the command's name, then its key ("Zoom in · +"). */
  const [name, key] = [(c: CommandId) => commandTitle(c).split(' · ')[0], (c: CommandId) => commandTitle(c).split(' · ')[1]];
  const press = (c: CommandId) => (c === 'fit' ? popup.choose(() => oncommand(c)) : oncommand(c));
</script>

<div class="vb-menu vb-zoom-menu" role="group" aria-label={commonWords.zoom} bind:this={root}>
  <button type="button" class="vb-btn vb-zoom-btn" {id} data-look={look} bind:this={button} title={toolbarWords.zoomMenu(percent)}
    aria-label={toolbarWords.zoomMenu(percent)} aria-haspopup="menu" aria-expanded={shown} aria-controls="vb-zoom-{uid}"
    onclick={() => (popup.open ? popup.close() : void popup.show())}><span aria-hidden="true">{percent}%</span><ButtonIcon name="chevron" /></button>
  <div class="vb-menu-list" id="vb-zoom-{uid}" role="menu" aria-label={commonWords.zoom} tabindex="-1" hidden={!shown} bind:this={list}>
    {#each ROWS as c (c)}
      <button type="button" class="vb-menu-item" role="menuitem" tabindex="-1" title={zoomTitle(c, percent)} onclick={() => press(c)}>
        <span class="vb-menu-label">{name(c)}</span><kbd aria-hidden="true">{key(c)}</kbd>
      </button>
    {/each}
  </div>
</div>
<ZoomLevel {percent} level={false} />
