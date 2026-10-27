<!-- The page shell: toolbar, the requests strip (agentAccess flag) and the proposals notice (proposals
     flag) or, while a past version shows, its banner (versionView flag), stage, reply panel, the key commands bubble (keyBubble flag),
     the Go to card box while a digit typed on the board has it open (goToCard flag),
     the chat sidebar (chatPanel flag), toast, the confirm dialog, the New board / Rename board dialog (boardEdit flag),
     the Archived list (archiveBoard flag) and the folder picker (openFolder flag). Notes open in a bubble beside their card (board/notes.ts). The stage is the
     board's root: the framework-free board (D-005) is mounted in it with this page as its host (board/mount.ts,
     page-host.ts), and the page draws from the board's status. -->
<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import { mount, type MountedBoard } from '../board/mount.ts';
  import { exposeWork } from '../board/work.ts';
  import { askConfirm, shell, toast } from './shell.svelte.ts';
  import { createPageHost } from './page-host.ts';
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
  import { createChatBridge } from './chat-bridge.ts';
  import { createChatPanel, type ChatPanel } from './chat-panel.ts';
  import { flagOn } from '#format';
  import { pageFlags } from '../flags.ts';

  /** The board's root: the page hosts the board in it (board/mount.ts), as nclite hosts it in a pane. */
  let stage: HTMLElement;
  let view = $state<MountedBoard | null>(null);
  const board = $derived(view?.board ?? null);
  const host = createPageHost();
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
  // The viewer's alignment (alignSetting flag, field report batch 3 ruling 4) changed in the "⋯" menu: a setting the board hears.
  $effect(() => {
    void shell.align;
    untrack(() => host.settingsChanged());
  });
  /** Send to agent; with the chat, it is the chat's message with no words when the board's session has
   *  something attached, and waits while the agent is mid-turn (chat-panel.ts `boardSend`). */
  const send = (v: MountedBoard) => (chat ? chat.boardSend(v.send) : v.send());

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
    const v = mount(stage, host);
    // What the page shows of the board is its status, mirrored into the page's state.
    Object.assign(shell, v.status.now);
    const unmirror = v.status.on((patch) => Object.assign(shell, patch));
    // The chat's side of the board: what it attaches, refreshed on every draw.
    const unbridge = bridge?.board(v.board.side);
    const unrefresh = bridge ? v.status.on((patch) => { if ('drawn' in patch) bridge.refresh(); }) : undefined;
    if (new URLSearchParams(location.search).has('vbwork')) exposeWork({ rebuild: () => v.board.rebuild(), idle: () => v.board.idle() });
    view = v;
    return () => { unrefresh?.(); unbridge?.(); unmirror(); v.unmount(); };
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
  onsend={() => (view ? send(view) : Promise.resolve('The board is not ready yet.'))}
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

<main id="stage" class="vb-stage vb-ground" tabindex="-1" aria-label="Board" bind:this={stage}></main>
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
