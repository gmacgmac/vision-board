<!-- The page shell: toolbar, the requests strip (agentAccess flag) or, while a past version shows,
     its banner (versionView flag), stage, reply panel, the key commands bubble (keyBubble flag),
     toast, the confirm dialog and the New board / Rename board dialog (boardEdit flag). Notes open in a bubble beside their card (board/notes.ts). The stage's contents are drawn by the framework-free
     board controller (D-005), mounted here. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { createBoard, type Board } from '../board/controller.ts';
  import { shell } from './shell.svelte.ts';
  import Toolbar from './Toolbar.svelte';
  import ReplyPanel from './ReplyPanel.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import BoardDialog from './BoardDialog.svelte';
  import AccessRequests from './AccessRequests.svelte';
  import VersionBanner from './VersionBanner.svelte';
  import KeyHelp from './KeyHelp.svelte';
  import { flagOn } from '../../../../packages/format/src/index.ts';
  import { pageFlags } from '../flags.ts';

  let stage: HTMLElement;
  let world: HTMLElement;
  let regions: HTMLElement;
  let cards: HTMLElement;
  let wires: SVGSVGElement;
  let wiresTop: SVGSVGElement;
  let board: Board | null = $state(null);
  const keyBubble = flagOn('keyBubble', pageFlags());

  onMount(() => {
    const b = createBoard({ stage, world, regions, cards, wires, wiresTop });
    board = b;
    void b.boot();
    return () => b.destroy();
  });
</script>

<a class="vb-skip" href="#stage">Skip to the board</a>
<Toolbar
  onboard={(id) => board?.switchTo(id)}
  onversion={(seq) => board?.showVersion(seq) ?? Promise.resolve()}
  ongo={(id) => board?.goToContainer(id)}
  oncommand={(id) => board?.command(id)}
  onhide={() => board?.toggleHide()}
  onsend={() => board?.send() ?? Promise.resolve('The board is not ready yet.')}
  onrevoke={(agent) => board?.access.revoke(undefined, agent) ?? Promise.resolve()}
/>
{#if shell.past}
  <VersionBanner run={shell.past} onback={() => void board?.showVersion(null)} />
{:else if shell.agentAccess}
  <AccessRequests requests={shell.requests} news={shell.requestNews}
    onanswer={(seq, a, text) => board?.access.answer(seq, a, text) ?? Promise.resolve(false)} />
{/if}

<main id="stage" class="vb-stage vb-ground" tabindex="-1" aria-label="Board" bind:this={stage}>
  <div id="world" class="vb-world no-anim" bind:this={world}>
    <div id="regions" class="vb-regions" bind:this={regions}></div>
    <svg id="wires" class="vb-wires" aria-hidden="true" bind:this={wires}></svg>
    <div id="cards" class="vb-cards" role="list" aria-label="Items, in number order" bind:this={cards}></div>
    <svg id="wires-top" class="vb-wires vb-wires-top" aria-hidden="true" bind:this={wiresTop}></svg>
  </div>
  <div id="message" class="vb-message" role="status" hidden={shell.message === null}>{shell.message ?? ''}</div>
</main>
<!-- The selection, perceivable without colour (3_FE_01 ruling 9): a polite live region. -->
<p id="selection-status" class="vb-visually-hidden" role="status">{shell.selection}</p>

<ReplyPanel />

{#if keyBubble}<KeyHelp />{/if}

<div id="toast" class="vb-toast" role="alert" hidden={!shell.toast} data-tone={shell.toast?.tone}>
  {shell.toast?.text ?? ''}
</div>

<ConfirmDialog />
<BoardDialog onsave={(action, fields) => board?.saveBoard(action, fields) ?? Promise.resolve('The board is not ready yet.')} />
