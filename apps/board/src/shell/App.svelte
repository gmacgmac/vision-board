<!-- The page shell: toolbar, the requests strip (agentAccess flag) and the proposals notice (proposals
     flag) or, while a past version shows, its banner (versionView flag), stage, reply panel, the key commands bubble (keyBubble flag),
     the Go to card box while a digit typed on the board has it open (goToCard flag),
     the chat sidebar (chatPanel flag), toast, the confirm dialog, the New board / Rename board dialog (boardEdit flag),
     the Archived list (archiveBoard flag) and the folder picker (openFolder flag). Notes open in a bubble beside their card (board/notes.ts). The stage's contents are drawn by the framework-free
     board controller (D-005), mounted here. -->
<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import { createBoard, type Board } from '../board/controller.ts';
  import { askConfirm, shell, toast } from './shell.svelte.ts';
  import Toolbar from './Toolbar.svelte';
  import ReplyPanel from './ReplyPanel.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import BoardDialog from './BoardDialog.svelte';
  import AccessRequests from './AccessRequests.svelte';
  import ProposalsBar from './ProposalsBar.svelte';
  import VersionBanner from './VersionBanner.svelte';
  import KeyHelp from './KeyHelp.svelte';
  import GoToCard from './GoToCard.svelte';
  import ChatSidebar from './ChatSidebar.svelte';
  import FolderDialog from './FolderDialog.svelte';
  import ArchivedDialog from './ArchivedDialog.svelte';
  import { createChatBridge } from '../board/chat-bridge.ts';
  import { createChatPanel, type ChatPanel } from '../board/chat-panel.ts';
  import { flagOn } from '../../../../packages/format/src/index.ts';
  import { pageFlags } from '../flags.ts';

  let stage: HTMLElement;
  let world: HTMLElement;
  let regions: HTMLElement;
  let cards: HTMLElement;
  let wires: SVGSVGElement;
  let wiresTop: SVGSVGElement;
  let marks: HTMLElement;
  let board: Board | null = $state(null);
  const keyBubble = flagOn('keyBubble', pageFlags());
  const openFolder = flagOn('openFolder', pageFlags());
  const archiving = flagOn('archiveBoard', pageFlags());
  /** The chat beside the board (chatPanel flag, chat-panel FE_02): the bridge joins its two sides. */
  shell.chatPanel = flagOn('chatPanel', pageFlags());
  const bridge = shell.chatPanel ? createChatBridge() : undefined;
  let chat: ChatPanel | null = $state(null);
  // The chat talks about the open board, or in the folder ('') once boot found no board in it; an
  // archive or restore draws its composer again (N39 ruling 3).
  $effect(() => {
    const [c, id, past] = [chat, shell.boardId || (shell.noBoards ? '' : null), !!shell.past];
    void shell.archived;
    untrack(() => c?.show(id, past));
  });
  // The viewer's alignment (alignSetting flag, field report batch 3 ruling 4) changed in the "⋯" menu: lay out again.
  $effect(() => {
    void shell.align;
    untrack(() => board?.relayout());
  });
  /** Send to agent; with the chat, it is the chat's message with no words when the board's session has
   *  something attached, and waits while the agent is mid-turn (chat-panel.ts `boardSend`). */
  const send = (b: Board) => (chat ? chat.boardSend(b.send) : b.send());

  function hostChat(panel: HTMLElement) {
    const c = createChatPanel(panel, {
      bridge: bridge!, confirm: askConfirm, toast,
      boardName: (id) => shell.boards.find((b) => b.board === id)?.title ?? id,
      archived: (id) => shell.archived.some((b) => b.board === id),
      open: async () => { shell.chatOpen = true; await tick(); },
      waiting: (on) => { shell.sendWaiting = on; },
      attached: (on) => { shell.chatAttached = on; },
      view: (state) => { shell.chatView = state; },
    });
    chat = c;
    return () => { c.destroy(); chat = null; };
  }

  onMount(() => {
    const b = createBoard({ stage, world, regions, cards, wires, wiresTop, marks }, bridge);
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
  onopen={(n) => board?.go.to(n)}
  oncommand={(id) => board?.command(id)}
  onhide={() => board?.toggleHide()}
  onsend={() => (board ? send(board) : Promise.resolve('The board is not ready yet.'))}
  onrevoke={(agent) => board?.access.revoke(undefined, agent) ?? Promise.resolve()}
  onflagged={() => board?.nextFlagged()}
  onarchive={() => void board?.boardEdit.archive()}
  onlock={() => void board?.boardEdit.lock()}
/>
{#if shell.past}
  <VersionBanner run={shell.past} onback={() => void board?.showVersion(null)} />
{:else}
  {#if shell.agentAccess}
    <AccessRequests requests={shell.requests} news={shell.requestNews}
      onanswer={(seq, a, text) => board?.access.answer(seq, a, text) ?? Promise.resolve(false)} />
  {/if}
  <ProposalsBar rows={shell.proposals} news={shell.proposalNews}
    onreview={() => board?.proposals.review()} onacceptall={() => void board?.proposals.acceptAll()} />
{/if}

<main id="stage" class="vb-stage vb-ground" tabindex="-1" aria-label="Board" bind:this={stage}>
  <div id="world" class="vb-world no-anim" bind:this={world}>
    <div id="regions" class="vb-regions" bind:this={regions}></div>
    <svg id="wires" class="vb-wires" aria-hidden="true" bind:this={wires}></svg>
    <div id="cards" class="vb-cards" role="list" aria-label="Items, in number order" bind:this={cards}></div>
    <svg id="wires-top" class="vb-wires vb-wires-top" aria-hidden="true" bind:this={wiresTop}></svg>
    <!-- Markers for link labels with no room on their line (linkLabels flag, board/link-marks.ts). -->
    <div id="link-marks" class="vb-link-marks" role="group" aria-label="Link labels" hidden bind:this={marks}></div>
  </div>
  <div id="message" class="vb-message" role="status" hidden={shell.message === null}>{shell.message ?? ''}</div>
</main>
<!-- The selection, perceivable without colour (3_FE_01 ruling 9): a polite live region. -->
<p id="selection-status" class="vb-visually-hidden" role="status">{shell.selection}</p>

<ReplyPanel />

{#if keyBubble}<KeyHelp />{/if}
{#if shell.go}
  <GoToCard box={shell.go} onedit={(text) => board?.go.edit(text)} onenter={() => board?.go.enter()}
    onclose={() => board?.go.close()} onpast={() => void board?.go.openPast()} />
{/if}
{#if bridge}<ChatSidebar onhost={hostChat} onload={() => chat?.load() ?? Promise.resolve(false)} />{/if}

<div id="toast" class="vb-toast" role="alert" hidden={!shell.toast} data-tone={shell.toast?.tone}>
  {shell.toast?.text ?? ''}
</div>

<ConfirmDialog />
<BoardDialog onsave={(action, fields) => board?.boardEdit.save(action, fields) ?? Promise.resolve('The board is not ready yet.')} />
{#if archiving}<ArchivedDialog onrestore={(id) => board?.boardEdit.restore(id) ?? Promise.resolve('The board is not ready yet.')} />{/if}
{#if openFolder}<FolderDialog />{/if}
