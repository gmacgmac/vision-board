<!-- The page shell: toolbar, stage, reply panel, key help, toast and note dialog. The stage's
     contents are drawn by the framework-free board controller (D-005), mounted here. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { createBoard, type Board } from '../board/controller.ts';
  import { shell } from './shell.svelte.ts';
  import Toolbar from './Toolbar.svelte';
  import ReplyPanel from './ReplyPanel.svelte';
  import NoteDialog from './NoteDialog.svelte';

  let stage: HTMLElement;
  let world: HTMLElement;
  let regions: HTMLElement;
  let cards: HTMLElement;
  let wires: SVGSVGElement;
  let board: Board | null = $state(null);

  onMount(() => {
    const b = createBoard({ stage, world, regions, cards, wires });
    board = b;
    void b.boot();
    return () => b.destroy();
  });
</script>

<a class="vb-skip" href="#stage">Skip to the board</a>
<Toolbar
  onboard={(id) => board?.switchTo(id)}
  onfit={() => board?.fit()}
  onhide={() => board?.toggleHide()}
/>

<main id="stage" class="vb-stage" tabindex="-1" aria-label="Board" bind:this={stage}>
  <div id="world" class="vb-world no-anim" bind:this={world}>
    <div id="regions" class="vb-regions" bind:this={regions}></div>
    <svg id="wires" class="vb-wires" aria-hidden="true" bind:this={wires}></svg>
    <div id="cards" class="vb-cards" role="list" aria-label="Items, in number order" bind:this={cards}></div>
  </div>
  <div id="message" class="vb-message" role="status" hidden={shell.message === null}>{shell.message ?? ''}</div>
</main>

<ReplyPanel />

<div class="vb-help" aria-hidden="true">
  <kbd>A</kbd> ok <kbd>X</kbd> drop <kbd>C</kbd> comment <kbd>M</kbd> more context <kbd>L</kbd> later
  <kbd>J</kbd>/<kbd>K</kbd> next · <kbd>Alt</kbd>+arrows move · <kbd>R</kbd> reset place · drag to move · scroll to pan · <kbd>Ctrl</kbd>+scroll zoom
</div>

<div id="toast" class="vb-toast" role="alert" hidden={!shell.toast} data-tone={shell.toast?.tone}>
  {shell.toast?.text ?? ''}
</div>

<NoteDialog />
